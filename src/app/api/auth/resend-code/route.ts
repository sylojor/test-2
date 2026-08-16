// ============================================
// API: Resend Verification Code
// POST /api/auth/resend-code
// { email } → sends a new 6-digit code via SendGrid
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendVerificationEmail(email: string, name: string, code: string): Promise<boolean> {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@blivoai.com"

  if (!SENDGRID_API_KEY) {
    console.warn("[SENDGRID] SENDGRID_API_KEY not set — skipping email send")
    return false
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email, name }],
            dynamic_template_data: { code, name },
          },
        ],
        from: { email: FROM_EMAIL, name: "BlivoAI" },
        subject: `Your BlivoAI verification code: ${code}`,
        content: [
          {
            type: "text/plain",
            value: `Hi ${name},\n\nYour BlivoAI verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\n— BlivoAI Team`,
          },
        ],
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[SENDGRID_ERROR]", error)
    return false
  }
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

    await sendVerificationEmail(user.email, user.name, code)

    return NextResponse.json({ message: "Verification code sent" })
  } catch (error) {
    console.error("[RESEND_CODE_ERROR]", error)
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 })
  }
}
