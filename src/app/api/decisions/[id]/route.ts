// ============================================
// API: مراجعة قرار (موافقة/رفض)
// POST /api/decisions/[id]/review
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

export async function POST(
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
    const { approved, reviewNote, reviewerId } = body

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "يجب تحديد الموافقة أو الرفض" },
        { status: 400 },
      )
    }

    const decision = await db.decision.findUnique({
      where: { id },
      include: { employee: true },
    })

    if (!decision) {
      return NextResponse.json(
        { error: "القرار غير موجود" },
        { status: 404 },
      )
    }

    if (decision.status !== "PENDING") {
      return NextResponse.json(
        { error: "هاد القرار تمت مراجعته مسبقًا" },
        { status: 400 },
      )
    }

    const status = approved ? "APPROVED" : "REJECTED"

    const updated = await db.decision.update({
      where: { id },
      data: {
        status,
        reviewedBy: reviewerId,
        reviewNote: reviewNote?.trim() || null,
        reviewedAt: new Date(),
      },
    })

    // لو تمت الموافقة، رجّع الموظف لحالة نشط
    if (approved && decision.employee.status === "AWAITING_APPROVAL") {
      await db.employee.update({
        where: { id: decision.employeeId },
        data: { status: "ACTIVE" },
      })
    }

    // سجّل بالمراجعة
    await db.auditLog.create({
      data: {
        companyId: decision.employee.companyId,
        action: approved ? "decision_approved" : "decision_rejected",
        actorType: "USER",
        actorId: reviewerId,
        details: JSON.stringify({
          decisionId: id,
          decisionTitle: decision.title,
          reviewNote: reviewNote || null,
        }),
      },
    })

    return NextResponse.json({
      decision: updated,
      message: approved ? "تمت الموافقة على القرار" : "تم رفض القرار",
    })

  } catch (error) {
    console.error("[REVIEW_DECISION_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء مراجعة القرار" },
      { status: 500 },
    )
  }
}
