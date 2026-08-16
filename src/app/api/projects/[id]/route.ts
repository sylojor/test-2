// ============================================
// API: مشروع واحد — تحديث / حذف
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
    const { name, description, status, priority, deadline } = body

    // Security: Verify project belongs to user's company
    const userCompanyId = authPayload.companyId || authPayload.ownedCompany?.id
    const project = await db.project.findUnique({ where: { id }, select: { companyId: true } })
    if (!project || (userCompanyId && project.companyId !== userCompanyId)) {
      return NextResponse.json({ error: "المشروع غير موجود" }, { status: 404 })
    }

    const updated = await db.project.update({
      where: { id },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
        ...(priority !== undefined && { priority }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(status === "COMPLETED" && { completedAt: new Date() }),
      },
      include: {
        department: { select: { id: true, name: true, color: true } },
        tasks: true,
      },
    })

    return NextResponse.json({ project: updated })
  } catch (error) {
    console.error("[PROJECT_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث المشروع" }, { status: 500 })
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

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: "المشروع غير موجود" }, { status: 404 })
    }

    await db.project.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PROJECT_DELETE_ERROR]", error)
    return NextResponse.json({ error: "فشل حذف المشروع" }, { status: 500 })
  }
}
