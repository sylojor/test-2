// ============================================
// نظام الوكيل الذكي (Agent Executor)
//
// الفكرة:
// - الموظف يشتغل بوضع مجاني عادي (ردود محلية)
// - لما يحتاج ذكاء حقيقي → الوكيل ينفتح
// - الوكيل يشتغل (يستدعي LLM) → يرجع نتيجة
// - السيرفر يراجع النتيجة:
//   - إذا منيحة → يمشي ويوصل للمشترك كأنه الموظف عملو
//   - إذا مش منيحة → يعطيه ملاحظات ويعيد المحاولة
// - السيرفر يطفي الوكيل بعد ما يخلص
// - المشترك ما يشوف هاد الحكي أبداً
//   يشوف: "الموظف عم يشتغل" → "خلص! هاد النتيجة"
// ============================================

import { db } from "@/lib/db"
import { sendToLLM } from "@/lib/llm-service"
import { sendToLLMWithTools } from "@/lib/llm-service"
import type { RequestType, ModelTier, LLMMessage } from "@/types"

// ============================================
// أنواع
// ============================================

interface AgentTask {
  employeeId: string
  companyId: string
  taskType: RequestType
  taskTitle: string
  taskInput: string
  systemPrompt?: string
  conversationHistory?: LLMMessage[]
  preferredTier?: ModelTier
  maxAttempts?: number
}

interface AgentResult {
  success: boolean
  output: string
  sessionId: string
  tokensUsed: number
  cost: number
  attempts: number
  approved: boolean
  // معلومات داخلية — المشترك ما يشوفها
  _internal: {
    agentOutput: string
    reviewResult: string
    reviewNote?: string
    wasRevised: boolean
  }
}

// ============================================
// الدالة الرئيسية: تنفيذ مهمة بالوكيل الذكي
// ============================================

