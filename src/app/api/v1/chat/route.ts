// ============================================
// Developer API v1 — Chat Endpoint
// POST /api/v1/chat
//
// Authenticate via: Authorization: Bearer blv_sk_...
//
// Request Body:
//   employeeId: string (required)
//   message: string (required)
//   conversationId?: string (optional, for continuity)
//   language?: 'ar' | 'en' (optional, default: 'ar')
//   stream?: boolean (optional, default: false)
//
// Response:
//   { data: { id, reply, conversationId, employeeName, tokensUsed, createdAt } }
// ============================================

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { sendToLLMWithTools } from "@/lib/llm-service"
import { canConsumeTokens } from "@/lib/token-manager"
import {
  extractApiKeyFromRequest,
  verifyApiKey,
  checkApiKeyRateLimit,
  recordApiUsage,
  hasScope,
  apikeyAuthError,
  apikeyRateLimitError,
  apikeyValidationError,
  apikeySuccess,
} from "@/lib/api-key-service"
import type { LLMMessage } from "@/types"

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // === 1. API Key Auth ===
    const rawKey = extractApiKeyFromRequest(request)
    if (!rawKey) return apikeyAuthError()

    const apiKey = await verifyApiKey(rawKey)
    if (!apiKey) return apikeyAuthError()

    // === 2. Scope Check ===
    if (!hasScope(apiKey.scopes, "chat")) {
      return new Response(
        JSON.stringify({ error: { code: "FORBIDDEN", message: "Your API key does not have 'chat' scope" } }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }

    // === 3. Rate Limit ===
    const rateResult = checkApiKeyRateLimit(apiKey.id, apiKey.rateLimitRpm, apiKey.rateLimitRpd)
    if (!rateResult.allowed) {
      const retryMs = Math.min(
        rateResult.rpmResult.allowed ? rateResult.rpdResult.resetAt : rateResult.rpmResult.resetAt,
        Date.now()
      ) - Date.now()
      return apikeyRateLimitError(Math.abs(retryMs))
    }

    // === 4. Parse Body ===
    const body = await request.json()
    const { employeeId, message, conversationId, language } = body

    if (!employeeId || !message) {
      return apikeyValidationError("employeeId and message are required")
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return apikeyValidationError("message must be a non-empty string")
    }

    if (message.length > 10000) {
      return apikeyValidationError("message must not exceed 10,000 characters")
    }

    // === 5. Verify Employee ===
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { company: true, department: true },
    })

    if (!employee || employee.companyId !== apiKey.companyId) {
      return new Response(
        JSON.stringify({ error: { code: "NOT_FOUND", message: "Employee not found or does not belong to your company" } }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    if (employee.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "This employee is not active" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // === 6. Token Budget Check ===
    const canOperate = await canConsumeTokens(employee.companyId)
    if (!canOperate) {
      const responseTime = Date.now() - startTime
      await recordApiUsage({
        apiKeyId: apiKey.id,
        companyId: apiKey.companyId,
        endpoint: "POST /api/v1/chat",
        statusCode: 200,
        ip: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        responseTimeMs: responseTime,
      })
      return new Response(
        JSON.stringify({
          data: {
            reply: "Token budget exhausted. Please top up your tokens to continue using the API.",
            tokensUsed: 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // === 7. Create or Get Conversation ===
    let convoId = conversationId

    if (!convoId) {
      const conversation = await db.conversation.create({
        data: {
          type: "DIRECT",
          participants: {
            create: [
              {
                participantType: "USER",
                participantId: employee.company.ownerId,
                participantName: "API User",
              },
              {
                participantType: "EMPLOYEE",
                participantId: employee.id,
                participantName: employee.name,
                employeeId: employee.id,
              },
            ],
          },
        },
      })
      convoId = conversation.id
    } else {
      // Verify conversation belongs to company
      const convo = await db.conversation.findFirst({
        where: {
          id: convoId,
          participants: { some: { employeeId } },
        },
      })
      if (!convo) {
        return new Response(
          JSON.stringify({ error: { code: "NOT_FOUND", message: "Conversation not found" } }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }
    }

    // === 8. Save User Message ===
    await db.message.create({
      data: {
        conversationId: convoId,
        senderType: "USER",
        senderName: "API User",
        content: message.trim(),
      },
    })

    // === 9. Build System Prompt ===
    const isEnglish = (language === "en" ||
      request.headers.get("accept-language")?.startsWith("en")) ?? false

    let systemPrompt = employee.systemPrompt || buildDefaultSystemPrompt(employee, isEnglish)
    systemPrompt += buildApiContextRules(isEnglish)

    // === 10. Get Chat History ===
    const historyMessages: LLMMessage[] = [{ role: "system", content: systemPrompt }]

    const recentMessages = await db.message.findMany({
      where: { conversationId: convoId },
      orderBy: { createdAt: "asc" },
      take: 50,
    })

    for (const msg of recentMessages) {
      historyMessages.push({
        role: msg.senderType === "USER" ? "user" : "assistant",
        content: msg.content,
      })
    }

    // === 11. Call LLM ===
    // @ts-expect-error args shape mismatch with overloaded signature
    const llmResult = await sendToLLMWithTools({
      messages: historyMessages,
      companyId: employee.companyId,
      employeeId: employee.id,
      taskType: "CHAT",
    })

    const reply = llmResult?.content || "Sorry, I could not process your request. Please try again."
    const tokensUsed = (llmResult?.tokensIn || 0) + (llmResult?.tokensOut || 0)

    // === 12. Save Employee Reply ===
    await db.message.create({
      data: {
        conversationId: convoId,
        senderType: "EMPLOYEE",
        senderName: employee.name,
        content: reply,
      },
    })

    // === 13. Record Usage ===
    const responseTime = Date.now() - startTime
    await recordApiUsage({
      apiKeyId: apiKey.id,
      companyId: apiKey.companyId,
      endpoint: "POST /api/v1/chat",
      statusCode: 200,
      tokensUsed,
      ip: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      responseTimeMs: responseTime,
    })

    // === 14. Response ===
    return new Response(
      JSON.stringify({
        data: {
          id: convoId,
          reply,
          conversationId: convoId,
          employeeName: employee.name,
          employeeRole: employee.role,
          tokensUsed,
          createdAt: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Powered-By": "API",
          "X-RateLimit-Remaining": String(rateResult.rpmResult.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rateResult.rpmResult.resetAt / 1000)),
        },
      }
    )
  } catch (error) {
    console.error("[API_V1_CHAT_ERROR]", error)
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

// ============================================
// Default System Prompt (fallback)
// ============================================

function buildDefaultSystemPrompt(employee: {
  name: string
  role: string
  specialization: string | null
  personality: string | null
}, isEnglish: boolean): string {
  const spec = employee.specialization || (isEnglish ? "general" : "عام")
  const personality = employee.personality || ""

  if (isEnglish) {
    return `You are ${employee.name}, ${employee.role} at the company.
Your specialization: ${spec}
${personality ? `Your personality: ${personality}` : ""}
- Be professional and helpful within your area of expertise.
- If asked about something outside your specialization, politely redirect.
- Respond concisely unless the user asks for detailed explanation.`
  }

  return `أنت ${employee.name}، ${employee.role} في الشركة.
تخصصك: ${spec}
${personality ? `شخصيتك: ${personality}` : ""}
- كن محترف ومفيد ضمن مجال تخصصك.
- إذا سُئلت عن شيء خارج تخصصك، أحل بلطف.
- رد بإيجاز إلا إذا طلب المستخدم شرح مفصل.`
}

function buildApiContextRules(isEnglish: boolean): string {
  if (isEnglish) {
    return `

---
API CONTEXT: You are being accessed via the BlivoAI Developer API. Respond naturally to the user's message. The user may be using a third-party application that integrates with this platform. Provide helpful, accurate responses within your role.`
  }
  return `

---
سياق API: أنت يتم الوصول إليك عبر BlivoAI Developer API. رد بشكل طبيعي على رسالة المستخدم. قد يكون المستخدم يستخدم تطبيق طرف ثالث يدمج مع هذه المنصة. قدم ردود مفيدة ودقيقة ضمن دورك.`
}
