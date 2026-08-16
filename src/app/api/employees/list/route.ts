// ============================================
// API: جلب موظفي الشركة
// GET /api/employees/list?companyId=xxx
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { getAuthCompanyId, requireCompanyAccess, requireRole } from "@/lib/tenant"

export async function GET(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const companyId = authPayload.companyId

    if (!companyId) {
      return NextResponse.json(
        { error: "معرّف الشركة مطلوب" },
        { status: 400 },
      )
    }

    const employees = await db.employee.findMany({
      where: { 
        companyId,
        status: { not: "DELETED" }
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { 
            decisions: { where: { status: "PENDING" } },
            tasks: { where: { status: "IN_PROGRESS" } },
          },
        },
      },
    })

    return NextResponse.json({ employees })
  } catch (error) {
    console.error("[GET_EMPLOYEES_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الموظفين" },
      { status: 500 },
    )
  }
}
