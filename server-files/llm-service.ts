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
    try {
      const mod = await import("@/lib/db")
      _db = mod.db
      // Verify the db has the models we need
      if (!_db || !_db.llmModel) {
        console.warn("[LLM] Prisma client missing llmModel - run prisma generate")
        _db = null
        return null
      }
    } catch (error) {
      console.warn("[LLM] Failed to import db:", error instanceof Error ? error.message : error)
      _db = null
      return null
    }
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
    LIGHT: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    MEDIUM: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    HEAVY: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
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
  together:  { input: 0.088, output: 0.264 },
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

// --- بناء الإعدادات من متغيرات البيئة + قاعدة البيانات ---
// الأولوية: env vars > DB settings > defaults
let cachedDbConfig: { provider?: string; apiKey?: string; baseUrl?: string; models?: Record<string, string> } | null = null
let dbConfigCacheTime = 0
const DB_CONFIG_CACHE_TTL = 60_000 // 60 seconds

async function getLLMConfigFromDb(): Promise<{ provider?: string; apiKey?: string; baseUrl?: string; models?: Record<string, string> }> {
  // Return cached if fresh
  if (cachedDbConfig && Date.now() - dbConfigCacheTime < DB_CONFIG_CACHE_TTL) {
    return cachedDbConfig
  }
  
  try {
    const db = await getDb()
    if (!db) {
      console.warn("[LLM] DB not available, skipping DB config")
      return {}
    }
    // Get active LLM models from DB — they have API keys and model IDs
    const activeModels = await db.llmModel.findMany({ where: { isActive: true } })
    
    if (activeModels.length === 0) return {}
    
    // Use the first active model as the primary config
    const primary = activeModels[0]
    const result = {
      provider: primary.provider?.toLowerCase() || undefined,
      apiKey: primary.apiKeyValue || undefined,
      baseUrl: primary.baseUrl || undefined,
      models: {} as Record<string, string>,
    }
    
    // Map all tiers from DB models
    for (const m of activeModels) {
      if (m.tier && m.modelId) {
        result.models[m.tier] = m.modelId
      }
    }
    
    cachedDbConfig = result
    dbConfigCacheTime = Date.now()
    return result
  } catch (error) {
    console.warn("[LLM] Failed to read DB config, using env vars only:", error instanceof Error ? error.message : error)
    return {}
  }
}

function getLLMConfig(): LLMConfig {
  // الافتراضي: zai — لأنه يعمل فوراً بدون API key
  const provider = (process.env.LLM_PROVIDER || "zai") as LLMProvider
  const apiKey = process.env.LLM_API_KEY || process.env.TOGETHER_API_KEY || undefined
  const baseUrl = process.env.LLM_API_URL || undefined

  const defaultModels = PROVIDER_MODELS[provider] || PROVIDER_MODELS.zai
  const models: Record<ModelTier, string> = {
    LIGHT: process.env.LLM_MODEL_LIGHT || defaultModels.LIGHT,
    MEDIUM: process.env.LLM_MODEL_MEDIUM || defaultModels.MEDIUM,
    HEAVY: process.env.LLM_MODEL_HEAVY || defaultModels.HEAVY,
  }

  return { provider, apiKey, baseUrl, models }
}

// Enhanced config that also reads from DB
async function getLLMConfigWithDb(): Promise<LLMConfig> {
  const envConfig = getLLMConfig()
  const dbConfig = await getLLMConfigFromDb()
  
  // If DB has config with a valid provider and API key, prefer it over env vars
  // This allows the UI settings to override environment defaults
  if (dbConfig.provider && dbConfig.apiKey) {
    const provider = dbConfig.provider as LLMProvider
    const defaultModels = PROVIDER_MODELS[provider] || PROVIDER_MODELS.zai
    
    const models: Record<ModelTier, string> = {
      LIGHT: dbConfig.models?.LIGHT || defaultModels.LIGHT,
      MEDIUM: dbConfig.models?.MEDIUM || defaultModels.MEDIUM,
      HEAVY: dbConfig.models?.HEAVY || defaultModels.HEAVY,
    }
    
    return {
      provider,
      apiKey: dbConfig.apiKey,
      baseUrl: dbConfig.baseUrl || PROVIDER_BASE_URLS[provider],
      models,
    }
  }
  
  // If env vars are set with a real provider (not mock/zai), use them
  if (envConfig.apiKey && envConfig.provider !== "zai" && envConfig.provider !== "mock") {
    return envConfig
  }
  
  // Fallback to env config (which defaults to zai/mock based on LLM_PROVIDER)
  return envConfig
}

