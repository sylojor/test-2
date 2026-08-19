// ============================================
// API: System Rebuild (Admin Only)
// GET: Read-only system status
// POST: Trigger deployment rebuild via signal file
//
// How it works:
// - POST writes a "rebuild-requested.signal" file to /app/data/
// - A cron job on the HOST server monitors this file
// - When detected, the host runs deploy.sh (git pull + docker-compose rebuild)
// - The signal file is deleted after processing
//
// SECURITY:
// - Admin-only authentication required
// - Rate limited (1 rebuild per 5 minutes)
// - No shell command execution from API (only signal file)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { requirePlatformOwner } from "@/lib/auth"
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } from "fs"
import { db } from "@/lib/db"

// --- Rebuild rate limiting (1 rebuild per 5 min) ---
let lastRebuildTime = 0
const REBUILD_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

// --- Signal file paths (inside container, on shared volume with host) ---
const DATA_DIR = "/app/data"
const REBUILD_SIGNAL_FILE = `${DATA_DIR}/rebuild-requested.signal`
const REBUILD_STATUS_FILE = `${DATA_DIR}/rebuild-status.json`

// ============================================
// GET: Read-only system status (admin only)
// ============================================
export async function GET(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const isDocker = existsSync("/.dockerenv")

    // Database health check
    let dbHealthy = false
    let dbTableCount = 0
    try {
      const userCount = await db.user.count()
      dbHealthy = true
      dbTableCount = userCount
    } catch {
      dbHealthy = false
    }

    // Get LLM model count from database
    let modelCount = 0
    try {
      modelCount = await (db as any).lLMModel.count()
    } catch {
      // LLMModel table might not exist yet
    }

    // Check rebuild status from signal/status files
    let rebuildStatus = "idle"
    let rebuildRequestedBy = ""
    let rebuildRequestedAt = ""
    try {
      if (existsSync(REBUILD_STATUS_FILE)) {
        const statusData = JSON.parse(readFileSync(REBUILD_STATUS_FILE, "utf-8"))
        rebuildStatus = statusData.status || "idle"
        rebuildRequestedBy = statusData.requestedBy || ""
        rebuildRequestedAt = statusData.requestedAt || ""
        // Auto-clear completed/failed status after 30 minutes
        if ((statusData.status === "completed" || statusData.status === "failed") &&
            Date.now() - statusData.timestamp > 30 * 60 * 1000) {
          try { unlinkSync(REBUILD_STATUS_FILE) } catch {}
          rebuildStatus = "idle"
        }
      }
      // If signal file still exists, rebuild is pending
      if (existsSync(REBUILD_SIGNAL_FILE)) {
        rebuildStatus = "pending"
      }
    } catch {
      rebuildStatus = "idle"
    }

    return NextResponse.json({
      status: "running",
      environment: {
        isDocker,
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()),
      },
      database: {
        healthy: dbHealthy,
        connected: dbHealthy,
        sampleRecordCount: dbTableCount,
        modelCount,
      },
      security: {
        jwtSecretConfigured: !!process.env.JWT_SECRET,
        llmKeyConfigured: !!process.env.LLM_API_KEY,
        dbUrlConfigured: !!process.env.DATABASE_URL,
      },
      rebuild: {
        status: rebuildStatus,
        requestedBy: rebuildRequestedBy,
        requestedAt: rebuildRequestedAt,
        lastRebuildTime,
        cooldownRemaining: lastRebuildTime ? Math.max(0, REBUILD_COOLDOWN_MS - (Date.now() - lastRebuildTime)) : 0,
      },
      message: rebuildStatus === "pending"
        ? "طلب إعادة البناء قيد الانتظار — سيتم تنفيذه خلال دقيقة"
        : "استخدم POST /api/admin/rebuild لتحديث الموقع من GitHub",
    })
  } catch (error) {
    console.error("[ADMIN_STATUS_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب حالة النظام" }, { status: 500 })
  }
}

// ============================================
// POST: Trigger rebuild (admin only, rate limited)
// Writes a signal file to shared volume (/app/data/)
// The host's cron job (auto-deploy-watcher.sh) detects
// this file and runs deploy.sh on the host machine.
// ============================================
export async function POST(request: NextRequest) {
  try {
    // --- Auth check ---
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    // --- Rate limit check ---
    const now = Date.now()
    if (lastRebuildTime && now - lastRebuildTime < REBUILD_COOLDOWN_MS) {
      const remaining = Math.ceil((REBUILD_COOLDOWN_MS - (now - lastRebuildTime)) / 1000)
      return NextResponse.json({
        error: `انتظر ${remaining} ثانية قبل المحاولة التالية`,
        cooldownRemaining: remaining,
      }, { status: 429 })
    }

    // --- Ensure data directory exists ---
    try { mkdirSync(DATA_DIR, { recursive: true }) } catch {}

    // --- Write rebuild signal file ---
    // The host server's cron job (auto-deploy-watcher.sh) monitors /app/data/
    // on the host side and will detect this file, then run deploy.sh
    let signalWritten = false
    let statusWritten = false

    try {
      writeFileSync(REBUILD_SIGNAL_FILE, JSON.stringify({
        requestedAt: new Date().toISOString(),
        requestedBy: authResult.payload.email,
        action: "git_pull_and_rebuild",
      }), "utf-8")
      signalWritten = true
    } catch (writeError) {
      console.error("[REBUILD_SIGNAL_WRITE_ERROR]", writeError)
    }

    // --- Write status file ---
    try {
      writeFileSync(REBUILD_STATUS_FILE, JSON.stringify({
        status: "requested",
        timestamp: Date.now(),
        requestedBy: authResult.payload.email,
        requestedAt: new Date().toISOString(),
        message: "طلب إعادة البناء تم تسجيله — سيتم تنفيذه خلال دقيقة",
      }), "utf-8")
      statusWritten = true
    } catch (writeError) {
      console.error("[REBUILD_STATUS_WRITE_ERROR]", writeError)
    }

    // --- Update rate limit ---
    lastRebuildTime = now

    if (signalWritten && statusWritten) {
      return NextResponse.json({
        success: true,
        message: "تم تسجيل طلب إعادة البناء — سيتم تنفيذه من الخادم خلال دقيقة",
        signalWritten: true,
        statusWritten: true,
        note: "تأكد أن auto-deploy-watcher.sh يعمل كـ cron job على الخادم الرئيسي",
      })
    } else if (signalWritten) {
      return NextResponse.json({
        success: true,
        message: "تم تسجيل طلب إعادة البناء — لكن لم يتم حفظ ملف الحالة",
        signalWritten: true,
        statusWritten: false,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "فشل تسجيل طلب إعادة البناء — لا يمكن الكتابة على مجلد البيانات",
        signalWritten: false,
        statusWritten: false,
        hint: "تحقق من أن مجلد /app/data له صلاحيات كتابة في الحاوية",
      }, { status: 500 })
    }
  } catch (error) {
    console.error("[ADMIN_REBUILD_ERROR]", error)
    return NextResponse.json({ error: "فشل تسجيل طلب إعادة البناء" }, { status: 500 })
  }
}
