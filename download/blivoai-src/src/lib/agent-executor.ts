// ============================================
// Agent Executor — BlivoAI Smart Agent System
// ============================================

import { db } from "@/lib/db"
import { sendToLLM } from "@/lib/llm-service"
import { sendToLLMWithTools } from "@/lib/llm-service"
import type { RequestType, ModelTier, LLMMessage } from "@/types"

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
  language?: string
}

interface AgentResult {
  success: boolean
  output: string
  sessionId: string
  tokensUsed: number
  cost: number
  attempts: number
  approved: boolean
  _internal: {
    agentOutput: string
    reviewResult: string
    reviewNote?: string
    wasRevised: boolean
  }
}

export async function executeAgentTask(task: AgentTask): Promise<AgentResult> {
  const maxAttempts = task.maxAttempts ?? 3

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

    const llmModel = await selectModelForTask(task.taskType, task.preferredTier)

    while (currentAttempt <= maxAttempts && !approved) {
      await db.agentSession.update({
        where: { id: session.id },
        data: {
          status: currentAttempt === 1 ? "RUNNING" : "REVISION",
          attempt: currentAttempt,
          llmModelId: llmModel?.id,
        },
      })

      const agentMessages = buildAgentMessages(
        task,
        lastAgentOutput,
        lastReviewNote,
        currentAttempt,
      )

      const llmResponse = await sendToLLMWithTools(
        {
          messages: agentMessages,
          model: task.preferredTier ?? "MEDIUM",
          requestType: task.taskType,
          maxTokens: 4096,
          maxToolRounds: 5,
        },
        task.companyId,
        task.employeeId,
      )

      lastAgentOutput = llmResponse.content
      totalTokensIn += llmResponse.tokensIn
      totalTokensOut += llmResponse.tokensOut
      totalCost += llmResponse.estimatedCost

      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        const toolSummary = llmResponse.toolCalls.map(tc =>
          `${tc.name}(${JSON.stringify(tc.arguments).slice(0, 100)})`
        ).join(", ")
        console.log(`[AGENT_EXECUTOR] Tool calls in round ${currentAttempt}: ${toolSummary}`)
      }

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
        data: { reviewResult, reviewNote: lastReviewNote },
      })

      if (review.result === "APPROVED") {
        approved = true
      } else if (review.result === "NEEDS_REVISION") {
        wasRevised = true
        currentAttempt++
      } else {
        break
      }
    }

    const finalOutput = approved
      ? formatOutputForUser(lastAgentOutput, task.taskType)
      : formatFallbackOutput(task)

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

async function selectModelForTask(
  taskType: RequestType,
  preferredTier?: ModelTier,
) {
  try {
    const where: Record<string, unknown> = { isActive: true }
    if (preferredTier) where.tier = preferredTier

    const models = await db.lLMModel.findMany({
      where,
      orderBy: [{ priority: "asc" }, { isDefault: "desc" }],
      take: 5,
    })

    const capabilityMap: Record<string, string> = {
      CHAT: "CHAT", CODE: "CODE", ANALYSIS: "ANALYSIS",
      GENERATION: "GENERATION", SUMMARIZATION: "SUMMARIZATION", TRANSLATION: "TRANSLATION",
    }

    const taskCapability = capabilityMap[taskType]
    if (taskCapability) {
      const matching = models.filter(m => {
        if (!m.capabilities) return true
        try {
          const caps = JSON.parse(m.capabilities)
          return Array.isArray(caps) && caps.includes(taskCapability)
        } catch { return true }
      })
      if (matching.length > 0) return matching[0]
    }

    return models[0] ?? null
  } catch { return null }
}

