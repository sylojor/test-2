// ============================================
// API: Payment Checkout
// POST /api/payments/checkout
// Creates a Dodo Payments checkout session
// Passes metadata (targetPlan) to Dodo for webhook
//
// ANY authenticated user can pay — like buying online with Visa
// Money goes to the owner's Dodo account (company-level config)
// The paying user just sees the checkout page — no config details
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { createDodoCheckout } from "@/lib/dodo-payments"

export async function POST(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }
    
    // ALL authenticated users can pay — like any online purchase
    // The money goes to the company owner's Dodo account automatically
    // No role restriction needed
    
    const body = await request.json()
    const { companyId, amount, currency, description, type, metadata } = body
    
    if (!companyId || !amount) {
      return NextResponse.json({ error: "companyId and amount required" }, { status: 400 })
    }
    
    // Verify user belongs to this company
    if (authPayload.companyId !== companyId) {
      return NextResponse.json({ error: "You can only pay for your own company" }, { status: 403 })
    }
    
    // Merge metadata — includes targetPlan for webhook to update subscription
    const checkoutMetadata = {
      type: type || "subscription_upgrade",
      userId: authPayload.userId,
      ...(metadata || {}),
    }
    
    const checkout = await createDodoCheckout(
      companyId,
      amount,
      currency || "USD",
      description || "BlivoAI Subscription",
      checkoutMetadata,
    )
    
    if (!checkout) {
      // Generic message — no technical details about payment config
      return NextResponse.json({ 
        error: "Payment service is currently unavailable",
      }, { status: 503 })
    }
    
    return NextResponse.json({
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
    })
  } catch (error) {
    console.error("[CHECKOUT_ERROR]", error)
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 })
  }
}
