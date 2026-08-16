// ============================================
// API: ميزانية التوكنات — النسخة الكاملة
// GET: جلب معلومات الميزانية
// POST: شحن توكنات إضافية
// PATCH: تحديث خطة الاشتراك
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { getTokenBudgetInfo, purchaseTokenAddOn, updateSubscription } from "@/lib/token-manager"
import { getPlanFromDB } from "@/lib/plan-db"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import type { SubscriptionPlan } from "@/types"

// GET /api/token-budget?companyId=xxx
export async function GET(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (!companyId) {
      return NextResponse.json({ error: "معرّف الشركة مطلوب" }, { status: 400 })
    }

    const budgetInfo = await getTokenBudgetInfo(companyId)
    return NextResponse.json({ 
      budget: budgetInfo,
      plans: SUBSCRIPTION_PLANS,
    })
  } catch (error) {
    console.error("[TOKEN_BUDGET_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب معلومات الميزانية" }, { status: 500 })
  }
}

// POST /api/token-budget — شحن توكنات إضافية
export async function POST(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { companyId, tokens } = body

    if (!companyId) {
      return NextResponse.json({ error: "معرّف الشركة مطلوب" }, { status: 400 })
    }

    if (!tokens || typeof tokens !== "number" || tokens <= 0) {
      return NextResponse.json({ error: "عدد التوكنات غير صحيح" }, { status: 400 })
    }

    const budgetInfo = await purchaseTokenAddOn(companyId, tokens)
    return NextResponse.json({ 
      message: `تم شحن ${(tokens / 1000000).toFixed(1)}M توكن`,
      budget: budgetInfo,
    })
  } catch (error) {
    console.error("[TOKEN_ADDON_ERROR]", error)
    return NextResponse.json({ error: "فشل شحن التوكنات" }, { status: 500 })
  }
}

// PATCH /api/token-budget — تحديث خطة الاشتراك
export async function PATCH(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { companyId, plan } = body

    if (!companyId) {
      return NextResponse.json({ error: "معرّف الشركة مطلوب" }, { status: 400 })
    }

    const validPlans: SubscriptionPlan[] = ["FREE_TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"]
    if (!plan || !validPlans.includes(plan)) {
      return NextResponse.json({ error: "خطة اشتراك غير صحيحة" }, { status: 400 })
    }

    const budgetInfo = await updateSubscription(companyId, plan)
    return NextResponse.json({
      message: `تم تحديث الاشتراك إلى ${SUBSCRIPTION_PLANS[plan].nameAr}`,
      budget: budgetInfo,
    })
  } catch (error) {
    console.error("[SUBSCRIPTION_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث الاشتراك" }, { status: 500 })
  }
}
