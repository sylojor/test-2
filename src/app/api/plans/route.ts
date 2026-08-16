// ============================================
// API: جلب الخطط — عام (بدون auth)
// الشركات تستخدمو لعرض الأسعار والمزايا
// ============================================

import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const plans = await db.planConfig.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    })

    // لو ما في خطط بالداتابيز، ارجع الافتراضية من الكود
    if (plans.length === 0) {
      const { SUBSCRIPTION_PLANS } = await import("@/lib/subscription-plans")
      const planKeys = Object.keys(SUBSCRIPTION_PLANS) as Array<keyof typeof SUBSCRIPTION_PLANS>
      const fallback = planKeys.map((key, index) => {
        const plan = SUBSCRIPTION_PLANS[key]
        return {
          id: `fallback-${key}`,
          planKey: key,
          name: plan.name,
          nameAr: plan.nameAr,
          price: plan.price,
          tokenBudget: plan.tokenBudget,
          maxEmployees: plan.maxEmployees,
          maxDepartments: plan.maxDepartments,
          features: JSON.stringify(plan.featuresAr ?? plan.features),
          featuresEn: JSON.stringify(plan.featuresEn ?? plan.features),
          isActive: true,
          order: index,
        }
      })
      return NextResponse.json({ plans: fallback }, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      })
    }

    return NextResponse.json({ plans }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    })
  } catch (error) {
    console.error("[GET_PLANS_PUBLIC_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
