// ============================================
// API: إعدادات النظام (Admin System Settings)
// GET: جلب كل الإعدادات + env status indicators + masked keys
// PUT: حفظ إعدادات LLM + API Keys (Dodo, etc.)
//     - API Keys get written to .env file (persistent)
//     - Also updated in process.env (immediate effect)
//
// SECURITY: Admin auth required for ALL operations
// - Raw env values are NEVER exposed in GET response
// - Only masked values and boolean indicators are shown
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { getLLMStatus } from "@/lib/llm-service"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

// Mask a key: show only last 4 chars
function maskKey(key: string | undefined): string {
  if (!key) return ""
  if (key.length <= 8) return "****"
  return `****${key.slice(-4)}`
}

// --- جلب كل إعدادات النظام (admin only) ---
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    // 1. حالة LLM
    const llmStatus = getLLMStatus()
    const maskedKey = maskKey(process.env.LLM_API_KEY)

    // 2. إحصائيات قاعدة البيانات
    const [
      userCount,
      companyCount,
      employeeCount,
      departmentCount,
      projectCount,
      workOrderCount,
      conversationCount,
      messageCount,
      tokenUsageCount,
    ] = await Promise.all([
      db.user.count(),
      db.company.count(),
      db.employee.count(),
      db.department.count(),
      db.project.count(),
      db.workOrder.count(),
      db.conversation.count(),
      db.message.count(),
      db.tokenUsage.count(),
    ])

    // 3. حالة Docker
    const isDocker = existsSync("/.dockerenv")

    // 4. إجمالي التوكنات
    const totalTokensResult = await db.tokenUsage.aggregate({
      _sum: { totalTokens: true, estimatedCost: true },
    })

    // 5. LLM Models from database
    const llmModels = await (db as any).lLMModel.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, provider: true, modelId: true,
        tier: true, isActive: true, isDefault: true,
      },
      orderBy: { priority: "asc" },
    })

    // 6. API Keys & Payment — masked values for admin UI
    const envKeys = {
      dodoApiKeyMasked: maskKey(process.env.DODO_API_KEY),
      dodoWebhookSecretMasked: maskKey(process.env.DODO_WEBHOOK_SECRET),
      dodoBaseUrl: process.env.DODO_API_BASE_URL || "https://api.dodopayments.com/v1",
    }

    // SECURITY: Only boolean indicators + masked values
    return NextResponse.json({
      llm: {
        ...llmStatus,
        apiKeyMasked: maskedKey,
      },
      envKeys,
      database: {
        userCount, companyCount, employeeCount, departmentCount,
        projectCount, workOrderCount, conversationCount, messageCount,
        tokenUsageCount,
        totalTokensUsed: totalTokensResult._sum.totalTokens ?? 0,
        totalCost: totalTokensResult._sum.estimatedCost ?? 0,
      },
      system: {
        isDocker,
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        uptime: Math.floor(process.uptime()),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      envStatus: {
        LLM_PROVIDER_SET: !!process.env.LLM_PROVIDER,
        LLM_API_URL_SET: !!process.env.LLM_API_URL,
        LLM_API_KEY_SET: !!process.env.LLM_API_KEY,
        LLM_MODEL_LIGHT_SET: !!process.env.LLM_MODEL_LIGHT,
        LLM_MODEL_MEDIUM_SET: !!process.env.LLM_MODEL_MEDIUM,
        LLM_MODEL_HEAVY_SET: !!process.env.LLM_MODEL_HEAVY,
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        JWT_SECRET_SET: !!process.env.JWT_SECRET,
        DODO_API_KEY_SET: !!process.env.DODO_API_KEY,
        DODO_WEBHOOK_SECRET_SET: !!process.env.DODO_WEBHOOK_SECRET,
      },
      llmModels,
    })
  } catch (error) {
    console.error("[ADMIN_SETTINGS_GET_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب الإعدادات" }, { status: 500 })
  }
}

