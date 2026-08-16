// @ts-nocheck
// ============================================
// Dodo Payments Integration
// Handles: checkout creation, webhook verification,
// payment status tracking
//
// Supports: platform-level env config (fallback)
//           + company-specific DB config (priority)
// ============================================

import crypto from "crypto"
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
      : "https://live.dodopayments.com" // Dodo live default
    
    return {
      apiKey: dbConfig.apiKey,
      baseUrl,
      webhookSecret: dbConfig.webhookUrl ?? undefined, // webhookUrl stores the webhook secret or base URL
      provider: dbConfig.provider,
    }
  }
  
  // 2) Fallback: platform-level env variables
  const envApiKey = process.env.DODO_API_KEY
  if (envApiKey) {
    return {
      apiKey: envApiKey,
      baseUrl: process.env.DODO_API_BASE_URL || "https://live.dodopayments.com",
      webhookSecret: process.env.DODO_WEBHOOK_SECRET,
    }
  }
  
  return null
}

// Dodo token add-on product IDs (platform-level, created in Dodo dashboard)
const TOKEN_DODO_PRODUCTS: Record<number, string> = {
  1000000:  "pdt_0Nl0KFXPFHAGE4PvKSC1j",  // 1M tokens — $5
  5000000:  "pdt_0NkbhoLEVpb3RHvZbJmo4",  // 5M tokens — $20
  10000000: "pdt_0NkbhoPEK9CTUAqta1XdT",  // 10M tokens — $35
  50000000: "pdt_0NkbhoREBnXFbaIRadU2q",  // 50M tokens — $150
}

