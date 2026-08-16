// ============================================
// API: جلب الموديلز المتوفرة من المزود
// GET: يطلب قائمة الموديلز من Together/Grok/OpenRouter
// يحتاج API Key + Provider
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import type { LLMProvider } from "@/types"

const PROVIDER_MODEL_ENDPOINTS: Record<string, string> = {
  together: "https://api.together.xyz/v1/models",
  grok: "https://api.groq.com/openai/v1/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  local: "", // لا نعرف السيرفر المحلي
}

interface AvailableModel {
  id: string
  name: string
  provider: string
  tier: string // suggested tier based on size
  pricing?: { input: number; output: number }
  contextLength?: number
  type?: string // chat, completion, image, etc.
}

// --- جلب الموديلز المتوفرة من المزود ---
export async function GET(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get("provider") as LLMProvider
    const apiKey = searchParams.get("apiKey") || ""
    const baseUrl = searchParams.get("baseUrl") || ""

    if (!provider) {
      return NextResponse.json({ error: "provider مطلوب" }, { status: 400 })
    }

    if (provider === "mock") {
      return NextResponse.json({
        models: [
          { id: "mock-light", name: "Mock Light", provider: "mock", tier: "LIGHT" },
          { id: "mock-medium", name: "Mock Medium", provider: "mock", tier: "MEDIUM" },
          { id: "mock-heavy", name: "Mock Heavy", provider: "mock", tier: "HEAVY" },
        ],
      })
    }

    if (provider === "local") {
      // للسيرفر المحلي — نطلب من الـ baseUrl
      if (!baseUrl) {
        return NextResponse.json({ models: [], message: "حدد عنوان السيرفر المحلي" })
      }
      return fetchLocalModels(baseUrl, apiKey)
    }

    if (!apiKey) {
      return NextResponse.json({ error: "API Key مطلوب" }, { status: 400 })
    }

    // جلب من المزود
    const modelsEndpoint = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/models`
      : PROVIDER_MODEL_ENDPOINTS[provider]

    if (!modelsEndpoint) {
      return NextResponse.json({ error: "لا نعرف نقطة الموديلز لهذا المزود" }, { status: 400 })
    }

    const response = await fetch(modelsEndpoint, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        ...(provider === "openrouter" ? {
          "HTTP-Referer": "https://one-employer.company",
          "X-Title": "One Employer Company",
        } : {}),
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      return NextResponse.json({
        error: `فشل جلب الموديلز (${response.status}): ${errorText.slice(0, 200)}`,
      }, { status: response.status })
    }

    const data = await response.json()
    const models: AvailableModel[] = parseModelsResponse(data, provider)

    return NextResponse.json({ models })
  } catch (error) {
    console.error("[LLM_MODELS_FETCH_ERROR]", error)
    return NextResponse.json({
      error: `خطأ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
    }, { status: 500 })
  }
}

// --- جلب موديلز من سيرفر محلي ---
async function fetchLocalModels(baseUrl: string, apiKey?: string) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {},
    })

    if (!response.ok) {
      return NextResponse.json({ models: [], message: `فشل الاتصال بالسيرفر المحلي (${response.status})` })
    }

    const data = await response.json()
    const models = parseModelsResponse(data, "local")
    return NextResponse.json({ models })
  } catch {
    return NextResponse.json({ models: [], message: "فشل الاتصال بالسيرفر المحلي" })
  }
}

// --- تحليل رد الموديلز من مختلف المزودين ---
function parseModelsResponse(data: any, provider: string): AvailableModel[] {
  const rawModels = data.data || data.models || []
  
  const models: AvailableModel[] = rawModels
    .filter((m: any) => {
      // فلترة: نعرض فقط موديلز chat/completion (ليس image/embedding)
      const type = m.type || m.object || ""
      const id = m.id || ""
      
      // Exclude embedding, image, and audio models
      if (type.includes("embedding") || id.includes("embed")) return false
      if (type.includes("image") || id.includes("vision") || id.includes("whisper")) return false
      if (type.includes("audio") || id.includes("tts") || id.includes("asr")) return false
      if (id.includes("inpainting") || id.includes("diffusion")) return false
      
      return true
    })
    .map((m: any) => {
      const id = m.id || m.name || ""
      const name = m.name || m.id || ""
      
      // تحديد المستوى المقترح حسب اسم الموديل
      const tier = suggestTier(id, name)
      
      // أسعار
      const pricing = m.pricing ? {
        input: parseFloat(m.pricing.input || m.pricing.prompt || "0") || 0,
        output: parseFloat(m.pricing.output || m.pricing.completion || "0") || 0,
      } : undefined
      
      // طول السياق
      const contextLength = m.context_length || m.max_context_length || undefined
      
      // نوع الموديل
      const type = m.type || m.object || "chat"

      return {
        id,
        name,
        provider,
        tier,
        pricing,
        contextLength,
        type,
      }
    })
    .sort((a: AvailableModel, b: AvailableModel) => {
      // ترتيب: MEDIUM أول (لأنه الأكثر استخدام)، ثم LIGHT، ثم HEAVY
      const tierOrder: Record<string, number> = { LIGHT: 2, MEDIUM: 1, HEAVY: 3 }
      return (tierOrder[a.tier] || 4) - (tierOrder[b.tier] || 4)
    })

  return models
}

// --- تحديد المستوى المقترح حسب اسم/حجم الموديل ---
function suggestTier(modelId: string, modelName: string): string {
  const combined = `${modelId} ${modelName}`.toLowerCase()
  
  // HEAVY: موديلز كبيرة (405B+, MoE أقوى)
  if (
    combined.includes("405b") ||
    combined.includes("deepseek-v3") ||
    combined.includes("deepseek-r1") ||
    combined.includes("grok-3") ||
    combined.includes("o1") ||
    combined.includes("o3") ||
    combined.includes("claude-3.5") ||
    combined.includes("claude-opus") ||
    combined.includes("gpt-4") ||
    combined.includes("command-r-plus") ||
    combined.includes("70b") && combined.includes("grok")
  ) {
    return "HEAVY"
  }
  
  // LIGHT: موديلز صغيرة (8B, 9B, 14B)
  if (
    combined.includes("8b") ||
    combined.includes("9b") ||
    combined.includes("14b") ||
    combined.includes("3b") ||
    combined.includes("7b") ||
    combined.includes("mini") ||
    combined.includes("flash") ||
    combined.includes("turbo") ||
    combined.includes("instant") ||
    combined.includes("free") ||
    combined.includes("llama-3.1-8b") ||
    combined.includes("llama-3.2") ||
    combined.includes("gemma-2b") ||
    combined.includes("qwen2.5-3b") ||
    combined.includes("groq-3-mini")
  ) {
    return "LIGHT"
  }
  
  // MEDIUM: موديلز متوسطة (70B, 32B, 20B)
  if (
    combined.includes("70b") ||
    combined.includes("32b") ||
    combined.includes("20b") ||
    combined.includes("72b") ||
    combined.includes("llama-3.1-70b") ||
    combined.includes("llama-3.3-70b") ||
    combined.includes("qwen2.5-72b") ||
    combined.includes("command-r") ||
    combined.includes("mixtral") ||
    combined.includes("deepseek-v2")
  ) {
    return "MEDIUM"
  }
  
  // Default: MEDIUM
  return "MEDIUM"
}
