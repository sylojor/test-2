// ============================================
// Developer API v1 — Employees Endpoint
// GET /api/v1/employees         — List employees
// GET /api/v1/employees/:id    — Get single employee
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
  apikeySuccess,
} from "@/lib/api-key-service"

// GET /api/v1/employees — List all active employees
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
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

    // === 3. Fetch Employees ===
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get("departmentId")
    const status = searchParams.get("status") || "ACTIVE"
    const specialization = searchParams.get("specialization")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

    const where: Record<string, unknown> = {
      companyId: apiKey.companyId,
      status,
      ...(departmentId && { departmentId }),
      ...(specialization && { specialization }),
    }

    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        select: {
          id: true,
          name: true,
          role: true,
          status: true,
          specialization: true,
          avatarColor: true,
          capabilities: true,
          department: { select: { id: true, name: true, color: true } },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.employee.count({ where }),
    ])

    // === 4. Record Usage ===
    await recordApiUsage({
      apiKeyId: apiKey.id,
      companyId: apiKey.companyId,
      endpoint: "GET /api/v1/employees",
      statusCode: 200,
      ip: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      responseTimeMs: Date.now() - startTime,
    })

    // === 5. Response ===
    return new Response(
      JSON.stringify({
        data: employees.map(e => ({
          id: e.id,
          name: e.name,
          role: e.role,
          status: e.status,
          specialization: e.specialization,
          avatarColor: e.avatarColor,
          capabilities: e.capabilities ? JSON.parse(e.capabilities) : [],
          department: e.department,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
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
    console.error("[API_V1_EMPLOYEES_ERROR]", error)
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
