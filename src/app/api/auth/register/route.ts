// ============================================
// API: Race-safe registration with P2002 handling
// POST /api/auth/register
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { hashPassword, checkAuthRateLimit, getClientIp } from "@/lib/auth"
import { sendVerificationCodeEmail } from "@/lib/email-service"

const errors = {
  rateLimit:   { ar: "محاولات كثيرة جداً — حاول بعد قليل", en: "Too many attempts — try again later" },
  nameReq:     { ar: "الاسم مطلوب (2 حروف على الأقل)", en: "Name is required (at least 2 characters)" },
  emailInv:    { ar: "البريد الإلكتروني مش صحيح", en: "Invalid email address" },
  passShort:   { ar: "كلمة السر لازم 6 حروف على الأقل", en: "Password must be at least 6 characters" },
  passLong:    { ar: "كلمة السر طويلة كتير", en: "Password is too long" },
  emailExists: { ar: "هاد الإيميل مسجل فعلاً", en: "This email is already registered" },
  serverErr:   { ar: "حدث خطأ أثناء التسجيل", en: "Registration failed" },
  emailFail:   { ar: "فشل إرسال كود التفعيل", en: "Failed to send verification code" },
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

  try {
    const body = await request.json()
    const { name, email, password } = body
    const clientIp = getClientIp(request)

    const rateLimit = checkAuthRateLimit(clientIp)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: err(errors.rateLimit) }, { status: 429 })
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: err(errors.nameReq) }, { status: 400 })
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: err(errors.emailInv) }, { status: 400 })
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: err(errors.passShort) }, { status: 400 })
    }
    if (password.length > 128) {
      return NextResponse.json({ error: err(errors.passLong) }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)
    const code = generateCode()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    // Race-safe: handle P2002 unique constraint from concurrent requests
    let user
    try {
      user = await db.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          role: "ADMIN",
          verificationCode: code,
          verificationExpiry: expiry,
          emailVerified: false,
        },
      })
    } catch (createError: any) {
      if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === "P2002") {
        return NextResponse.json({ error: err(errors.emailExists) }, { status: 409 })
      }
      throw createError
    }

    const emailSent = await sendVerificationCodeEmail(user.email, user.name, code, lang)
    if (!emailSent) {
      console.error("[REGISTER] Failed to send verification email to", user.email)
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: false },
      requiresVerification: true,
    }, { status: 201 })

  } catch (error) {
    console.error("[REGISTER_ERROR]", error)
    return NextResponse.json({ error: err(errors.serverErr) }, { status: 500 })
  }
}
