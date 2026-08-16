// ============================================
// API: Verify Email Code
// POST /api/auth/verify-email
// { email, code } → verifies the 6-digit code
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
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

    // Mark as verified
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
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
