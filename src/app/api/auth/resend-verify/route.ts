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

  const rateLimit = checkAuthRateLimit(clientIp, "resend-verify")
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: err(errors.rateLimit) }, { status: 429 })
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: err(errors.missingEmail) }, { status: 400 })
    }

    
// PATCH: Also handle forgot-password and reset-password from this route
// (to avoid Docker build context cache issues)

    // Check if this is a forgot-password request
    if (body.type === 'forgot-password' || body.forgot) {
      const user = await db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      })
      // Anti-enumeration: always return success
      if (user) {
        const code = generateCode()
        const expiry = new Date(Date.now() + 15 * 60 * 1000)
        await db.user.update({
          where: { id: user.id },
          data: { verificationCode: code, verificationExpiry: expiry },
        })
        const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://blivoai.com'}/${lang === 'en' ? 'en' : 'ar'}/reset-password?code=${code}&email=${encodeURIComponent(user.email)}`
        const { sendResetPasswordEmail } = await import('@/lib/email-service')
        await sendResetPasswordEmail(user.email, user.name, resetUrl, lang)
      }
      return NextResponse.json({ message: lang === 'ar' ? 'إذا كان البريد مسجلاً، ستصلك رسالة' : 'If the email is registered, you will receive a message' })
    }

    // Check if this is a reset-password request
    if (body.type === 'reset-password' || (body.resetCode && body.newPassword)) {
      const code = body.resetCode || body.code
      const newPassword = body.newPassword
      if (!code || !newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: lang === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required' }, { status: 400 })
      }
      const user = await db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      })
      if (!user || !user.verificationCode || !user.verificationExpiry) {
        return NextResponse.json({ error: lang === 'ar' ? 'كود غير صحيح' : 'Invalid code' }, { status: 400 })
      }
      if (new Date() > user.verificationExpiry) {
        return NextResponse.json({ error: lang === 'ar' ? 'الكود منتهي الصلاحية' : 'Code has expired' }, { status: 400 })
      }
      if (user.verificationCode !== code.trim()) {
        return NextResponse.json({ error: lang === 'ar' ? 'كود غير صحيح' : 'Invalid code' }, { status: 400 })
      }
      const { hashPassword } = await import('@/lib/auth')
      const hashedPassword = await hashPassword(newPassword)
      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, verificationCode: null, verificationExpiry: null },
      })
      return NextResponse.json({ message: lang === 'ar' ? 'تم تغيير كلمة السر بنجاح' : 'Password changed successfully' })
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
