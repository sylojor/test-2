// ============================================
// API: Test Checkout - $0.01
// POST /api/payments/test-checkout
// Creates a 1-cent Dodo checkout for testing
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

// Test product ID in Dodo ($0.01)
const TEST_PRODUCT_ID = "pdt_0NkiC3ElSdQ8Ps03pXQJn"

export async function POST(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { companyId } = body
    const lang = body.lang || "ar"

    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 })
    }

    const apiKey = process.env.DODO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Dodo not configured" }, { status: 503 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"
    const dodoBase = process.env.DODO_API_BASE_URL || "https://live.dodopayments.com"

    const payload = {
      product_cart: [{
        product_id: TEST_PRODUCT_ID,
        quantity: 1,
      }],
      return_url: `${baseUrl}/${lang}/payment/success?companyId=${companyId}&plan=FREE_TRIAL&sessionId={checkout_id}&test=true`,
      metadata: {
        companyId,
        type: "test_payment",
        lang,
      },
    }

    console.log("[TEST_CHECKOUT] Creating 1-cent test checkout for company:", companyId)

    const res = await fetch(`${dodoBase}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("[TEST_CHECKOUT_ERROR]", res.status, errText)
      return NextResponse.json({ error: "Failed to create test checkout" }, { status: 500 })
    }

    const data = await res.json()
    const checkoutUrl = data.checkout_url || data.url
    const sessionId = data.id || data.session_id

    console.log("[TEST_CHECKOUT] Created:", { sessionId: sessionId?.substring(0, 20) })

    return NextResponse.json({
      checkoutUrl,
      sessionId,
      test: true,
    })
  } catch (error) {
    console.error("[TEST_CHECKOUT_ERROR]", error)
    return NextResponse.json({ error: "Test checkout failed" }, { status: 500 })
  }
}
