// ============================================
// API: إعدادات النظام (Admin System Settings)
// GET: جلب كل الإعدادات (from DB only — NEVER from .env)
// PUT: حفظ إعدادات LLM في قاعدة البيانات فقط
//
// SECURITY FIXES:
// - Removed .env file read/write — NEVER expose .env contents
// - Removed envRaw from response
// - Removed DATABASE_URL exposure
// - All settings are read/written from database only
// - Admin auth required for ALL operations
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { getLLMStatus, testLLMConnection } from "@/lib/llm-service"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { existsSync } from "fs"

// --- جلب كل إعدادات النظام (admin only) ---
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    // 1. حالة LLM
    const llmStatus = getLLMStatus()
    const maskedKey = process.env.LLM_API_KEY
      ? `****${process.env.LLM_API_KEY.slice(-4)}`
      : ""

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

    // 3. حالة Docker (safe check)
    const isDocker = existsSync("/.dockerenv")

    // 4. إجمالي التوكنات المستخدمة
    const totalTokensResult = await db.tokenUsage.aggregate({
      _sum: { totalTokens: true, estimatedCost: true },
    })

    // 5. LLM Models from database (NOT from .env)
    const llmModels = await (db as any).lLMModel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        provider: true,
        modelId: true,
        tier: true,
        isActive: true,
        isDefault: true,
      },
      orderBy: { priority: "asc" },
    })

    // SECURITY: Only expose safe environment variable indicators, NEVER raw values
    return NextResponse.json({
      llm: {
        ...llmStatus,
        apiKeyMasked: maskedKey,
      },
      database: {
        userCount,
        companyCount,
        employeeCount,
        departmentCount,
        projectCount,
        workOrderCount,
        conversationCount,
        messageCount,
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
      // SECURITY: Only show boolean indicators, NEVER actual values
      envStatus: {
        LLM_PROVIDER_SET: !!process.env.LLM_PROVIDER,
        LLM_API_URL_SET: !!process.env.LLM_API_URL,
        LLM_API_KEY_SET: !!process.env.LLM_API_KEY,
        LLM_MODEL_LIGHT_SET: !!process.env.LLM_MODEL_LIGHT,
        LLM_MODEL_MEDIUM_SET: !!process.env.LLM_MODEL_MEDIUM,
        LLM_MODEL_HEAVY_SET: !!process.env.LLM_MODEL_HEAVY,
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        JWT_SECRET_SET: !!process.env.JWT_SECRET,
      },
      // LLM Models from database (the proper way to manage them)
      llmModels,
    })
  } catch (error) {
    console.error("[ADMIN_SETTINGS_GET_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب الإعدادات" }, { status: 500 })
  }
}

// --- حفظ إعدادات LLM في قاعدة البيانات فقط (admin only) ---
export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { provider, apiKey, apiUrl, modelLight, modelMedium, modelHeavy } = body as {
      provider: string
      apiKey: string
      apiUrl: string
      modelLight: string
      modelMedium: string
      modelHeavy: string
    }

    // SECURITY: We no longer write to .env file!
    // Instead, we update process.env for the current session
    // and store settings in the database via LLMModel records.
    // For persistent changes, the user must set environment variables
    // on the server/hosting platform.

    // Update runtime env for current process session (temporary, not persistent)
    if (provider) process.env.LLM_PROVIDER = provider
    if (apiKey) process.env.LLM_API_KEY = apiKey
    if (apiUrl) process.env.LLM_API_URL = apiUrl
    if (modelLight) process.env.LLM_MODEL_LIGHT = modelLight
    if (modelMedium) process.env.LLM_MODEL_MEDIUM = modelMedium
    if (modelHeavy) process.env.LLM_MODEL_HEAVY = modelHeavy

    // Also update default LLM models in database if they exist
    // This ensures settings persist across restarts when models are in DB
    if (modelLight) {
      const lightModel = await (db as any).lLMModel.findFirst({
        where: { tier: "LIGHT", isDefault: true },
      })
      if (lightModel) {
        await (db as any).lLMModel.update({
          where: { id: lightModel.id },
          data: { modelId: modelLight },
        })
      }
    }

    if (modelMedium) {
      const mediumModel = await (db as any).lLMModel.findFirst({
        where: { tier: "MEDIUM", isDefault: true },
      })
      if (mediumModel) {
        await (db as any).lLMModel.update({
          where: { id: mediumModel.id },
          data: { modelId: modelMedium },
        })
      }
    }

    if (modelHeavy) {
      const heavyModel = await (db as any).lLMModel.findFirst({
        where: { tier: "HEAVY", isDefault: true },
      })
      if (heavyModel) {
        await (db as any).lLMModel.update({
          where: { id: heavyModel.id },
          data: { modelId: modelHeavy },
        })
      }
    }

    // If apiKey and apiUrl provided, update all active models for this provider
    if (apiKey && apiUrl && provider) {
      await (db as any).lLMModel.updateMany({
        where: { provider: provider.toLowerCase(), isActive: true },
        data: {
          apiKeyValue: apiKey,
          baseUrl: apiUrl,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "تم حفظ الإعدادات في قاعدة البيانات. للتغييرات الدائمة، يجب تعيين متغيرات البيئة على الخادم.",
      warning: "الإعدادات محفوظة للجلسة الحالية فقط. لإعادة التشغيل، يرجى تعيين متغيرات البيئة على مستوى الخادم.",
    })
  } catch (error) {
    console.error("[ADMIN_SETTINGS_PUT_ERROR]", error)
    return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 })
  }
}