export async function executeAgentTask(task: AgentTask): Promise<AgentResult> {
  const maxAttempts = task.maxAttempts ?? 3

  // 1. إنشاء جلسة وكيل
  const session = await db.agentSession.create({
    data: {
      employeeId: task.employeeId,
      companyId: task.companyId,
      taskType: task.taskType,
      taskTitle: task.taskTitle,
      taskInput: task.taskInput,
      maxAttempts,
      status: "SPAWNING",
      startedAt: new Date(),
    },
  })

  try {
    let currentAttempt = 1
    let lastAgentOutput = ""
    let lastReviewNote = ""
    let totalTokensIn = 0
    let totalTokensOut = 0
    let totalCost = 0
    let approved = false
    let reviewResult = ""
    let wasRevised = false

    // 2. اختيار موديل LLM مناسب
    const llmModel = await selectModelForTask(task.taskType, task.preferredTier)

    // 3. حلقة العمل: وكيل → مراجعة → تعديل
    while (currentAttempt <= maxAttempts && !approved) {
      // --- المرحلة A: الوكيل يشتغل ---
      await db.agentSession.update({
        where: { id: session.id },
        data: { 
          status: currentAttempt === 1 ? "RUNNING" : "REVISION",
          attempt: currentAttempt,
          llmModelId: llmModel?.id,
        },
      })

      // بناء رسائل الوكيل
      const agentMessages = buildAgentMessages(
        task,
        lastAgentOutput,
        lastReviewNote,
        currentAttempt,
      )

      // استدعاء LLM مع أدوات (tool calling)
      // الموظف يستخدم الأدوات عشان يخدم المشترك فعلياً
      const llmResponse = await sendToLLMWithTools(
        {
          messages: agentMessages,
          model: task.preferredTier ?? "MEDIUM",
          requestType: task.taskType,
          maxTokens: 4096,
          maxToolRounds: 5,  // Maximum 5 rounds of tool calls
        },
        task.companyId,
        task.employeeId,
      )

      lastAgentOutput = llmResponse.content
      totalTokensIn += llmResponse.tokensIn
      totalTokensOut += llmResponse.tokensOut
      totalCost += llmResponse.estimatedCost

      // لو في استدعاءات أدوات — نسجلها بالجلسة
      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        const toolSummary = llmResponse.toolCalls.map(tc =>
          `${tc.name}(${JSON.stringify(tc.arguments).slice(0, 100)}) → ${tc.result.success ? "✅" : "❌"}`
        ).join(", ")
        console.log(`[AGENT_EXECUTOR] Tool calls in round ${currentAttempt}: ${toolSummary}`)
      }

      // تحديث جلسة بنتيجة الوكيل
      await db.agentSession.update({
        where: { id: session.id },
        data: {
          status: "REVIEWING",
          agentOutput: lastAgentOutput,
          agentTokensIn: totalTokensIn,
          agentTokensOut: totalTokensOut,
          totalTokensIn,
          totalTokensOut,
          totalCost,
        },
      })

      // --- المرحلة B: السيرفر يراجع النتيجة ---
      const review = await reviewAgentOutput(
        task.taskInput,
        lastAgentOutput,
        task.taskType,
        task.companyId,
        task.employeeId,
      )

      reviewResult = review.result
      lastReviewNote = review.note ?? ""

      await db.agentSession.update({
        where: { id: session.id },
        data: {
          reviewResult,
          reviewNote: lastReviewNote,
        },
      })

      if (review.result === "APPROVED") {
        approved = true
      } else if (review.result === "NEEDS_REVISION") {
        wasRevised = true
        currentAttempt++
      } else {
        // REJECTED — لا نعيد
        break
      }
    }

    // 4. النتيجة النهائية
    const finalOutput = approved
      ? formatOutputForUser(lastAgentOutput, task.taskType)
      : formatFallbackOutput(task)

    // تحديث الموديل إحصائيات
    if (llmModel) {
      await db.lLMModel.update({
        where: { id: llmModel.id },
        data: {
          totalCalls: { increment: 1 },
          totalTokensIn: { increment: totalTokensIn },
          totalTokensOut: { increment: totalTokensOut },
          totalCost: { increment: totalCost },
          lastUsedAt: new Date(),
        },
      })
    }

    // إغلاق الجلسة
    await db.agentSession.update({
      where: { id: session.id },
      data: {
        status: approved ? "COMPLETED" : "FAILED",
        finalOutput,
        completedAt: new Date(),
        totalTokensIn,
        totalTokensOut,
        totalCost,
      },
    })

    return {
      success: approved,
      output: finalOutput,
      sessionId: session.id,
      tokensUsed: totalTokensIn + totalTokensOut,
      cost: totalCost,
      attempts: currentAttempt,
      approved,
      _internal: {
        agentOutput: lastAgentOutput,
        reviewResult,
        reviewNote: lastReviewNote,
        wasRevised,
      },
    }
  } catch (error) {
    // خطأ → نحاول نقدم رد بديل
    console.error("[AGENT_EXECUTOR_ERROR]", error)

    await db.agentSession.update({
      where: { id: session.id },
      data: {
        status: "FAILED",
        finalOutput: formatFallbackOutput(task),
        completedAt: new Date(),
      },
    })

    return {
      success: false,
      output: formatFallbackOutput(task),
      sessionId: session.id,
      tokensUsed: 0,
      cost: 0,
      attempts: 0,
      approved: false,
      _internal: {
        agentOutput: "",
        reviewResult: "ERROR",
        reviewNote: error instanceof Error ? error.message : "Unknown error",
        wasRevised: false,
      },
    }
  }
}

// ============================================
// اختيار موديل LLM مناسب للمهمة
// ============================================

