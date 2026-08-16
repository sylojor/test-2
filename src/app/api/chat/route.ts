// ============================================
// API: Chat — BlivoAI Smart Chatbot
// POST /api/chat
//
// Requires auth (verifyAuth)
// Accepts: { messages: [{role, content}], conversationId? }
// Returns: Streaming text response from LLM
// Rate limited: 60 req/min
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, checkApiRateLimit, getClientIp, rateLimitResponse, unauthorizedResponse } from "@/lib/auth"
import { sendToLLM } from "@/lib/llm-service"
import { db } from "@/lib/db"
import type { LLMMessage } from "@/types"

const CHATBOT_SYSTEM_PROMPT_AR = `أنت شات بوت BlivoAI الذكي. اسمك "Blivo".

قواعد مهمة:
1. أجب بلغة واضحة ومهنية بالعربي
2. ساعد المستخدم في أي سؤال — محادثة، إدارة أعمال، تقنية
3. إذا سُئلت عن إدارة أعمال، اشرح كيف BlivoAI تساعد
4. كن مبدع وقدم اقتراحات مفيدة
5. لا تذكر أنك موديل أو API — أنت شات بوت ذكي
6. رد بشكل سياقي — فهم المحادثة الكاملة`

const CHATBOT_SYSTEM_PROMPT_EN = `You are BlivoAI's smart chatbot named "Blivo".

Important rules:
1. Answer clearly and professionally in English
2. Help the user with any question — chat, business management, tech
3. If asked about business management, explain how BlivoAI helps
4. Be creative and provide useful suggestions
5. Never mention you're a model or API — you're a smart chatbot
6. Respond contextually — understand the full conversation`

export async function POST(request: NextRequest) {
  try {
    // === 1. Authentication ===
    const payload = verifyAuth(request)
    if (!payload) {
      return unauthorizedResponse()
    }

    // === 2. Rate Limiting ===
    const clientIp = getClientIp(request)
    const rateLimit = checkApiRateLimit(clientIp, "chat")
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs || 60000)
    }

    // === 3. Parse Request ===
    const body = await request.json()
    const { messages, conversationId } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      )
    }

    // Validate messages format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          { error: "Each message must have role and content" },
          { status: 400 }
        )
      }
      if (!["user", "assistant", "system"].includes(msg.role)) {
        return NextResponse.json(
          { error: "Invalid message role" },
          { status: 400 }
        )
      }
    }

    // === 4. Determine language from messages ===
    const hasArabicContent = messages.some(m =>
      /[\u0600-\u06FF]/.test(m.content)
    )
    const systemPrompt = hasArabicContent ? CHATBOT_SYSTEM_PROMPT_AR : CHATBOT_SYSTEM_PROMPT_EN

    // === 5. Build LLM messages ===
    const llmMessages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
    ]

    // Add conversation history
    for (const msg of messages) {
      if (msg.role === "user" || msg.role === "assistant") {
        llmMessages.push({ role: msg.role, content: msg.content })
      }
    }

    // === 6. Get user's company for token budget ===
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: { ownedCompany: true },
    })

    const companyId = user?.ownedCompany?.id || user?.companyId || "default"
    const employeeId = `chatbot-${payload.userId}`

    // === 7. Call LLM ===
    const llmResponse = await sendToLLM(
      {
        messages: llmMessages,
        requestType: "CHAT",
        temperature: 0.7,
        maxTokens: 2048,
      },
      companyId,
      employeeId,
    )

    // === 8. Save conversation to DB if conversationId provided ===
    if (conversationId) {
      try {
        // Save user message
        const lastUserMsg = [...messages].reverse().find(m => m.role === "user")
        if (lastUserMsg) {
          await db.message.create({
            data: {
              conversationId,
              senderType: "USER",
              senderId: payload.userId,
              senderName: user?.name || "User",
              content: lastUserMsg.content,
            },
          })
        }

        // Save assistant response
        await db.message.create({
          data: {
            conversationId,
            senderType: "EMPLOYEE",
            senderId: employeeId,
            senderName: "Blivo",
            content: llmResponse.content,
            metadata: JSON.stringify({
              tokensIn: llmResponse.tokensIn,
              tokensOut: llmResponse.tokensOut,
              modelTier: llmResponse.modelTier,
              cached: llmResponse.cached,
            }),
          },
        })

        // Update conversation timestamp
        await db.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        })
      } catch (dbError) {
        console.warn("[CHAT_DB_SAVE_ERROR]", dbError)
        // Don't fail the request if DB save fails
      }
    }

    // === 9. Return streaming response ===
    // The ChatbotPanel reads response.body as a stream
    // We return the content as plain text which is naturally streamable
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Send the full content in one chunk for simplicity
        // The ChatbotPanel will display it as streaming content
        controller.enqueue(encoder.encode(llmResponse.content))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": conversationId || "",
        "X-Tokens-Used": String(llmResponse.tokensIn + llmResponse.tokensOut),
        "X-Rate-Limit-Remaining": String(rateLimit.remaining),
      },
    })
  } catch (error) {
    console.error("[CHAT_API_ERROR]", error)
    return NextResponse.json(
      { error: "An error occurred during chat" },
      { status: 500 }
    )
  }
}
