// ============================================
// API: Verify Payment Status
// GET /api/payments/verify?sessionId=xxx
// Checks Dodo for actual payment status
// ============================================

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId")
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 })
    }

    const apiKey = process.env.DODO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Payment not configured" }, { status: 503 })
    }

    const dodoBase = process.env.DODO_API_BASE_URL || "https://live.dodopayments.com"

    // Fetch checkout status from Dodo
    const res = await fetch(`${dodoBase}/checkouts/${sessionId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    })

    if (!res.ok) {
      console.error("[VERIFY] Dodo API error:", res.status)
      return NextResponse.json({
        verified: false,
        error: "could_not_verify",
        status: "unknown",
      })
    }

    const data = await res.json()

    // Dodo checkout status field
    const status = data.status || data.payment_status || "unknown"
    const isPaid = status === "paid" || status === "completed" || data.payment_status === "paid"

    console.log("[VERIFY] Session", sessionId?.substring(0, 16), "→ status:", status, "→ paid:", isPaid)

    return NextResponse.json({
      verified: true,
      paid: isPaid,
      status,
      amount: data.amount ? data.amount / 100 : null,
      currency: data.currency || null,
    })
  } catch (error) {
    console.error("[VERIFY_ERROR]", error)
    return NextResponse.json({
      verified: false,
      error: "verification_failed",
      status: "unknown",
    })
  }
}
