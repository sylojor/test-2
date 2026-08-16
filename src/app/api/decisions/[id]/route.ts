// ============================================
// API: قرار واحد
// GET /api/decisions/[id]
// PATCH /api/decisions/[id] — مراجعة القرار
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()
    if (!authPayload.companyId) return new Response(JSON.stringify({ error: "المستخدم لا ينتمي لأي شركة" }), { status: 403, headers: { "Content-Type": "application/json" } })

    const { id } = await params
    const decision = await db.decision.findUnique({ where: { id }, include: { employee: true } })

    if (!decision) {
      return NextResponse.json({ error: "القرار غير موجود" }, { status: 404 })
    }

    // TENANT ISOLATION
    if (decision.companyId !== authPayload.companyId) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية الوصول لهذا المورد" }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    return NextResponse.json({ decision })
  } catch (error) {
    console.error("[GET_DECISION_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب القرار" }, { status: 500 })
  }
}

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
    const { status, reviewNote } = body

    const decision = await db.decision.findUnique({ where: { id } })
    if (!decision) {
      return NextResponse.json({ error: "القرار غير موجود" }, { status: 404 })
    }

    if (decision.status !== "PENDING") {
      return NextResponse.json({ error: "هاد القرار تمت مراجعته مسبقًا" }, { status: 400 })
    }

    // TENANT ISOLATION
    if (decision.companyId !== authPayload.companyId) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية الوصول لهذا المورد" }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    const updated = await db.decision.update({
      where: { id },
      data: {
        status: status || "APPROVED",
        reviewNote: reviewNote || null,
        reviewedById: authPayload.userId,
        reviewedAt: new Date(),
      },
    })

    return NextResponse.json({ decision: updated })
  } catch (error) {
    console.error("[UPDATE_DECISION_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث القرار" }, { status: 500 })
  }
}
