// ============================================
// Developer API v1 — Single Employee Endpoint
// GET /api/v1/employees/:id
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
  apikeyNotFoundError,
} from "@/lib/api-key-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id } = await params

    // === 1. Auth ===
    const rawKey = extractApiKeyFromRequest(request)
    if (!rawKey) return apikeyAuthError()

    const apiKey = await verifyApiKey(rawKey)
    if (!apiKey) return apikeyAuthError()

    if (!hasScope(apiKey.scopes, "employees")) {
      return new Response(
        JSON.stringify({ error: { code: "FORBIDDEN", message: "Your API key does not have 'employees' scope" } }),
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

    // === 3. Fetch Employee ===
    const employee = await db.employee.findFirst({
      where: { id, companyId: apiKey.companyId },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        specialization: true,
        personality: true,
        avatarColor: true,
        capabilities: true,
        constraints: true,
        approvalMode: true,
        department: { select: { id: true, name: true, color: true } },
        createdAt: true,
        updatedAt: true,
        // Stats
        _count: {
          select: {
            conversationParticipants: true,
            tokenUsages: true,
            decisions: true,
            tasks: true,
          },
        },
      },
    })

    if (!employee) {
      await recordApiUsage({
        apiKeyId: apiKey.id,
        companyId: apiKey.companyId,
        endpoint: `GET /api/v1/employees/${id}`,
        statusCode: 404,
        responseTimeMs: Date.now() - startTime,
      })
      return apikeyNotFoundError("Employee not found")
    }

    // === 4. Record Usage ===
    await recordApiUsage({
      apiKeyId: apiKey.id,
      companyId: apiKey.companyId,
      endpoint: `GET /api/v1/employees/${id}`,
      statusCode: 200,
      ip: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      responseTimeMs: Date.now() - startTime,
    })

    // === 5. Response ===
    return new Response(
      JSON.stringify({
        data: {
          ...employee,
          capabilities: employee.capabilities ? JSON.parse(employee.capabilities) : [],
          constraints: employee.constraints ? JSON.parse(employee.constraints) : [],
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
    console.error("[API_V1_EMPLOYEE_DETAIL_ERROR]", error)
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
