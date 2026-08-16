// ============================================
// API: إنشاء شركة جديدة
// POST /api/companies
// يرسل إيميل ترحيب بعد الإنشاء بنجاح
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { sendWelcomeEmail } from "@/lib/email-service"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import type { Dialect, Tone, SubscriptionPlan } from "@/types"

const VALID_DIALECTS: Dialect[] = ["levantine", "egyptian", "gulf", "iraqi", "moroccan", "formal", "english"]
const VALID_TONES: Tone[] = ["friendly", "formal", "casual", "professional", "playful"]

export async function POST(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, description, industry, dialect, tone } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "اسم الشركة مطلوب" }, { status: 400 })
    }

    // SECURITY: Use authPayload.userId — NEVER trust ownerId from request body (IDOR prevention)
    const ownerId = authPayload.userId

    const companyDialect: Dialect = VALID_DIALECTS.includes(dialect) ? dialect : "levantine"
    const companyTone: Tone = VALID_TONES.includes(tone) ? tone : "friendly"

    // Use transaction to atomically create company + link user
    const company = await db.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          industry: industry?.trim() || null,
          dialect: companyDialect,
          tone: companyTone,
          ownerId,
        },
      })

      // Link owner to company
      await tx.user.update({
        where: { id: ownerId },
        data: { companyId: newCompany.id },
      })

      return newCompany
    })

    // --- إرسال إيميل ترحيب ---
    const owner = await db.user.findUnique({ where: { id: ownerId } })
    if (owner) {
      const plan = company.subscription as SubscriptionPlan
      const planInfo = SUBSCRIPTION_PLANS[plan]
      const budgetStr = planInfo
        ? `${(planInfo.tokenBudget / 1_000_000).toFixed(planInfo.tokenBudget >= 1_000_000 ? 0 : 1)}M`
        : "500K"

      sendWelcomeEmail(
        owner.email,
        owner.name,
        company.name,
        "ar",
        planInfo?.nameAr || "تجربة مجانية",
        budgetStr,
      ).then((sent) => {
        if (sent) console.log("[WELCOME_EMAIL] Sent to", owner.email, "for company", company.name)
        else console.error("[WELCOME_EMAIL] Failed to send to", owner.email)
      })
    }

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    console.error("[CREATE_COMPANY_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الشركة" }, { status: 500 })
  }
}
