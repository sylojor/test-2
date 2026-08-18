// ============================================
// خدمة LLM (Large Language Model Service)
//
// هاد الطبقة بتتصل بموديلات الذكاء الاصطناعي
//
// طريقة الربط — 6 خيارات:
//
// 1️⃣ Together AI (أرخص + تنوع):
//    LLM_PROVIDER=together
//    LLM_API_KEY=xxxxxxxx
//
// 2️⃣ Grok / xAI (أذكى بالعربي):
//    LLM_PROVIDER=grok
//    LLM_API_KEY=xai-xxxxx
//
// 3️⃣ OpenRouter (الأسهل):
//    LLM_PROVIDER=openrouter
//    LLM_API_KEY=sk-or-v1-xxxxx
//
// 4️⃣ سيرفر GPU محلي (مجاني + أقوى):
//    LLM_PROVIDER=local
//    LLM_API_URL=http://your-gpu-server:8000
//
// 5️⃣ ZAI SDK (الافتراضي — ذكاء حقيقي فوري):
//    LLM_PROVIDER=zai
//    لا يحتاج API Key — يعمل فوراً
//
// 6️⃣ Mock — للتجربة بدون ذكاء حقيقي
//    LLM_PROVIDER=mock (أو احذف المتغير)
//
// نظام متدرج (Model Tiering):
// - LIGHT: للمهام البسيطة (تلخيص، ترجمة) — موديل صغير وسريع
// - MEDIUM: للمحادثات العادية — موديل 70B
// - HEAVY: للمهام المعقدة (كود، تحليل) — أقوى موديل
// ============================================

import type { ModelTier, LLMMessage, LLMRequest, LLMResponse, RequestType, LLMProvider } from "@/types"

type ToolCallResult = { tool_call_id: string; name: string; arguments: string }
import {
  selectModelTier,
  getCachedResponse,
  setCachedResponse,
  buildConversationContext,
  recordTokenUsage,
  estimateTokens,
} from "@/lib/token-manager"

// تأكد إنه الكود يشتغل على السيرفر فقط
// z-ai-web-dev-sdk يحتاج fs/promises اللي موجود بالـ Node.js بس
const isServer = typeof window === "undefined"

// Lazy import for db — only on server
let _db: any = null
async function getDb() {
  if (!_db && isServer) {
    const mod = await import("@/lib/db")
    _db = mod.db
  }
  return _db
}

// ============================================
// Retry helper — مع إعادة المحاولة التلقائية
// ============================================
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        console.warn(`[LLM] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`, error instanceof Error ? error.message : error)
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
      }
    }
  }
  throw lastError
}

// ============================================
// الإعدادات — تُقرأ من متغيرات البيئة تلقائياً
// ============================================

interface LLMConfig {
  provider: LLMProvider
  apiKey?: string
  baseUrl?: string
  models: Record<ModelTier, string>
}

// --- موديلات افتراضية لكل مزود ---
const PROVIDER_MODELS: Record<string, Record<ModelTier, string>> = {
  together: {
    // أرخص موديلات Together AI مع أفضل أداء
    // LIGHT: 8B — أرخص موديل ($0.10/M) للمهام البسيطة
    // MEDIUM: 70B — توازن بين الذكاء والتكلفة ($0.88/M)
    // HEAVY: DeepSeek V3 — أذكى موديل بسعر معقول ($0.30/$0.39/M)
    LIGHT: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
    MEDIUM: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    HEAVY: "deepseek-ai/DeepSeek-V3",
  },
  grok: {
    LIGHT: "grok-3-mini",
    MEDIUM: "grok-3",
    HEAVY: "grok-3",
  },
  openrouter: {
    LIGHT: "meta-llama/llama-3.1-8b-instruct:free",
    MEDIUM: "meta-llama/llama-3.1-70b-instruct",
    HEAVY: "meta-llama/llama-3.1-405b-instruct",
  },
  local: {
    LIGHT: "llama3.1:8b",
    MEDIUM: "llama3.1:70b",
    HEAVY: "llama3.1:70b",
  },
  zai: {
    LIGHT: "zai-default",
    MEDIUM: "zai-default",
    HEAVY: "zai-default",
  },
  mock: {
    LIGHT: "mock-light",
    MEDIUM: "mock-medium",
    HEAVY: "mock-heavy",
  },
}

// --- أسعار تقريبية لكل مزود (لكل مليون token) ---
const PROVIDER_PRICING: Record<string, { input: number; output: number }> = {
  // أسعار فعلية لكل مليون token (محدّثة)
  together:  { input: 0.30, output: 0.50 },   // متوسط بين الموديلات الثلاثة
  grok:      { input: 0.30, output: 0.50 },
  openrouter: { input: 0.15, output: 0.75 },
  local:     { input: 0, output: 0 },
  zai:       { input: 0, output: 0 },       // مجاني — متوفر بالبيئة
  mock:      { input: 0, output: 0 },
}

// --- روابط API لكل مزود ---
const PROVIDER_BASE_URLS: Record<string, string> = {
  together: "https://api.together.xyz/v1",
  grok: "https://api.x.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  local: "http://localhost:8000/v1",
  zai: "",
  mock: "",
}


// ============================================
// SSRF Protection — Validate external URLs
// Only allow known LLM provider URLs
// ============================================
const ALLOWED_LLM_HOSTS = [
  "api.together.xyz",
  "api.groq.com",
  "api.x.ai",
  "openrouter.ai",
  "api.openai.com",
  "api.anthropic.com",
  "llm.z-ai.dev",
  "live.dodopayments.com",
  "sandbox.dodopayments.com",
]

function validateExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    // Block private/internal IPs
    if (parsed.hostname === "localhost" || 
        parsed.hostname === "127.0.0.1" || 
        parsed.hostname === "::1" ||
        parsed.hostname === "0.0.0.0" ||
        parsed.hostname.startsWith("10.") ||
        parsed.hostname.startsWith("192.168.") ||
        parsed.hostname.startsWith("172.") ||
        parsed.hostname === "metadata.google.internal") {
      return "Private/internal IP not allowed"
    }
    // For LLM API calls, check against allowed hosts
    const isAllowed = ALLOWED_LLM_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith("." + h))
    if (!isAllowed) {
      return `Host not in allowlist: ${parsed.hostname}`
    }
    return null
  } catch {
    return "Invalid URL"
  }
}

// --- بناء الإعدادات من متغيرات البيئة ---
function getLLMConfig(): LLMConfig {
  // الافتراضي: together — أرخص provider حقيقي
  const provider = (process.env.LLM_PROVIDER || "together") as LLMProvider
  const apiKey = process.env.LLM_API_KEY || undefined
  const baseUrl = process.env.LLM_API_URL || undefined

  const defaultModels = PROVIDER_MODELS[provider] || PROVIDER_MODELS.zai
  const models: Record<ModelTier, string> = {
    LIGHT: process.env.LLM_MODEL_LIGHT || defaultModels.LIGHT,
    MEDIUM: process.env.LLM_MODEL_MEDIUM || defaultModels.MEDIUM,
    HEAVY: process.env.LLM_MODEL_HEAVY || defaultModels.HEAVY,
  }

  return { provider, apiKey, baseUrl, models }
}

// ============================================
// ZAI SDK Singleton — نستخدمه للمحادثات الذكية
// ============================================