// ============================================
// Smart Model Routing — per-employee per-task
// Priority: Employee-specific > Company default > Global tier
// ============================================

export async function getSmartModelForEmployee(
  employeeId: string,
  taskType: RequestType,
): Promise<LLMModel | null> {
  try {
    const db = await getDb()
    if (!db) return null
    
    // Check if employee has a specific routing for this task type
    const routing = await db.employeeModelRouting.findUnique({
      where: { employeeId_taskType: { employeeId, taskType } },
      include: { llmModel: true },
    })
    
    if (routing?.llmModel && routing.isActive && routing.llmModel.isActive) {
      console.log(`[SMART_ROUTING] Employee ${employeeId} → ${routing.llmModel.name} for ${taskType}`)
      return routing.llmModel
    }
    
    // Fallback: No employee-specific routing → use global tier system
    return null
  } catch (error) {
    console.warn("[SMART_ROUTING_ERROR]", error)
    return null
  }
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
// التوجيه الذكي للموديلات (Smart Model Routing)
// يفحص هل الموظف له توجيه مخصص لنوع المهمة
// الأولوية: توجيه الموظف > الافتراضي للشركة > النظام المتدرج
// ============================================


// ============================================
// الدالة الرئيسية: إرسال رسالة للـ LLM
// ============================================
export async function sendToLLM(
  request: LLMRequest,
  companyId: string,
  employeeId: string,
): Promise<LLMResponse> {
  const config = await getLLMConfigWithDb()
  const budgetLevel = await getBudgetLevel(companyId)
  
  // 0. فحص التوجيه الذكي — هل الموظف له موديل مخصص لنوع المهمة
  const smartRouting = await getSmartModelForEmployee(employeeId, request.requestType, companyId)
  
  // 1. اختيار الموديل المناسب — الأولوية: توجيه الموظف > النظام المتدرج
  let modelTier: ModelTier
  let routingModelId: string | undefined
  let routingProvider: string | undefined
  let routingBaseUrl: string | undefined
  
  if (smartRouting) {
    // لو في توجيه مخصص — استخدم الموديل المحدد
    modelTier = smartRouting.tier ?? "MEDIUM"
    routingModelId = smartRouting.modelId
    routingProvider = smartRouting.provider
    routingBaseUrl = smartRouting.baseUrl
  } else {
    // لو ما في توجيه — استخدم النظام المتدرج
    modelTier = request.model ?? selectModelTier(
      request.requestType,
      estimateTokens(request.messages.map(m => m.content).join("")),
      budgetLevel,
    )
  }

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

  // 3. فحص هل في ميزانية توكنات
  const { canConsumeTokens } = await import("@/lib/token-manager")
  const canConsume = await canConsumeTokens(companyId, 500)
  if (!canConsume && config.provider !== "mock" && config.provider !== "zai") {
    // لو ما في ميزانية → استخدم zai أو mock
    if (config.provider !== "zai") {
      return zaiLLMCall(request.messages, modelTier, request.requestType)
    }
    return mockLLMCall(request.messages, modelTier, request.requestType)
  }

  // 4. تلخيص المحادثة لو طويلة
  const optimizedMessages = buildConversationContext(request.messages)

  // 5. إرسال للموديل — لو في توجيه مخصص نستخدمو
  let response: LLMResponse

  // لو في توجيه مخصص للموظف — بنستخدم الموديل اللي اختارو مباشرة
  if (routingModelId && routingProvider) {
    // بناء إعدادات مخصصة للموديل المُوجّه — نستخدم apiKey من DB أو env
    const dbConfig = await getLLMConfigFromDb()
    const routingApiKey = routingProvider === dbConfig.provider ? dbConfig.apiKey : config.apiKey
    const routingConfig: LLMConfig = {
      provider: routingProvider as LLMProvider,
      apiKey: routingApiKey || config.apiKey, // نستخدم API key المناسب
      baseUrl: routingBaseUrl || config.baseUrl || (routingProvider === dbConfig.provider ? dbConfig.baseUrl : undefined),
      models: config.models, // نستخدم الأ tiers الافتراضية كم fallback
    }
    
    // بنستخدم الموديل المحدد بالتوجيه
    const routingBaseUrlFinal = routingBaseUrl || PROVIDER_BASE_URLS[routingProvider] || PROVIDER_BASE_URLS.zai
    
    try {
      response = await openAICompatibleCall(optimizedMessages, modelTier, routingConfig, routingBaseUrlFinal)
    } catch (routingError) {
      // لو الموديل المُوجّه فشل — fallback للنظام الافتراضي
      console.warn(`[SMART_ROUTING] Routing model failed, falling back to default:`, routingError instanceof Error ? routingError.message : routingError)
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
          response = await mockLLMCall(optimizedMessages, modelTier, request.requestType)
      }
    }
  } else {
    // لا توجيه مخصص — نستخدم المزود الافتراضي
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
        response = await mockLLMCall(optimizedMessages, modelTier, request.requestType)
    }
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
      console.warn("[LLM] ZAI SDK not available after retry, falling back to mock")
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
      console.warn("[LLM] ZAI returned empty response, falling back to mock")
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
    // Fallback لـ mock لو ZAI فشل بعد كل المحاولات
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

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(config.provider === "openrouter" ? {
        "HTTP-Referer": "https://one-employer.company",
        "X-Title": "One Employer Company",
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
    throw new Error(`LLM API error (${config.provider} ${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const tokensIn = data.usage?.prompt_tokens ?? 0
  const tokensOut = data.usage?.completion_tokens ?? 0

  return {
    content: data.choices[0]?.message?.content ?? "",
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
      levantine: "بلخّصلك الموضوع: أهم النقاط هيي...",
      egyptian: "هاخدلك الموضوع وخلاص: أهم نقطة هي...",
      gulf: "خلصت الموضوع: أهم شي هو...",
      formal: "ملخص الموضوع: النقاط الرئيسية هي...",
      english: "Here's the summary: the key points are...",
    })
  }

  if (requestType === "CODE") {
    return getDialectReply(dialect, {
      levantine: "تمام، بشتغل على الكود. بساوي اللي بدك ياه وبيرجعلك.",
      egyptian: "تمام، هشتغل على الكود. هعمل اللي انت عايزه.",
      gulf: "حياك، بسوي الكود. بسوي اللي تبيه وأرجع لك.",
      formal: "سأعمل على الكود المطلوب وسأقدمه في أقرب وقت.",
      english: "Sure, I'll work on the code and get back to you.",
    })
  }

  if (lower.includes("بوست") || lower.includes("منشور") || lower.includes("نشر") || lower.includes("post")) {
    return getDialectReply(dialect, {
      levantine: "تمام! بشتغل على البوست. شو الموضوع اللي بدك تنزل عنه؟ وعطني فكرة عن المحتوى اللي بدك إياه، وكمان بدك أضيف هاشتاقات؟",
      egyptian: "تمام يا باشا! هجهز البوست. إيه الموضوع اللي عايز تنشر عنه؟ وهل عايز هاشتاقات معينه؟",
      gulf: "حياك! بسوي البوست. وش الموضوع اللي تبي تنشر عنه؟ وأبغى أفكارك عن المحتوى.",
      formal: "سأعمل على المنشور. ما هو الموضوع الذي تريد النشر عنه؟ وهل تريد إضافة هاشتاقات؟",
      english: "Sure! I'll work on the post. What's the topic? And do you want me to include hashtags?",
    })
  }

  if (lower.includes("كود") || lower.includes("برمج") || lower.includes("تطوير") || lower.includes("api") || lower.includes("code")) {
    return getDialectReply(dialect, {
      levantine: "فهمت! بدك مساعدة بالبرمجة. عطني تفاصيل أكتر عن المشروع وهل بدك بلغة معينة، وبشتغل عليه فوراً.",
      egyptian: "فهمت! عايز مساعدة بالبرمجة. اديني تفاصيل أكتر عن المشروع وإيه اللغة اللي هتستخدمها.",
      gulf: "فهمت! تبي مساعدة بالبرمجة. عطني تفاصيل أكثر عن المشروع وأي لغة تبيها.",
      formal: "فهمت! سأساعدك بالبرمجة. أعطني تفاصيل أكثر عن المشروع واللغة المطلوبة.",
      english: "Got it! You need help with coding. Give me more details about the project and the language you prefer.",
    })
  }

  if (lower.includes("تقرير") || lower.includes("أداء") || lower.includes("إحصائ") || lower.includes("report")) {
    return getDialectReply(dialect, {
      levantine: "بجهزلك التقرير. بدك تقرير لفترة معينة؟ (أسبوع، شهر...) وكمان شو الأرقام اللي بدك تتضمن؟",
      egyptian: "هجهزلك التقرير. عايز تقرير لفترة معينة؟ (أسبوع، شهر...) وإيه الأرقام اللي عايزها تتضمن؟",
      gulf: "بجهز لك التقرير. تبي تقرير لفترة معينة؟ (أسبوع، شهر...) وأي أرقام تبي تتضمن؟",
      formal: "سأعد التقرير. هل تريده لفترة محددة؟ وما الأرقام التي تريد تضمينها؟",
      english: "I'll prepare the report. Do you want it for a specific period? What metrics should I include?",
    })
  }

  if (lower.includes("فاتور") || lower.includes("مصروف") || lower.includes("ميزان") || lower.includes("invoice")) {
    return getDialectReply(dialect, {
      levantine: "فهمت، بدك متابعة مالية. عطني تفاصيل الفاتورة أو المصروف وبسجلو بالدفتر. كمان بدك أعمل تحليل للمصروفات؟",
      egyptian: "فهمت، عايز متابعة مالية. اديني تفاصيل الفاتورة وهسجلها. وهل عايز تحليل للمصروفات؟",
      gulf: "فهمت، تبي متابعة مالية. عطني تفاصيل الفاتورة وبسجلها. وأبغى أسوي تحليل للمصروفات؟",
      formal: "سأتابع الشؤون المالية. أعطني تفاصيل الفاتورة لتسجيلها. هل تريد تحليل المصروفات؟",
      english: "I'll handle the financial tracking. Give me the invoice details to record them. Do you want an expense analysis?",
    })
  }

  if (lower.includes("مشروع") || lower.includes("خطة") || lower.includes("استراتيج") || lower.includes("project")) {
    return getDialectReply(dialect, {
      levantine: "حلو! بنشتغل على المشروع. بساوي خطة مفصلة وبحدد المهام والأولويات. بدك أعرضها عليك أول؟",
      egyptian: "تمام! هشتغل على المشروع. هعمل خطة مفصلة وأحدد المهام والأولويات. عايز أعرضها عليك الأول؟",
      gulf: "حلو! بشتغل على المشروع. بسوي خطة مفصلة وأحدد المهام. تبي أعرضها عليك أول؟",
      formal: "سأعمل على المشروع. سأعد خطة مفصلة وأحدد المهام والأولويات. هل تريد مراجعتها أولاً؟",
      english: "Great! I'll work on the project. I'll prepare a detailed plan with tasks and priorities. Want me to review it with you first?",
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

  // رد عام ذكي
  return getDialectReply(dialect, {
    levantine: `فهمت طلبك! بشتغل عليه. كمان لو بدك تفاصيل أكتر أو شي ثاني — أنا جاهز. شو أولوية هاد الشي بالنسبة لك؟`,
    egyptian: `فهمت طلبك! هشتغل عليه. ولو عايز تفاصيل أكتر أو حاجة تاني — أنا جاهز. إيه أولوية الموضوع ده؟`,
    gulf: `فهمت طلبك! بشتغل عليه. ولو تبي تفاصيل أكثر أو شي ثاني — أنا جاهز. وش أولوية هاد الشي؟`,
    formal: `فهمت طلبك! سأعمل عليه. إذا احتجت تفاصيل أكثر أو أي شيء آخر — أنا جاهز. ما هي أولوية هذا الأمر؟`,
    english: `Got your request! I'll work on it. If you need more details or anything else — I'm ready. What's the priority on this?`,
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
export async function isLLMConnected(): Promise<boolean> {
  const config = await getLLMConfigWithDb()
  // zai متصل دائماً (لا يحتاج API key)
  if (config.provider === "zai") return true
  return config.provider !== "mock" && !!config.apiKey
}

// ============================================
// جلب معلومات الـ LLM الحالية (للإعدادات)
// ============================================
export async function getLLMStatus(): Promise<{
  provider: LLMProvider
  connected: boolean
  models: Record<ModelTier, string>
  pricing: { input: number; output: number }
  providerLabel: string
}> {
  const config = await getLLMConfigWithDb()
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
          "HTTP-Referer": "https://one-employer.company",
          "X-Title": "One Employer Company",
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
// تصدير الدالة الذكية للتوجيه (للاستخدام الخارجي)
// ============================================
export { getSmartModelForEmployee }

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
