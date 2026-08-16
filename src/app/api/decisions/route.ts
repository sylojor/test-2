// ============================================
// API: جلب القرارات
// GET /api/decisions?companyId=xxx&status=PENDING
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
    const status = searchParams.get("status")

    // بناء شرط البحث
    const where: Record<string, unknown> = {}

    if (companyId) {
      where.employee = { companyId }
    }

    if (status) {
      where.status = status
    }

    const decisions = await db.decision.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarColor: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ decisions })
  } catch (error) {
    console.error("[GET_DECISIONS_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب القرارات" },
      { status: 500 },
    )
  }
}
