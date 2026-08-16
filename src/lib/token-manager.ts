// ============================================
// نظام إدارة التوكنات الذكي (Token Manager) — النسخة الكاملة
//
// المشكلة: موظف مبرمج ممكن يسحب توكن بالهبل = خسارة
// الحل: إدارة ذكية بدون حدود قاسية:
//
// 1. اشتراكات متدرجة (Subscription Plans):
//    - FREE_TRIAL: 500K token/شهر + 2 موظفين
//    - STARTER: 3M token/شهر + 5 موظفين ($29/شهر)
//    - PROFESSIONAL: 15M token/شهر + 15 موظفين ($79/شهر)
//    - ENTERPRISE: 50M token/شهر + غير محدود ($199/شهر)
//
// 2. شحن توكنات (Token Add-ons):
//    - لو خلصت الميزانية → يشحن توكنات إضافية
//    - التوكنات الإضافية ما بتنتهي بالشهر — بتفضل لحد ما تخلص
//
// 3. نموذج متدرج (Model Tiering):
//    - مهمة بسيطة → LIGHT (0.05$/M token)
//    - مهمة عادية → MEDIUM (0.88$/M token)
//    - مهمة معقدة → HEAVY (5$/M token)
//
// 4. ميزانية قسمية (Department Budget):
//    - كل قسم له نسبة من ميزانية الشركة
//    - قسم البرمجة مثلاً ممكن ياخد 40% لأنو بيسحب أكتر
//
// 5. تنبيهات ذكية:
//    - 70% → تنبيه أولي
//    - 85% → تنبيه + تفعيل التوفير التلقائي
//    - 100% → تنبيه حرج + اقتراح شحن
//    - لو في add-ons → يشتغل عادي من الإضافات
// ============================================

import { db } from "@/lib/db"
import { SUBSCRIPTION_PLANS, TOKEN_ADD_ON_PACKAGES } from "@/lib/subscription-plans"
import { getPlanFromDB } from "@/lib/plan-db"
import { sendTokenUsageAlertEmail } from "@/lib/email-service"
import type { ModelTier, RequestType, SubscriptionPlan, TokenBudgetInfo } from "@/types"

// --- أسعار الموديلات (لكل مليون token) ---
const MODEL_PRICING: Record<ModelTier, { input: number; output: number }> = {
  LIGHT:  { input: 0.05, output: 0.10 },   // مثلاً: Llama 3.1 8B
  MEDIUM: { input: 0.88, output: 0.88 },    // مثلاً: Llama 3.1 70B
  HEAVY:  { input: 3.00, output: 5.00 },    // مثلاً: Llama 3.1 405B
}

// --- عتبات التنبيهات ---
const ALERT_THRESHOLDS = {
  EARLY_WARNING: 0.70,
  WARNING: 0.85,
  CRITICAL: 1.00,
  AUTO_OPTIMIZE: 0.85,
} as const

// --- كاش تنبيهات التوكنات (منع إرسال أكثر من إيميل للشركة نفسها) ---
const tokenAlertSent = new Map<string, number>() // companyId -> timestamp
const ALERT_COOLDOWN = 24 * 60 * 60 * 1000 // 24 ساعة بين التنبيهات

// --- دالة تنسيق الأرقام الكبيرة ---
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

// --- كاش الردود ---
interface CacheEntry {
  content: string
  tokensIn: number
  tokensOut: number
  modelTier: ModelTier
  createdAt: number
}

const responseCache = new Map<string, CacheEntry>()
const CACHE_TTL = 1000 * 60 * 30 // 30 دقيقة
const CACHE_MAX_SIZE = 1000

// --- تنظيف الكاش ---
function cleanCache() {
  const now = Date.now()
  for (const [key, entry] of responseCache) {
    if (now - entry.createdAt > CACHE_TTL) {
      responseCache.delete(key)
    }
  }
  if (responseCache.size > CACHE_MAX_SIZE) {
    const entries = [...responseCache.entries()]
      .sort((a, b) => a[1].createdAt - b[1].createdAt)
    const toDelete = entries.slice(0, entries.length - CACHE_MAX_SIZE)
    for (const [key] of toDelete) {
      responseCache.delete(key)
    }
  }
}