let zaiInstance: any = null
let zaiInitPromise: Promise<any> | null = null
let zaiInitFailed = false

async function getZAIInstance(): Promise<any> {
  if (!isServer) return null
  if (zaiInstance) return zaiInstance
  // لو فشل قبل هيك — خلّينا نحاول مرة ثانية بعد فترة
  if (zaiInitFailed) {
    zaiInitFailed = false
    zaiInitPromise = null
  }
  if (zaiInitPromise) return zaiInitPromise

  zaiInitPromise = (async () => {
    try {
      // Dynamic import — ZAI SDK يعمل بالسيرفر فقط
      const ZAIModule = await import("z-ai-web-dev-sdk")
      const ZAI = ZAIModule.default || ZAIModule
      zaiInstance = await ZAI.create()
      console.log("[LLM] ZAI SDK initialized successfully")
      zaiInitFailed = false
      return zaiInstance
    } catch (error) {
      console.error("[LLM] ZAI SDK initialization failed:", error)
      zaiInitPromise = null
      zaiInitFailed = true
      throw error
    }
  })()

  return zaiInitPromise
}

// ============================================
// الدالة الرئيسية: إرسال رسالة للـ LLM
// ============================================
export async function sendToLLM(
  request: LLMRequest,
  companyId: string,
  employeeId: string,
): Promise<LLMResponse> {
  const config = getLLMConfig()
  const budgetLevel = await getBudgetLevel(companyId)
  
  // 1. اختيار الموديل المناسب
  const modelTier = request.model ?? selectModelTier(
    request.requestType,
    estimateTokens(request.messages.map(m => m.content).join("")),
    budgetLevel,
  )

  // 2. فحص الكاش
  const systemPrompt = request.messages.find(m => m.role === "system")?.content ?? ""
  const lastUserMessage = [...request.messages].reverse().find(m => m.role === "user")?.content ?? ""
  const cached = getCachedResponse(systemPrompt, lastUserMessage)
  
  if (cached && cached.modelTier === modelTier) {
    await recordTokenUsage({
      employeeId,
      modelTier,
      tokensIn: 0,
      tokensOut: 0,
      requestType: request.requestType,
      cached: true,
    })

    return {
      content: cached.content,
      tokensIn: cached.tokensIn,
      tokensOut: cached.tokensOut,
      modelTier,
      cached: true,
      estimatedCost: 0,
    }
  }

  // 3. فحص هل في ميزانية توكنات — ENFORCED
  const { canConsumeTokens } = await import("@/lib/token-manager")
  const canConsume = await canConsumeTokens(companyId, 500)
  if (!canConsume && config.provider !== "mock" && config.provider !== "zai") {
    console.warn(`[LLM] Token budget exhausted for company ${companyId} — rejecting request`)
    return {
      content: getDialectReply("formal", {
        formal: "عذراً، نفدت ميزانية التوكنات الخاصة بشركتك. يرجى التواصل مع الإدارة لشحن توكنات إضافية أو ترقية اشتراكك.",
        english: "Sorry, your company's token budget has been exhausted. Please contact your administrator to purchase additional tokens or upgrade your subscription.",
        levantine: "", egyptian: "", gulf: "",
      }),
      tokensIn: 0,
      tokensOut: 0,
      modelTier,
      cached: false,
      estimatedCost: 0,
      budgetExceeded: true,
    }
  }

  // 4. تلخيص المحادثة لو طويلة
  const optimizedMessages = buildConversationContext(request.messages) as LLMMessage[]

  // 5. إرسال للموديل
  let response: LLMResponse

  switch (config.provider) {
    case "together":
      response = await togetherAICall(optimizedMessages, modelTier, config)
      break
    case "grok":
      response = await grokAICall(optimizedMessages, modelTier, config)
      break
    case "openrouter":
      response = await openRouterCall(optimizedMessages, modelTier, config)
      break
    case "local":
      response = await localLLMCall(optimizedMessages, modelTier, config)
      break
    case "zai":
      response = await zaiLLMCall(optimizedMessages, modelTier, request.requestType)
      break
    case "mock":
    default:
      // لو ما في provider مظبوط → نحاول Together AI الأول
      if (config.apiKey) {
        console.warn('[LLM] Provider is mock/default but API key exists, trying Together AI instead')
        try {
          response = await togetherAICall(optimizedMessages, modelTier, {
            ...config,
            provider: 'together',
            baseUrl: config.baseUrl || PROVIDER_BASE_URLS.together,
          })
          break
        } catch (e) {
          console.error('[LLM] Together AI fallback failed:', e)
        }
      }
      response = await mockLLMCall(optimizedMessages, modelTier, request.requestType)
  }

  // 6. تسجيل الكاش
  setCachedResponse(systemPrompt, lastUserMessage, {
    content: response.content,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
    modelTier,
  })

  // 7. تسجيل الاستخدام
  await recordTokenUsage({
    employeeId,
    modelTier,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
    requestType: request.requestType,
    cached: false,
  })

  return response
}

// ============================================
// 0️⃣ ZAI SDK — ذكاء حقيقي فوري (الافتراضي)
// يربط بـ z-ai-web-dev-sdk اللي متوفر بالبيئة
// يعطي ردود ذكية وسياقية حقيقية
// ============================================

async function zaiLLMCall(
  messages: LLMMessage[],
  modelTier: ModelTier,
  requestType: RequestType,
): Promise<LLMResponse> {
  try {
    const zai = await withRetry(() => getZAIInstance(), 1, 500)
    
    if (!zai) {
      console.warn("[LLM] ZAI SDK not available, trying Together AI as fallback")
      const config = getLLMConfig()
      if (config.apiKey) {
        try {
          return await togetherAICall(messages, modelTier, {
            ...config,
            provider: 'together',
            baseUrl: config.baseUrl || PROVIDER_BASE_URLS.together,
          })
        } catch (e) {
          console.error('[LLM] Together AI fallback from ZAI failed:', e)
        }
      }
      return mockLLMCall(messages, modelTier, requestType)
    }

    // تحويل الرسائل لصيغة ZAI
    // ZAI SDK يدعم system role بشكل طبيعي
    const zaiMessages = messages.map(msg => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }))

    const startTime = Date.now()

    // استدعاء مع retry
    const completion = await withRetry(async () => {
      return await zai.chat.completions.create({
        messages: zaiMessages,
        temperature: 0.7,
        max_tokens: 2048,
      })
    }, 2, 1500)

    const content = completion.choices?.[0]?.message?.content ?? ""
    const responseTime = Date.now() - startTime

    if (!content || content.trim().length === 0) {
      console.warn("[LLM] ZAI returned empty response, trying Together AI as fallback")
      const config = getLLMConfig()
      if (config.apiKey) {
        try {
          return await togetherAICall(messages, modelTier, {
            ...config,
            provider: 'together',
            baseUrl: config.baseUrl || PROVIDER_BASE_URLS.together,
          })
        } catch (e) {
          console.error('[LLM] Together AI fallback from empty ZAI failed:', e)
        }
      }
      return mockLLMCall(messages, modelTier, requestType)
    }

    // تقدير التوكنات (ZAI ما بيرجع usage)
    const tokensIn = estimateTokens(messages.map(m => m.content).join(""))
    const tokensOut = estimateTokens(content)

    console.log(`[LLM] ZAI response (${responseTime}ms, ~${tokensIn + tokensOut} tokens)`)

    return {
      content,
      tokensIn,
      tokensOut,
      modelTier,
      cached: false,
      estimatedCost: 0, // ZAI مجاني بالبيئة
    }
  } catch (error) {
    console.error("[LLM] ZAI SDK error after retries:", error)
    // Fallback لـ Together AI لو ZAI فشل
    const config = getLLMConfig()
    if (config.apiKey) {
      try {
        console.warn('[LLM] Trying Together AI as fallback after ZAI error')
        return await togetherAICall(messages, modelTier, {
          ...config,
          provider: 'together',
          baseUrl: config.baseUrl || PROVIDER_BASE_URLS.together,
        })
      } catch (e2) {
        console.error('[LLM] Together AI also failed after ZAI error:', e2)
      }
    }
    return mockLLMCall(messages, modelTier, requestType)
  }
}

