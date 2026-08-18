// ============================================
// API: Employee Requests from Manager
// GET: List company requests
// POST: Create new request
// Security: All operations verify company ownership
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    // Security: Use authenticated user's company, not client-supplied
    const userCompanyId = authPayload.companyId || authPayload.ownedCompany?.id
    if (!userCompanyId) {
      return forbiddenResponse("لا يوجد شركة مرتبطة بحسابك")
    }

    const { searchParams } = new URL(request.url)
    const requestedCompanyId = searchParams.get("companyId")
    const status = searchParams.get("status")

    // Security: Reject cross-company access
    if (requestedCompanyId && requestedCompanyId !== userCompanyId) {
      return forbiddenResponse()
    }

    const employees = await db.employee.findMany({
      where: { companyId: userCompanyId, status: { not: "DELETED" } },
      select: { id: true },
    })
    const employeeIds = employees.map(e => e.id)

    const requests = await db.employeeRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        ...(status ? { status: status as any } : {}),
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
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const userCompanyId = authPayload.companyId || authPayload.ownedCompany?.id
    if (!userCompanyId) {
      return forbiddenResponse("لا يوجد شركة مرتبطة بحسابك")
    }

    const body = await request.json()
    const { employeeId, type, title, description, priority } = body

    if (!employeeId || !type || !title) {
      return NextResponse.json(
        { error: "معرّف الموظف ونوع الطلب والعنوان مطلوبين" },
        { status: 400 },
      )
    }

    // Security: Verify employee belongs to user's company
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    })
    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }
    if (employee.companyId !== userCompanyId) {
      return forbiddenResponse()
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