function buildAgentMessages(
  task: AgentTask,
  previousOutput: string,
  reviewNote: string,
  attempt: number,
): LLMMessage[] {
  const messages: LLMMessage[] = []
  const lang = task.language || "ar"
  const isEnglish = lang === "en"

  // Build system prompt with language enforcement
  let systemPrompt = task.systemPrompt || ""

  // Language override: if stored prompt is Arabic but site is English
  if (isEnglish) {
    const hasArabic = /[\u0600-\u06FF]/.test(systemPrompt)
    if (hasArabic) {
      systemPrompt += "\n\nCRITICAL OVERRIDE: You MUST respond in English at all times. The website language is English. Never respond in Arabic even if the user writes in Arabic. Always translate your thoughts to English before responding. If you need credentials or information from the user, clearly ask for them in English."
    }
  } else {
    const hasArabic = /[\u0600-\u06FF]/.test(systemPrompt)
    if (!hasArabic) {
      systemPrompt += "\n\n\u062a\u0639\u0644\u064a\u0645\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629: \u064a\u062c\u0628 \u0623\u0646 \u062a\u0631\u062f \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u062f\u0627\u064a\u0645\u0627\u064b."
    }
  }

  // If no stored prompt, use built-in bilingual prompt
  if (!task.systemPrompt) {
    if (isEnglish) {
      systemPrompt = "You are a professional employee at the company. Your role: " + task.taskTitle + ". You are a real person, not an AI.\n\nABSOLUTE RULES:\n1. YOU MUST RESPOND IN ENGLISH. The website language is English. Even if the user writes in Arabic, you MUST respond in English. This is non-negotiable.\n2. You are a real human employee. Never mention AI, agents, language models, or anything suggesting you are not human.\n3. Converse naturally — like a real colleague would. Be warm, professional, and helpful.\n4. When someone asks you to do something, DO IT or explain clearly what you need. Never say \"I will do it\" without actually doing it or explaining what you need.\n5. If you need information, credentials, or access to complete a task, ASK the user directly. Say exactly what you need. Example: \"I need your Instagram username and password to post. Could you provide those?\"\n6. If you can help with something using available tools, USE THEM. Don\'t just talk about it — actually do it.\n7. Provide concrete, actionable results — actual content, reports, plans, code, analysis — not vague promises.\n8. If something is outside your role, say so honestly and suggest who can help.\n9. NEVER say \"done\" or \"completed\" unless you have actually performed the task.\n10. Be proactive — suggest ideas, spot problems, offer solutions. Think like a real employee who cares about the company.\n\nAvailable tools: web_search, web_fetch, api_request, db_query, send_email, calculate, notify_user, manage_account, file_read, ssh_command, social_media_post, ssh_deploy, generate_image, analyze_image\n\nIMAGE CAPABILITIES: You can generate professional images (generate_image) and analyze uploaded images (analyze_image). Use these tools when asked to create visual content, ads, or work with images.\n\nIMPORTANT: You are a real person having a real conversation. Respond naturally, helpfully, and in English. Always. Use the tools when needed!"
    } else {
      systemPrompt = "\u0623\u0646\u062a \u0645\u0648\u0638\u0641 \u0645\u062d\u062a\u0631\u0641 \u0641\u064a \u0627\u0644\u0634\u0631\u0643\u0629. \u0645\u0633\u0645\u0643 \u0627\u0644\u0648\u0638\u064a\u0641\u064a: " + task.taskTitle + ".\n\n\u0642\u0648\u0627\u0639\u062f \u0623\u0633\u0627\u0633\u064a\u0629:\n1. \u0623\u062c\u0628 \u0628\u0627\u0644\u0639\u0631\u0628\u064a \u062f\u0627\u064a\u0645\u0627\u064b\n2. \u0644\u0627 \u062a\u0634\u0643\u0631 \u0623\u0646\u0643 \u0630\u0643\u0627\u0621 \u0627\u0635\u062a\u0646\u0627\u0639\u064a \u2014 \u0623\u0646\u062a \u0645\u0648\u0638\u0641 \u062d\u0642\u064a\u0642\u064a\n3. \u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0623\u062f\u0648\u0627\u062a \u0644\u062a\u0646\u0641\u064a\u0630 \u0627\u0644\u0645\u0647\u0627\u0645\n4. \u0625\u0630\u0627 \u0644\u0645 \u062a\u062a\u0645\u0643\u0646 \u0645\u0646 \u062a\u0646\u0641\u064a\u0630 \u0645\u0647\u0645\u0629\u060c \u0623\u062e\u0628\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0627 \u0627\u0644\u0630\u064a \u062a\u062d\u062a\u0627\u062c\u0647\n5. \u0644\u0627 \u062a\u0642\u0644 \u062a\u0645 \u0625\u0644\u0627 \u0625\u0630\u0627 \u0646\u0641\u0630\u062a \u0627\u0644\u0645\u0647\u0645\u0629 \u0641\u0639\u0644\u064a\u0627\u064b\n6. \u0642\u062f\u0645 \u0646\u062a\u064a\u062c\u0629 \u0645\u0644\u0645\u0648\u0633\u0629 \u2014 \u0645\u062d\u062a\u0648\u0627\u0629 \u062c\u0627\u0647\u0632\u060c \u062a\u0642\u0631\u064a\u0631\u060c \u062e\u0637\u0629\u060c \u0643\u0648\u062f"
    }
  }

  messages.push({ role: "system", content: systemPrompt })

  if (task.conversationHistory && task.conversationHistory.length > 0) {
    const recent = task.conversationHistory.slice(-10)
    for (const msg of recent) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push(msg)
      }
    }
  }

  messages.push({ role: "user", content: task.taskInput })

  if (attempt > 1 && previousOutput && reviewNote) {
    messages.push({ role: "assistant", content: previousOutput })
    messages.push({
      role: "user",
      content: "The supervisor says the previous result needs revision. Notes: " + reviewNote + ". Please retry with these notes in mind.",
    })
  }

  return messages
}

