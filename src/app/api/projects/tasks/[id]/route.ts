// ============================================
// API: مهمة واحدة — تحديث / حذف
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
    const { title, description, status, assigneeId, priority, result } = body

    const task = await db.projectTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: "المهمة غير موجودة" }, { status: 404 })
    }

    const updated = await db.projectTask.update({
      where: { id },
      data: {
        ...(title?.trim() && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(priority !== undefined && { priority }),
        ...(result !== undefined && { result }),
        ...(status === "COMPLETED" && { completedAt: new Date() }),
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ task: updated })
  } catch (error) {
    console.error("[TASK_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث المهمة" }, { status: 500 })
  }
}

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
    await db.projectTask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[TASK_DELETE_ERROR]", error)
    return NextResponse.json({ error: "فشل حذف المهمة" }, { status: 500 })
  }
}
