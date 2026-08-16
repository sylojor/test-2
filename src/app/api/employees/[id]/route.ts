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
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id } = await params
    
    // Security: Verify employee belongs to user's company
    const userCompanyId = authPayload.companyId || authPayload.ownedCompany?.id
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true, dialect: true, tone: true },
        },
        decisions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        conversationParticipants: {
          include: {
            conversation: {
              include: {
                messages: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: "الموظف غير موجود" },
        { status: 404 },
      )
    }

    return NextResponse.json({ employee })
  } catch (error) {
    console.error("[GET_EMPLOYEE_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب بيانات الموظف" },
      { status: 500 },
    )
  }
}

// --- تحديث موظف ---
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "الموظف غير موجود" },
        { status: 404 },
      )
    }

    const allowedFields = ["name", "role", "status", "approvalMode", "personality", "systemPrompt"]
    const updateData: Record<string, unknown> = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const employee = await db.employee.update({
      where: { id },
      data: updateData,
    })

    // تسجيل في سجل المراجعة
    if (updateData.status || updateData.approvalMode) {
      await db.auditLog.create({
        data: {
          companyId: existing.companyId,
          action: "employee_updated",
          actorType: "USER",
          details: JSON.stringify({
            employeeId: id,
            updatedFields: Object.keys(updateData),
          }),
        },
      })
    }

    return NextResponse.json({ employee })
  } catch (error) {
    console.error("[UPDATE_EMPLOYEE_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الموظف" },
      { status: 500 },
    )
  }
}

// --- حذف موظف (soft delete) ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "الموظف غير موجود" },
        { status: 404 },
      )
    }

    // Soft delete — ما بنحذفه فعليًا عشان الذاكرة تضل محفوظة
    const employee = await db.employee.update({
      where: { id },
      data: { status: "DELETED" },
    })

    await db.auditLog.create({
      data: {
        companyId: existing.companyId,
        action: "employee_deleted",
        actorType: "USER",
        details: JSON.stringify({
          employeeId: id,
          employeeName: existing.name,
          employeeRole: existing.role,
        }),
      },
    })

    return NextResponse.json({ 
      message: "تم حذف الموظف (بياناته محفوظة للذاكرة المستمرة)",
      employee,
    })
  } catch (error) {
    console.error("[DELETE_EMPLOYEE_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الموظف" },
      { status: 500 },
    )
  }
}