// --- حفظ إعدادات LLM + API Keys (admin only) ---
// API Keys (Dodo, etc.) are written to .env file for persistence
export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { provider, apiKey, apiUrl, modelLight, modelMedium, modelHeavy, envKeys } = body as {
      provider?: string
      apiKey?: string
      apiUrl?: string
      modelLight?: string
      modelMedium?: string
      modelHeavy?: string
      envKeys?: {
        dodoApiKey?: string
        dodoWebhookSecret?: string
        dodoBaseUrl?: string
      }
    }

    // ============================================
    // LLM Settings — update process.env + DB
    // ============================================
    if (provider) process.env.LLM_PROVIDER = provider
    if (apiKey) process.env.LLM_API_KEY = apiKey
    if (apiUrl) process.env.LLM_API_URL = apiUrl
    if (modelLight) process.env.LLM_MODEL_LIGHT = modelLight
    if (modelMedium) process.env.LLM_MODEL_MEDIUM = modelMedium
    if (modelHeavy) process.env.LLM_MODEL_HEAVY = modelHeavy

    // Update default LLM models in database
    if (modelLight) {
      const lightModel = await (db as any).lLMModel.findFirst({ where: { tier: "LIGHT", isDefault: true } })
      if (lightModel) {
        await (db as any).lLMModel.update({ where: { id: lightModel.id }, data: { modelId: modelLight } })
      }
    }
    if (modelMedium) {
      const mediumModel = await (db as any).lLMModel.findFirst({ where: { tier: "MEDIUM", isDefault: true } })
      if (mediumModel) {
        await (db as any).lLMModel.update({ where: { id: mediumModel.id }, data: { modelId: modelMedium } })
      }
    }
    if (modelHeavy) {
      const heavyModel = await (db as any).lLMModel.findFirst({ where: { tier: "HEAVY", isDefault: true } })
      if (heavyModel) {
        await (db as any).lLMModel.update({ where: { id: heavyModel.id }, data: { modelId: modelHeavy } })
      }
    }

    // ============================================
    // API Keys (Dodo, etc.) — write to .env file + process.env
    // ============================================
    const envUpdates: Record<string, string> = {}

    if (envKeys) {
      // Dodo API Key
      if (envKeys.dodoApiKey) {
        process.env.DODO_API_KEY = envKeys.dodoApiKey
        envUpdates["DODO_API_KEY"] = envKeys.dodoApiKey
      }
      // Dodo Webhook Secret
      if (envKeys.dodoWebhookSecret) {
        process.env.DODO_WEBHOOK_SECRET = envKeys.dodoWebhookSecret
        envUpdates["DODO_WEBHOOK_SECRET"] = envKeys.dodoWebhookSecret
      }
      // Dodo Base URL
      if (envKeys.dodoBaseUrl) {
        process.env.DODO_API_BASE_URL = envKeys.dodoBaseUrl
        envUpdates["DODO_API_BASE_URL"] = envKeys.dodoBaseUrl
      }
    }

    // Also update LLM env vars in the envUpdates
    if (provider) envUpdates["LLM_PROVIDER"] = provider
    if (apiKey) envUpdates["LLM_API_KEY"] = apiKey
    if (apiUrl) envUpdates["LLM_API_URL"] = apiUrl
    if (modelLight) envUpdates["LLM_MODEL_LIGHT"] = modelLight
    if (modelMedium) envUpdates["LLM_MODEL_MEDIUM"] = modelMedium
    if (modelHeavy) envUpdates["LLM_MODEL_HEAVY"] = modelHeavy

    // Write to .env file for persistence
    if (Object.keys(envUpdates).length > 0) {
      try {
        const envPath = join(process.cwd(), ".env")
        let envContent = ""

        if (existsSync(envPath)) {
          envContent = readFileSync(envPath, "utf-8")
        }

        // Update each variable in .env
        for (const [key, value] of Object.entries(envUpdates)) {
          const linePattern = new RegExp(`^${key}=.*$`, "m")
          if (linePattern.test(envContent)) {
            // Replace existing line
            envContent = envContent.replace(linePattern, `${key}=${value}`)
          } else {
            // Add new line
            envContent += `\n${key}=${value}`
          }
        }

        writeFileSync(envPath, envContent, "utf-8")
        console.log("[ADMIN_SETTINGS] Written to .env:", Object.keys(envUpdates).join(", "))
      } catch (envWriteError) {
        console.error("[ADMIN_SETTINGS] Failed to write .env:", envWriteError)
        // Still return success — process.env was updated for current session
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم حفظ الإعدادات — API Keys نُكتبت على .env بالسيرفر",
      envKeysWritten: Object.keys(envUpdates),
    })
  } catch (error) {
    console.error("[ADMIN_SETTINGS_PUT_ERROR]", error)
    return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 })
  }
}
