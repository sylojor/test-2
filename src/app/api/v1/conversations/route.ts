// ============================================
// Developer API v1 — Conversations Endpoint
// GET /api/v1/conversations — List conversations
//
// Authenticate via: Authorization: Bearer blv_sk_...
// ============================================

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import {
  extractApiKeyFromRequest,
  verifyApiKey,
  checkApiKeyRateLimit,
  recordApiUsage,
  hasScope,
  apikeyAuthError,
  apikeyRateLimitError,
} from "@/lib/api-key-service"

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // === 1. Auth ===
    const rawKey = extractApiKeyFromRequest(request)
    if (!rawKey) return apikeyAuthError()

    const apiKey = await verifyApiKey(rawKey)
    if (!apiKey) return apikeyAuthError()

    if (!hasScope(apiKey.scopes, "conversations")) {
      return new Response(
        JSON.stringify({ error: { code: "FORBIDDEN", message: "Your API key does not have 'conversations' scope" } }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }

    // === 2. Rate Limit ===
    const rateResult = checkApiKeyRateLimit(apiKey.id, apiKey.rateLimitRpm, apiKey.rateLimitRpd)
    if (!rateResult.allowed) {
      const retryMs = Math.abs(
        (rateResult.rpmResult.allowed ? rateResult.rpdResult.resetAt : rateResult.rpmResult.resetAt) - Date.now()
      )
      return apikeyRateLimitError(retryMs)
    }

    // === 3. Fetch Conversations ===
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // Get company employee IDs
    const companyEmployees = await db.employee.findMany({
      where: { companyId: apiKey.companyId, status: { not: "DELETED" } },
      select: { id: true },
    })
    const employeeIds = companyEmployees.map(e => e.id)

    const where: Record<string, unknown> = {
      participants: {
        some: {
          employeeId: { in: employeeIds },
          ...(employeeId && { employeeId }),
        },
      },
    }

    const [conversations, total] = await Promise.all([
      db.conversation.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          participants: {
            select: {
              participantType: true,
              participantName: true,
              employeeId: true,
            },
          },
          messages: {
            select: { content: true, senderType: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.conversation.count({ where }),
    ])

    // === 4. Record Usage ===
    await recordApiUsage({
      apiKeyId: apiKey.id,
      companyId: apiKey.companyId,
      endpoint: "GET /api/v1/conversations",
      statusCode: 200,
      ip: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      responseTimeMs: Date.now() - startTime,
    })

    // === 5. Response ===
    return new Response(
      JSON.stringify({
        data: conversations.map(c => ({
          id: c.id,
          type: c.type,
          title: c.title,
          participants: c.participants.map(p => ({
            type: p.participantType,
            name: p.participantName,
            employeeId: p.employeeId,
          })),
          lastMessage: c.messages[0] || null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Powered-By": "API",
          "X-RateLimit-Remaining": String(rateResult.rpmResult.remaining),
        },
      }
    )
  } catch (error) {
    console.error("[API_V1_CONVERSATIONS_ERROR]", error)
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