// ============================================
// دالة عامة: استدعاء OpenAI-compatible API
// كل المزودين (Together, Grok, OpenRouter, Local)
// بيستخدموا نفس API format
// ============================================
async function openAICompatibleCall(
  messages: LLMMessage[],
  modelTier: ModelTier,
  config: LLMConfig,
  baseUrl: string,
): Promise<LLMResponse> {
  const model = config.models[modelTier]
  const pricing = PROVIDER_PRICING[config.provider] || PROVIDER_PRICING.mock

  console.log(`[LLM] Calling ${config.provider} API with model: ${model}, baseUrl: ${baseUrl}`)

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(config.provider === "openrouter" ? {
        "HTTP-Referer": "https://blivoai.com",
        "X-Title: BlivoAI",
      } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    console.error(`[LLM] ${config.provider} API error (${response.status}): ${errorText}`)
    throw new Error(`LLM API error (${config.provider} ${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const tokensIn = data.usage?.prompt_tokens ?? 0
  const tokensOut = data.usage?.completion_tokens ?? 0
  const content = data.choices[0]?.message?.content ?? ""

  console.log(`[LLM] ${config.provider} response: ${content.length} chars, ${tokensIn + tokensOut} tokens`)

  return {
    content,
    tokensIn,
    tokensOut,
    modelTier,
    cached: false,
    estimatedCost: (tokensIn / 1_000_000) * pricing.input + (tokensOut / 1_000_000) * pricing.output,
  }
}

// ============================================
// 1️⃣ Together AI API
// ============================================
async function togetherAICall(
  messages: LLMMessage[],
  modelTier: ModelTier,
  config: LLMConfig,
): Promise<LLMResponse> {
  const baseUrl = config.baseUrl || PROVIDER_BASE_URLS.together
  return openAICompatibleCall(messages, modelTier, config, baseUrl)
}

// ============================================
// 2️⃣ Grok (xAI) API
// ============================================
async function grokAICall(
  messages: LLMMessage[],
  modelTier: ModelTier,
  config: LLMConfig,
): Promise<LLMResponse> {
  const baseUrl = config.baseUrl || PROVIDER_BASE_URLS.grok
  return openAICompatibleCall(messages, modelTier, config, baseUrl)
}

// ============================================
// 3️⃣ OpenRouter API
// ============================================
async function openRouterCall(
  messages: LLMMessage[],
  modelTier: ModelTier,
  config: LLMConfig,
): Promise<LLMResponse> {
  const baseUrl = config.baseUrl || PROVIDER_BASE_URLS.openrouter
  return openAICompatibleCall(messages, modelTier, config, baseUrl)
}

// ============================================
// 4️⃣ سيرفر GPU محلي
// ============================================
async function localLLMCall(
  messages: LLMMessage[],
  modelTier: ModelTier,
  config: LLMConfig,
): Promise<LLMResponse> {
  const baseUrl = config.baseUrl || PROVIDER_BASE_URLS.local
  
  const model = config.models[modelTier]

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { "Authorization": `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new Error(`Local LLM API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  
  return {
    content: data.choices[0]?.message?.content ?? "",
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
    modelTier,
    cached: false,
    estimatedCost: 0,
  }
}

// ============================================
// 5️⃣ Mock LLM — للـ fallback الأخير
// بيرد ردود ذكية حسب السياق واللهجة
// ============================================

async function mockLLMCall(
  messages: LLMMessage[],
  modelTier: ModelTier,
  requestType: RequestType,
): Promise<LLMResponse> {
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500))

  const systemMsg = messages.find(m => m.role === "system")
  const userMsg = [...messages].reverse().find(m => m.role === "user")
  
  const dialect = extractDialectFromPrompt(systemMsg?.content ?? "")
  const employeeName = extractEmployeeNameFromPrompt(systemMsg?.content ?? "")
  const employeeRole = extractEmployeeRoleFromPrompt(systemMsg?.content ?? "")
  const userMessage = userMsg?.content ?? ""

  const content = generateSmartMockReply(
    userMessage,
    dialect,
    employeeName,
    employeeRole,
    requestType,
  )

  const tokensIn = estimateTokens(messages.map(m => m.content).join(""))
  const tokensOut = estimateTokens(content)

  return {
    content,
    tokensIn,
    tokensOut,
    modelTier,
    cached: false,
    estimatedCost: 0,
  }
}

// ============================================
// توليد رد ذكي بالـ Mock
// ============================================

function generateSmartMockReply(
  userMessage: string,
  dialect: string,
  employeeName: string,
  employeeRole: string,
  requestType: RequestType,
): string {
  const lower = userMessage.toLowerCase()
  
  if (requestType === "SUMMARIZATION") {
    return getDialectReply(dialect, {
      levantine: `عذراً، لم أتمكن من تلخيص الموضوع حالياً بسبب ضغط على النظام. ممكن ترسل النص اللي بدك تلخصو مرة ثانية؟`,
      egyptian: `عذراً، لم أتمكن من تلخيص الموضوع حالياً. ممكن ترسل النص اللي عايز تلخصو مرة تاني؟`,
      gulf: `عذراً، لم أتمكن من تلخيص الموضوع حالياً. ممكن ترسل النص اللي تبي تلخصو مرة ثانية؟`,
      formal: `عذراً، لم أتمكن من التلخيص حالياً. ممكن ترسل النص مرة أخرى؟`,
      english: `Sorry, I couldn't summarize the content right now. Could you send the text again?`,
    })
  }

  if (requestType === "CODE") {
    return getDialectReply(dialect, {
      levantine: `عذراً، لم أتمكن من كتابة الكود حالياً. ممكن تعطني تفاصيل أكتر؟ شو اللغة؟ شو المطلوب بالضبط؟ وبحاول مرة ثانية.`,
      egyptian: `عذراً، لم أتمكن من كتابة الكود حالياً. ممكن تعطني تفاصيل أكتر؟ إيه اللغة؟ إيه المطلوب بالضبط؟`,
      gulf: `عذراً، لم أتمكن من كتابة الكود حالياً. ممكن تعطني تفاصيل أكثر؟ أي لغة؟ وش المطلوب بالضبط؟`,
      formal: `عذراً، لم أتمكن من كتابة الكود حالياً. ممكن تعطني تفاصيل أكثر؟ ما اللغة المطلوبة؟`,
      english: `Sorry, I couldn't write the code right now. Could you give me more details? What language? What's needed exactly?`,
    })
  }

  // طلب بوست/منشور على السوشيال — أهم حالة لأن المستخدم يتوقع نشر فعلي
  if (lower.includes("بوست") || lower.includes("منشور") || lower.includes("نشر") || lower.includes("post") || lower.includes("انستغرام") || lower.includes("انستا") || lower.includes("instagram")) {
    return getDialectReply(dialect, {
      levantine: `⚠️ لأني ما عندي ربط بحساب الانستغرام حالياً، ما أقدر ننشر فعلياً. بس أقدر أجهّزلك محتوى البوست:\n\n**محتوى مقترح:**\n${lower.includes("انستغرام") || lower.includes("انستا") || lower.includes("instagram") ? "منشور انستغرام" : "منشور سوشيال"}\n\nللنشر الفعلي، بدك:\n1. تربط حساب الانستغرام Business بالمنصة\n2. أو تعطيني صلاحية النشر\n\nممكن أساعدك بإعداد المحتوى؟`,
      egyptian: `⚠️ لأني ما عندي ربط بحساب الانستغرام حالياً، ما أقدر ننشر فعلياً. بس أقدر أجهّزلك محتوى البوست.\n\nللنشر الفعلي، محتاج:\n1. ربط حساب الانستغرام Business\n2. أو صلاحية النشر\n\nممكن أساعدك بإعداد المحتوى؟`,
      gulf: `⚠️ لأني ما عندي ربط بحساب الانستغرام حالياً، ما أقدر ننشر فعلياً. بس أقدر أجهّزلك محتوى البوست.\n\nللنشر الفعلي، محتاج:\n1. ربط حساب الانستغرام Business\n2. أو صلاحية النشر\n\nممكن أساعدك بإعداد المحتوى؟`,
      formal: `⚠️ لأنه لا يوجد ربط بحساب الانستغرام حالياً، لا يمكن النشر فعلياً. لكن يمكن إعداد المحتوى.\n\nللنشر الفعلي، يلزم:\n1. ربط حساب انستغرام Business\n2. أو صلاحية النشر\n\nهل تريد إعداد المحتوى؟`,
      english: `⚠️ Since there's no Instagram account connected, I can't actually publish. But I can prepare the post content for you.\n\nTo enable actual posting, you need:\n1. Connect an Instagram Business account\n2. Or grant posting permissions\n\nWould you like me to prepare the content?`,
    })
  }

  if (lower.includes("كود") || lower.includes("برمج") || lower.includes("تطوير") || lower.includes("api") || lower.includes("code")) {
    return getDialectReply(dialect, {
      levantine: `فهمت! بدك مساعدة بالبرمجة. ممكن تعطني تفاصيل أكتر عن المشروع وهل بدك بلغة معينة؟ وبحاول أساعدك بالتفصيل.`,
      egyptian: `فهمت! عايز مساعدة بالبرمجة. ممكن تعطني تفاصيل أكتر عن المشروع وإيه اللغة اللي هتستخدمها؟`,
      gulf: `فهمت! تبي مساعدة بالبرمجة. ممكن تعطني تفاصيل أكثر عن المشروع وأي لغة تبيها؟`,
      formal: `فهمت! أحتاج مساعدة بالبرمجة. ممكن تعطني تفاصيل أكثر عن المشروع واللغة المطلوبة؟`,
      english: `Got it! You need help with coding. Could you give me more details about the project and the language you prefer?`,
    })
  }

  if (lower.includes("تقرير") || lower.includes("أداء") || lower.includes("إحصائ") || lower.includes("report")) {
    return getDialectReply(dialect, {
      levantine: `عذراً، لم أتمكن من إعداد التقرير حالياً. ممكن تحدد شو الأرقام والبيانات اللي بدك تتضمن؟ ومن أي فترة؟`,
      egyptian: `عذراً، لم أتمكن من إعداد التقرير حالياً. ممكن تحدد إيه الأرقام اللي عايزها تتضمن؟ ومن أي فترة؟`,
      gulf: `عذراً، لم أتمكن من إعداد التقرير حالياً. ممكن تحدد أي أرقام تبي تتضمن؟ ومن أي فترة؟`,
      formal: `عذراً، لم أتمكن من إعداد التقرير حالياً. ممكن تحدد الأرقام المطلوبة والفترة؟`,
      english: `Sorry, I couldn't prepare the report right now. Could you specify which metrics and time period you want?`,
    })
  }

  if (lower.includes("فاتور") || lower.includes("مصروف") || lower.includes("ميزان") || lower.includes("invoice")) {
    return getDialectReply(dialect, {
      levantine: `عذراً، لم أتمكن من متابعة الفاتورة حالياً. ممكن تعطني تفاصيل الفاتورة أو المصروف وبسجلو لما النظام يرجع يشتغل عادي.`,
      egyptian: `عذراً، لم أتمكن من متابعة الفاتورة حالياً. ممكن تعطني تفاصيل الفاتورة وهسجلها لما النظام يرجع عادي.`,
      gulf: `عذراً، لم أتمكن من متابعة الفاتورة حالياً. ممكن تعطني تفاصيل الفاتورة وبسجلها لما النظام يشتغل عادي.`,
      formal: `عذراً، لم أتمكن من متابعة الفاتورة حالياً. أعطني تفاصيل الفاتورة لتسجيلها.`,
      english: `Sorry, I couldn't track the invoice right now. Could you give me the invoice details to record later?`,
    })
  }

  if (lower.includes("مشروع") || lower.includes("خطة") || lower.includes("استراتيج") || lower.includes("project")) {
    return getDialectReply(dialect, {
      levantine: `عذراً، لم أتمكن من إعداد خطة المشروع حالياً. ممكن تعطني تفاصيل أكتر عن المشروع — شو الهدف؟ شو الميزانية؟ شو المدة؟ وبحاول أساعدك بالتفصيل.`,
      egyptian: `عذراً، لم أتمكن من إعداد خطة المشروع حالياً. ممكن تعطني تفاصيل أكتر عن المشروع — إيه الهدف؟ إيه الميزانية؟`,
      gulf: `عذراً، لم أتمكن من إعداد خطة المشروع حالياً. ممكن تعطني تفاصيل أكثر — وش الهدف؟ وش الميزانية؟`,
      formal: `عذراً، لم أتمكن من إعداد خطة المشروع حالياً. أعطني تفاصيل أكثر — ما الهدف؟ ما الميزانية؟`,
      english: `Sorry, I couldn't prepare the project plan right now. Could you give me more details — what's the goal? What's the budget?`,
    })
  }

  if (lower.includes("شكر") || lower.includes("ممتاز") || lower.includes("حلو") || lower.includes("أحسنت") || lower.includes("thanks") || lower.includes("great")) {
    return getDialectReply(dialect, {
      levantine: "تسلم! دايماً بالخدمة. لو بدك شي ثاني قولي.",
      egyptian: "شكراً ليك! دايماً في الخدمة. لو عايز حاجة تاني قولي.",
      gulf: "الله يعافيك! دايمًا بالخدمة. لو تبي شي ثاني قللي.",
      formal: "شكراً لك! دائماً في الخدمة. هل تحتاج أي شيء آخر؟",
      english: "You're welcome! Always here to help. Let me know if you need anything else.",
    })
  }

  // رد عام — لا نكذب ونقول "تم" بدون أن نفعل شيئاً
  return getDialectReply(dialect, {
    levantine: `عذراً، لم أتمكن من معالجة طلبك بالكامل حالياً. ممكن تعطني تفاصيل أكتر عن شو بدك بالضبط؟ وبحاول أساعدك بشكل أفضل.`,
    egyptian: `عذراً، لم أتمكن من معالجة طلبك بالكامل حالياً. ممكن تعطني تفاصيل أكتر عن إيه اللي عايزه بالضبط؟`,
    gulf: `عذراً، لم أتمكن من معالجة طلبك بالكامل حالياً. ممكن تعطني تفاصيل أكثر عن وش تبي بالضبط؟`,
    formal: `عذراً، لم أتمكن من معالجة طلبك بالكامل حالياً. أعطني تفاصيل أكثر عن ما تريد بالضبط.`,
    english: `Sorry, I couldn't fully process your request right now. Could you give me more details about what you need?`,
  })
}

