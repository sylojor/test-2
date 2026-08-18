// ============================================
// API: Departments Management
// POST: Create new department (with subscription limits)
// GET: List company departments
// Security: All operations verify company ownership via auth token
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getPlanFromDB } from "@/lib/plan-db"
import { verifyAuth, unauthorizedResponse, forbiddenResponse, getUserCompanyId } from "@/lib/auth"
import type { SubscriptionPlan } from "@/types"

// GET /api/departments?companyId=xxx
export async function GET(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    // Security: Use authenticated user's company ID, not client-supplied
    const userCompanyId = getUserCompanyId(authPayload)
    if (!userCompanyId) {
      return forbiddenResponse("لا يوجد شركة مرتبطة بحسابك")
    }

    // Allow query param for filtering, but enforce ownership
    const { searchParams } = new URL(request.url)
    const requestedCompanyId = searchParams.get("companyId")
    if (requestedCompanyId && requestedCompanyId !== userCompanyId) {
      return forbiddenResponse()
    }

    const departments = await db.department.findMany({
      where: { companyId: userCompanyId },
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
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    // Security: Derive companyId from auth, not from request body
    const userCompanyId = getUserCompanyId(authPayload)
    if (!userCompanyId) {
      return forbiddenResponse("لا يوجد شركة مرتبطة بحسابك")
    }

    const body = await request.json()
    const { name, description, color, tokenBudgetPercent } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 })
    }

    const companyId = userCompanyId

    const company = await db.company.findUnique({ 
      where: { id: companyId },
      include: { departments: true },
    })
    if (!company) {
      return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 })
    }

    const planInfo = await getPlanFromDB(company.subscription)
    if (planInfo && company.departments.length >= planInfo.maxDepartments) {
      return NextResponse.json(
        { 
          error: `وصلت للحد الأقصى من الأقسام (${planInfo.maxDepartments}) بخطتك الحالية (${planInfo.nameAr}).`,
          code: "DEPARTMENT_LIMIT_REACHED",
          currentPlan: company.subscription,
          maxDepartments: planInfo.maxDepartments,
        },
        { status: 403 },
      )
    }

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

    await db.company.update({
      where: { id: companyId },
      data: { maxDepartments: planInfo?.maxDepartments ?? company.maxDepartments },
    })

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
