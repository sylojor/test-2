// ============================================
// API: /api/auth/verify — Verify Email Code
// POST: { email, code, lang? }
// Sets emailVerified=true and returns JWT token
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateToken, checkAuthRateLimit, getClientIp } from "@/lib/auth"

const errors = {
  rateLimit:    { ar: "محاولات كثيرة — حاول بعد قليل", en: "Too many attempts — try again later" },
  missingEmail: { ar: "البريد الإلكتروني مطلوب", en: "Email is required" },
  missingCode: { ar: "كود التفعيل مطلوب", en: "Verification code is required" },
  userNotFound: { ar: "المستخدم غير موجود", en: "User not found" },
  invalidCode:  { ar: "كود التفعيل غلط", en: "Invalid verification code" },
  codeExpired:  { ar: "كود التفعيل منتهي الصلاحية — أعد إرساله", en: "Code expired — please request a new one" },
  alreadyVerified: { ar: "الحساب مفعّل فعلاً", en: "Account is already verified" },
  serverErr:    { ar: "حدث خطأ", en: "An error occurred" },
}

function getLang(request: NextRequest): "ar" | "en" {
  const lang = request.nextUrl.searchParams.get("lang")
    || request.headers.get("x-lang")
    || "ar"
  return lang === "en" ? "en" : "ar"
}

export async function POST(request: NextRequest) {
  const lang = getLang(request)
  const err = (msg: { ar: string; en: string }) => msg[lang]
  const clientIp = getClientIp(request)

  // Rate limit
  const rateLimit = checkAuthRateLimit(clientIp)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: err(errors.rateLimit) }, { status: 429 })
  }

  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: err(!email ? errors.missingEmail : errors.missingCode) },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      return NextResponse.json({ error: err(errors.userNotFound) }, { status: 404 })
    }

    if (user.emailVerified) {
      // Already verified — return token so they can proceed
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
      const response = NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: true },
        token,
        alreadyVerified: true,
      })
      response.cookies.set("oec_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      })
      return response
    }

    // Check code
    if (user.verificationCode !== code) {
      return NextResponse.json({ error: err(errors.invalidCode) }, { status: 400 })
    }

    // Check expiry
    if (user.verificationExpiry && new Date() > user.verificationExpiry) {
      return NextResponse.json({ error: err(errors.codeExpired) }, { status: 400 })
    }

    // Verify!
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExpiry: null,
      },
    })

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: true },
      token,
    })

    response.cookies.set("oec_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[VERIFY_ERROR]", error)
    return NextResponse.json({ error: err(errors.serverErr) }, { status: 500 })
  }
}