async function selectModelForTask(
  taskType: RequestType,
  preferredTier?: ModelTier,
) {
  try {
    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (preferredTier) {
      where.tier = preferredTier
    }

    // حسب نوع المهمة
    const capabilityMap: Record<string, string> = {
      CHAT: "CHAT",
      CODE: "CODE",
      ANALYSIS: "ANALYSIS",
      GENERATION: "GENERATION",
      SUMMARIZATION: "SUMMARIZATION",
      TRANSLATION: "TRANSLATION",
    }

    // جلب الموديلات المناسبة
    const models = await db.lLMModel.findMany({
      where,
      orderBy: [{ priority: "asc" }, { isDefault: "desc" }],
      take: 5,
    })

    // فلترة حسب القدرات
    const taskCapability = capabilityMap[taskType]
    if (taskCapability) {
      const matching = models.filter(m => {
        if (!m.capabilities) return true // لو ما عندو قدرات محددة = يشتغل لكل شي
        try {
          const caps = JSON.parse(m.capabilities)
          return Array.isArray(caps) && caps.includes(taskCapability)
        } catch {
          return true
        }
      })
      if (matching.length > 0) return matching[0]
    }

    // fallback: أول موديل متاح
    return models[0] ?? null
  } catch {
    return null
  }
}

// ============================================
// بناء رسائل الوكيل
// ============================================

function buildAgentMessages(
  task: AgentTask,
  previousOutput: string,
  reviewNote: string,
  attempt: number,
): LLMMessage[] {
  const messages: LLMMessage[] = []

  // System prompt — محسّن مع تعليمات واضحة عن الأدوات
  const systemPrompt = task.systemPrompt || 
    `أنت موظف محترف في شركة. مسماك الوظيفي: ${task.taskTitle}.

قواعد أساسية:
1. أجب بلغة واضحة ومهنية
2. لا تذكر أنك ذكاء اصطناعي أو وكيل — أنت موظف حقيقي
3. استخدم الأدوات المتاحة لتنفيذ المهام فعلياً
4. إذا لم تتمكن من تنفيذ مهمة لأنه ينقصك شيء (بيانات، صلاحيات، حسابات)، أخبر المستخدم صراحة ما الذي يحتاجه
5. لا تقل "تم" أو "خلصت" إلا إذا نفذت المهمة فعلياً
6. إذا طلبت مهمة تحتاج حساب أو ربط (مثل نشر على انستغرام)، تحقق من وجود الربط أولاً باستخدام أداة social_media_post
7. قدّم نتيجة ملموسة — محتوى جاهز، تقرير، خطة، كود — وليس مجرد وعد بالتنفيذ

أدواتك المتاحة:
- web_search: البحث في الإنترنت
- web_fetch: قراءة صفحة ويب
- api_request: استدعاء APIs خارجية
- db_query: استعلام قاعدة البيانات
- send_email: إرسال إيميل
- calculate: حسابات رياضية
- notify_user: إرسال إشعار
- manage_account: إدارة حسابات
- file_read: قراءة ملفات
- ssh_command: تنفيذ أوامر على سيرفر
- social_media_post: نشر على السوشيال ميديا
- ssh_deploy: نشر مشروع على سيرفر

مهم: استخدم الأدوات فعلياً! لا تكتفِ بالقول أنك ستنفذ — نفّذ.`

  messages.push({ role: "system", content: systemPrompt })

  // سياق المحادثة (لو موجود)
  if (task.conversationHistory && task.conversationHistory.length > 0) {
    // نضيف آخر 10 رسائل فقط
    const recent = task.conversationHistory.slice(-10)
    for (const msg of recent) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push(msg)
      }
    }
  }

  // المهمة
  messages.push({ 
    role: "user", 
    content: task.taskInput,
  })

  // لو في محاولة سابقة + ملاحظات مراجعة
  if (attempt > 1 && previousOutput && reviewNote) {
    messages.push({
      role: "assistant",
      content: previousOutput,
    })
    messages.push({
      role: "user",
      content: `المشرف: النتيجة السابقة تحتاج تعديل. الملاحظات: ${reviewNote}\n\nأعد المحاولة مع مراعاة الملاحظات.`,
    })
  }

  return messages
}

// ============================================
// مراجعة نتيجة الوكيل
// السيرفر يشوف: هل النتيجة منيحة؟
// ============================================

