// ============================================
// API: إعدادات الـ LLM
// GET: جلب حالة الـ LLM الحالية
// POST: اختبار الاتصال بالـ LLM
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { getLLMStatus, testLLMConnection, LLM_PROVIDER_INFO } from "@/lib/llm-service"
import { verifyAuth, unauthorizedResponse, requireAdmin } from "@/lib/auth"
import type { LLMProvider } from "@/types"

// --- جلب حالة الـ LLM الحالية ---
export async function GET(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const status = getLLMStatus()
    
    // إخفاء الـ API Key (نعرض آخر 4 أرقام بس)
    const maskedKey = process.env.LLM_API_KEY
      ? `****${process.env.LLM_API_KEY.slice(-4)}`
      : "غير مربوط"

    return NextResponse.json({
      ...status,
      apiKeyMasked: maskedKey,
      providerInfo: LLM_PROVIDER_INFO,
      envVars: {
        LLM_PROVIDER: process.env.LLM_PROVIDER || "mock",
        LLM_API_URL: process.env.LLM_API_URL || "",
        LLM_MODEL_LIGHT: process.env.LLM_MODEL_LIGHT || "",
        LLM_MODEL_MEDIUM: process.env.LLM_MODEL_MEDIUM || "",
        LLM_MODEL_HEAVY: process.env.LLM_MODEL_HEAVY || "",
      },
    })
  } catch (error) {
    console.error("[LLM_SETTINGS_GET_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب إعدادات LLM" }, { status: 500 })
  }
}

// --- اختبار الاتصال بالـ LLM ---
export async function POST(request: NextRequest) {
  try {
    // === Admin-only: testing LLM settings requires admin ===
    const adminResult = requireAdmin(request)
    if (!adminResult.success) {
      return adminResult.response
    }

    const body = await request.json()
    const { provider, apiKey, baseUrl } = body as {
      provider: LLMProvider
      apiKey: string
      baseUrl?: string
    }

    if (!provider) {
      return NextResponse.json({ error: "provider مطلوب" }, { status: 400 })
    }

    if (provider !== "mock" && !apiKey) {
      return NextResponse.json({ error: "API Key مطلوب" }, { status: 400 })
    }

    const result = await testLLMConnection(provider, apiKey, baseUrl)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[LLM_TEST_ERROR]", error)
    return NextResponse.json({
      success: false,
      message: `خطأ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
    }, { status: 500 })
  }
}
