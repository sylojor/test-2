// ============================================
// API: جلب وتحديث الشركة الحالية
// GET /api/companies/me — جلب بيانات الشركة
// PUT /api/companies/me — تحديث بيانات الشركة
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import type { Dialect, Tone } from "@/types"

const VALID_DIALECTS: Dialect[] = ["levantine", "egyptian", "gulf", "iraqi", "moroccan", "formal", "english"]
const VALID_TONES: Tone[] = ["friendly", "formal", "casual", "professional", "playful"]

export async function GET(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const companyId = authPayload.companyId
    if (!companyId) {
      return NextResponse.json({ company: null })
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        employees: {
          where: { status: { not: "DELETED" } },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ company: null })
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        description: company.description,
        industry: company.industry,
        dialect: company.dialect,
        tone: company.tone,
        logoUrl: company.logoUrl,
        ownerId: company.ownerId,
        subscription: company.subscription,
        tokenBudgetMonthly: company.tokenBudgetMonthly ?? 0,
        tokenUsedMonthly: company.tokenUsedMonthly ?? 0,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
    })
  } catch (error) {
    console.error("[GET_COMPANY_ME_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات الشركة" },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const companyId = authPayload.companyId
    if (!companyId) {
      return NextResponse.json({ error: "لا توجد شركة مرتبطة بحسابك" }, { status: 404 })
    }

    // SECURITY: Only the owner can modify company settings
    const existing = await db.company.findUnique({ where: { id: companyId } })
    if (!existing) {
      return NextResponse.json({ error: "لا توجد شركة" }, { status: 404 })
    }
    if (existing.ownerId !== authPayload.userId) {
      return NextResponse.json({ error: "غير مصرح بتعديل بيانات الشركة" }, { status: 403 })
    }

    const body = await request.json()
    const { name, industry, description, dialect, tone } = body

    // Validate dialect and tone if provided
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (industry !== undefined) updateData.industry = industry
    if (description !== undefined) updateData.description = description
    if (dialect !== undefined) {
      if (!VALID_DIALECTS.includes(dialect as Dialect)) {
        return NextResponse.json({ error: "قيمة اللهجة غير صالحة" }, { status: 400 })
      }
      updateData.dialect = dialect
    }
    if (tone !== undefined) {
      if (!VALID_TONES.includes(tone as Tone)) {
        return NextResponse.json({ error: "قيمة النبرة غير صالحة" }, { status: 400 })
      }
      updateData.tone = tone
    }

    const updated = await db.company.update({
      where: { id: companyId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      company: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        industry: updated.industry,
        dialect: updated.dialect,
        tone: updated.tone,
      },
    })
  } catch (error) {
    console.error("[PUT_COMPANY_ME_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث بيانات الشركة" }, { status: 500 })
  }
}
