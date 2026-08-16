// ============================================
// API: اجتماع واحد — تحديث/حذف
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { requireResourceAccess } from "@/lib/tenant"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.status) updateData.status = body.status
    if (body.title) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.scheduledAt) updateData.scheduledAt = new Date(body.scheduledAt)
    if (body.duration) updateData.duration = body.duration
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.summary !== undefined) updateData.summary = body.summary
    if (body.endedAt) updateData.endedAt = new Date(body.endedAt)

    const meeting = await db.meeting.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ meeting })
  } catch (error) {
    console.error("[MEETING_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث الاجتماع" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id } = await params
    await db.meeting.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[MEETING_DELETE_ERROR]", error)
    return NextResponse.json({ error: "فشل حذف الاجتماع" }, { status: 500 })
  }
}
