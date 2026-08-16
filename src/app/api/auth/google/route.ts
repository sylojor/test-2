// ============================================
// API: تسجيل الدخول بـ Google
// POST /api/auth/google
//
// يتحقق من Google ID Token و:
// - لو المستخدم موجود → يسجل دخوله
// - لو جديد → ينشئ حساب جديد ويحوله لإنشاء شركة
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, generateToken, checkAuthRateLimit, getClientIp } from "@/lib/auth"

interface GoogleTokenPayload {
  sub: string
  email: string
  email_verified: boolean
  name: string
  picture?: string
  given_name?: string
  family_name?: string
}

async function verifyGoogleToken(token: string): Promise<GoogleTokenPayload | null> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    )
    if (!response.ok) return null
    const data = await response.json()
    
    // تحقق إن التوكين لينا
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (clientId && data.aud !== clientId) {
      console.error("[GOOGLE_AUTH] Audience mismatch:", data.aud, "vs", clientId)
      return null
    }
    
    return data as GoogleTokenPayload
  } catch (error) {
    console.error("[GOOGLE_AUTH] Token verification failed:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token: googleToken } = body
    const clientIp = getClientIp(request)

    if (!googleToken || typeof googleToken !== "string") {
      return NextResponse.json({ error: "Google token is required" }, { status: 400 })
    }

    // --- Rate Limiting ---
    const rateLimit = checkAuthRateLimit(clientIp)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "محاولات كثيرة جداً — حاول بعد قليل" },
        { status: 429 }
      )
    }

    // --- تحقق من Google Token ---
    const googleUser = await verifyGoogleToken(googleToken)
    if (!googleUser) {
      return NextResponse.json({ error: "فشل التحقق من Google" }, { status: 401 })
    }

    if (!googleUser.email_verified) {
      return NextResponse.json({ error: "الإيميل مو مفعل عند Google" }, { status: 401 })
    }

    const email = googleUser.email.toLowerCase()
    const name = googleUser.name || googleUser.given_name || "Google User"

    // --- هل المستخدم موجود؟ ---
    let user = await db.user.findUnique({ where: { email } })
    let isNewUser = false

    if (!user) {
      // إنشاء حساب جديد بكلمة سر عشوائية (لأن Google هو المصادق)
      const randomPassword = await hashPassword(Math.random().toString(36).slice(2) + Date.now().toString(36))
      
      user = await db.user.create({
        data: {
          email,
          name,
          password: randomPassword,
          role: "OWNER",
        },
      })
      isNewUser = true
    }

    // --- إنشاء JWT Token ---
    const jwtToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
    })

    // --- جلب بيانات الشركة إذا موجودة ---
    let company = null
    let employees: any[] = []
    let departments: any[] = []

    if (user.companyId) {
      company = await db.company.findUnique({
        where: { id: user.companyId },
        include: {
          employees: true,
          departments: { orderBy: { name: "asc" } },
        },
      })
      if (company) {
        employees = company.employees
        departments = company.departments
        company = { ...company, employees: undefined, departments: undefined }
      }
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      company,
      employees,
      departments,
      isNewUser,
    })

    // تعيين JWT كـ HttpOnly Cookie
    response.cookies.set("oec_token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    })

    return response

  } catch (error) {
    console.error("[GOOGLE_AUTH_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول بـ Google" }, { status: 500 })
  }
}
