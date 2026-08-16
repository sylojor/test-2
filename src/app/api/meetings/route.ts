// ============================================
// API: الاجتماعات (Meetings)
// GET: جلب اجتماعات شركة
// POST: إنشاء اجتماع جديد
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

    const where: Record<string, unknown> = { companyId }
    if (status) where.status = status

    const meetings = await db.meeting.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
    })

    return NextResponse.json({ meetings })
  } catch (error) {
    console.error("[MEETINGS_LIST_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب الاجتماعات" }, { status: 500 })
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
    const { 
      createdById,
      createdByType,
      createdByName,
      title,
      description,
      agenda,
      type,
      scheduledAt,
      duration,
      departmentIds,
      participantIds,
 } = body

    if (!companyId || !title || !scheduledAt || !createdByName) {
      return NextResponse.json(
        { error: "الشركة والعنوان والوقت واسم المنشئ مطلوبون" },
        { status: 400 },
      )
    }

    const meeting = await db.meeting.create({
      data: {
        companyId,
        createdById: createdById || null,
        createdByType: createdByType || "USER",
        createdByName,
        title,
        description: description || null,
        agenda: agenda ? JSON.stringify(agenda) : null,
        type: type || "SCHEDULED",
        scheduledAt: new Date(scheduledAt),
        duration: duration || 30,
        departmentIds: departmentIds ? JSON.stringify(departmentIds) : null,
        participantIds: participantIds ? JSON.stringify(participantIds) : null,
      },
    })

    return NextResponse.json({ meeting }, { status: 201 })
  } catch (error) {
    console.error("[MEETING_CREATE_ERROR]", error)
    return NextResponse.json({ error: "فشل إنشاء الاجتماع" }, { status: 500 })
  }
}
