// ============================================
// Dodo Payments Integration — BlivoAI
// Correct API implementation using product_cart
// Supports: subscriptions, one-time (token add-ons)
// Auto-creates products in Dodo if missing
// ============================================

import { db } from "@/lib/db"

// --- Types ---
interface DodoConfig {
  apiKey: string
  baseUrl: string
  webhookSecret?: string
}

interface DodoProduct {
  id: string
  name: string
  description?: string
  price: number  // in cents
  currency: string
  type: "one_time" | "recurring"
  recurring_interval?: "monthly" | "yearly"
}

interface DodoCheckoutSession {
  id: string
  checkout_url: string
  status: string
  payment_id?: string
}

// --- Config ---
export function getDodoEnvConfig(): DodoConfig | null {
  const apiKey = process.env.DODO_API_KEY
  if (!apiKey) return null

  const isLive = process.env.DODO_IS_LIVE === "true"
  const baseUrl = isLive
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com"

  return {
    apiKey,
    baseUrl,
    webhookSecret: process.env.DODO_WEBHOOK_SECRET,
  }
}

// Get config: company DB first, then env fallback
export async function getDodoConfig(companyId?: string): Promise<DodoConfig | null> {
  if (companyId) {
    try {
      const dbConfig = await db.platformPaymentConfig.findUnique({
        where: { companyId },
      })
      if (dbConfig?.apiKey) {
        const isLive = dbConfig.provider !== "dodo_test"
        return {
          apiKey: dbConfig.apiKey,
          baseUrl: isLive
            ? "https://live.dodopayments.com"
            : "https://test.dodopayments.com",
          webhookSecret: dbConfig.webhookUrl || undefined,
        }
      }
    } catch {
      // DB config not found, fall through to env
    }
  }

  return getDodoEnvConfig()
}

// --- Product Management ---

// Create a product in Dodo
async function createDodoProduct(
  config: DodoConfig,
  product: {
    name: string
    description: string
    price: number  // in dollars
    currency?: string
    type: "one_time" | "recurring"
    recurringInterval?: "monthly" | "yearly"
  }
): Promise<DodoProduct | null> {
  try {
    const priceInCents = Math.round(product.price * 100)
    const body: Record<string, unknown> = {
      name: product.name,
      description: product.description,
      price: {
        type: product.type === "recurring" ? "recurring_price" : "one_time_price",
        price: priceInCents,
        currency: product.currency || "USD",
        discount: 0,
        tax_inclusive: false,
        purchasing_power_parity: false,
        payment_frequency_interval: product.recurringInterval === "yearly" ? "Year" : "Month",
        payment_frequency_count: 1,
        subscription_period_interval: product.recurringInterval === "yearly" ? "Year" : "Month",
        subscription_period_count: 1,
        trial_period_days: 0,
      },
      tax_category: "saas",
    }

    const response = await fetch(`${config.baseUrl}/products`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[DODO_PRODUCT_CREATE_ERROR]", response.status, errorData)
      return null
    }

    const data = await response.json()
    return {
      id: data.product_id,
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency,
      type: data.type,
      recurring_interval: data.recurring_interval,
    }
  } catch (error) {
    console.error("[DODO_PRODUCT_CREATE_FETCH_ERROR]", error)
    return null
  }
}

// Get or create product for a plan
export async function getOrCreatePlanProduct(
  config: DodoConfig,
  planKey: string,
  planName: string,
  planNameAr: string,
  priceDollars: number,
  isRecurring: boolean = true,
): Promise<string | null> {
  // 1) Check if product ID already stored in DB
  try {
    const planConfig = await db.planConfig.findUnique({
      where: { planKey },
    })

    const storedId = isRecurring
      ? planConfig?.dodoProductId
      : planConfig?.dodoTokenProductId

    if (storedId) {
      // Verify product exists in Dodo
      const checkResponse = await fetch(`${config.baseUrl}/products/${storedId}`, {
        headers: { "Authorization": `Bearer ${config.apiKey}` },
      })
      if (checkResponse.ok) {
        return storedId
      }
      // Product was deleted in Dodo, clear and recreate
      console.warn(`[DODO] Product ${storedId} not found in Dodo, recreating...`)
    }

    // 2) Create product in Dodo
    const product = await createDodoProduct(config, {
      name: `${planName} ${isRecurring ? 'Subscription' : 'Token Top-up'}`,
      description: isRecurring
        ? `BlivoAI ${planName} plan - ${planNameAr} - ${priceDollars > 0 ? `$${priceDollars}/month` : 'Free'}`
        : `BlivoAI Token Add-on for ${planName} plan`,
      price: priceDollars,
      type: isRecurring ? "recurring" : "one_time",
      recurringInterval: "monthly",
    })

    if (!product) return null

    // 3) Store product ID in DB
    const updateField = isRecurring ? "dodoProductId" : "dodoTokenProductId"
    await db.planConfig.update({
      where: { planKey },
      data: { [updateField]: product.id },
    })

    console.log(`[DODO] Created ${isRecurring ? 'subscription' : 'token'} product for ${planKey}: ${product.id}`)
    return product.id
  } catch (error) {
    console.error("[DODO_GET_OR_CREATE_PRODUCT_ERROR]", error)
    return null
  }
}