function getDialectReply(dialect: string, replies: Record<string, string>): string {
  return replies[dialect] ?? replies.levantine
}

// ============================================
// استخراج معلومات من System Prompt
// ============================================

function extractDialectFromPrompt(prompt: string): string {
  if (prompt.includes("شامي") || prompt.includes("شو") || prompt.includes("هيك")) return "levantine"
  if (prompt.includes("مصري") || prompt.includes("إيه") || prompt.includes("كده")) return "egyptian"
  if (prompt.includes("خليجي") || prompt.includes("وش") || prompt.includes("عشان")) return "gulf"
  if (prompt.includes("عراقي") || prompt.includes("شلون")) return "iraqi"
  if (prompt.includes("مغربي") || prompt.includes("باش")) return "moroccan"
  if (prompt.includes("English") || prompt.includes("communicate in English")) return "english"
  return "formal"
}

function extractEmployeeNameFromPrompt(prompt: string): string {
  const match = prompt.match(/أنت (\S+)/)
  return match?.[1] ?? "الموظف"
}

function extractEmployeeRoleFromPrompt(prompt: string): string {
  const match = prompt.match(/مسماك الوظيفي:\s*(.+?)[.\n]/)
  return match?.[1] ?? "موظف"
}

// ============================================
// فحص هل الـ LLM مربوط فعلاً ولا mock
// ============================================
export function isLLMConnected(): boolean {
  const config = getLLMConfig()
  // zai متصل دائماً (لا يحتاج API key)
  if (config.provider === "zai") return true
  return config.provider !== "mock" && !!config.apiKey
}

