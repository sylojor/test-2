// @ts-nocheck
// ============================================
// API: طلبات الموظف من المدير
// GET: جلب طلبات الشركة
// POST: إنشاء طلب جديد (من الموظف)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const status = searchParams.get("status")

    if (!companyId) {
      return NextResponse.json({ error: "معرّف الشركة مطلوب" }, { status: 400 })
    }

    // جلب طلبات كل موظفي الشركة
    const employees = await db.employee.findMany({
      where: { // @ts-expect-error status type
     companyId, status: { not: "DELETED" } },
      select: { id: true },
    })
    const employeeIds = employees.map(e => e.id)

    const requests = await db.employeeRequest.findMany({
      where: { // @ts-expect-error status type
    
        employeeId: { in: employeeIds },
        ...(status && { status }),
      },
      include: {
        employee: { select: { id: true, name: true, role: true, avatarColor: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("[REQUESTS_LIST_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب الطلبات" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { employeeId, type, title, description, priority } = body

    if (!employeeId || !type || !title) {
      return NextResponse.json(
        { error: "معرّف الموظف ونوع الطلب والعنوان مطلوبين" },
        { status: 400 },
      )
    }

    const employee = await db.employee.findUnique({ where: { // @ts-expect-error status type
     id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    const empRequest = await db.employeeRequest.create({
      data: {
        employeeId,
        type,
        title: title.trim(),
        description: description?.trim() || "",
        priority: priority || 5,
      },
    })

    return NextResponse.json({ request: empRequest }, { status: 201 })
  } catch (error) {
    console.error("[REQUEST_CREATE_ERROR]", error)
    return NextResponse.json({ error: "فشل إنشاء الطلب" }, { status: 500 })
  }
}
