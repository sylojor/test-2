// ============================================
// API: حفظ إعدادات الـ LLM في قاعدة البيانات
// PUT: يحفظ API Key + الموديلز المختارة + Provider
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse, requireAdmin } from "@/lib/auth"
import type { LLMProvider, ModelTier } from "@/types"

// --- حفظ الإعدادات ---
export async function PUT(request: NextRequest) {
  try {
    const adminResult = requireAdmin(request)
    if (!adminResult.success) {
      return adminResult.response
    }

    const body = await request.json()
    const {
      provider,
      apiKey,
      baseUrl,
      models, // { LIGHT: "model-id", MEDIUM: "model-id", HEAVY: "model-id" }
    } = body as {
      provider: LLMProvider
      apiKey?: string
      baseUrl?: string
      models: Record<ModelTier, string>
    }

    if (!provider) {
      return NextResponse.json({ error: "provider مطلوب" }, { status: 400 })
    }

    // حفظ في قاعدة البيانات
    try {
      const { db } = await import("@/lib/db")

      // First, deactivate all existing LLM models
      await db.llmModel.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })

      // Then, create/update the selected models
      for (const [tier, modelId] of Object.entries(models)) {
        if (!modelId) continue

        // Check if this model already exists
        const existing = await db.llmModel.findFirst({
          where: { modelId, provider },
        })

        if (existing) {
          // Update existing model
          await db.llmModel.update({
            where: { id: existing.id },
            data: {
              isActive: true,
              isDefault: true,
              tier: tier as ModelTier,
              apiKeyValue: apiKey || existing.apiKeyValue,
              baseUrl: baseUrl || existing.baseUrl,
              name: getModelName(modelId, provider),
            },
          })
        } else {
          // Create new model entry
          await db.llmModel.create({
            data: {
              name: getModelName(modelId, provider),
              provider,
              apiKeyValue: apiKey || undefined,
              baseUrl: baseUrl || undefined,
              modelId,
              tier: tier as ModelTier,
              isActive: true,
              isDefault: true,
              priceInput: 0,
              priceOutput: 0,
            },
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: "تم حفظ إعدادات الـ LLM بنجاح",
        provider,
        models,
      })
    } catch (dbError) {
      console.error("[LLM_SAVE_DB_ERROR]", dbError)
      // If DB save fails, still try to set environment variables for the current session
      // (But env vars in Next.js are read at build time, so this won't work for docker)
      return NextResponse.json({
        success: false,
        message: `فشل الحفظ في قاعدة البيانات: ${dbError instanceof Error ? dbError.message : "خطأ"}`,
      }, { status: 500 })
    }
  } catch (error) {
    console.error("[LLM_SAVE_ERROR]", error)
    return NextResponse.json({
      success: false,
      message: `خطأ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
    }, { status: 500 })
  }
}

// --- حذف إعدادات الـ LLM (إعادة للوضع الافتراضي) ---
export async function DELETE(request: NextRequest) {
  try {
    const adminResult = requireAdmin(request)
    if (!adminResult.success) {
      return adminResult.response
    }

    const { db } = await import("@/lib/db")

    // Deactivate all models
    await db.llmModel.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: "تم إعادة إعدادات الـ LLM للوضع الافتراضي",
    })
  } catch (error) {
    console.error("[LLM_DELETE_ERROR]", error)
    return NextResponse.json({
      success: false,
      message: `خطأ: ${error instanceof Error ? error.message : "خطأ"}`,
    }, { status: 500 })
  }
}

function getModelName(modelId: string, provider: string): string {
  // Generate a human-readable name from the model ID
  const nameMap: Record<string, string> = {
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo": "Llama 3.1 8B",
    "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo": "Llama 3.1 70B",
    "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo": "Llama 3.1 405B",
    "llama-3.1-8b": "Llama 3.1 8B",
    "llama-3.1-70b": "Llama 3.1 70B",
    "llama-3.1-8b-instruct:free": "Llama 3.1 8B (Free)",
    "llama-3.1-70b-instruct": "Llama 3.1 70B",
    "deepseek-v3": "DeepSeek V3",
    "deepseek-r1": "DeepSeek R1",
    "grok-3": "Grok 3",
    "grok-3-mini": "Grok 3 Mini",
  }

  if (nameMap[modelId]) return nameMap[modelId]

  // Fallback: extract name from model ID
  return modelId.split("/").pop() || modelId
}
