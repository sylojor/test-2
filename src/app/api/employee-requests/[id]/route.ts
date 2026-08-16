// ============================================
// API: طلب واحد — رد المدير
// PATCH: الرد على طلب الموظف
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

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
    const { status, response, respondedBy } = body

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "الحالة لازم تكون APPROVED أو REJECTED" }, { status: 400 })
    }

    const empRequest = await db.employeeRequest.findUnique({ where: { id } })
    if (!empRequest) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 })
    }

    const updated = await db.employeeRequest.update({
      where: { id },
      data: {
        status,
        response: response?.trim() || null,
        respondedBy: respondedBy || null,
        respondedAt: new Date(),
      },
    })

    // لو الطلب مقبول وفيه رد — خزّنو بذاكرة الموظف
    if (status === "APPROVED" && response) {
      await db.employeeMemory.create({
        data: {
          employeeId: empRequest.employeeId,
          category: "manager_response",
          key: `request_${id}`,
          value: `سؤال: ${empRequest.title} | جواب: ${response}`,
        },
      }).catch(() => {/* لو المفتاح موجود مش مشكلة */})
    }

    return NextResponse.json({ request: updated })
  } catch (error) {
    console.error("[REQUEST_RESPOND_ERROR]", error)
    return NextResponse.json({ error: "فشل الرد على الطلب" }, { status: 500 })
  }
}
