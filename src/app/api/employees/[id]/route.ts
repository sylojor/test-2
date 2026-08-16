// ============================================
// API: جلب/تحديث/حذف موظف واحد
// GET /api/employees/[id]
// PATCH /api/employees/[id]
// DELETE /api/employees/[id]
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

// --- جلب موظف واحد ---
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()
    if (!authPayload.companyId) return new Response(JSON.stringify({ error: "المستخدم لا ينتمي لأي شركة" }), { status: 403, headers: { "Content-Type": "application/json" } })

    const { id } = await params

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        company: { select: { name: true, dialect: true, tone: true } },
        decisions: { orderBy: { createdAt: "desc" }, take: 10 },
        tasks: { orderBy: { createdAt: "desc" }, take: 10 },
        conversations: {
          orderBy: { updatedAt: "desc" }, take: 5,
          include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // TENANT ISOLATION
    if (employee.companyId !== authPayload.companyId) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية الوصول لهذا المورد" }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    return NextResponse.json({ employee })
  } catch (error) {
    console.error("[GET_EMPLOYEE_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء جلب بيانات الموظف" }, { status: 500 })
  }
}

// --- تحديث موظف ---
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()
    if (!authPayload.companyId) return new Response(JSON.stringify({ error: "المستخدم لا ينتمي لأي شركة" }), { status: 403, headers: { "Content-Type": "application/json" } })

    const { id } = await params
    const body = await request.json()

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // TENANT ISOLATION
    if (existing.companyId !== authPayload.companyId) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية الوصول لهذا المورد" }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    const allowedFields = ["name", "role", "status", "approvalMode", "personality", "systemPrompt"]
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }

    const employee = await db.employee.update({ where: { id }, data: updateData })

    if (updateData.status || updateData.approvalMode) {
      await db.auditLog.create({
        data: {
          companyId: existing.companyId, action: "employee_updated", actorType: "USER",
          details: JSON.stringify({ employeeId: id, updatedFields: Object.keys(updateData) }),
        },
      })
    }

    return NextResponse.json({ employee })
  } catch (error) {
    console.error("[UPDATE_EMPLOYEE_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث الموظف" }, { status: 500 })
  }
}

// --- حذف موظف (soft delete) ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()
    if (!authPayload.companyId) return new Response(JSON.stringify({ error: "المستخدم لا ينتمي لأي شركة" }), { status: 403, headers: { "Content-Type": "application/json" } })

    const { id } = await params
    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // TENANT ISOLATION
    if (existing.companyId !== authPayload.companyId) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية الوصول لهذا المورد" }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    const employee = await db.employee.update({ where: { id }, data: { status: "DELETED" } })
    await db.auditLog.create({
      data: {
        companyId: existing.companyId, action: "employee_deleted", actorType: "USER",
        details: JSON.stringify({ employeeId: id, employeeName: existing.name, employeeRole: existing.role }),
      },
    })

    return NextResponse.json({ message: "تم حذف الموظف", employee })
  } catch (error) {
    console.error("[DELETE_EMPLOYEE_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء حذف الموظف" }, { status: 500 })
  }
}