// --- Checkout Session ---

export async function createDodoCheckout(params: {
  companyId: string
  companyOwnerId?: string
  ownerEmail?: string
  ownerName?: string
  productId: string
  quantity?: number
  lang?: string
  metadata?: Record<string, string>
}): Promise<{ checkoutUrl: string; sessionId: string } | null> {
  const config = await getDodoConfig(params.companyId)
  if (!config) {
    console.error("[DODO] No payment config found")
    return null
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"
  const lang = params.lang || "ar"

  try {
    const body: Record<string, unknown> = {
      product_cart: [
        {
          product_id: params.productId,
          quantity: params.quantity || 1,
        },
      ],
      return_url: `${baseUrl}/${lang}/payment/success`,
      cancel_url: `${baseUrl}/${lang}/payment/cancel`,
      metadata: {
        companyId: params.companyId,
        lang,
        ...(params.metadata || {}),
      },
    }

    // Pre-fill customer info if available
    if (params.ownerEmail || params.ownerName) {
      body.customer = {}
      if (params.ownerEmail) body.customer.email = params.ownerEmail
      if (params.ownerName) body.customer.name = params.ownerName
    }

    console.log(`[DODO] Creating checkout: product=${params.productId}, company=${params.companyId}`)

    const response = await fetch(`${config.baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[DODO_CHECKOUT_ERROR]", response.status, errorData)
      return null
    }

    const data = await response.json()
    const checkoutUrl = data.checkout_url || data.payment_link || data.url
    const sessionId = data.id || data.session_id

    if (!checkoutUrl) {
      console.error("[DODO_CHECKOUT_ERROR] No checkout_url in response:", JSON.stringify(data).slice(0, 500))
      return null
    }

    console.log(`[DODO] Checkout created: ${sessionId} -> ${checkoutUrl.slice(0, 80)}...`)
    return { checkoutUrl, sessionId }
  } catch (error) {
    console.error("[DODO_CHECKOUT_FETCH_ERROR]", error)
    return null
  }
}

// --- Webhook Verification ---
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
    console.warn("[DODO] Webhook verification skipped")
    return true
  }
}

// --- Webhook Event Handler ---
export async function handleDodoWebhookEvent(event: {
  type: string
  data: Record<string, unknown>
}): Promise<void> {
  const { type, data } = event
  console.log(`[DODO_WEBHOOK] Processing: ${type}`)

  switch (type) {
    case "payment.succeeded":
    case "payment.completed": {
      const companyId = data.metadata?.companyId as string
      const targetPlan = data.metadata?.targetPlan as string
      const paymentType = data.metadata?.type as string || "subscription_upgrade"
      const tokenAmount = data.metadata?.tokenAmount as string

      if (!companyId) {
        console.warn("[DODO_WEBHOOK] No companyId in metadata")
        return
      }

      const amount = typeof data.amount === "number" ? data.amount : (typeof data.amount === "string" ? parseFloat(data.amount) : 0)
      const currency = (data.currency as string) || "USD"
      const paymentId = (data.id || data.payment_id) as string

      const isTokenAddon = paymentType === "token_addon"

      try {
        if (isTokenAddon && tokenAmount) {
          // Token add-on: add tokens
          const tokenCount = parseInt(tokenAmount, 10)
          await db.company.update({
            where: { id: companyId },
            data: { tokenAddOnsPurchased: { increment: tokenCount } },
          })
        } else {
          // Subscription upgrade
          const updateData: Record<string, unknown> = {
            subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }

          if (targetPlan && targetPlan !== "FREE_TRIAL") {
            updateData.subscription = targetPlan
            const planConfig = await db.planConfig.findUnique({ where: { planKey: targetPlan } })
            if (planConfig) {
              updateData.tokenBudgetMonthly = planConfig.tokenBudget
            }
          } else {
            updateData.subscription = "ACTIVE"
          }

          await db.company.update({
            where: { id: companyId },
            data: updateData,
          })
        }

        // Record payment
        await db.payment.create({
          data: {
            companyId,
            amount: amount / 100, // Convert from cents
            currency,
            status: "COMPLETED",
            provider: "dodo",
            providerPaymentId: paymentId,
            type: isTokenAddon ? "TOKEN_ADDON" : "SUBSCRIPTION",
            targetPlan: targetPlan || null,
            tokenAmount: isTokenAddon ? parseInt(tokenAmount, 10) : null,
            metadata: JSON.stringify(data.metadata || {}),
          },
        })

        console.log(`[DODO_WEBHOOK] Payment recorded: ${paymentId} for ${companyId}`)
      } catch (error) {
        console.error("[DODO_WEBHOOK] Error processing payment:", error)
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
              amount: (typeof data.amount === "number" ? data.amount : 0) / 100,
              currency: (data.currency as string) || "USD",
              status: "FAILED",
              provider: "dodo",
              providerPaymentId: (data.id || data.payment_id) as string,
              type: "SUBSCRIPTION",
              targetPlan: (data.metadata?.targetPlan as string) || null,
              metadata: JSON.stringify(data.metadata || {}),
            },
          })
        } catch (error) {
          console.error("[DODO_WEBHOOK] Error recording failed payment:", error)
        }
      }
      break
    }

    case "subscription.active":
    case "subscription.renewed": {
      const companyId = data.metadata?.companyId as string
      const targetPlan = data.metadata?.targetPlan as string
      if (companyId) {
        await db.company.update({
          where: { id: companyId },
          data: {
            subscription: targetPlan || "ACTIVE",
            subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        }).catch(() => {})
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
        }).catch(() => {})
      }
      break
    }

    default:
      console.log(`[DODO_WEBHOOK] Unhandled event: ${type}`)
  }
}

// --- Admin: Sync all plans to Dodo ---
export async function syncPlansToDodo(): Promise<{
  success: boolean
  synced: Array<{ planKey: string; productId: string; type: string }>
  errors: string[]
}> {
  const config = getDodoEnvConfig()
  if (!config) {
    return { success: false, synced: [], errors: ["DODO_API_KEY not configured"] }
  }

  const plans = await db.planConfig.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  })

  const synced: Array<{ planKey: string; productId: string; type: string }> = []
  const errors: string[] = []

  for (const plan of plans) {
    if (plan.price === 0) {
      // Free plan doesn't need a Dodo product
      continue
    }

    // Sync subscription product
    try {
      const productId = await getOrCreatePlanProduct(
        config, plan.planKey, plan.name, plan.nameAr, plan.price, true
      )
      if (productId) {
        synced.push({ planKey: plan.planKey, productId, type: "subscription" })
      } else {
        errors.push(`Failed to create product for ${plan.planKey} (subscription)`)
      }
    } catch (e: unknown) {
      errors.push(`${plan.planKey} subscription: ${(e as Error).message}`)
    }
  }

  // Sync token add-on products for paid plans
  const tokenAddons = [
    { tokens: 1_000_000, price: 5, label: "1M" },
    { tokens: 5_000_000, price: 20, label: "5M" },
    { tokens: 10_000_000, price: 35, label: "10M" },
    { tokens: 50_000_000, price: 150, label: "50M" },
  ]

  // Create a generic token add-on product (not per-plan)
  for (const addon of tokenAddons) {
    try {
      // Use ENTERPRISE plan to store token product IDs (or any paid plan)
      const existingPlan = plans.find(p => p.price > 0)
      if (!existingPlan) continue

      const existingTokenId = existingPlan.dodoTokenProductId
      if (existingTokenId) {
        // Check if it still exists
        const check = await fetch(`${config.baseUrl}/products/${existingTokenId}`, {
          headers: { "Authorization": `Bearer ${config.apiKey}` },
        })
        if (check.ok) continue
      }

      // We'll create individual token products
      const product = await createDodoProduct(config, {
        name: `Token Add-on: ${addon.label} Tokens`,
        description: `BlivoAI ${addon.label} token top-up - one-time purchase`,
        price: addon.price,
        type: "one_time",
      })

      if (product) {
        synced.push({ planKey: `tokens_${addon.label}`, productId: product.id, type: "token_addon" })
      }
    } catch (e: unknown) {
      errors.push(`Token ${addon.label}: ${(e as Error).message}`)
    }
  }

  return { success: errors.length === 0, synced, errors }
}

// --- Token Add-on Product Management ---
// Store token product IDs in a simple mapping
const TOKEN_PRODUCT_CACHE: Record<string, string> = {}

export async function getTokenAddonProductId(
  config: DodoConfig,
  tokens: number,
  price: number,
): Promise<string | null> {
  const cacheKey = `tokens_${tokens}`
  if (TOKEN_PRODUCT_CACHE[cacheKey]) return TOKEN_PRODUCT_CACHE[cacheKey]

  // Check if any plan has this token product ID stored
  const plans = await db.planConfig.findMany({
    where: { dodoTokenProductId: { not: null } },
  })

  // For now, create a dedicated product for each token tier
  const label = tokens >= 1_000_000 ? `${tokens / 1_000_000}M` : `${tokens / 1_000}K`
  const product = await createDodoProduct(config, {
    name: `Token Add-on: ${label} Tokens`,
    description: `BlivoAI ${label} token top-up — one-time purchase. Tokens persist until consumed.`,
    price,
    type: "one_time",
  })

  if (product) {
    TOKEN_PRODUCT_CACHE[cacheKey] = product.id
    return product.id
  }

  return null
}