// ============================================
// الدالة الرئيسية: اختيار الموديل المناسب
// ============================================
export function selectModelTier(
  requestType: RequestType,
  messageLength: number,
  budgetLevel: number, // 0-1 (نسبة الاستخدام الحالية)
): ModelTier {
  // لو الميزانية عالية (>85%) → استخدم موديل أخف
  if (budgetLevel >= ALERT_THRESHOLDS.AUTO_OPTIMIZE) {
    if (requestType === "CHAT" && messageLength < 200) return "LIGHT"
    if (requestType === "SUMMARIZATION") return "LIGHT"
    return "MEDIUM"
  }

  // اختيار عادي حسب نوع الطلب
  switch (requestType) {
    case "CHAT":
      return messageLength < 100 ? "LIGHT" : "MEDIUM"
    case "SUMMARIZATION":
      return "LIGHT"
    case "TRANSLATION":
      return "LIGHT"
    case "CODE":
      return "HEAVY"  // الكود لازم يكون دقيق
    case "ANALYSIS":
      return "HEAVY"
    case "GENERATION":
      return "MEDIUM"
    default:
      return "MEDIUM"
  }
}

// ============================================
// دالة الكاش — فحص لو الجواب مخزّن
// ============================================
export function getCachedResponse(
  systemPrompt: string,
  message: string,
): CacheEntry | null {
  cleanCache()
  const key = generateCacheKey(systemPrompt, message)
  return responseCache.get(key) ?? null
}

export function setCachedResponse(
  systemPrompt: string,
  message: string,
  entry: Omit<CacheEntry, "createdAt">,
): void {
  const key = generateCacheKey(systemPrompt, message)
  responseCache.set(key, { ...entry, createdAt: Date.now() })
}

function generateCacheKey(systemPrompt: string, message: string): string {
  const combined = `${systemPrompt.slice(0, 200)}|${message.slice(0, 500)}`
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}

// ============================================
// تلخيص المحادثة (Smart Summarization)
// ============================================
export function shouldSummarizeConversation(
  messageCount: number,
  estimatedTokens: number,
): boolean {
  return messageCount > 10 || estimatedTokens > 4000
}

export function buildConversationContext(
  messages: Array<{ role: string; content: string }>,
  maxRecentMessages: number = 6,
): Array<{ role: string; content: string }> {
  if (messages.length <= maxRecentMessages + 2) {
    return messages
  }

  const oldMessages = messages.slice(0, messages.length - maxRecentMessages)
  const recentMessages = messages.slice(messages.length - maxRecentMessages)
  const summary = summarizeMessages(oldMessages)

  return [
    { role: "system", content: `[ملخص المحادثة السابقة]: ${summary}` },
    ...recentMessages,
  ]
}

function summarizeMessages(
  messages: Array<{ role: string; content: string }>,
): string {
  const parts = messages.map(m => {
    const prefix = m.role === "user" ? "المدير" : "الموظف"
    const content = m.content.length > 100 ? m.content.slice(0, 100) + "..." : m.content
    return `${prefix}: ${content}`
  })
  return parts.join(" | ")
}

// ============================================
// حساب التكلفة التقريبية
// ============================================
export function estimateCost(
  tokensIn: number,
  tokensOut: number,
  modelTier: ModelTier,
): number {
  const pricing = MODEL_PRICING[modelTier]
  const inputCost = (tokensIn / 1_000_000) * pricing.input
  const outputCost = (tokensOut / 1_000_000) * pricing.output
  return Number((inputCost + outputCost).toFixed(6))
}