// ============================================
// جلب معلومات الـ LLM الحالية (للإعدادات)
// ============================================
export function getLLMStatus(): {
  provider: LLMProvider
  connected: boolean
  models: Record<ModelTier, string>
  pricing: { input: number; output: number }
  providerLabel: string
} {
  const config = getLLMConfig()
  const pricing = PROVIDER_PRICING[config.provider] || PROVIDER_PRICING.mock

  const PROVIDER_LABELS: Record<string, string> = {
    together: "Together AI",
    grok: "Grok (xAI)",
    openrouter: "OpenRouter",
    local: "سيرفر محلي",
    zai: "ZAI SDK (ذكاء حقيقي)",
    mock: "وضع التجربة (Mock)",
  }

  return {
    provider: config.provider,
    connected: isLLMConnected(),
    models: config.models,
    pricing,
    providerLabel: PROVIDER_LABELS[config.provider] ?? config.provider,
  }
}

// ============================================
// اختبار الاتصال بالـ LLM
// ============================================
export async function testLLMConnection(provider: LLMProvider, apiKey: string, baseUrl?: string): Promise<{
  success: boolean
  message: string
  model?: string
  responseTime?: number
}> {
  const startTime = Date.now()

  try {
    // ZAI — اختصار
    if (provider === "zai") {
      try {
        const zai = await getZAIInstance()
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "system", content: "أنت مساعد." },
            { role: "user", content: "قل مرحباً بكلمة واحدة" },
          ],
          temperature: 0,
          max_tokens: 20,
        })
        const reply = completion.choices?.[0]?.message?.content ?? ""
        return {
          success: true,
          message: `الاتصال ناجح! الرد: "${reply.slice(0, 50)}"`,
          model: "zai-default",
          responseTime: Date.now() - startTime,
        }
      } catch (error) {
        return {
          success: false,
          message: `فشل الاتصال بـ ZAI: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
          responseTime: Date.now() - startTime,
        }
      }
    }

    if (provider === "mock") {
      return { success: true, message: "وضع التجربة يعمل", model: "mock", responseTime: 0 }
    }

    const config: LLMConfig = {
      provider,
      apiKey,
      baseUrl,
      models: PROVIDER_MODELS[provider] || PROVIDER_MODELS.mock,
    }

    const apiBaseUrl = baseUrl || PROVIDER_BASE_URLS[provider]

    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(provider === "openrouter" ? {
          "HTTP-Referer": "https://blivoai.com",
          "X-Title: BlivoAI",
        } : {}),
      },
      body: JSON.stringify({
        model: config.models.LIGHT,
        messages: [
          { role: "user", content: "قل مرحباً بكلمة واحدة" },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      return {
        success: false,
        message: `خطأ من API (${response.status}): ${errorText.slice(0, 200)}`,
        responseTime,
      }
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content ?? ""

    return {
      success: true,
      message: `الاتصال ناجح! الرد: "${reply.slice(0, 50)}"`,
      model: config.models.LIGHT,
      responseTime,
    }
  } catch (error) {
    return {
      success: false,
      message: `فشل الاتصال: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
      responseTime: Date.now() - startTime,
    }
  }
}

// ============================================
// دالة مساعدة: جلب مستوى الميزانية
// ============================================

async function getBudgetLevel(companyId: string): Promise<number> {
  try {
    const db = await getDb()
    if (!db) return 0
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { tokenBudgetMonthly: true, tokenUsedMonthly: true, tokenAddOnsPurchased: true, tokenAddOnsUsed: true },
    })
    if (!company) return 0
    const totalBudget = company.tokenBudgetMonthly + company.tokenAddOnsPurchased
    const totalUsed = company.tokenUsedMonthly + company.tokenAddOnsUsed
    if (totalBudget === 0) return 0
    return totalUsed / totalBudget
  } catch {
    return 0
  }
}

