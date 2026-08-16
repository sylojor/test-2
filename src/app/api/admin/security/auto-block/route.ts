// ============================================
// Security Auto-Block API — Auto-block IPs detected by proxy.ts
// Called by proxy.ts when suspicious/critical paths are accessed
// Protected by INTERNAL_SECURITY_KEY (shared with proxy.ts)
// POST: Create or update a BlockedIP record (auto-block)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

const INTERNAL_KEY = process.env.INTERNAL_SECURITY_KEY

export async function POST(request: NextRequest) {
  try {
    // Verify internal caller (proxy.ts)
    const key = request.headers.get("x-internal-key")
    if (!INTERNAL_KEY || key !== INTERNAL_KEY) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { ip, reason, path, attemptDetail } = body

    if (!ip) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }

    // Check if IP is already blocked
    const existing = await db.blockedIP.findUnique({ where: { ip } })

    if (existing && existing.isActive) {
      // Update existing block — increment request count
      const updated = await db.blockedIP.update({
        where: { ip },
        data: {
          requestCount: existing.requestCount + 1,
          updatedAt: new Date(),
          attemptDetail: attemptDetail || existing.attemptDetail,
          path: path || existing.path,
        },
      })
      return NextResponse.json({ blocked: updated, message: "IP already blocked — count updated" })
    }

    if (existing && !existing.isActive) {
      // Re-block previously unblocked IP
      const reblocked = await db.blockedIP.update({
        where: { ip },
        data: {
          isActive: true,
          autoBlocked: true,
          reason: reason || "Auto-blocked: suspicious activity",
          path: path || null,
          attemptDetail: attemptDetail || null,
          requestCount: existing.requestCount + 1,
          unblockedAt: null,
          updatedAt: new Date(),
        },
      })
      return NextResponse.json({ blocked: reblocked, message: "IP re-blocked automatically" })
    }

    // Create new auto-block record
    const blocked = await db.blockedIP.create({
      data: {
        ip,
        reason: reason || "Auto-blocked: suspicious activity",
        autoBlocked: true,
        isActive: true,
        path: path || null,
        attemptDetail: attemptDetail || null,
        requestCount: 1,
      },
    })

    // Also log this blocking event
    await db.securityLog.create({
      data: {
        ip,
        path: path || "/unknown",
        method: "AUTO_BLOCK",
        statusCode: 403,
        userAgent: request.headers.get("user-agent") || "",
        referer: request.headers.get("referer") || "",
        isSuspicious: true,
        reason: reason || "Auto-blocked",
        blocked: true,
      },
    })

    return NextResponse.json({ blocked, message: "IP auto-blocked successfully" })
  } catch (error) {
    console.error("[Security Auto-Block] Error:", error)
    return NextResponse.json({ error: "Failed to auto-block IP" }, { status: 500 })
  }
}
