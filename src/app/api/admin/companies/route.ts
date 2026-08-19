// ============================================
// API: إدارة الشركات (صاحب المنصة) — Admin only
// GET  — جلب كل الشركات (admin auth required)
// PATCH — تحديث حالة شركة (admin auth required)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePlatformOwner } from "@/lib/auth"

// --- جلب كل الشركات (admin only) ---
export async function GET(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const companies = await db.company.findMany({
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            employees: true,
            departments: true,
            projects: true,
            workOrders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const totalCompanies = companies.length
    const totalEmployees = companies.reduce((sum, c) => sum + c._count.employees, 0)

    // Get actual plan prices from database
    const planConfigs = await db.planConfig.findMany()
    const planPriceMap: Record<string, number> = {}
    for (const pc of planConfigs) {
      planPriceMap[pc.planKey] = pc.price
    }
    const totalRevenue = companies.reduce((sum, c) => {
      return sum + (planPriceMap[c.subscription] ?? 0)
    }, 0)

    return NextResponse.json({
      companies,
      stats: {
        total: totalCompanies,
        totalEmployees,
        totalMonthlyRevenue: totalRevenue,
        byPlan: {
          FREE_TRIAL: companies.filter(c => c.subscription === "FREE_TRIAL").length,
          STARTER: companies.filter(c => c.subscription === "STARTER").length,
          PROFESSIONAL: companies.filter(c => c.subscription === "PROFESSIONAL").length,
          ENTERPRISE: companies.filter(c => c.subscription === "ENTERPRISE").length,
        },
      },
    })
  } catch (error) {
    console.error("[GET_COMPANIES_ADMIN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}

// --- تحديث شركة (admin only) ---
export async function PATCH(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { id, action, data } = body

    if (!id || !action) {
      return NextResponse.json({ error: "المعرّف والإجراء مطلوبين" }, { status: 400 })
    }

    switch (action) {
      case "update_subscription": {
        // جلب بيانات الخطة من الداتابيز
        const planConfig = await db.planConfig.findUnique({
          where: { planKey: data.subscription },
        })

        const updateData: Record<string, any> = {
          subscription: data.subscription,
          subscriptionStartAt: new Date(),
          subscriptionEndAt: data.durationMonths
            ? new Date(Date.now() + data.durationMonths * 30 * 24 * 60 * 60 * 1000)
            : null,
        }

        // لو في خطة بالداتابيز، استخدم بياناتها
        if (planConfig) {
          updateData.tokenBudgetMonthly = data.tokenBudgetMonthly ?? planConfig.tokenBudget
          updateData.maxEmployees = data.maxEmployees ?? planConfig.maxEmployees
          updateData.maxDepartments = data.maxDepartments ?? planConfig.maxDepartments
        } else {
          // fallback للخطط الافتراضية
          updateData.tokenBudgetMonthly = data.tokenBudgetMonthly ?? getPlanTokenBudget(data.subscription)
        }

        const updated = await db.company.update({
          where: { id },
          data: updateData,
        })
        return NextResponse.json({ company: updated, message: "تم تحديث الاشتراك" })
      }

      case "add_tokens": {
        const amount = data.amount ?? 0
        const updated = await db.company.update({
          where: { id },
          data: {
            tokenAddOnsPurchased: { increment: amount },
          },
        })
        return NextResponse.json({ company: updated, message: `تم شحن ${amount} توكن` })
      }

      case "update_info": {
        const updated = await db.company.update({
          where: { id },
          data: {
            name: data.name,
            industry: data.industry,
            dialect: data.dialect,
            tone: data.tone,
          },
        })
        return NextResponse.json({ company: updated, message: "تم تحديث المعلومات" })
      }

      default:
        return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 })
    }
  } catch (error) {
    console.error("[PATCH_COMPANY_ADMIN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}

function getPlanTokenBudget(plan: string): number {
  const budgets: Record<string, number> = {
    FREE_TRIAL: 500000,
    STARTER: 3000000,
    PROFESSIONAL: 15000000,
    ENTERPRISE: 50000000,
  }
  return budgets[plan] ?? 500000
}