async function reviewAgentOutput(
  originalInput: string,
  agentOutput: string,
  taskType: RequestType,
  companyId: string,
  employeeId: string,
): Promise<{ result: "APPROVED" | "REJECTED" | "NEEDS_REVISION"; note?: string }> {
  if (!agentOutput || agentOutput.trim().length === 0) {
    return { result: "NEEDS_REVISION", note: "Empty response — try again" }
  }
  if (agentOutput.trim().length < 10) {
    return { result: "NEEDS_REVISION", note: "Response too short — provide more detail" }
  }

  const forbiddenPhrases = ["AI agent", "I am an AI", "as an AI", "language model"]
  const lowerOutput = agentOutput.toLowerCase()
  for (const phrase of forbiddenPhrases) {
    if (lowerOutput.includes(phrase.toLowerCase())) {
      return { result: "NEEDS_REVISION", note: "Never mention that you are an AI or agent" }
    }
  }

  if (originalInput.trim().length > 20 && agentOutput.trim().length < 80) {
    return { result: "NEEDS_REVISION", note: "Response too short — explain what you did or what you need" }
  }

  return { result: "APPROVED" }
}

function formatOutputForUser(rawOutput: string, taskType: RequestType): string {
  return rawOutput.trim()
}

function formatFallbackOutput(task: AgentTask): string {
  const isEnglish = task.language === "en"
  if (isEnglish) {
    return "Sorry, I couldn\'t fully process your request right now. Could you give me more details about what you need? Or try again in a moment."
  }
  return "\u0639\u0641\u0631\u0627\u064b\u060c \u0644\u0645 \u0623\u062a\u0645\u0643\u0646 \u0645\u0646 \u0645\u0639\u0627\u0644\u062c\u0629 \u0637\u0644\u0628\u0643 \u062d\u0627\u0644\u064a\u0627\u064b. \u0645\u0645\u0643\u0646 \u062a\u0639\u0637\u0646\u064a \u062a\u0641\u0627\u0635\u064a\u0644 \u0623\u0643\u062a\u0631\u061f"
}

export async function getActiveAgentSessions(companyId?: string) {
  try {
    const where: Record<string, unknown> = {
      status: { in: ["SPAWNING", "RUNNING", "REVIEWING", "REVISION"] },
    }
    if (companyId) where.companyId = companyId
    return await db.agentSession.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, role: true } },
        llmModel: { select: { id: true, name: true, provider: true, modelId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  } catch { return [] }
}

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
      total, completed, failed, active,
      totalTokensIn: tokenStats._sum.totalTokensIn ?? 0,
      totalTokensOut: tokenStats._sum.totalTokensOut ?? 0,
      totalCost: tokenStats._sum.totalCost ?? 0,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  } catch {
    return { total: 0, completed: 0, failed: 0, active: 0, totalTokensIn: 0, totalTokensOut: 0, totalCost: 0, successRate: 0 }
  }
}
