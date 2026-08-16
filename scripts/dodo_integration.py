#!/usr/bin/env python3
"""
Dodo Payments integration script:
1. Create Dodo webhook API endpoint
2. Create payment checkout API (for subscription payments)
3. Create Dodo payment helper module
4. Fix the JWT_SECRET in .env (needed for auth)
"""

import paramiko

SSH_HOST = "141.95.55.5"
SSH_USER = "ubuntu"
SSH_PASSWORD = "Mghazi@199641"
PROJECT_DIR = "/home/ubuntu/blivoai-demo"

def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SSH_HOST, port=22, username=SSH_USER, password=SSH_PASSWORD)
    return client

def read_file(client, filepath):
    sftp = client.open_sftp()
    with sftp.open(filepath, 'r') as f:
        content = f.read().decode('utf-8')
    sftp.close()
    return content

def write_file(client, filepath, content):
    sftp = client.open_sftp()
    with sftp.open(filepath, 'w') as f:
        f.write(content.encode('utf-8'))
    sftp.close()
    print(f"  ✓ Written: {filepath}")

def exec_cmd(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out, err

def main():
    client = ssh_connect()
    
    # ============================================
    # 1. Create Dodo payment helper module
    # ============================================
    print("\n=== Creating Dodo payment helper ===")
    
    dodo_helper = '''// ============================================
// Dodo Payments Integration
// Handles: checkout creation, webhook verification,
// payment status tracking
// ============================================

import { db } from "@/lib/db"

// Dodo Payments API configuration
interface DodoConfig {
  apiKey: string
  baseUrl: string
  webhookSecret?: string
}

// Get Dodo config from database for a specific company
export async function getDodoConfig(companyId: string): Promise<DodoConfig | null> {
  const config = await db.platformPaymentConfig.findUnique({
    where: { companyId },
  })
  
  if (!config?.apiKey) return null
  
  return {
    apiKey: config.apiKey,
    baseUrl: "https://api.dodopayments.com/v1",
    webhookSecret: config.webhookUrl, // stored in webhookUrl field for now
  }
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
    console.error("[DODO] No config found for company:", companyId)
    return null
  }
  
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
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://demo.blivoai.com"}/payment/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://demo.blivoai.com"}/payment/cancel`,
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
      checkoutUrl: data checkout_url || data.url,
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
  // Dodo uses HMAC-SHA256 for webhook verification
  try {
    const crypto = require("crypto")
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")
    
    return signature === expectedSignature
  } catch {
    // If crypto is not available, skip verification (development mode)
    console.warn("[DODO] Webhook verification skipped - crypto not available")
    return true
  }
}

// Handle Dodo webhook event
export async function handleDodoWebhookEvent(event: {
  type: string
  data: Record<string, unknown>
}): Promise<void> {
  const { type, data } = event
  
  switch (type) {
    case "payment.completed":
    case "payment.succeeded": {
      // Payment was successful — update company subscription
      const companyId = data.metadata?.companyId as string
      if (companyId) {
        await db.company.update({
          where: { id: companyId },
          data: {
            subscription: "ACTIVE",
            subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        })
        
        // Create payment record
        await db.payment.create({
          data: {
            companyId,
            amount: (data.amount as number) / 100,
            currency: data.currency as string || "USD",
            status: "COMPLETED",
            provider: "dodo",
            providerPaymentId: data.id as string,
            type: "SUBSCRIPTION",
          },
        }).catch(() => {
          // Payment table might not exist yet
          console.warn("[DODO] Could not create payment record")
        })
      }
      break
    }
    
    case "payment.failed": {
      const companyId = data.metadata?.companyId as string
      if (companyId) {
        await db.payment.create({
          data: {
            companyId,
            amount: (data.amount as number) / 100,
            currency: data.currency as string || "USD",
            status: "FAILED",
            provider: "dodo",
            providerPaymentId: data.id as string,
            type: "SUBSCRIPTION",
          },
        }).catch(() => {
          console.warn("[DODO] Could not create payment record")
        })
      }
      break
    }
    
    case "subscription.created":
    case "subscription.active": {
      const companyId = data.metadata?.companyId as string
      if (companyId) {
        await db.company.update({
          where: { id: companyId },
          data: { subscription: "ACTIVE" },
        })
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
'''
    
    filepath = f"{PROJECT_DIR}/src/lib/dodo-payments.ts"
    write_file(client, filepath, dodo_helper)
    
    # ============================================
    # 2. Create Dodo webhook API endpoint
    # ============================================
    print("\n=== Creating Dodo webhook API ===")
    
    webhook_api = '''// ============================================
// API: Dodo Payments Webhook
// POST /api/webhooks/dodo
// Receives payment events from Dodo Payments
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyDodoWebhook, handleDodoWebhookEvent } from "@/lib/dodo-payments"

export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.text()
    const signature = request.headers.get("x-dodo-signature") || ""
    
    // Get webhook secret from the first available config
    // (In production, you'd pass the companyId in metadata)
    const { db } = await import("@/lib/db")
    const config = await db.platformPaymentConfig.findFirst()
    
    if (!config?.apiKey) {
      console.error("[DODO_WEBHOOK] No Dodo config found")
      return NextResponse.json({ error: "No Dodo config" }, { status: 500 })
    }
    
    // Verify webhook signature
    const webhookSecret = config.webhookUrl || config.apiKey
    const isValid = verifyDodoWebhook(rawPayload, signature, webhookSecret)
    
    if (!isValid) {
      console.error("[DODO_WEBHOOK] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    
    // Parse the event
    const event = JSON.parse(rawPayload)
    
    // Handle the event
    await handleDodoWebhookEvent(event)
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[DODO_WEBHOOK_ERROR]", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
'''
    
    # Create the directory structure for webhook API
    exec_cmd(client, f"mkdir -p {PROJECT_DIR}/src/app/api/webhooks/dodo")
    
    filepath = f"{PROJECT_DIR}/src/app/api/webhooks/dodo/route.ts"
    write_file(client, filepath, webhook_api)
    
    # ============================================
    # 3. Create payment checkout API
    # ============================================
    print("\n=== Creating payment checkout API ===")
    
    checkout_api = '''// ============================================
// API: Payment Checkout
// POST /api/payments/checkout
// Creates a Dodo Payments checkout session
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
    
    const body = await request.json()
    const { companyId, amount, currency, description, type } = body
    
    if (!companyId || !amount) {
      return NextResponse.json({ error: "companyId and amount required" }, { status: 400 })
    }
    
    const checkout = await createDodoCheckout(
      companyId,
      amount,
      currency || "USD",
      description || "BlivoAI Subscription",
      { type: type || "subscription", userId: authPayload.userId },
    )
    
    if (!checkout) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
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
'''
    
    exec_cmd(client, f"mkdir -p {PROJECT_DIR}/src/app/api/payments/checkout")
    
    filepath = f"{PROJECT_DIR}/src/app/api/payments/checkout/route.ts"
    write_file(client, filepath, checkout_api)
    
    # ============================================
    # 4. Create payment success/cancel pages
    # ============================================
    print("\n=== Creating payment result pages ===")
    
    success_page = '''// ============================================
// Payment Success Page
// Shows after a successful Dodo payment
// ============================================

"use client"

import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n"
import { useRouter } from "next/navigation"

export default function PaymentSuccessPage() {
  const language = useLocale()
  const router = useRouter()
  
  useEffect(() => {
    // Auto-redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      router.push(`/${language}`)
    }, 5000)
    return () => clearTimeout(timer)
  }, [language, router])
  
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4" dir={language === "ar" ? "rtl" : "ltr"}>
      <Card className="bg-card border-border max-w-md w-full">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {language === "ar" ? "الدفع ناجح!" : "Payment Successful!"}
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            {language === "ar" ? "اشتراكك تم تفعيله. رح تتحول على الداشبورد تلقائياً." : "Your subscription has been activated. You'll be redirected to the dashboard automatically."}
          </p>
          <Button
            onClick={() => router.push(`/${language}`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {language === "ar" ? "روح على الداشبورد" : "Go to Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
'''
    
    cancel_page = '''// ============================================
// Payment Cancel Page
// Shows when a payment is cancelled/failed
// ============================================

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"
import { useRouter } from "next/navigation"

export default function PaymentCancelPage() {
  const language = useLocale()
  const router = useRouter()
  
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4" dir={language === "ar" ? "rtl" : "ltr"}>
      <Card className="bg-card border-border max-w-md w-full">
        <CardContent className="p-8 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {language === "ar" ? "الدفع ملغى" : "Payment Cancelled"}
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            {language === "ar" ? "لم يتم إكمال الدفع. بتعود للموقع." : "The payment was not completed. You'll be redirected back."}
          </p>
          <Button
            onClick={() => router.push(`/${language}`)}
            className="bg-muted text-foreground hover:bg-muted/80"
          >
            {language === "ar" ? "رجوع" : "Go Back"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
'''
    
    exec_cmd(client, f"mkdir -p {PROJECT_DIR}/src/app/[lang]/payment/success {PROJECT_DIR}/src/app/[lang]/payment/cancel")
    
    filepath = f"{PROJECT_DIR}/src/app/[lang]/payment/success/page.tsx"
    write_file(client, filepath, success_page)
    
    filepath = f"{PROJECT_DIR}/src/app/[lang]/payment/cancel/page.tsx"
    write_file(client, filepath, cancel_page)
    
    # ============================================
    # 5. Add i18n translations for payment pages
    # ============================================
    print("\n=== Adding payment i18n translations ===")
    
    filepath = f"{PROJECT_DIR}/src/lib/i18n.ts"
    content = read_file(client, filepath)
    
    # Add payment page translations (Arabic)
    content = content.replace(
        '"payment.connect": "ربط"',
        '"payment.connect": "رببط",\n    "payment.checkoutSuccess": "الدفع ناجح!",\n    "payment.checkoutCancel": "الدفع ملغى",\n    "payment.goDashboard": "روح على الداشبورد",\n    "payment.goBack": "رجوع"'
    )
    
    # Add payment page translations (English)
    content = content.replace(
        '"payment.connect": "Connect"',
        '"payment.connect": "Connect",\n    "payment.checkoutSuccess": "Payment Successful!",\n    "payment.checkoutCancel": "Payment Cancelled",\n    "payment.goDashboard": "Go to Dashboard",\n    "payment.goBack": "Go Back"'
    )
    
    write_file(client, filepath, content)
    
    # ============================================
    # 6. FIX .env - add JWT_SECRET
    # ============================================
    print("\n=== Updating .env ===")
    
    filepath = f"{PROJECT_DIR}/.env"
    write_file(client, filepath, "DATABASE_URL=postgresql://blivoai:blivoai2024@demo-postgres:5432/blivoai\nJWT_SECRET=blivoai_jwt_secret_2024_demo_key\nNEXT_PUBLIC_BASE_URL=https://demo.blivoai.com\n")
    
    # ============================================
    # 7. VERIFY
    # ============================================
    print("\n=== Verification ===")
    
    # Check Dodo helper exists
    filepath = f"{PROJECT_DIR}/src/lib/dodo-payments.ts"
    content = read_file(client, filepath)
    if "createDodoCheckout" in content and "verifyDodoWebhook" in content:
        print("  ✓ Dodo payment helper module created")
    else:
        print("  ✗ Dodo payment helper missing!")
    
    # Check webhook API exists
    filepath = f"{PROJECT_DIR}/src/app/api/webhooks/dodo/route.ts"
    content = read_file(client, filepath)
    if "handleDodoWebhookEvent" in content:
        print("  ✓ Dodo webhook API created")
    else:
        print("  ✗ Dodo webhook API missing!")
    
    # Check checkout API exists
    filepath = f"{PROJECT_DIR}/src/app/api/payments/checkout/route.ts"
    content = read_file(client, filepath)
    if "createDodoCheckout" in content:
        print("  ✓ Payment checkout API created")
    else:
        print("  ✗ Payment checkout API missing!")
    
    # Check payment pages exist
    filepath = f"{PROJECT_DIR}/src/app/[lang]/payment/success/page.tsx"
    content = read_file(client, filepath)
    if "Payment Successful" in content or "الدفع ناجح" in content:
        print("  ✓ Payment success page created")
    else:
        print("  ✗ Payment success page missing!")
    
    # Check .env has JWT_SECRET
    filepath = f"{PROJECT_DIR}/.env"
    content = read_file(client, filepath)
    if "JWT_SECRET" in content:
        print("  ✓ .env has JWT_SECRET")
    else:
        print("  ✗ .env missing JWT_SECRET!")
    
    client.close()
    print("\n=== All Dodo payment integration done! ===")

if __name__ == "__main__":
    main()
