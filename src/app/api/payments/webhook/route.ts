// ============================================
// API: Dodo Payments Webhook
// POST /api/payments/webhook
// Receives payment notifications from Dodo
// Verifies signature, updates subscription status
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyDodoWebhook, handleDodoWebhookEvent } from "@/lib/dodo-payments"

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get("x-dodo-signature") || ""
    const webhookSecret = process.env.DODO_WEBHOOK_SECRET || ""

    // Verify webhook signature (skip if secret not set — for testing)
    if (webhookSecret && !verifyDodoWebhook(rawBody, signature, webhookSecret)) {
      console.error("[DODO_WEBHOOK] Invalid signature — possible forged request")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the event payload
    let event
    try {
      event = JSON.parse(rawBody)
    } catch {
      console.error("[DODO_WEBHOOK] Invalid JSON payload")
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    console.log("[DODO_WEBHOOK] Received event:", event.type, "| ID:", event.data?.id)

    // Process the webhook event
    await handleDodoWebhookEvent(event)

    // Always return 200 to Dodo — they retry on non-200
    return NextResponse.json({ received: true, type: event.type })
  } catch (error) {
    console.error("[DODO_WEBHOOK_ERROR]", error)
    // Still return 200 to prevent Dodo from retrying endlessly
    // We logged the error for debugging
    return NextResponse.json({ received: true, error: "Processing failed" }, { status: 200 })
  }
}

// Health check — GET returns 200 so Dodo knows the endpoint exists
export async function GET() {
  return NextResponse.json({
    status: "active",
    message: "Dodo Payments webhook endpoint is ready",
    timestamp: new Date().toISOString(),
  })
}
