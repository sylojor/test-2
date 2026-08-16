// @ts-nocheck
// ============================================
// API تسجيل الدخول — Login (Security-hardened)
// إيميل + كلمة سر → JWT Token + جلسة
//
// SECURITY FIXES:
// - NO plaintext password fallback — bcrypt only
// - If a password is not bcrypt format, authentication is REJECTED
// - Rate limiting لمنع هجمات القوة الغاشمة
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword, generateToken, checkAuthRateLimit, getClientIp } from "@/lib/auth"
import { logActivity } from "@/lib/activity-logger"
import { ACTIONS } from "@/lib/activity-logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body
    const clientIp = getClientIp(request)

    // --- Rate Limiting ---
    const rateLimit = checkAuthRateLimit(clientIp)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED", retryAfter: Math.ceil((rateLimit.retryAfterMs || 0) / 1000) },
        { status: 429 }
      )
    }

    // --- التحقق من المدخلات ---
    if (!email || !password) {
      return NextResponse.json(
        { error: "MISSING_CREDENTIALS" },
        { status: 400 }
      )
    }

    // --- البحث عن المستخدم ---
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        ownedCompany: {
          include: {
            departments: true,
            employees: {
              where: { status: { not: "DELETED" } },
            },
          },
        },
      },
    })

    if (!user) {
      logActivity({ action: ACTIONS.LOGIN_FAILED, userEmail: email, ip: clientIp, success: false, error: "User not found", statusCode: 401, path: "/api/auth/login", method: "POST" }).catch(() => {})
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "EMAIL_NOT_VERIFIED", email: user.email },
        { status: 403 }
      )
    }

    // --- التحقق من كلمة السر (bcrypt ONLY — no plaintext fallback) ---
    // SECURITY: If password is not bcrypt format, reject authentication
    const passwordValid = await verifyPassword(password, user.password)

    if (!passwordValid) {
      logActivity({ action: ACTIONS.LOGIN_FAILED, userId: user.id, userEmail: user.email, ip: clientIp, success: false, error: "Wrong password", statusCode: 401, path: "/api/auth/login", method: "POST" }).catch(() => {})
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 }
      )
    }

    // --- إنشاء JWT Token ---
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: (user.ownedCompany?.id || user.companyId) ?? undefined,
    })

    // --- إرجاع بيانات المستخدم + الشركة + التوكن ---
    const responseData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      company: user.ownedCompany
        ? {
            id: user.ownedCompany.id,
            name: user.ownedCompany.name,
            description: user.ownedCompany.description,
            industry: user.ownedCompany.industry,
            dialect: user.ownedCompany.dialect,
            tone: user.ownedCompany.tone,
            logoUrl: user.ownedCompany.logoUrl,
            ownerId: user.ownedCompany.ownerId,
            subscription: user.ownedCompany.subscription,
            tokenBudgetMonthly: user.ownedCompany.tokenBudgetMonthly ?? 0,
            tokenUsedMonthly: user.ownedCompany.tokenUsedMonthly ?? 0,
            tokenBudgetResetAt: user.ownedCompany.tokenBudgetResetAt,
            tokenAddOnsPurchased: user.ownedCompany.tokenAddOnsPurchased ?? 0,
            tokenAddOnsUsed: user.ownedCompany.tokenAddOnsUsed ?? 0,
            subscriptionStartAt: user.ownedCompany.subscriptionStartAt,
            subscriptionEndAt: user.ownedCompany.subscriptionEndAt,
            createdAt: user.ownedCompany.createdAt,
            updatedAt: user.ownedCompany.updatedAt,
          }
        : null,
      departments: user.ownedCompany?.departments ?? [],
      employees: user.ownedCompany?.employees ?? [],
      token,
    }

    const response = NextResponse.json(responseData)

    // تعيين JWT كـ HttpOnly Cookie
    response.cookies.set("oec_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    })

    // Log activity (fire-and-forget — don't block response on log failure)
    logActivity({ action: ACTIONS.LOGIN, userId: user.id, userEmail: user.email, userRole: user.role, ip: clientIp, details: { role: user.role, companyId: user.companyId }, statusCode: 200, path: "/api/auth/login", method: "POST" }).catch(() => {})

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "LOGIN_ERROR" },
      { status: 500 }
    )
  }
}
