// ============================================
// API: Payment Checkout
// POST /api/payments/checkout
// Creates a Dodo Payments checkout session
// Passes metadata (targetPlan) to Dodo for webhook
//
// SECURITY: Only OWNER role can initiate payment
// ADMIN/VIEWER — must ask the owner to upgrade
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth"
import { createDodoCheckout } from "@/lib/dodo-payments"

export async function POST(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }
    
    // SECURITY: Only OWNER can pay and upgrade subscription
    if (authPayload.role !== "OWNER") {
      return forbiddenResponse("بس صاحب الشركة يقدر يدفع ويرقّي الاشتراك — Only the company owner can pay and upgrade the subscription")
    }
    
    const body = await request.json()
    const { companyId, amount, currency, description, type, metadata } = body
    
    if (!companyId || !amount) {
      return NextResponse.json({ error: "companyId and amount required" }, { status: 400 })
    }
    
    // Merge metadata — includes targetPlan for webhook to update subscription
    const checkoutMetadata = {
      type: type || "subscription_upgrade",
      userId: authPayload.userId,
      ...(metadata || {}),
    }
    
    console.log("[CHECKOUT] Creating checkout:", { companyId, amount, currency, type, metadata: checkoutMetadata })
    
    const checkout = await createDodoCheckout(
      companyId,
      amount,
      currency || "USD",
      description || "BlivoAI Subscription",
      checkoutMetadata,
    )
    
    console.log("[CHECKOUT] Result:", checkout ? { url: checkout.checkoutUrl?.substring(0, 80), sessionId: checkout.sessionId } : "NULL")
    
    if (!checkout) {
      console.error("[CHECKOUT] createDodoCheckout returned null — Dodo config missing or API error")
      return NextResponse.json({ 
        error: "Payment gateway not configured. Please set up Dodo Payments API key in Settings or add DODO_API_KEY to server environment.",
        code: "PAYMENT_NOT_CONFIGURED",
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
