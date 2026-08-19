#!/usr/bin/env python3
"""Fix resend-code route to use Resend (email-service.ts) instead of SendGrid"""
filepath = '/home/ubuntu/new-blivo/src/app/api/auth/resend-code/route.ts'

new_content = '''// ============================================
// API: Resend Verification Code
// POST /api/auth/resend-code
// { email } → sends a new 6-digit code via Resend
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendVerificationCodeEmail } from "@/lib/email-service"

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" })
    }

    // Rate limit: max 1 code per 60 seconds
    if (user.verificationExpiry) {
      const timeSinceLastCode = Date.now() - user.verificationExpiry.getTime()
      const elapsed = (10 * 60 * 1000) - timeSinceLastCode // 10 min expiry
      if (elapsed > (10 * 60 * 1000 - 60 * 1000)) {
        return NextResponse.json({ error: "Please wait before requesting a new code" }, { status: 429 })
      }
    }

    const code = generateCode()
    const expiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await db.user.update({
      where: { id: user.id },
      data: {
        verificationCode: code,
        verificationExpiry: expiry,
      },
    })

    const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" as const : "ar" as const
    await sendVerificationCodeEmail(user.email, user.name, code, lang)

    return NextResponse.json({ message: "Verification code sent" })
  } catch (error) {
    console.error("[RESEND_CODE_ERROR]", error)
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 })
  }
}
'''

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Fixed resend-code/route.ts: now uses Resend via email-service.ts')
