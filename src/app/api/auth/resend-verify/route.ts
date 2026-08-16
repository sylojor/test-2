// ============================================
// API: /api/auth/resend-verify — Resend Verification Code
// POST: { email, lang? }
// Generates new code and sends email
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkAuthRateLimit, getClientIp } from "@/lib/auth"
import { sendVerificationCodeEmail } from "@/lib/email-service"

const errors = {
  rateLimit:    { ar: "محاولات كثيرة — حاول بعد دقيقة", en: "Too many attempts — try again in a minute" },
  missingEmail: { ar: "البريد الإلكتروني مطلوب", en: "Email is required" },
  userNotFound: { ar: "المستخدم غير موجود", en: "User not found" },
  alreadyVerified: { ar: "الحساب مفعّل فعلاً", en: "Account is already verified" },
  serverErr:    { ar: "حدث خطأ", en: "An error occurred" },
}

function getLang(request: NextRequest): "ar" | "en" {
  const lang = request.nextUrl.searchParams.get("lang")
    || request.headers.get("x-lang")
    || "ar"
  return lang === "en" ? "en" : "ar"
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  const lang = getLang(request)
  const err = (msg: { ar: string; en: string }) => msg[lang]
  const clientIp = getClientIp(request)

  const rateLimit = checkAuthRateLimit(clientIp)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: err(errors.rateLimit) }, { status: 429 })
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: err(errors.missingEmail) }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      return NextResponse.json({ error: err(errors.userNotFound) }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: err(errors.alreadyVerified) }, { status: 400 })
    }

    // Generate new code
    const code = generateCode()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    await db.user.update({
      where: { id: user.id },
      data: { verificationCode: code, verificationExpiry: expiry },
    })

    await sendVerificationCodeEmail(user.email, user.name, code, lang)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[RESEND_VERIFY_ERROR]", error)
    return NextResponse.json({ error: err(errors.serverErr) }, { status: 500 })
  }
}