// ============================================
// تصدير معلومات المزودين (للواجهة)
// ============================================
export const LLM_PROVIDER_INFO = {
  zai: {
    name: "ZAI SDK",
    nameAr: "ذكاء حقيقي (ZAI)",
    description: "ذكاء اصطناعي حقيقي — يعمل فوراً بدون API Key. الموظف يرد بذكاء ويفهم السياق.",
    pricing: "مجاني",
    signupUrl: "",
    pros: ["يعمل فوراً", "لا يحتاج API Key", "ردود ذكية حقيقية"],
    cons: ["يعتمد على بيئة التشغيل"],
    recommended: true,
  },
  together: {
    name: "Together AI",
    nameAr: "توغيذر AI",
    description: "أرخص خيار + تنوع موديلات كبيرة (Llama, Qwen, DeepSeek)",
    pricing: "$0.088/M tokens",
    signupUrl: "https://together.ai/",
    pros: ["أرخص سعر", "أكثر من 100 موديل", "API سريع"],
    cons: ["الموديلات الكبيرة أغلى"],
    recommended: false,
  },
  grok: {
    name: "Grok (xAI)",
    nameAr: "غروك",
    description: "أذكى بالعربي + شخصية بشرية طبيعية — مثالي للمحادثات",
    pricing: "$0.30/M tokens",
    signupUrl: "https://console.x.ai/",
    pros: ["ممتاز بالعربي", "شخصية بشرية", "فهم سياق قوي"],
    cons: ["أغلى من Together"],
    recommended: false,
  },
  openrouter: {
    name: "OpenRouter",
    nameAr: "أوبن راوتر",
    description: "أسهل إعداد — تجمّع كل المزودين بمكان واحد",
    pricing: "$0.15/M tokens",
    signupUrl: "https://openrouter.ai/",
    pros: ["سهل الإعداد", "موديلات مجانية متوفرة", "تنوع كبير"],
    cons: ["أسعار متفاوتة حسب الموديل"],
    recommended: false,
  },
  local: {
    name: "سيرفر GPU محلي",
    nameAr: "سيرفر محلي",
    description: "مجاني! بس لازم يكون عندك سيرفر GPU",
    pricing: "مجاني",
    signupUrl: "",
    pros: ["مجاني تماماً", "خصوصية كاملة", "بلا حدود"],
    cons: ["يحتاج GPU قوي", "إعداد معقد", "صيانة يدوية"],
    recommended: false,
  },
  mock: {
    name: "وضع التجربة",
    nameAr: "تجربة",
    description: "للتطوير والتجربة بدون API — ردود محدودة",
    pricing: "مجاني",
    signupUrl: "",
    pros: ["مجاني", "ما يحتاج API", "جاهز فوراً"],
    cons: ["ردود محدودة", "مش ذكاء اصطناعي حقيقي"],
    recommended: false,
  },
} as const

export type LLMProviderInfoKey = keyof typeof LLM_PROVIDER_INFO

// ============================================
// Tool Calling — إرسال رسالة مع أدوات للـ LLM
//
// ملاحظة: agent-tools يتم تحميله ديناميكياً فقط على السيرفر
// لأنه يحتوي على imports تعمل فقط على السيرفر (db, z-ai-web-dev-sdk)
// ============================================

export interface ToolCallMessage {
  role: "assistant"
  content: string | null
  tool_calls?: Array<{
    id: string
    type: "function"
    function: {
      name: string
      arguments: string  // JSON string
    }
  }>
}

export interface ToolResultMessage {
  role: "tool"
  tool_call_id: string
  content: string
}

// Extended message type that supports tool calls
export type ExtendedLLMMessage = LLMMessage | ToolCallMessage | ToolResultMessage

export interface LLMToolRequest extends LLMRequest {
  tools?: any[]  // ToolDefinition[] — but dynamic import
  companyId?: string
  employeeId?: string
  maxToolRounds?: number  // Maximum tool call rounds (default: 5)
}

export interface ToolCallLogEntry {
  name: string
  arguments: Record<string, unknown>
  result: any  // ToolCallResult — but dynamic import
}

export interface LLMToolResponse extends LLMResponse {
  toolCalls?: ToolCallLogEntry[]
  totalToolRounds?: number
}

export async function sendToLLMWithTools(
  request: LLMToolRequest,
  companyId: string,
  employeeId: string,
): Promise<LLMToolResponse> {
  // --- Dynamic import of agent-tools (server-only) ---
  const { AVAILABLE_TOOLS, executeTool } = await import("@/lib/agent-tools")

  const config = getLLMConfig()
  const budgetLevel = await getBudgetLevel(companyId)

  const modelTier = request.model ?? selectModelTier(
    request.requestType,
    estimateTokens(request.messages.map(m => m.content).join("")),
    budgetLevel,
  )

  // Tools to send — default to all available tools if not specified
  const tools = request.tools || AVAILABLE_TOOLS
  const maxToolRounds = request.maxToolRounds ?? 5

  // Check token budget
  const { canConsumeTokens } = await import("@/lib/token-manager")
  const canConsume = await canConsumeTokens(companyId, 500)
  if (!canConsume && config.provider !== "mock" && config.provider !== "zai") {
    // لا نرجع لـ mock أبداً — نستمر بالـ LLM الحقيقي بس نسجل تحذير
    console.warn(`[LLM_TOOLS] Token budget low for company ${companyId}, but proceeding with real LLM call`)
  }

  // Build conversation context
  const optimizedMessages = buildConversationContext(request.messages) as LLMMessage[]

  // Track all tool calls made
  const toolCallLog: Array<{
    name: string
    arguments: Record<string, unknown>
    result: any
  }> = []

  // Extended messages list (will grow as tool calls are made)
  const extendedMessages: any[] = [...optimizedMessages]

  let totalTokensIn = 0
  let totalTokensOut = 0
  let totalCost = 0
  let toolRounds = 0
  let finalContent = ""

  // Tool calling loop
  while (toolRounds < maxToolRounds) {
    // Send request to LLM with tools
    let response: LLMToolAPIResponse

    try {
      if (config.provider === "zai") {
        // === ZAI SDK path — use SDK directly with tools ===
        response = await callZAIWithTools(extendedMessages, tools)
      } else {
        // === HTTP API path (Together, Grok, OpenRouter, Local) ===
        response = await callLLMWithTools(extendedMessages, modelTier, config, tools)
      }
    } catch (primaryError) {
      // === Fallback: try ZAI SDK with tools when HTTP provider fails ===
      console.warn(`[LLM_TOOLS] Primary provider (${config.provider}) failed: ${primaryError}. Falling back to ZAI SDK with tools.`)
      try {
        response = await callZAIWithTools(extendedMessages, tools)
      } catch (zaiError) {
        console.error(`[LLM_TOOLS] ZAI fallback also failed: ${zaiError}. Returning empty.`)
        response = { content: "", tokensIn: 0, tokensOut: 0, estimatedCost: 0, toolCalls: [] }
      }
    }

    totalTokensIn += response.tokensIn
    totalTokensOut += response.tokensOut
    totalCost += response.estimatedCost

    // Check if the model wants to call tools
    const toolCalls = response.toolCalls

    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls — the model gave a final text response
      finalContent = response.content
      break
    }

    // Process each tool call
    for (const toolCall of toolCalls) {
      // Parse arguments
      let parsedArgs: Record<string, unknown> = {}
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments)
      } catch {
        parsedArgs = {}
        console.warn(`[LLM_TOOL_CALL] Failed to parse tool arguments: ${toolCall.function.arguments}`)
      }

      // Add the assistant message with tool_calls to the conversation
      extendedMessages.push({
        role: "assistant",
        content: null,
        tool_calls: [toolCall],
      })

      // Execute the tool
      console.log(`[LLM_TOOL_CALL] Executing tool: ${toolCall.function.name} with args: ${JSON.stringify(parsedArgs)}`)

      const toolResult = await executeTool(
        toolCall.function.name,
        parsedArgs,
        companyId,
        employeeId,
        request.requestType,
      )

      // Log the tool call
      toolCallLog.push({
        name: toolCall.function.name,
        arguments: parsedArgs,
        result: toolResult,
      })

      // Add tool result to conversation
      extendedMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult.output,
      })
    }

    toolRounds++
    console.log(`[LLM_TOOL_CALL] Round ${toolRounds} completed. Tools called: ${toolCalls.map(tc => tc.function.name).join(", ")}`)

    // After tool calls, the loop continues — LLM will see the tool results
    // and either call more tools or give a final text response
  }

  // If we exhausted tool rounds without a final text response,
  // make one last call without tools to get a summary
  if (!finalContent && toolRounds >= maxToolRounds) {
    extendedMessages.push({
      role: "user",
      content: "Please provide your final response based on all the information gathered from the tool calls above.",
    })

    let finalResponse: LLMToolAPIResponse
    try {
      if (config.provider === "zai") {
        finalResponse = await callZAIWithTools(extendedMessages, [])
      } else {
        finalResponse = await callLLMWithTools(extendedMessages, modelTier, config, [])
      }
    } catch {
      finalResponse = await callZAIWithTools(extendedMessages, [])
    }
    finalContent = finalResponse.content
    totalTokensIn += finalResponse.tokensIn
    totalTokensOut += finalResponse.tokensOut
    totalCost += finalResponse.estimatedCost
  }

  // If still no content, generate a fallback
  if (!finalContent) {
    finalContent = generateToolCallSummary(toolCallLog)
  }

  // Record token usage
  await recordTokenUsage({
    employeeId,
    modelTier,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    requestType: request.requestType,
    cached: false,
  })

  // Log cache
  const systemPrompt = request.messages.find(m => m.role === "system")?.content ?? ""
  const lastUserMessage = [...request.messages].reverse().find(m => m.role === "user")?.content ?? ""
  setCachedResponse(systemPrompt, lastUserMessage, {
    content: finalContent,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    modelTier,
  })

  return {
    content: finalContent,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    modelTier,
    cached: false,
    estimatedCost: totalCost,
    toolCalls: toolCallLog,
    totalToolRounds: toolRounds,
  }
}

