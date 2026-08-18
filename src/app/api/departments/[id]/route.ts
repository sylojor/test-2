// ============================================
// API: Single Department Management
// PATCH: Update department
// DELETE: Delete department
// Security: Verify resource belongs to authenticated user's company
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse, forbiddenResponse, getUserCompanyId } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const userCompanyId = getUserCompanyId(authPayload)
    if (!userCompanyId) {
      return forbiddenResponse()
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, color, tokenBudgetPercent } = body

    // Security: Verify department belongs to user's company
    const department = await db.department.findUnique({ where: { id } })
    if (!department) {
      return NextResponse.json({ error: "القسم غير موجود" }, { status: 404 })
    }
    if (department.companyId !== userCompanyId) {
      return forbiddenResponse()
    }

    const updated = await db.department.update({
      where: { id },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color && { color }),
        ...(tokenBudgetPercent !== undefined && { tokenBudgetPercent }),
      },
    })

    return NextResponse.json({ department: updated })
  } catch (error) {
    console.error("[DEPARTMENT_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث القسم" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const userCompanyId = getUserCompanyId(authPayload)
    if (!userCompanyId) {
      return forbiddenResponse()
    }

    const { id } = await params

    // Security: Verify department belongs to user's company
    const department = await db.department.findUnique({
      where: { id },
      include: { employees: true },
    })
    if (!department) {
      return NextResponse.json({ error: "القسم غير موجود" }, { status: 404 })
    }
    if (department.companyId !== userCompanyId) {
      return forbiddenResponse()
    }

    if (department.employees.length > 0) {
      await db.employee.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      })
    }

    await db.department.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DEPARTMENT_DELETE_ERROR]", error)
    return NextResponse.json({ error: "فشل حذف القسم" }, { status: 500 })
  }
}