async function reviewAgentOutput(
  originalInput: string,
  agentOutput: string,
  taskType: RequestType,
  companyId: string,
  employeeId: string,
): Promise<{ result: "APPROVED" | "REJECTED" | "NEEDS_REVISION"; note?: string }> {
  // --- قواعد المراجعة السريعة (بدون LLM) ---
  
  // 1. هل في رد أصلاً؟
  if (!agentOutput || agentOutput.trim().length === 0) {
    return { result: "NEEDS_REVISION", note: "الرد فارغ — حاول مرة ثانية" }
  }

  // 2. هل الرد قصير كتير؟ (أقل من 10 حروف)
  if (agentOutput.trim().length < 10) {
    return { result: "NEEDS_REVISION", note: "الرد قصير كتير — قدّم رد مفصل أكتر" }
  }

  // 3. هل يذكر إنه AI أو وكيل؟ (ممنوع!)
  const forbiddenPhrases = [
    "أنا ذكاء اصطناعي",
    "أنا وكيل",
    "كوكيل",
    "AI agent",
    "I am an AI",
    "as an AI",
    "language model",
    "نموذج لغوي",
  ]
  const lowerOutput = agentOutput.toLowerCase()
  for (const phrase of forbiddenPhrases) {
    if (lowerOutput.includes(phrase.toLowerCase())) {
      return { 
        result: "NEEDS_REVISION", 
        note: "لا تذكر أنك ذكاء اصطناعي أو وكيل — أنت موظف حقيقي" 
      }
    }
  }

  // 4. فحص الردود العامة الفارغة (بدون محتوى فعلي)
  const emptyPhrases = [
    "بشتغل عليه",
    "هشتغل عليه",
    "بشتغل على",
    "خليني أجهّز",
    "خليني جهّز",
    "بيرجعلك",
    "وبيرجعلك",
    "وبعطيك النتيجة",
    "وبعطيك",
    "بجهزلك",
    "بجهّز",
    "سأعمل على",
    "سأقوم ب",
  ]
  // لو الرد قصير وفيه عبارة فارغة → رفض
  if (agentOutput.trim().length < 150) {
    for (const phrase of emptyPhrases) {
      if (agentOutput.includes(phrase)) {
        return { 
          result: "NEEDS_REVISION", 
          note: "الرد مجرد وعد بالتنفيذ بدون نتيجة فعلي — نفّذ المهمة أو اشرح شو تحتاج بالتفصيل" 
        }
      }
    }
  }

  // 5. فحص أساسي حسب نوع المهمة
  if (taskType === "CODE") {
    // مهمة كود — هل في كود بالرد؟
    if (!agentOutput.includes("```") && !agentOutput.includes("function") && !agentOutput.includes("const ") && !agentOutput.includes("def ")) {
      return { result: "NEEDS_REVISION", note: "المهمة تحتاج كود — أضف الكود المطلوب" }
    }
  }

  if (taskType === "ANALYSIS") {
    // تحليل — هل في نقاط أو بيانات؟
    if (!agentOutput.includes("•") && !agentOutput.includes("-") && !agentOutput.includes(":") && !agentOutput.includes("1.")) {
      return { result: "NEEDS_REVISION", note: "التحليل يحتاج نقاط مفصلة أو بيانات" }
    }
  }

  // 6. فحص الردود المتكررة — لو الرد نفسو يتكرر
  if (originalInput.trim().length > 20 && agentOutput.trim().length < 80) {
    // الرد قصير كتير بالنسبة لطلب طويل — غالباً رد ثابت
    return { result: "NEEDS_REVISION", note: "الرد قصير كتير — اشرح بالتفصيل شو عملت أو شو تحتاج" }
  }

  // 7. مراجعة بالـ LLM (اختياري — بس للمهام المعقدة)
  // للـ MVP بنعتمد على القواعد فقط
  // مستقبلاً: يمكن استدعاء LLM مراجعة

  // كل شي تمام — موافقة
  return { result: "APPROVED" }
}