// ============================================
// تسجيل استخدام التوكنات في قاعدة البيانات
// ============================================
export async function recordTokenUsage(params: {
  employeeId: string
  modelTier: ModelTier
  tokensIn: number
  tokensOut: number
  requestType: RequestType
  conversationId?: string
  cached: boolean
}): Promise<void> {
  const totalTokens = params.tokensIn + params.tokensOut
  const estimatedCost = estimateCost(params.tokensIn, params.tokensOut, params.modelTier)

  // حفظ سجل الاستخدام — نتجاهل الأخطاء (مثلاً: chatbot ليس موظف حقيقي)
  try {
    await db.tokenUsage.create({
      data: {
        employeeId: params.employeeId,
        modelTier: params.modelTier,
        tokensIn: params.tokensIn,
        tokensOut: params.tokensOut,
        totalTokens,
        requestType: params.requestType,
        conversationId: params.conversationId,
        estimatedCost,
        cached: params.cached,
      },
    })
  } catch (dbError) {
    console.warn("[TOKEN_RECORDING_WARNING] Failed to record token usage for:", params.employeeId, dbError instanceof Error ? dbError.message : dbError)
  }

  // تحديث ميزانية الشركة
  const employee = await db.employee.findUnique({
    where: { id: params.employeeId },
    select: { companyId: true },
  }).catch(() => null)
  if (employee) {
    const company = await db.company.findUnique({
      where: { id: employee.companyId },
      select: { tokenBudgetMonthly: true, tokenUsedMonthly: true, tokenAddOnsPurchased: true, tokenAddOnsUsed: true, subscription: true, name: true, ownerId: true },
    })
    if (!company) return

    // خصم من الميزانية الشهرية أولاً
    const newUsed = company.tokenUsedMonthly + totalTokens
    if (newUsed <= company.tokenBudgetMonthly) {
      await db.company.update({
        where: { id: employee.companyId },
        data: { tokenUsedMonthly: newUsed },
      })
    } else {
      const overflow = newUsed - company.tokenBudgetMonthly
      await db.company.update({
        where: { id: employee.companyId },
        data: {
          tokenUsedMonthly: company.tokenBudgetMonthly,
          tokenAddOnsUsed: company.tokenAddOnsUsed + overflow,
        },
      })
    }

    // === تنبيه 80% توكنات ===
    const effectiveTotal = company.tokenBudgetMonthly + company.tokenAddOnsPurchased
    const finalMonthlyUsed = Math.min(newUsed, company.tokenBudgetMonthly)
    const effectiveUsed = finalMonthlyUsed + company.tokenAddOnsUsed
    const percentUsed = effectiveTotal > 0 ? effectiveUsed / effectiveTotal : 0

    if (percentUsed >= 0.80 && percentUsed < 1.0) {
      const lastSent = tokenAlertSent.get(employee.companyId) || 0
      const now = Date.now()
      if (now - lastSent > ALERT_COOLDOWN) {
        tokenAlertSent.set(employee.companyId, now)
        const owner = await db.user.findUnique({ where: { id: company.ownerId } })
        if (owner) {
          const planInfo = await getPlanFromDB(company.subscription)
          sendTokenUsageAlertEmail(owner.email, owner.name, {
            companyName: company.name,
            percentUsed,
            tokensUsed: formatTokens(effectiveUsed),
            tokensTotal: formatTokens(effectiveTotal),
            tokensRemaining: formatTokens(Math.max(0, effectiveTotal - effectiveUsed)),
            planName: planInfo?.nameAr,
          }, "ar").then((sent) => {
            if (sent) console.log("[TOKEN_ALERT] 80% alert sent to", owner.email, "for", company.name)
            else console.error("[TOKEN_ALERT] Failed to send to", owner.email)
          })
        }
      }
    }
  }
}

// ============================================
// فحص هل الشركة تقدر تستهلك توكنات
// (الميزانية الشهرية + الإضافات)
// ============================================
export async function canConsumeTokens(companyId: string, estimatedTokens: number = 1000): Promise<boolean> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      tokenBudgetMonthly: true,
      tokenUsedMonthly: true,
      tokenAddOnsPurchased: true,
      tokenAddOnsUsed: true,
    },
  })
  if (!company) return false

  const monthlyRemaining = Math.max(0, company.tokenBudgetMonthly - company.tokenUsedMonthly)
  const addOnsRemaining = Math.max(0, company.tokenAddOnsPurchased - company.tokenAddOnsUsed)
  const totalRemaining = monthlyRemaining + addOnsRemaining

  return totalRemaining >= estimatedTokens
}

