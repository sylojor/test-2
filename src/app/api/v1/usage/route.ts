// ============================================
// Developer API v1 — Usage & Analytics
// GET /api/v1/usage
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

    // === 2. Rate Limit ===
    const rateResult = checkApiKeyRateLimit(apiKey.id, apiKey.rateLimitRpm, apiKey.rateLimitRpd)
    if (!rateResult.allowed) {
      const retryMs = Math.abs(
        (rateResult.rpmResult.allowed ? rateResult.rpdResult.resetAt : rateResult.rpmResult.resetAt) - Date.now()
      )
      return apikeyRateLimitError(retryMs)
    }

    // === 3. Gather Usage Data ===
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)

    const [
      todayLogs,
      weekLogs,
      monthLogs,
      topEndpoints,
      dailyUsage,
      allKeys,
    ] = await Promise.all([
      // Today's usage
      db.apiUsageLog.groupBy({
        by: ["endpoint"],
        where: { companyId: apiKey.companyId, createdAt: { gte: todayStart } },
        _count: true,
        _sum: { tokensUsed: true },
      }),
      // This week's usage
      db.apiUsageLog.aggregate({
        where: { companyId: apiKey.companyId, createdAt: { gte: sevenDaysAgo } },
        _count: true,
        _sum: { tokensUsed: true, responseTimeMs: true },
      }),
      // This month's usage
      db.apiUsageLog.aggregate({
        where: { companyId: apiKey.companyId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
        _sum: { tokensUsed: true, responseTimeMs: true },
      }),
      // Top endpoints (30 days)
      db.apiUsageLog.groupBy({
        by: ["endpoint"],
        where: { companyId: apiKey.companyId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
        _sum: { tokensUsed: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // Daily usage for last 30 days
      db.$queryRaw<Array<{ date: string; requests: bigint; tokens: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*) as requests, COALESCE(SUM(tokens_used), 0) as tokens
        FROM api_usage_logs
        WHERE company_id = ${apiKey.companyId} AND created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      // All API keys summary
      db.apiKey.findMany({
        where: { companyId: apiKey.companyId },
        select: {
          id: true, name: true, keyPrefix: true, isActive: true,
          totalRequests: true, totalTokensUsed: true, lastUsedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    // === 4. Record Usage ===
    await recordApiUsage({
      apiKeyId: apiKey.id,
      companyId: apiKey.companyId,
      endpoint: "GET /api/v1/usage",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    })

    // === 5. Response ===
    return new Response(
      JSON.stringify({
        data: {
          summary: {
            today: {
              requests: todayLogs.reduce((s, l) => s + l._count, 0),
              tokens: todayLogs.reduce((s, l) => s + (l._sum.tokensUsed || 0), 0),
            },
            thisWeek: {
              requests: weekLogs._count,
              tokens: weekLogs._sum.tokensUsed || 0,
              avgResponseTime: weekLogs._count > 0 ? Math.round((weekLogs._sum.responseTimeMs || 0) / weekLogs._count) : 0,
            },
            thisMonth: {
              requests: monthLogs._count,
              tokens: monthLogs._sum.tokensUsed || 0,
              avgResponseTime: monthLogs._count > 0 ? Math.round((monthLogs._sum.responseTimeMs || 0) / monthLogs._count) : 0,
            },
          },
          topEndpoints: topEndpoints.map(e => ({
            endpoint: e.endpoint,
            requests: e._count,
            tokensUsed: e._sum.tokensUsed || 0,
          })),
          dailyUsage: dailyUsage.map(d => ({
            date: d.date,
            requests: Number(d.requests),
            tokens: Number(d.tokens),
          })),
          apiKeys: allKeys.map(k => ({
            id: k.id,
            name: k.name,
            prefix: k.keyPrefix,
            isActive: k.isActive,
            totalRequests: k.totalRequests,
            totalTokensUsed: k.totalTokensUsed,
            lastUsedAt: k.lastUsedAt,
            createdAt: k.createdAt,
          })),
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Powered-By": "BlivoAI API v1",
          "X-RateLimit-Remaining": String(rateResult.rpmResult.remaining),
        },
      }
    )
  } catch (error) {
    console.error("[API_V1_USAGE_ERROR]", error)
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