// ============================================
// تنسيق النتيجة للمستخدم
// المشترك يشوف هاد — كأنه الموظف عملو
// ============================================

function formatOutputForUser(rawOutput: string, taskType: RequestType): string {
  // إزالة أي علامات داخلية
  let output = rawOutput
  
  // إزالة أسطر "أنا موظف ذكي" أو أي تعريف داخلي
  output = output.replace(/بصفتي موظف ذكي[:]?\s*/gi, "")
  output = output.replace(/كموظف في الشركة[:]?\s*/gi, "")
  
  return output.trim()
}

function formatFallbackOutput(task: AgentTask): string {
  // رد بديل لما الوكيل يفشل — يوضح للمستخدم شو يحتاج بدل ما يقول "تم"
  const fallbacks: Record<string, string> = {
    CHAT: "عذراً، لم أتمكن من معالجة طلبك بالكامل حالياً. ممكن تعطني تفاصيل أكتر عن شو بدك بالضبط؟ أو جرب تطلب مرة ثانية.",
    GENERATION: "لم أتمكن من تجهيز المحتوى المطلوب حالياً. ممكن تعطني تفاصيل أكتر؟ مثلاً: شو الموضوع؟ لشو بدك المحتوى؟ شو النغمة اللي بدك إياها؟",
    ANALYSIS: "لم أتمكن من إعداد التحليل حالياً. ممكن تحدد شو البيانات اللي بدك تحللها؟ ومن أي فترة؟",
    CODE: "لم أتمكن من كتابة الكود حالياً. ممكن تعطني تفاصيل أكتر عن المشروع؟ شو اللغة؟ شو المطلوب بالضبط؟",
    SUMMARIZATION: "لم أتمكن من التلخيص حالياً. ممكن ترسل النص أو الموضوع اللي بدك تلخصو؟",
    TRANSLATION: "لم أتمكن من الترجمة حالياً. ممكن ترسل النص اللي بدك تترجمو؟",
    OTHER: "لم أتمكن من تنفيذ المطلوب حالياً. ممكن تعطني تفاصيل أكتر عن شو بدك؟",
  }
  return fallbacks[task.taskType] ?? fallbacks.OTHER
}

// ============================================
// جلب حالة الوكيل النشط (للمونيتور الداخلي)
// مش للمشترك — لصاحب المنصة بس
// ============================================

export async function getActiveAgentSessions(companyId?: string) {
  try {
    const where: Record<string, unknown> = {
      status: { in: ["SPAWNING", "RUNNING", "REVIEWING", "REVISION"] },
    }
    if (companyId) where.companyId = companyId

    return await db.agentSession.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
        llmModel: {
          select: { id: true, name: true, provider: true, modelId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  } catch {
    return []
  }
}

// ============================================
// إحصائيات الوكلاء (لصاحب المنصة)
// ============================================

export async function getAgentStats() {
  try {
    const [total, completed, failed, active] = await Promise.all([
      db.agentSession.count(),
      db.agentSession.count({ where: { status: "COMPLETED" } }),
      db.agentSession.count({ where: { status: "FAILED" } }),
      db.agentSession.count({ where: { status: { in: ["SPAWNING", "RUNNING", "REVIEWING", "REVISION"] } } }),
    ])

    const tokenStats = await db.agentSession.aggregate({
      _sum: { totalTokensIn: true, totalTokensOut: true, totalCost: true },
    })

    return {
      total,
      completed,
      failed,
      active,
      totalTokensIn: tokenStats._sum.totalTokensIn ?? 0,
      totalTokensOut: tokenStats._sum.totalTokensOut ?? 0,
      totalCost: tokenStats._sum.totalCost ?? 0,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  } catch {
    return {
      total: 0, completed: 0, failed: 0, active: 0,
      totalTokensIn: 0, totalTokensOut: 0, totalCost: 0, successRate: 0,
    }
  }
}
