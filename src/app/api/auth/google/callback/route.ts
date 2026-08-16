// ============================================
// Google OAuth Callback
// GET /api/auth/google/callback?code=...
//
// Google redirects here after user selects account
// We exchange code for tokens, verify, login/register
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword, generateToken } from "@/lib/auth"

async function exchangeCodeForToken(code: string): Promise<any> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ""
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"}/api/auth/google/callback`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error("[GOOGLE_TOKEN_EXCHANGE_ERROR]", err)
    return null
  }

  return tokenRes.json()
}

async function getUserInfo(accessToken: string): Promise<any> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const lang = searchParams.get("state") || "ar"

    if (error) {
      console.error("[GOOGLE_AUTH_ERROR]", error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"}/${lang}?google_error=1`)
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"}/${lang}?google_error=1`)
    }

    const tokenData = await exchangeCodeForToken(code)
    if (!tokenData?.access_token) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"}/${lang}?google_error=1`)
    }

    const googleUser = await getUserInfo(tokenData.access_token)
    if (!googleUser?.email) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"}/${lang}?google_error=1`)
    }

    const email = googleUser.email.toLowerCase()
    const name = googleUser.name || "Google User"

    let user = await db.user.findUnique({ where: { email } })
    let isNewUser = false

    if (!user) {
      const randomPassword = await hashPassword(Math.random().toString(36).slice(2) + Date.now().toString(36))
      user = await db.user.create({
        data: { email, name, password: randomPassword, role: "VIEWER" },
      })
      isNewUser = true
    }

    const jwtToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
    })

    let company: any = null
    let employees: any[] = []
    let departments: any[] = []

    if (user.companyId) {
      company = await db.company.findUnique({
        where: { id: user.companyId },
        include: { employees: true, departments: { orderBy: { name: "asc" } } },
      })
      if (company) {
        employees = company.employees
        departments = company.departments
        company = { ...company, employees: undefined, departments: undefined }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"
    const redirectUrl = new URL(`/${lang}`, baseUrl)

    if (isNewUser || !company) {
      redirectUrl.searchParams.set("google_signup", "1")
      redirectUrl.searchParams.set("google_name", name)
      redirectUrl.searchParams.set("google_email", email)
    } else {
      redirectUrl.searchParams.set("google_login", "1")
    }

    const response = NextResponse.redirect(redirectUrl.toString())

    response.cookies.set("oec_token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    })

    return response
  } catch (err) {
    console.error("[GOOGLE_CALLBACK_ERROR]", err)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"
    return NextResponse.redirect(`${baseUrl}/ar?google_error=1`)
  }
}
