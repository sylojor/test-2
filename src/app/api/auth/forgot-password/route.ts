// ============================================
// API: Forgot Password
// POST /api/auth/forgot-password
// { email } → sends reset code (anti-enumeration)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkAuthRateLimit, getClientIp } from "@/lib/auth"
import { sendResetPasswordEmail } from "@/lib/email-service"

const errors = {
  rateLimit:    { ar: "محاولات كثيرة — حاول بعد قليل", en: "Too many attempts — try again later" },
  missingEmail: { ar: "البريد الإلكتروني مطلوب", en: "Email is required" },
  serverErr:    { ar: "حدث خطأ", en: "An error occurred" },
}

function getLang(request: NextRequest): "ar" | "en" {
  const lang = request.nextUrl.searchParams.get("lang")
    || request.headers.get("x-lang")
    || "ar"
  return lang === "en" ? "en" : "ar"
}

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  const lang = getLang(request)
  const err = (msg: { ar: string; en: string }) => msg[lang]
  const clientIp = getClientIp(request)

  const rateLimit = checkAuthRateLimit(clientIp, "forgot-password")
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: err(errors.rateLimit) }, { status: 429 })
  }

  try {
    const { email } = await request.json()
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: err(errors.missingEmail) }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    // ANTI-ENUMERATION: Always return success, even if user doesn't exist
    // This prevents attackers from discovering valid emails
    if (!user) {
      return NextResponse.json({
        message: lang === "ar" ? "إذا كان البريد مسجلاً، ستصلك رسالة" : "If the email is registered, you will receive a message",
      })
    }

    // Generate reset code
    const code = generateResetCode()
    const expiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await db.user.update({
      where: { id: user.id },
      data: {
        verificationCode: code,
        verificationExpiry: expiry,
      },
    })

    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"}/${lang === "en" ? "en" : "ar"}/reset-password?code=${code}&email=${encodeURIComponent(user.email)}`
    await sendResetPasswordEmail(user.email, user.name, resetUrl, lang)

    return NextResponse.json({
      message: lang === "ar" ? "إذا كان البريد مسجلاً، ستصلك رسالة" : "If the email is registered, you will receive a message",
    })
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error)
    // Still return generic message to prevent enumeration
    return NextResponse.json({
      message: lang === "ar" ? "إذا كان البريد مسجلاً، ستصلك رسالة" : "If the email is registered, you will receive a message",
    })
  }
}