// ============================================
// جلب معلومات الميزانية الكاملة
// ============================================
export async function getTokenBudgetInfo(companyId: string): Promise<TokenBudgetInfo> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      departments: true,
      employees: { where: { status: "ACTIVE" } },
    },
  })

  if (!company) {
    return {
      monthly: 0,
      used: 0,
      remaining: 0,
      addOnsPurchased: 0,
      addOnsUsed: 0,
      addOnsRemaining: 0,
      totalRemaining: 0,
      percentUsed: 0,
      alertLevel: "depleted",
      subscription: "FREE_TRIAL",
      canOperate: false,
      byDepartment: {},
      byEmployee: {},
    }
  }

  // إعادة تعيين الميزانية لو خلص الشهر
  const now = new Date()
  const resetDate = new Date(company.tokenBudgetResetAt)
  const monthsDiff = (now.getFullYear() - resetDate.getFullYear()) * 12 + (now.getMonth() - resetDate.getMonth())
  
  if (monthsDiff >= 1) {
    await db.company.update({
      where: { id: companyId },
      data: {
        tokenUsedMonthly: 0,
        tokenBudgetResetAt: now,
      },
    })
    company.tokenUsedMonthly = 0
  }

  const monthly = company.tokenBudgetMonthly
  const used = company.tokenUsedMonthly
  const monthlyRemaining = Math.max(0, monthly - used)
  const addOnsPurchased = company.tokenAddOnsPurchased
  const addOnsUsed = company.tokenAddOnsUsed
  const addOnsRemaining = Math.max(0, addOnsPurchased - addOnsUsed)
  const totalRemaining = monthlyRemaining + addOnsRemaining
  const effectiveTotal = monthly + addOnsPurchased
  const effectiveUsed = used + addOnsUsed
  const percentUsed = effectiveTotal > 0 ? effectiveUsed / effectiveTotal : 0

  let alertLevel: TokenBudgetInfo["alertLevel"] = "normal"
  if (totalRemaining === 0) alertLevel = "depleted"
  else if (percentUsed >= ALERT_THRESHOLDS.CRITICAL) alertLevel = "critical"
  else if (percentUsed >= ALERT_THRESHOLDS.WARNING) alertLevel = "warning"

  const canOperate = totalRemaining > 0

  // حساب حسب القسم
  const byDepartment: TokenBudgetInfo["byDepartment"] = {}
  for (const dept of company.departments) {
    const deptBudget = dept.tokenBudgetPercent > 0
      ? Math.floor(monthly * (dept.tokenBudgetPercent / 100))
      : 0

    const deptEmployeeIds = company.employees
      .filter(e => e.departmentId === dept.id)
      .map(e => e.id)

    let deptUsed = 0
    if (deptEmployeeIds.length > 0) {
      const usages = await db.tokenUsage.findMany({
        where: {
          employeeId: { in: deptEmployeeIds },
          createdAt: { gte: company.tokenBudgetResetAt },
        },
        select: { totalTokens: true },
      })
      deptUsed = usages.reduce((sum, u) => sum + u.totalTokens, 0)
    }

    byDepartment[dept.id] = {
      name: dept.name,
      color: dept.color,
      budget: deptBudget,
      used: deptUsed,
      remaining: Math.max(0, deptBudget - deptUsed),
      percentUsed: deptBudget > 0 ? deptUsed / deptBudget : (monthly > 0 ? deptUsed / monthly : 0),
    }
  }

  // حساب حسب الموظف
  const byEmployee: TokenBudgetInfo["byEmployee"] = {}
  for (const emp of company.employees) {
    const usages = await db.tokenUsage.findMany({
      where: {
        employeeId: emp.id,
        createdAt: { gte: company.tokenBudgetResetAt },
      },
      select: { totalTokens: true },
    })
    const empUsed = usages.reduce((sum, u) => sum + u.totalTokens, 0)
    byEmployee[emp.id] = {
      name: emp.name,
      role: emp.role,
      used: empUsed,
      percentOfTotal: effectiveTotal > 0 ? empUsed / effectiveTotal : 0,
    }
  }

  return {
    monthly,
    used,
    remaining: monthlyRemaining,
    addOnsPurchased,
    addOnsUsed,
    addOnsRemaining,
    totalRemaining,
    percentUsed,
    alertLevel,
    subscription: company.subscription as SubscriptionPlan,
    canOperate,
    byDepartment,
    byEmployee,
  }
}

// ============================================
// شحن توكنات إضافية
// ============================================
export async function purchaseTokenAddOn(companyId: string, tokens: number): Promise<TokenBudgetInfo> {
  await db.company.update({
    where: { id: companyId },
    data: {
      tokenAddOnsPurchased: { increment: tokens },
    },
  })

  // تسجيل الحدث
  await db.auditLog.create({
    data: {
      companyId,
      action: "token_addon_purchased",
      actorType: "USER",
      details: JSON.stringify({ tokensPurchased: tokens }),
    },
  })

  return getTokenBudgetInfo(companyId)
}

// ============================================
// تحديث خطة الاشتراك
// ============================================
export async function updateSubscription(
  companyId: string,
  plan: SubscriptionPlan,
): Promise<TokenBudgetInfo> {
  const planInfo = await getPlanFromDB(plan)
  
  await db.company.update({
    where: { id: companyId },
    data: {
      subscription: plan,
      tokenBudgetMonthly: planInfo.tokenBudget,
      subscriptionStartAt: new Date(),
      subscriptionEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم
    },
  })

  // تسجيل الحدث
  await db.auditLog.create({
    data: {
      companyId,
      action: "subscription_updated",
      actorType: "USER",
      details: JSON.stringify({ plan, tokenBudget: planInfo.tokenBudget }),
    },
  })

  return getTokenBudgetInfo(companyId)
}

// ============================================
// دالة مساعدة: تقدير عدد التوكنات
// ============================================
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3)
}
