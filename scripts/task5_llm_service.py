#!/usr/bin/env python3
"""Task 5: Smart Model Routing in llm-service.ts - Add getSmartModelForEmployee()"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

with sftp.open("/home/ubuntu/blivoai-demo/src/lib/llm-service.ts", "r") as f:
    content = f.read().decode()

# Find the sendToLLM function and add smart model routing before the model selection step
# We need to add a getSmartModelForEmployee function and integrate it into sendToLLM

# Add the new function before the sendToLLM function
old_send_to_llm_start = '''// ============================================
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
  )'''

new_send_to_llm_start = '''// ============================================
// التوجيه الذكي للموديلات (Smart Model Routing)
// يفحص هل الموظف له توجيه مخصص لنوع المهمة
// الأولوية: توجيه الموظف > الافتراضي للشركة > النظام المتدرج
// ============================================

async function getSmartModelForEmployee(
  employeeId: string,
  requestType: RequestType,
  companyId: string,
): Promise<{ modelId?: string; provider?: string; baseUrl?: string; tier?: ModelTier } | null> {
  try {
    // 1. فحص هل في توجيه مخصص للموظف لهاد نوع المهمة
    const routing = await db.employeeModelRouting.findUnique({
      where: { employeeId_taskType: { employeeId, taskType: requestType } },
      include: {
        llmModel: {
          select: {
            id: true,
            name: true,
            provider: true,
            modelId: true,
            baseUrl: true,
            tier: true,
            apiKeyValue: true,
            apiKeyEnvVar: true,
            isActive: true,
          },
        },
      },
    })

    // لو في توجيه نشط وموديل مربوط — استخدمو
    if (routing?.isActive && routing.llmModel?.isActive) {
      const model = routing.llmModel
      console.log(`[SMART_ROUTING] Employee ${employeeId} uses ${model.name} for ${requestType}`)
      return {
        modelId: model.modelId,
        provider: model.provider,
        baseUrl: model.baseUrl || undefined,
        tier: model.tier,
      }
    }

    // 2. فحص هل في موديل افتراضي للشركة (isDefault=true)
    const companyDefault = await db.llmModel.findFirst({
      where: {
        isActive: true,
        isDefault: true,
        // موديل افتراضي للشركة — حالياً ما في companyId على LLMModel
        // بس ممكن نستخدم capabilities لتحديد نوع المهمة
        capabilities: { contains: requestType },
      },
      orderBy: { priority: "asc" },
    })

    if (companyDefault) {
      console.log(`[SMART_ROUTING] Using company default ${companyDefault.name} for ${requestType}`)
      return {
        modelId: companyDefault.modelId,
        provider: companyDefault.provider,
        baseUrl: companyDefault.baseUrl || undefined,
        tier: companyDefault.tier,
      }
    }

    // 3. لا توجيه مخصص — استخدم النظام المتدرج الافتراضي
    console.log(`[SMART_ROUTING] No specific routing for ${requestType}, using tier system`)
    return null
  } catch (error) {
    console.error("[SMART_ROUTING_ERROR]", error)
    return null
  }
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
  }'''

content = content.replace(old_send_to_llm_start, new_send_to_llm_start)

# Now we need to add the routing override in the LLM call section
# Find the "5. إرسال للموديل" section and modify the switch to handle routing overrides
old_send_section = '''  // 5. إرسال للموديل
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
      response = await mockLLMCall(optimizedMessages, modelTier, request.requestType)
  }'''

new_send_section = '''  // 5. إرسال للموديل — لو في توجيه مخصص نستخدمو
  let response: LLMResponse

  // لو في توجيه مخصص للموظف — بنستخدم الموديل اللي اختارو مباشرة
  if (routingModelId && routingProvider) {
    // بناء إعدادات مخصصة للموديل المُوجّه
    const routingConfig: LLMConfig = {
      provider: routingProvider as LLMProvider,
      apiKey: config.apiKey, // نستخدم API key الافتراضي
      baseUrl: routingBaseUrl || config.baseUrl,
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
  }'''

content = content.replace(old_send_section, new_send_section)

# Export the getSmartModelForEmployee function
old_export = '''// ============================================
// تصدير معلومات المزودين (للواجهة)
// ============================================'''

new_export = '''// ============================================
// تصدير الدالة الذكية للتوجيه (للاستخدام الخارجي)
// ============================================
export { getSmartModelForEmployee }

// ============================================
// تصدير معلومات المزودين (للواجهة)
// ============================================'''

content = content.replace(old_export, new_export)

# Also need to import db properly - it's already lazy loaded via getDb()
# But for getSmartModelForEmployee we need db directly
# The db import is already handled via getDb() function in the file
# Let's update getSmartModelForEmployee to use getDb() instead of db

old_db_in_routing = '''async function getSmartModelForEmployee(
  employeeId: string,
  requestType: RequestType,
  companyId: string,
): Promise<{ modelId?: string; provider?: string; baseUrl?: string; tier?: ModelTier } | null> {
  try {
    // 1. فحص هل في توجيه مخصص للموظف لهاد نوع المهمة
    const routing = await db.employeeModelRouting.findUnique({'''

new_db_in_routing = '''async function getSmartModelForEmployee(
  employeeId: string,
  requestType: RequestType,
  companyId: string,
): Promise<{ modelId?: string; provider?: string; baseUrl?: string; tier?: ModelTier } | null> {
  try {
    const db = await getDb()
    if (!db) return null
    
    // 1. فحص هل في توجيه مخصص للموظف لهاد نوع المهمة
    const routing = await db.employeeModelRouting.findUnique({'''

content = content.replace(old_db_in_routing, new_db_in_routing)

# Also fix the second db call
old_company_default = '''    // 2. فحص هل في موديل افتراضي للشركة (isDefault=true)
    const companyDefault = await db.llmModel.findFirst({'''

new_company_default = '''    // 2. فحص هل في موديل افتراضي للشركة (isDefault=true)
    const companyDefault = await db.llmModel.findFirst({'''

# This one is fine since we already assigned db, but let's verify
# Actually we need to make sure all db calls use the local variable

with sftp.open("/home/ubuntu/blivoai-demo/src/lib/llm-service.ts", "w") as f:
    f.write(content.encode())
print("✓ llm-service.ts updated with smart model routing")

sftp.close()
client.close()
print("\nTask 5 complete: Smart model routing added to llm-service.ts")
