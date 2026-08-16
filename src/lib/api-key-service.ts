// ============================================
// Developer API Key Service
// مفتاح API احترافي للمطورين
//
// Features:
// - Secure key generation (blv_sk_... format)
// - SHA-256 hashing (never store raw keys)
// - Plan-based access control (PROFESSIONAL + ENTERPRISE)
// - Per-key rate limiting (RPM + RPD)
// - Usage tracking
// ============================================

import crypto from "crypto"
import { db } from "./db"

// ============================================
// Types
// ============================================

export interface ApiKeyData {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  rateLimitRpm: number
  rateLimitRpd: number
  totalRequests: number
  totalTokensUsed: number
  lastUsedAt: string | null
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

export interface VerifiedApiKey {
  id: string
  companyId: string
  name: string
  scopes: string[]
  rateLimitRpm: number
  rateLimitRpd: number
  totalRequests: number
  totalTokensUsed: number
  plan: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

// ============================================
// Rate Limiting Store (in-memory per process)
// ============================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rpmStore = new Map<string, RateLimitEntry>()
const rpdStore = new Map<string, RateLimitEntry>()

// Cleanup every 10 minutes
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rpmStore.entries()) {
      if (now > entry.resetAt) rpmStore.delete(key)
    }
    for (const [key, entry] of rpdStore.entries()) {
      if (now > entry.resetAt) rpdStore.delete(key)
    }
  }, 10 * 60 * 1000)
}

// ============================================
// Key Generation
// ============================================

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomBytes = crypto.randomBytes(32).toString("hex")
  const key = `blv_sk_${randomBytes}`
  const prefix = key.substring(0, 16) + "..."  // blv_sk_a1b2c3d4...
  const hash = crypto.createHash("sha256").update(key).digest("hex")
  return { key, prefix, hash }
}

// ============================================
// Key Verification (for API requests)
// ============================================

export async function verifyApiKey(rawKey: string): Promise<VerifiedApiKey | null> {
  if (!rawKey.startsWith("blv_sk_")) return null

  const hash = crypto.createHash("sha256").update(rawKey).digest("hex")

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash: hash },
    include: { company: { select: { subscription: true, id: true } } },
  })

  if (!apiKey || !apiKey.isActive) return null

  // Check expiry
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    await db.apiKey.update({ where: { id: apiKey.id }, data: { isActive: false } })
    return null
  }

  // Plan check — only PROFESSIONAL and ENTERPRISE
  const plan = apiKey.company.subscription
  if (plan !== "PROFESSIONAL" && plan !== "ENTERPRISE") return null

  return {
    id: apiKey.id,
    companyId: apiKey.companyId,
    name: apiKey.name,
    scopes: JSON.parse(apiKey.scopes || "[]"),
    rateLimitRpm: apiKey.rateLimitRpm,
    rateLimitRpd: apiKey.rateLimitRpd,
    totalRequests: apiKey.totalRequests,
    totalTokensUsed: apiKey.totalTokensUsed,
    plan,
  }
}

// ============================================
// Rate Limiting
// ============================================

export function checkApiKeyRateLimit(
  apiKeyId: string,
  rpm: number,
  rpd: number
): { rpmResult: RateLimitResult; rpdResult: RateLimitResult; allowed: boolean } {
  const now = Date.now()

  // RPM check
  const rpmKey = `rpm:${apiKeyId}`
  const rpmEntry = rpmStore.get(rpmKey)
  let rpmCount = 1
  let rpmReset = now + 60 * 1000

  if (rpmEntry && now <= rpmEntry.resetAt) {
    if (rpmEntry.count >= rpm) {
      return {
        rpmResult: { allowed: false, remaining: 0, resetAt: rpmEntry.resetAt, limit: rpm },
        rpdResult: { allowed: true, remaining: rpd, resetAt: now + 86400000, limit: rpd },
        allowed: false,
      }
    }
    rpmCount = rpmEntry.count + 1
    rpmReset = rpmEntry.resetAt
  }
  rpmStore.set(rpmKey, { count: rpmCount, resetAt: rpmReset })

  // RPD check
  const rpdKey = `rpd:${apiKeyId}`
  const rpdEntry = rpdStore.get(rpdKey)
  let rpdCount = 1
  let rpdReset = now + 86400000

  if (rpdEntry && now <= rpdEntry.resetAt) {
    if (rpdEntry.count >= rpd) {
      return {
        rpmResult: { allowed: true, remaining: rpm - rpmCount, resetAt: rpmReset, limit: rpm },
        rpdResult: { allowed: false, remaining: 0, resetAt: rpdEntry.resetAt, limit: rpd },
        allowed: false,
      }
    }
    rpdCount = rpdEntry.count + 1
    rpdReset = rpdEntry.resetAt
  }
  rpdStore.set(rpdKey, { count: rpdCount, resetAt: rpdReset })

  return {
    rpmResult: { allowed: true, remaining: rpm - rpmCount, resetAt: rpmReset, limit: rpm },
    rpdResult: { allowed: true, remaining: rpd - rpdCount, resetAt: rpdReset, limit: rpd },
    allowed: true,
  }
}

