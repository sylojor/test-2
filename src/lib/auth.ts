// ============================================
// نظام المصادقة والتوثيق (Authentication)
// JWT + bcrypt + Session Management
//
// الميزات:
// - تشفير كلمات السر بـ bcrypt
// - JWT tokens مع مدة صلاحية
// - Rate limiting لمنع هجمات القوة الغاشمة
// - إدارة جلسات آمنة
// - verifyAuth() helper for API routes
// - requireAdmin() helper for admin-only access
//
// SECURITY FIXES:
// - NO hardcoded JWT_SECRET — must come from env
// - NO plaintext password fallback — bcrypt only
// - Proper token verification for ALL routes
// ============================================

import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// --- JWT Configuration (NO hardcoded secret) ---
const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = "7d"
const JWT_ISSUER = "blivoai"

// Validate that JWT_SECRET is set at startup
if (!JWT_SECRET) {
  console.error("[CRITICAL] JWT_SECRET environment variable is not set!")
  console.error("[CRITICAL] All authenticated routes will fail until JWT_SECRET is configured.")
}

// Helper to get JWT secret with runtime check
function getJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured. Authentication cannot proceed.")
  }
  return JWT_SECRET
}

// --- إعدادات Rate Limiting ---
interface RateLimitEntry {
  count: number
  resetAt: number
  blocked: boolean
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const AUTH_RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 30 * 60 * 1000,
}

// --- إعدادات API Rate Limiting ---
interface ApiRateLimitEntry {
  count: number
  resetAt: number
}

const apiRateLimitStore = new Map<string, ApiRateLimitEntry>()
const API_RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  "chat": { maxRequests: 60, windowMs: 60 * 1000 },
  "default": { maxRequests: 120, windowMs: 60 * 1000 },
  "auth": { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  "admin": { maxRequests: 30, windowMs: 60 * 1000 },
}

// ============================================
// تشفير كلمات السر (bcrypt ONLY — no plaintext fallback)
// ============================================

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // SECURITY: Only accept bcrypt hashes. Reject plaintext hashes.
  if (!hash.startsWith("$2a$") && !hash.startsWith("$2b$")) {
    console.error("[SECURITY] Password hash is not bcrypt format. Rejecting authentication.")
    return false
  }
  return bcrypt.compare(password, hash)
}

// ============================================
// JWT Token
// ============================================

export interface JWTPayload {
  userId: string
  email: string
  role: string
  companyId?: string
  ownedCompany?: { id: string; name: string }
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
    }) as JWTPayload
    return decoded
  } catch {
    return null
  }
}

// ============================================
// استخراج Token من الطلب
// ============================================

export function extractToken(request: Request): string | null {
  // 1. من Authorization header
  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  // 2. من Cookie (للمتصفح)
  const cookieHeader = request.headers.get("cookie")
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map(c => {
        const [key, ...v] = c.split("=")
        return [key, v.join("=")]
      })
    )
    if (cookies.oec_token) {
      return cookies.oec_token
    }
  }

  return null
}

// ============================================
// verifyAuth() — Helper for ALL API routes
// Verifies JWT token and returns the payload or null
// ============================================

export function verifyAuth(request: Request): JWTPayload | null {
  const token = extractToken(request)
  if (!token) return null
  return verifyToken(token)
}

// ============================================
// requireAdmin() — Helper for admin-only routes
// Returns the admin payload if valid, or a NextResponse error
// ============================================

export type AdminAuthResult = 
  | { success: true; payload: JWTPayload }
  | { success: false; response: Response }

export function requireAdmin(request: Request): AdminAuthResult {
  const payload = verifyAuth(request)
  
  if (!payload) {
    return {
      success: false,
      response: unauthorizedResponse("غير مصرح — سجّل دخولك"),
    }
  }

  // Only OWNER and ADMIN roles can access admin routes
  if (payload.role !== "OWNER" && payload.role !== "ADMIN") {
    return {
      success: false,
      response: forbiddenResponse("ليس لديك صلاحية مشرف — هذا الإجراء مخصص للمشرفين فقط"),
    }
  }

  return { success: true, payload }
}

// ============================================
// requirePlatformOwner() — OWNER only (platform admin)
// ============================================

export function requirePlatformOwner(request: Request): AdminAuthResult {
  const payload = verifyAuth(request)
  
  if (!payload) {
    return {
      success: false,
      response: unauthorizedResponse("غير مصرح — سجّل دخولك"),
    }
  }

  if (payload.role !== "OWNER") {
    return {
      success: false,
      response: forbiddenResponse("ليس لديك صلاحية — هذا الإجراء مخصص لصاحب المنصة فقط"),
    }
  }

  return { success: true, payload }
}

// ============================================
// Rate Limiting للمصادقة
// ============================================

export function checkAuthRateLimit(identifier: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + AUTH_RATE_LIMIT.windowMs,
      blocked: false,
    })
    return { allowed: true }
  }

  if (entry.blocked) {
    const retryAfterMs = entry.resetAt - now
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) }
  }

  entry.count++

  if (entry.count > AUTH_RATE_LIMIT.maxAttempts) {
    entry.blocked = true
    entry.resetAt = now + AUTH_RATE_LIMIT.blockDurationMs
    return { allowed: false, retryAfterMs: AUTH_RATE_LIMIT.blockDurationMs }
  }

  return { allowed: true }
}

// ============================================
// Rate Limiting للـ API
// ============================================

export function checkApiRateLimit(
  identifier: string,
  category: string = "default"
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const now = Date.now()
  const limit = API_RATE_LIMITS[category] || API_RATE_LIMITS.default
  const key = `${category}:${identifier}`
  const entry = apiRateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    apiRateLimitStore.set(key, {
      count: 1,
      resetAt: now + limit.windowMs,
    })
    return { allowed: true, remaining: limit.maxRequests - 1 }
  }

  if (entry.count >= limit.maxRequests) {
    const retryAfterMs = entry.resetAt - now
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) }
  }

  entry.count++
  return { allowed: true, remaining: limit.maxRequests - entry.count }
}

// ============================================
// تنظيف دوري للحدود (Cleanup)
// ============================================

if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
      if (now > entry.resetAt) rateLimitStore.delete(key)
    })
    Array.from(apiRateLimitStore.entries()).forEach(([key, entry]) => {
      if (now > entry.resetAt) apiRateLimitStore.delete(key)
    })
  }, 10 * 60 * 1000)
}

// ============================================
// Helper: إرجاع IP من الطلب
// ============================================

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }
  return "unknown"
}

// ============================================
// Helper: إنشاء استجابة Rate Limit
// ============================================

export function rateLimitResponse(retryAfterMs: number): Response {
  return new Response(
    JSON.stringify({
      error: "طلبات كثيرة جداً — حاول بعد قليل",
      retryAfter: Math.ceil(retryAfterMs / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    }
  )
}

// ============================================
// Helper: إنشاء استجابة Unauthorized
// ============================================

export function unauthorizedResponse(message: string = "غير مصرح — سجّل دخولك"): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  )
}

// ============================================
// Helper: إنشاء استجابة Forbidden
// ============================================

export function forbiddenResponse(message: string = "ليس لديك صلاحية لهذا الإجراء"): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  )
}
