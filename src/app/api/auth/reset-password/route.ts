// ============================================
// API: Reset Password
// POST /api/auth/reset-password
// { email, code, newPassword } → resets password
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, checkAuthRateLimit, getClientIp } from "@/lib/auth"

const errors = {
  rateLimit:    { ar: "محاولات كثيرة — حاول بعد قليل", en: "Too many attempts — try again later" },
  missingFields:{ ar: "جميع الحقول مطلوبة", en: "All fields are required" },
  codeExpired:  { ar: "الكود منتهي الصلاحية", en: "Code has expired" },
  invalidCode:  { ar: "كود غير صحيح", en: "Invalid code" },
  passShort:    { ar: "كلمة السر لازم 6 حروف على الأقل", en: "Password must be at least 6 characters" },
  serverErr:    { ar: "حدث خطأ", en: "An error occurred" },
  success:      { ar: "تم تغيير كلمة السر بنجاح", en: "Password changed successfully" },
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

  const rateLimit = checkAuthRateLimit(clientIp, "reset-password")
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: err(errors.rateLimit) }, { status: 429 })
  }

  try {
    const { email, code, newPassword } = await request.json()

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: err(errors.missingFields) }, { status: 400 })
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: err(errors.passShort) }, { status: 400 })
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ error: "Password too long" }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    // ANTI-ENUMERATION: Don't reveal if user exists
    if (!user) {
      return NextResponse.json({ error: err(errors.invalidCode) }, { status: 400 })
    }

    if (!user.verificationCode || !user.verificationExpiry) {
      return NextResponse.json({ error: err(errors.invalidCode) }, { status: 400 })
    }

    if (new Date() > user.verificationExpiry) {
      return NextResponse.json({ error: err(errors.codeExpired) }, { status: 400 })
    }

    if (user.verificationCode !== code.trim()) {
      return NextResponse.json({ error: err(errors.invalidCode) }, { status: 400 })
    }

    // Invalidate token immediately (prevent reuse)
    const hashedPassword = await hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verificationCode: null,
        verificationExpiry: null,
      },
    })

    return NextResponse.json({ message: err(errors.success) })
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error)
    return NextResponse.json({ error: err(errors.serverErr) }, { status: 500 })
  }
}
