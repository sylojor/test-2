// ============================================
// API: إدارة الأقسام (Departments)
// POST: إنشاء قسم جديد (مع حدود الاشتراك)
// GET: جلب أقسام الشركة
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getPlanFromDB } from "@/lib/plan-db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { getAuthCompanyId, requireCompanyAccess, requireRole } from "@/lib/tenant"
import type { SubscriptionPlan } from "@/types"

// GET /api/departments?companyId=xxx
export async function GET(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const companyId = authPayload.companyId

    const departments = await db.department.findMany({
      where: { companyId },
      include: {
        employees: {
          where: { status: { not: "DELETED" } },
          select: { id: true, name: true, role: true, status: true, avatarColor: true, specialization: true },
        },
        projects: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ departments })
  } catch (error) {
    console.error("[DEPARTMENTS_LIST_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب الأقسام" }, { status: 500 })
  }
}

// POST /api/departments
export async function POST(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const companyId = authPayload.companyId
    const { name, description, color, tokenBudgetPercent } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 })
    }

    // هل الشركة موجودة؟
    const company = await db.company.findUnique({ 
      where: { id: companyId },
      include: { departments: true },
    })
    if (!company) {
      return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 })
    }

    // --- التحقق من حدود الاشتراك ---
    const planInfo = await getPlanFromDB(company.subscription)
    if (planInfo && company.departments.length >= planInfo.maxDepartments) {
      return NextResponse.json(
        { 
          error: `وصلت للحد الأقصى من الأقسام (${planInfo.maxDepartments}) بخطتك الحالية (${planInfo.nameAr}). بدك ترقي خطتك عشان تضيف أقسام أكتر.`,
          code: "DEPARTMENT_LIMIT_REACHED",
          currentPlan: company.subscription,
          maxDepartments: planInfo.maxDepartments,
        },
        { status: 403 },
      )
    }

    // هل في قسم بنفس الاسم؟
    const existing = await db.department.findFirst({
      where: { companyId, name: name.trim() },
    })
    if (existing) {
      return NextResponse.json({ error: "في قسم بنفس الاسم فعلاً" }, { status: 409 })
    }

    const department = await db.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#10b981",
        tokenBudgetPercent: tokenBudgetPercent || 0,
        companyId,
      },
    })

    // تحديث maxDepartments بالشركة
    await db.company.update({
      where: { id: companyId },
      data: { maxDepartments: planInfo?.maxDepartments ?? company.maxDepartments },
    })

    // سجل الحدث
    await db.auditLog.create({
      data: {
        companyId,
        action: "department_created",
        actorType: "USER",
        actorId: company.ownerId,
        actorName: "صاحب الشركة",
        details: JSON.stringify({ departmentId: department.id, departmentName: department.name }),
      },
    })

    return NextResponse.json({ 
      department,
      subscription: {
        plan: company.subscription,
        departmentsUsed: company.departments.length + 1,
        departmentsMax: planInfo?.maxDepartments ?? Infinity,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("[DEPARTMENT_CREATE_ERROR]", error)
    return NextResponse.json({ error: "فشل إنشاء القسم" }, { status: 500 })
  }
}