// Create a checkout session with Dodo Payments
// Supports: subscription upgrades (recurring monthly/yearly) and token add-ons (one-time)
// Dodo API: POST {baseUrl}/checkouts with product_cart
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
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"
  const isRecurring = metadata?.isRecurring === "true"
  const isTokenAddon = metadata?.type === "token_addon"
  const lang = metadata?.lang || "ar"
  const billingCycle = metadata?.billingCycle || "monthly"
  
  // === Resolve Dodo Product ID ===
  let dodoProductId: string | null = null
  
  if (isTokenAddon) {
    // Token add-on: use dedicated token product by token amount
    const tokenAmount = parseInt(metadata?.tokenAmount || "0", 10)
    dodoProductId = TOKEN_DODO_PRODUCTS[tokenAmount] || null
    if (!dodoProductId) {
      console.error("[DODO] No token product found for amount:", tokenAmount)
      return null
    }
  } else {
    // Subscription: look up product from DB based on plan + billing cycle
    const targetPlan = metadata?.targetPlan
    if (targetPlan) {
      try {
        const dbPlan = await db.planConfig.findUnique({ where: { planKey: targetPlan } })
        if (dbPlan) {
          dodoProductId = billingCycle === "yearly"
            ? (dbPlan.dodoYearlyProductId || dbPlan.dodoProductId)
            : dbPlan.dodoProductId
        }
      } catch {
        console.warn("[DODO] Could not look up product ID from DB for plan:", targetPlan)
      }
    }
  }
  
  if (!dodoProductId) {
    console.error("[DODO] No Dodo product ID found for this checkout")
    return null
  }
  
  try {
    // Dodo API format: product_cart with product_id (no amount override — product has fixed price)
    const productCartItem: Record<string, unknown> = {
      product_id: dodoProductId,
      quantity: 1,
    }
    
    const checkoutPayload: Record<string, unknown> = {
      product_cart: [productCartItem],
      return_url: `${baseUrl}/${lang}/payment/success?companyId=${companyId}&plan=${metadata?.targetPlan || ""}&sessionId={checkout_id}`,
      metadata: {
        companyId,
        ...metadata,
      },
    }
    
    console.log("[DODO] Creating checkout:", {
      url: `${config.baseUrl}/checkouts`,
      productId: dodoProductId,
      isRecurring,
      isTokenAddon,
      billingCycle,
    })
    
    const response = await fetch(`${config.baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutPayload),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("[DODO_CHECKOUT_ERROR]", response.status, errorText)
      return null
    }
    
    const data = await response.json()
    const checkoutUrl = data.checkout_url || data.url
    const sessionId = data.id || data.session_id
    
    console.log("[DODO] Checkout created:", { sessionId: sessionId?.substring(0, 20), url: checkoutUrl?.substring(0, 60) })
    
    if (!checkoutUrl) {
      console.error("[DODO] No checkout_url in response:", JSON.stringify(data).substring(0, 300))
      return null
    }
    
    return { checkoutUrl, sessionId }
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
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")
    
    const expectedBuf = Buffer.from(expectedSignature, 'utf8')
    const actualBuf = Buffer.from(signature, 'utf8')
    if (expectedBuf.length !== actualBuf.length) return false
    return crypto.timingSafeEqual(expectedBuf, actualBuf)
  } catch {
    console.error("[DODO] Webhook verification failed — crypto error")
    return false
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
      const companyId = (data.metadata as any)?.companyId as string
      const targetPlan = (data.metadata as any)?.targetPlan as string
      const paymentType = (data.metadata as any)?.type as string || "subscription_upgrade"
      const tokenAmount = (data.metadata as any)?.tokenAmount as string
      
      if (companyId) {
        const isTokenAddon = paymentType === "token_addon"
        
        if (isTokenAddon && tokenAmount) {
          // Token add-on purchase: add tokens to company
          const tokenCount = parseInt(tokenAmount, 10)
          await db.company.update({
            where: { id: companyId },
            data: {
              tokenAddOnsPurchased: { increment: tokenCount },
            },
          })
        } else {
          // Subscription upgrade: update plan and token budget
          const updateData: Record<string, unknown> = {}
          
          // Calculate subscription end date based on billing cycle
          const billingCycle = ((data.metadata as any)?.billingCycle as string) || "monthly"
          const monthsToAdd = billingCycle === "yearly" ? 12 : 1
          updateData.subscriptionEndAt = new Date(Date.now() + monthsToAdd * 30 * 24 * 60 * 60 * 1000)
          updateData.subscriptionStartAt = new Date()
          
          if (targetPlan) {
            updateData.subscription = targetPlan
            // Try to get token budget from DB PlanConfig first, then fallback to hardcoded
            try {
              const dbPlan = await db.planConfig.findUnique({ where: { planKey: targetPlan } })
              if (dbPlan) {
                updateData.tokenBudgetMonthly = dbPlan.tokenBudget
                updateData.maxEmployees = dbPlan.maxEmployees
                updateData.maxDepartments = dbPlan.maxDepartments
              } else {
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
              }
            } catch {
              // Fallback if DB query fails
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
            }
          }
          
          await db.company.update({
            where: { id: companyId },
            data: updateData,
          })
        }
        
        // Create payment record (idempotency check)
        try {
          const existingPayment = await db.payment.findUnique({
            where: { providerPaymentId: data.id as string },
          })
          if (existingPayment) {
            console.log("[DODO] Payment already recorded, skipping duplicate:", data.id)
            break
          }
          await db.payment.create({
            data: {
              companyId,
              amount: (data.amount as number) / 100,
              currency: (data.currency as string) || "USD",
              status: "COMPLETED",
              provider: "dodo",
              providerPaymentId: data.id as string,
              type: isTokenAddon ? "TOKEN_ADDON" : "SUBSCRIPTION",
              targetPlan: targetPlan || null,
              tokenAmount: isTokenAddon ? parseInt(tokenAmount, 10) : null,
              metadata: JSON.stringify(data.metadata || {}),
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
      const companyId = (data.metadata as any)?.companyId as string
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
              targetPlan: (data.metadata?.targetPlan as string) || null,
              metadata: JSON.stringify(data.metadata || {}),
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
      const companyId = (data.metadata as any)?.companyId as string
      if (companyId) {
        await db.company.update({
          where: { id: companyId },
          data: { subscription: "FREE_TRIAL" },
        })
      }
      break
    }
    
    default:
      console.log("[DODO_WEBHOOK] Unhandled event type:", type)
  }
}

// ============================================
// Admin helpers — env config & plan sync
// ============================================

// Get Dodo config from environment only (no DB lookup)
export function getDodoEnvConfig(): DodoConfig | null {
  const envApiKey = process.env.DODO_API_KEY
  if (!envApiKey) return null
  return {
    apiKey: envApiKey,
    baseUrl: process.env.DODO_API_BASE_URL || "https://live.dodopayments.com",
    webhookSecret: process.env.DODO_WEBHOOK_SECRET,
  }
}

// Sync plans to Dodo as products (stub — admin can implement later)
export async function syncPlansToDodo(): Promise<{ success: boolean; synced: string[]; errors: string[] }> {
  const config = getDodoEnvConfig()
  if (!config) return { success: false, synced: [], errors: ["No Dodo API key configured"] }
  
  try {
    // List existing products from Dodo
    const res = await fetch(`${config.baseUrl}/products`, {
      headers: { "Authorization": `Bearer ${config.apiKey}` },
    })
    if (!res.ok) return { success: false, synced: [], errors: ["Failed to fetch products"] }
    
    const data = await res.json()
    const existingIds: string[] = (data.items || []).map((p: { id: string }) => p.id)
    
    return { success: true, synced: existingIds, errors: [] }
  } catch (error) {
    return { success: false, synced: [], errors: [String(error)] }
  }
}