// ============================================
// Call LLM API with tools support
// ============================================

interface LLMToolAPIResponse {
  content: string
  tokensIn: number
  tokensOut: number
  estimatedCost: number
  toolCalls?: Array<{
    id: string
    type: "function"
    function: {
      name: string
      arguments: string
    }
  }>
}

// ============================================
// ZAI SDK Tool Calling — uses SDK directly
// Handles the case where ZAI is the provider
// ============================================

async function callZAIWithTools(
  messages: ExtendedLLMMessage[],
  tools: any[],
): Promise<LLMToolAPIResponse> {
  try {
    const zai = await withRetry(() => getZAIInstance(), 1, 500)

    if (!zai) {
      console.warn("[LLM_TOOL_ZAI] ZAI SDK not available, falling back to regular call without tools")
      const content = "[Tools unavailable] "
      return { content, tokensIn: 0, tokensOut: 0, estimatedCost: 0, toolCalls: [] }
    }

    // Build clean messages for ZAI (filter out tool role messages that ZAI may not support)
    const cleanMessages = messages
      .filter(m => m.role !== "tool" && !(m.role === "assistant" && "tool_calls" in m))
      .map(m => ({
        role: m.role as "system" | "user" | "assistant",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      }))

    // If there were tool calls and results, append a summary message
    const toolResults = messages.filter(m => m.role === "tool")
    if (toolResults.length > 0) {
      const toolSummary = toolResults.map(m => {
        const tcMsg = m as ToolResultMessage
        return `[Tool Result]\n${tcMsg.content}`
      }).join("\n\n")
      cleanMessages.push({
        role: "user",
        content: `Here are the results from the tools I executed:\n\n${toolSummary}\n\nNow please provide your final response based on these results.`,
      })
    }

    const startTime = Date.now()

    // Build request params
    const params: Record<string, unknown> = {
      messages: cleanMessages,
      temperature: 0.7,
      max_tokens: 2048,
    }

    // If we have a previous assistant message with tool_calls, extract the
    // intended tool calls and execute them before this point
    const lastAssistantWithTools = [...messages].reverse().find(m => m.role === "assistant" && "tool_calls" in m)
    
    if (lastAssistantWithTools && "tool_calls" in lastAssistantWithTools) {
      // Tool calls already processed by the loop - just get final response
      // (the tool results were added as user message above)
    } else if (tools.length > 0) {
      // First call with tools — try passing tools to ZAI
      // ZAI SDK may support OpenAI-compatible tools parameter
      try {
        const toolResponse = await zai.chat.completions.create({
          ...params,
          tools: tools,
          tool_choice: "auto",
        } as any)

        const responseTime = Date.now() - startTime
        const choice = toolResponse.choices?.[0]
        const msg = choice?.message
        
        // Check if ZAI returned tool_calls
        const zaiToolCalls = msg?.tool_calls as Array<{
          id: string
          type: "function"
          function: { name: string; arguments: string }
        }> | undefined

        if (zaiToolCalls && zaiToolCalls.length > 0) {
          console.log(`[LLM_TOOL_ZAI] ZAI returned ${zaiToolCalls.length} tool calls (${responseTime}ms)`)
          const tokensIn = estimateTokens(cleanMessages.map(m => m.content).join(""))
          const tokensOut = estimateTokens(msg?.content || "")
          return {
            content: msg?.content || "",
            tokensIn,
            tokensOut,
            estimatedCost: 0,
            toolCalls: zaiToolCalls,
          }
        }

        // No tool calls — return text response
        const content = msg?.content || ""
        const tokensIn = estimateTokens(cleanMessages.map(m => m.content).join(""))
        const tokensOut = estimateTokens(content)
        console.log(`[LLM_TOOL_ZAI] ZAI text response (${responseTime}ms, ~${tokensIn + tokensOut} tokens)`)

        return {
          content,
          tokensIn,
          tokensOut,
          estimatedCost: 0,
          toolCalls: [],
        }
      } catch (toolErr: any) {
        // If ZAI doesn't support tools parameter, fall back to prompt-based approach
        console.warn(`[LLM_TOOL_ZAI] ZAI tools param failed (${toolErr?.message}), using prompt-based tool selection`)
      }
    }

    // Prompt-based tool selection fallback
    // Append tool descriptions to the last user message so the model can "request" tool usage
    if (tools.length > 0 && !toolResults.length) {
      const lastUserIdx = cleanMessages.map(m => m.role).lastIndexOf("user")
      if (lastUserIdx >= 0) {
        const toolDescriptions = tools.map((t: any) => {
          const fn = t.function || t
          const params = fn.parameters?.properties 
            ? Object.entries(fn.parameters.properties).map(([k, v]: [string, any]) => `    - ${k} (${v.type}): ${v.description}`).join("\n") 
            : "    (no parameters)"
          return `- ${fn.name}: ${fn.description}\n  Parameters:\n${params}`
        }).join("\n\n")

        const toolInstruction = `\n\n[AVAILABLE TOOLS - Use them when needed]\nYou have access to the following tools. When you need to use a tool, output EXACTLY this JSON format on a new line:\n{"tool": "tool_name", "arguments": {"param1": "value1"}}\n\nAvailable tools:\n${toolDescriptions}\n\nIMPORTANT: When you need real-time data, web access, or database queries, USE the tools. Do NOT guess or make up information.`

        cleanMessages[lastUserIdx] = {
          ...cleanMessages[lastUserIdx],
          content: cleanMessages[lastUserIdx].content + toolInstruction,
        }
      }
    }

    const completion = await withRetry(async () => {
      return await zai.chat.completions.create({
        messages: cleanMessages,
        temperature: 0.7,
        max_tokens: 2048,
      })
    }, 2, 1500)

    const content = completion.choices?.[0]?.message?.content || ""
    const responseTime = Date.now() - startTime

    // Parse prompt-based tool calls from the response
    const parsedToolCalls = parsePromptBasedToolCalls(content, tools)
    
    const tokensIn = estimateTokens(cleanMessages.map(m => m.content).join(""))
    const tokensOut = estimateTokens(content)
    console.log(`[LLM_TOOL_ZAI] ZAI response (${responseTime}ms, ~${tokensIn + tokensOut} tokens, ${parsedToolCalls.length} prompt-based tool calls)`)

    // If we found prompt-based tool calls, strip them from content and return them
    if (parsedToolCalls.length > 0) {
      // Remove the JSON tool call lines from the content
      const cleanContent = content
        .split("\n")
        .filter((line: string) => {
          const trimmed = line.trim()
          if (trimmed.startsWith('{"tool":') || trimmed.startsWith('{ "tool":')) return false
          return true
        })
        .join("\n")
        .trim()

      return {
        content: cleanContent,
        tokensIn,
        tokensOut,
        estimatedCost: 0,
        toolCalls: parsedToolCalls.map((tc, i) => ({
          id: `zai_tool_${Date.now()}_${i}`,
          type: "function" as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      }
    }

    return {
      content,
      tokensIn,
      tokensOut,
      estimatedCost: 0,
      toolCalls: [],
    }
  } catch (error) {
    console.error("[LLM_TOOL_ZAI] ZAI tool calling error:", error)
    return {
      content: "",
      tokensIn: 0,
      tokensOut: 0,
      estimatedCost: 0,
      toolCalls: [],
    }
  }
}

/**
 * Parse tool calls from LLM text output (prompt-based approach)
 * Looks for JSON patterns like {"tool": "name", "arguments": {...}}
 */
function parsePromptBasedToolCalls(
  content: string,
  tools: any[],
): Array<{ name: string; arguments: Record<string, unknown> }> {
  const results: Array<{ name: string; arguments: Record<string, unknown> }> = []
  const validToolNames = new Set(tools.map((t: any) => (t.function || t).name))

  // Try to find JSON tool call patterns
  const jsonPattern = /\{\s*"tool"\s*:\s*"(\w+)"\s*,\s*"arguments"\s*:\s*(\{[^}]*\})\s*\}/g
  let match: RegExpExecArray | null

  while ((match = jsonPattern.exec(content)) !== null) {
    const toolName = match[1]
    if (validToolNames.has(toolName)) {
      try {
        const args = JSON.parse(match[2])
        results.push({ name: toolName, arguments: args })
      } catch {
        // Try more lenient parse
        try {
          // Handle nested objects
          const fullJson = match[0]
          const parsed = JSON.parse(fullJson)
          if (parsed.tool && parsed.arguments) {
            results.push({ name: parsed.tool, arguments: parsed.arguments })
          }
        } catch {
          console.warn(`[LLM_TOOL_ZAI] Failed to parse tool call arguments for ${toolName}`)
        }
      }
    }
  }

  return results
}

async function callLLMWithTools(
  messages: ExtendedLLMMessage[],
  modelTier: ModelTier,
  config: LLMConfig,
  tools: any[],  // ToolDefinition[] — loaded dynamically
): Promise<LLMToolAPIResponse> {
  const model = config.models[modelTier]
  const pricing = PROVIDER_PRICING[config.provider] || PROVIDER_PRICING.mock
  const baseUrl = config.baseUrl || PROVIDER_BASE_URLS[config.provider] || PROVIDER_BASE_URLS.together

  // Build the request body
  const requestBody: Record<string, unknown> = {
    model,
    messages: messages.map(m => {
      // Clean messages for API format
      if (m.role === "tool") {
        return {
          role: "tool",
          tool_call_id: (m as ToolResultMessage).tool_call_id,
          content: (m as ToolResultMessage).content,
        }
      }
      if (m.role === "assistant" && "tool_calls" in m) {
        const tcMsg = m as ToolCallMessage
        return {
          role: "assistant",
          content: tcMsg.content || null,
          tool_calls: tcMsg.tool_calls,
        }
      }
      // Regular message
      return {
        role: m.role as "system" | "user" | "assistant",
        content: m.content || "",
      }
    }),
    max_tokens: 2048,
    temperature: 0.7,
  }

  // Add tools if provided
  if (tools.length > 0) {
    requestBody.tools = tools
    requestBody.tool_choice = "auto"  // Let the model decide when to call tools
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(config.provider === "openrouter" ? {
        "HTTP-Referer": "https://blivoai.com",
        "X-Title: BlivoAI",
      } : {}),
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    // If tool calling fails, try without tools as fallback
    console.warn(`[LLM_TOOL_CALL] API error with tools (${response.status}): ${errorText}. Falling back to regular call.`)

    // Fallback: send without tools
    const fallbackResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.filter(m => m.role !== "tool" && !("tool_calls" in m)).map(m => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content || "",
        })),
        max_tokens: 2048,
        temperature: 0.7,
      }),
    })

    if (!fallbackResponse.ok) {
      throw new Error(`LLM API error (${config.provider} ${fallbackResponse.status})`)
    }

    const fallbackData = await fallbackResponse.json()
    const tokensIn = fallbackData.usage?.prompt_tokens ?? 0
    const tokensOut = fallbackData.usage?.completion_tokens ?? 0

    return {
      content: fallbackData.choices[0]?.message?.content ?? "",
      tokensIn,
      tokensOut,
      estimatedCost: (tokensIn / 1_000_000) * pricing.input + (tokensOut / 1_000_000) * pricing.output,
      toolCalls: [],  // No tool calls in fallback
    }
  }

  const data = await response.json()
  const tokensIn = data.usage?.prompt_tokens ?? 0
  const tokensOut = data.usage?.completion_tokens ?? 0

  // Check for tool calls in the response
  const choice = data.choices?.[0]
  const assistantMessage = choice?.message

  const responseToolCalls = assistantMessage?.tool_calls as Array<{
    id: string
    type: "function"
    function: { name: string; arguments: string }
  }> | undefined

  const content = assistantMessage?.content ?? ""

  return {
    content,
    tokensIn,
    tokensOut,
    estimatedCost: (tokensIn / 1_000_000) * pricing.input + (tokensOut / 1_000_000) * pricing.output,
    toolCalls: responseToolCalls,
  }
}

// ============================================
// Generate summary from tool call results
// (used when LLM doesn't give final text)
// ============================================

function generateToolCallSummary(
  toolCallLog: ToolCallLogEntry[]
): string {
  if (toolCallLog.length === 0) {
    return "I processed your request but couldn't find specific results. Let me know what else you need."
  }

  const summaries = toolCallLog.map(tc => {
    const status = tc.result.success ? "✅" : "❌"
    return `${status} **${tc.name}**: ${tc.result.output.slice(0, 500)}`
  }).join("\n\n")

  return `Based on the information I gathered:\n\n${summaries}\n\nPlease let me know if you need any more details or have further questions.`
}
