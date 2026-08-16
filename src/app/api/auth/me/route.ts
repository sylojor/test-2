// ============================================
// API: Get current authenticated user
// GET /api/auth/me — reads JWT from HttpOnly cookie
//
// This endpoint is used by client components
// to verify auth status without localStorage.
// Returns user info + company data if authenticated.
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // 1. Verify JWT from HttpOnly cookie
    const payload = verifyAuth(request)
    if (!payload) {
      return unauthorizedResponse("غير مصرح — سجّل دخولك")
    }

    // 2. Fetch user data from DB
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: {
        ownedCompany: {
          include: {
            departments: true,
            employees: {
              where: { status: { not: "DELETED" } },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 })
    }

    // 3. Return user + company data
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        emailVerified: user.emailVerified ?? true,
        trialStartAt: user.trialStartAt,
      },
      company: user.ownedCompany
        ? {
            id: user.ownedCompany.id,
            name: user.ownedCompany.name,
            description: user.ownedCompany.description,
            industry: user.ownedCompany.industry,
            dialect: user.ownedCompany.dialect,
            tone: user.ownedCompany.tone,
            ownerId: user.ownedCompany.ownerId,
            subscription: user.ownedCompany.subscription,
            tokenBudgetMonthly: user.ownedCompany.tokenBudgetMonthly ?? 0,
            tokenUsedMonthly: user.ownedCompany.tokenUsedMonthly ?? 0,
            tokenAddOnsPurchased: user.ownedCompany.tokenAddOnsPurchased ?? 0,
            tokenAddOnsUsed: user.ownedCompany.tokenAddOnsUsed ?? 0,
            tokenBudgetResetAt: user.ownedCompany.tokenBudgetResetAt,
            createdAt: user.ownedCompany.createdAt,
            updatedAt: user.ownedCompany.updatedAt,
          }
        : null,
      departments: user.ownedCompany?.departments ?? [],
      employees: user.ownedCompany?.employees ?? [],
      authenticated: true,
    })
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ بالتحقق" }, { status: 500 })
  }
}
