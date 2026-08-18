// ============================================
// API: Verify Email / Forgot Password / Reset Password
// POST /api/auth/verify-email
//
// Unified auth code handler:
//   { email, code }                    → verify email
//   { email, type: "forgot-password" } → send reset code (anti-enumeration)
//   { email, code, newPassword }      → reset password
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code, newPassword, type } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // ============================================
    // FORGOT PASSWORD: Send reset code (anti-enumeration)
    // ============================================
    if (type === "forgot-password") {
      const user = await db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      })
      if (user) {
        const resetCode = generateCode()
        const expiry = new Date(Date.now() + 15 * 60 * 1000)
        await db.user.update({
          where: { id: user.id },
          data: { verificationCode: resetCode, verificationExpiry: expiry },
        })
        const { sendResetPasswordEmail } = await import("@/lib/email-service")
        const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "ar"
        const resetUrl = process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/${lang}/reset-password?code=${resetCode}&email=${encodeURIComponent(user.email)}`
          : `https://blivoai.com/${lang}/reset-password?code=${resetCode}&email=${encodeURIComponent(user.email)}`
        await sendResetPasswordEmail(user.email, user.name, resetUrl, lang as any)
      }
      return NextResponse.json({
        message: "If the email is registered, you will receive a password reset code",
      })
    }

    // ============================================
    // RESET PASSWORD
    // ============================================
    if (type === "reset-password" && newPassword) {
      if (!code || !newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Code and new password (6+ chars) are required" }, { status: 400 })
      }
      const user = await db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      })
      if (!user || !user.verificationCode || !user.verificationExpiry) {
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
      }
      if (new Date() > user.verificationExpiry) {
        return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 })
      }
      if (user.verificationCode !== code.trim()) {
        return NextResponse.json({ error: "Invalid code" }, { status: 400 })
      }
      const { hashPassword } = await import("@/lib/auth")
      const hashedPassword = await hashPassword(newPassword)
      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, verificationCode: null, verificationExpiry: null },
      })
      return NextResponse.json({ message: "Password changed successfully" })
    }

    // ============================================
    // VERIFY EMAIL CODE (original)
    // ============================================
    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ verified: true, message: "Email already verified" })
    }

    if (!user.verificationCode || !user.verificationExpiry) {
      return NextResponse.json({ error: "No verification code found. Request a new one." }, { status: 400 })
    }

    if (new Date() > user.verificationExpiry) {
      return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 })
    }

    if (user.verificationCode !== code.trim()) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExpiry: null,
      },
    })

    return NextResponse.json({ verified: true, message: "Email verified successfully" })
  } catch (error) {
    console.error("[VERIFY_EMAIL_ERROR]", error)
    return NextResponse.json({ error: "Operation failed" }, { status: 500 })
  }
}
