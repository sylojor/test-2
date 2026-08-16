// ============================================
// API Keys Management — Dashboard Routes
// JWT authenticated (for logged-in users)
//
// GET:    List all API keys for company
// POST:   Create new API key
// DELETE: Revoke API key (by ID)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse, forbiddenResponse, getClientIp } from "@/lib/auth"
import { generateApiKey, getDefaultRateLimits } from "@/lib/api-key-service"

// GET: List API keys
export async function GET(request: NextRequest) {
  try {
    const auth = verifyAuth(request)
    if (!auth) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })
    }

    // Verify company belongs to user
    const company = await db.company.findFirst({
      where: { id: companyId, ownerId: auth.userId },
      select: { subscription: true },
    })
    if (!company) return forbiddenResponse("Company not found")

    // Check plan
    if (company.subscription !== "PROFESSIONAL" && company.subscription !== "ENTERPRISE") {
      return NextResponse.json({
        error: "API keys are available on Professional and Enterprise plans only",
        upgrade: true,
        currentPlan: company.subscription,
      }, { status: 403 })
    }

    const keys = await db.apiKey.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimitRpm: true,
        rateLimitRpd: true,
        totalRequests: true,
        totalTokensUsed: true,
        lastUsedAt: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Get today's usage for each key
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const usageStats = await db.apiUsageLog.groupBy({
      by: ["apiKeyId"],
      where: { companyId, createdAt: { gte: today } },
      _count: true,
      _sum: { tokensUsed: true },
    })

    const usageMap = new Map(usageStats.map(s => [s.apiKeyId, s]))

    const enriched = keys.map(k => {
      const stats = usageMap.get(k.id)
      return {
        ...k,
        scopes: JSON.parse(k.scopes || "[]"),
        todayRequests: stats?._count || 0,
        todayTokens: stats?._sum.tokensUsed || 0,
      }
    })

    return NextResponse.json({ keys: enriched })
  } catch (error) {
    console.error("[API_KEYS_LIST_ERROR]", error)
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 })
  }
}

// POST: Create new API key
export async function POST(request: NextRequest) {
  try {
    const auth = verifyAuth(request)
    if (!auth) return unauthorizedResponse()

    const body = await request.json()
    const { companyId, name, scopes, expiresAt } = body

    if (!companyId || !name) {
      return NextResponse.json({ error: "companyId and name are required" }, { status: 400 })
    }

    // Verify company and plan
    const company = await db.company.findFirst({
      where: { id: companyId, ownerId: auth.userId },
      select: { subscription: true },
    })
    if (!company) return forbiddenResponse("Company not found")

    if (company.subscription !== "PROFESSIONAL" && company.subscription !== "ENTERPRISE") {
      return NextResponse.json({
        error: "API keys are available on Professional and Enterprise plans only",
        upgrade: true,
      }, { status: 403 })
    }

    // Check max keys limit
    const existingKeys = await db.apiKey.count({
      where: { companyId, isActive: true },
    })
    const maxKeys = company.subscription === "ENTERPRISE" ? 20 : 5
    if (existingKeys >= maxKeys) {
      return NextResponse.json({
        error: `Maximum ${maxKeys} active API keys allowed on your plan`,
      }, { status: 400 })
    }

    // Generate key
    const { key, prefix, hash } = generateApiKey()
    const limits = getDefaultRateLimits(company.subscription)
    const finalScopes = scopes || ["chat", "employees", "conversations"]

    const apiKey = await db.apiKey.create({
      data: {
        companyId,
        name: name.trim().substring(0, 100),
        keyPrefix: prefix,
        keyHash: hash,
        scopes: JSON.stringify(finalScopes),
        rateLimitRpm: limits.rpm,
        rateLimitRpd: limits.rpd,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    // Return the FULL key only once
    return NextResponse.json({
      key,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: finalScopes,
        rateLimitRpm: apiKey.rateLimitRpm,
        rateLimitRpd: apiKey.rateLimitRpd,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      warning: "Save this API key now. You will not be able to see it again.",
    }, { status: 201 })
  } catch (error) {
    console.error("[API_KEYS_CREATE_ERROR]", error)
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
  }
}

// DELETE: Revoke API key
export async function DELETE(request: NextRequest) {
  try {
    const auth = verifyAuth(request)
    if (!auth) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get("id")
    const companyId = searchParams.get("companyId")

    if (!keyId || !companyId) {
      return NextResponse.json({ error: "id and companyId are required" }, { status: 400 })
    }

    // Verify ownership
    const apiKey = await db.apiKey.findFirst({
      where: { id: keyId, companyId },
    })
    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    await db.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: "API key revoked" })
  } catch (error) {
    console.error("[API_KEYS_DELETE_ERROR]", error)
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 })
  }
}