// ============================================
// Usage Tracking
// ============================================

export async function recordApiUsage(params: {
  apiKeyId: string
  companyId: string
  endpoint: string
  statusCode: number
  tokensUsed?: number
  ip?: string
  userAgent?: string
  responseTimeMs?: number
}) {
  const [_, updatedKey] = await Promise.all([
    db.apiUsageLog.create({
      data: {
        apiKeyId: params.apiKeyId,
        companyId: params.companyId,
        endpoint: params.endpoint,
        statusCode: params.statusCode,
        tokensUsed: params.tokensUsed || 0,
        ip: params.ip,
        userAgent: params.userAgent,
        responseTimeMs: params.responseTimeMs || 0,
      },
    }),
    db.apiKey.update({
      where: { id: params.apiKeyId },
      data: {
        totalRequests: { increment: 1 },
        totalTokensUsed: { increment: params.tokensUsed || 0 },
        lastUsedAt: new Date(),
      },
    }),
  ])
  return updatedKey
}

// ============================================
// Extract API key from request
// ============================================

export function extractApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer blv_sk_")) {
    return authHeader.slice(7)
  }

  // Also check query param for simplicity
  const url = new URL(request.url)
  const queryKey = url.searchParams.get("api_key")
  if (queryKey?.startsWith("blv_sk_")) {
    return queryKey
  }

  return null
}

// ============================================
// Scope check
// ============================================

export function hasScope(scopes: string[], requiredScope: string): boolean {
  return scopes.includes("*") || scopes.includes(requiredScope)
}

// ============================================
// Default rate limits by plan
// ============================================

export function getDefaultRateLimits(plan: string): { rpm: number; rpd: number } {
  switch (plan) {
    case "ENTERPRISE":
      return { rpm: 200, rpd: 50000 }
    case "PROFESSIONAL":
      return { rpm: 60, rpd: 10000 }
    default:
      return { rpm: 10, rpd: 100 }
  }
}

// ============================================
// Error Responses
// ============================================

export function apikeyAuthError(): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing API key. Provide a valid key via Authorization: Bearer blv_sk_...",
      },
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  )
}

export function apikeyForbiddenError(message: string): Response {
  return new Response(
    JSON.stringify({
      error: { code: "FORBIDDEN", message },
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  )
}

export function apikeyRateLimitError(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMITED",
        message: "API rate limit exceeded. Please retry after the reset time.",
        retryAfterSeconds: Math.ceil(retryAfter / 1000),
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(retryAfter / 1000)),
        "X-RateLimit-Reset": String(Math.ceil(retryAfter / 1000)),
      },
    }
  )
}

export function apikeyNotFoundError(message: string): Response {
  return new Response(
    JSON.stringify({ error: { code: "NOT_FOUND", message } }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  )
}

export function apikeyValidationError(message: string): Response {
  return new Response(
    JSON.stringify({ error: { code: "VALIDATION_ERROR", message } }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  )
}

// ============================================
// Success Response Helper
// ============================================

export function apikeySuccess(data: unknown, meta?: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ data, ...(meta ? { meta } : {}) }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Powered-By": "API",
      },
    }
  )
}
