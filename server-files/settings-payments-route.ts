// ============================================
// API: Payment Settings — Multi-provider support
// GET  — Get payment configuration for company
// POST — Save payment configuration (any provider)
// PATCH — Test payment connection
// DELETE — Remove payment configuration
//
// Supports: Dodo, Stripe, PayPal, or any provider
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

const PAYMENT_PROVIDERS = [
  { id: "dodo", name: "Dodo Payments", nameAr: "دودو بايمنتس", icon: "🦤", baseUrl: "https://api.dodopayments.com/v1", signupUrl: "https://dodopayments.com/" },
  { id: "stripe", name: "Stripe", nameAr: "سترايب", icon: "💳", baseUrl: "https://api.stripe.com/v1", signupUrl: "https://stripe.com/" },
  { id: "paypal", name: "PayPal", nameAr: "باي بال", icon: "🅿️", baseUrl: "https://api.paypal.com/v1", signupUrl: "https://developer.paypal.com/" },
  { id: "lemonsqueezy", name: "Lemon Squeezy", nameAr: "ليمون سكويزي", icon: "🍋", baseUrl: "https://api.lemonsqueezy.com/v1", signupUrl: "https://lemonsqueezy.com/" },
  { id: "custom", name: "Custom Gateway", nameAr: "بوابة مخصصة", icon: "🔧", baseUrl: "", signupUrl: "" },
]

export async function GET(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    // Get company from auth
    const company = await db.company.findFirst({
      where: { ownerId: authPayload.userId },
    })

    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 })
    }

    // Get payment config for this company
    const paymentConfig = await db.platformPaymentConfig.findUnique({
      where: { companyId: company.id },
    })

    return NextResponse.json({
      config: paymentConfig ? {
        provider: paymentConfig.provider,
        apiKeyMasked: paymentConfig.apiKey ? `****${paymentConfig.apiKey.slice(-4)}` : null,
        webhookUrl: paymentConfig.webhookUrl,
        baseUrl: paymentConfig.webhookUrl || "", // reuse webhookUrl field for baseUrl temporarily
        connected: paymentConfig.isConnected,
      } : null,
      providers: PAYMENT_PROVIDERS,
      currentProvider: paymentConfig?.provider || null,
    })
  } catch (error) {
    console.error("[GET_PAYMENT_SETTINGS_ERROR]", error)
    return NextResponse.json({
      config: null,
      providers: PAYMENT_PROVIDERS,
      currentProvider: null,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const company = await db.company.findFirst({
      where: { ownerId: authPayload.userId },
    })

    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 })
    }

    const body = await request.json()
    const { provider, apiKey, webhookSecret, baseUrl } = body

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 })
    }

    // Validate provider
    const validProvider = PAYMENT_PROVIDERS.find(p => p.id === provider)
    if (!validProvider) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    // Upsert payment config
    const updated = await db.platformPaymentConfig.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        provider,
        apiKey,
        webhookUrl: webhookSecret || validProvider.baseUrl,
        isConnected: true,
      },
      update: {
        provider,
        apiKey,
        webhookUrl: webhookSecret || validProvider.baseUrl,
        isConnected: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Payment gateway saved and activated",
      config: {
        provider: updated.provider,
        apiKeyMasked: `****${updated.apiKey.slice(-4)}`,
        connected: updated.isConnected,
      },
    })
  } catch (error) {
    console.error("[SAVE_PAYMENT_SETTINGS_ERROR]", error)
    return NextResponse.json({ error: "Error saving payment settings" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const company = await db.company.findFirst({
      where: { ownerId: authPayload.userId },
    })

    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 })
    }

    // Test connection — try to make a simple API call to the provider
    const paymentConfig = await db.platformPaymentConfig.findUnique({
      where: { companyId: company.id },
    })

    if (!paymentConfig?.apiKey) {
      return NextResponse.json({ success: false, message: "No API key configured" })
    }

    const providerInfo = PAYMENT_PROVIDERS.find(p => p.id === paymentConfig.provider)
    const testUrl = providerInfo?.baseUrl || "https://api.dodopayments.com/v1"

    try {
      const res = await fetch(`${testUrl}/products`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${paymentConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      })

      // If we get any response (even 401 = wrong key, 404 = correct key but no products)
      // 200/201/404 = connection works, 401/403 = key invalid
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({
          success: false,
          message: `Connection failed — API key appears invalid (${res.status})`,
        })
      }

      return NextResponse.json({
        success: true,
        message: `Connected to ${providerInfo?.name || paymentConfig.provider} successfully`,
      })
    } catch (fetchError) {
      // Network errors = can't reach the server at all
      return NextResponse.json({
        success: false,
        message: `Cannot reach ${providerInfo?.name || paymentConfig.provider} — check your network or base URL`,
      })
    }
  } catch (error) {
    console.error("[TEST_PAYMENT_ERROR]", error)
    return NextResponse.json({ success: false, message: "Test failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const company = await db.company.findFirst({
      where: { ownerId: authPayload.userId },
    })

    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 })
    }

    await db.platformPaymentConfig.deleteMany({
      where: { companyId: company.id },
    })

    return NextResponse.json({ success: true, message: "Payment gateway removed" })
  } catch (error) {
    console.error("[DELETE_PAYMENT_SETTINGS_ERROR]", error)
    return NextResponse.json({ error: "Error removing payment settings" }, { status: 500 })
  }
}
