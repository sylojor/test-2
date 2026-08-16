// ============================================
// Dodo Payments Integration
// Handles: checkout creation, webhook verification,
// payment status tracking
//
// Supports: platform-level env config (fallback)
//           + company-specific DB config (priority)
// ============================================

import { db } from "@/lib/db"

// Dodo Payments API configuration
interface DodoConfig {
  apiKey: string
  baseUrl: string
  webhookSecret?: string
  provider?: string
}

// Get Dodo config — company DB config first, then env fallback
export async function getDodoConfig(companyId: string): Promise<DodoConfig | null> {
  // 1) Try company-specific config from DB
  const dbConfig = await db.platformPaymentConfig.findUnique({
    where: { companyId },
  })
  
  if (dbConfig?.apiKey) {
    // Use the provider's base URL stored in webhookUrl field (for non-Dodo providers)
    // Or default to Dodo's base URL
    const baseUrl = dbConfig.webhookUrl && dbConfig.provider !== "dodo"
      ? dbConfig.webhookUrl  // For custom/other providers, webhookUrl stores the base URL
      : dbConfig.provider === "stripe" ? "https://api.stripe.com/v1"
      : dbConfig.provider === "paypal" ? "https://api.paypal.com/v1"
      : dbConfig.provider === "lemonsqueezy" ? "https://api.lemonsqueezy.com/v1"
      : "https://api.dodopayments.com/v1" // Dodo default
    
    return {
      apiKey: dbConfig.apiKey,
      baseUrl,
      webhookSecret: dbConfig.webhookUrl, // webhookUrl stores the webhook secret or base URL
      provider: dbConfig.provider,
    }
  }
  
  // 2) Fallback: platform-level env variables
  const envApiKey = process.env.DODO_API_KEY
  if (envApiKey) {
    return {
      apiKey: envApiKey,
      baseUrl: process.env.DODO_API_BASE_URL || "https://api.dodopayments.com/v1",
      webhookSecret: process.env.DODO_WEBHOOK_SECRET,
    }
  }
  
  return null
}

// Create a checkout session with Dodo Payments
export async function createDodoCheckout(
  companyId: string,
  amount: number,
  currency: string = "USD",
  description: string,
  metadata?: Record<string, string>,
): Promise<{ checkoutUrl: string; sessionId: string } | null> {
  const config = await getDodoConfig(companyId)
  if (!config) {
    console.error("[DODO] No payment config found — set DODO_API_KEY env or company config")
    return null
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://demo.blivoai.com"
  
  try {
    const response = await fetch(`${config.baseUrl}/checkout_sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Dodo expects amount in cents
        currency,
        description,
        success_url: `${baseUrl}/payment/success?companyId=${companyId}&plan=${metadata?.targetPlan || ""}`,
        cancel_url: `${baseUrl}/payment/cancel`,
        metadata: {
          companyId,
          ...metadata,
        },
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error("[DODO_CHECKOUT_ERROR]", errorData)
      return null
    }
    
    const data = await response.json()
    return {
      checkoutUrl: data.checkout_url || data.url,
      sessionId: data.id || data.session_id,
    }
  } catch (error) {
    console.error("[DODO_CHECKOUT_FETCH_ERROR]", error)
    return null
  }
}

// Verify a Dodo webhook signature
export function verifyDodoWebhook(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const crypto = require("crypto")
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")
    
    return signature === expectedSignature
  } catch {
    console.warn("[DODO] Webhook verification skipped - crypto not available")
    return true
  }
}

// Handle Dodo webhook event — updates subscription based on targetPlan metadata
export async function handleDodoWebhookEvent(event: {
  type: string
  data: Record<string, unknown>
}): Promise<void> {
  const { type, data } = event
  
  switch (type) {
    case "payment.completed":
    case "payment.succeeded": {
      const companyId = data.metadata?.companyId as string
      const targetPlan = data.metadata?.targetPlan as string
      
      if (companyId) {
        // Update subscription to the target plan specified in checkout metadata
        const updateData: Record<string, unknown> = {
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
        
        if (targetPlan) {
          // Use the specific plan from metadata
          updateData.subscription = targetPlan
          // Also update token budget based on plan
          const SUBSCRIPTION_PLANS = {
            FREE_TRIAL: { tokenBudget: 500_000 },
            STARTER: { tokenBudget: 3_000_000 },
            PROFESSIONAL: { tokenBudget: 15_000_000 },
            ENTERPRISE: { tokenBudget: 50_000_000 },
          }
          const planInfo = SUBSCRIPTION_PLANS[targetPlan as keyof typeof SUBSCRIPTION_PLANS]
          if (planInfo) {
            updateData.tokenBudgetMonthly = planInfo.tokenBudget
          }
        } else {
          // Legacy: just mark as ACTIVE
          updateData.subscription = "ACTIVE"
        }
        
        await db.company.update({
          where: { id: companyId },
          data: updateData,
        })
        
        // Create payment record
        try {
          await db.payment.create({
            data: {
              companyId,
              amount: (data.amount as number) / 100,
              currency: (data.currency as string) || "USD",
              status: "COMPLETED",
              provider: "dodo",
              providerPaymentId: data.id as string,
              type: "SUBSCRIPTION",
            },
          })
        } catch {
          console.warn("[DODO] Could not create payment record")
        }
        
        // Audit log
        try {
          await db.auditLog.create({
            data: {
              companyId,
              action: "subscription_upgraded_via_payment",
              actorType: "SYSTEM",
              details: JSON.stringify({
                targetPlan,
                amount: (data.amount as number) / 100,
                currency: data.currency,
                providerPaymentId: data.id,
              }),
            },
          })
        } catch {
          console.warn("[DODO] Could not create audit log")
        }
      }
      break
    }
    
    case "payment.failed": {
      const companyId = data.metadata?.companyId as string
      if (companyId) {
        try {
          await db.payment.create({
            data: {
              companyId,
              amount: (data.amount as number) / 100,
              currency: (data.currency as string) || "USD",
              status: "FAILED",
              provider: "dodo",
              providerPaymentId: data.id as string,
              type: "SUBSCRIPTION",
            },
          })
        } catch {
          console.warn("[DODO] Could not create payment record")
        }
      }
      break
    }
    
    case "subscription.cancelled":
    case "subscription.expired": {
      const companyId = data.metadata?.companyId as string
      if (companyId) {
        await db.company.update({
          where: { id: companyId },
          data: { subscription: "EXPIRED" },
        })
      }
      break
    }
    
    default:
      console.log("[DODO_WEBHOOK] Unhandled event type:", type)
  }
}
