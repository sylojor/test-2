// ============================================
// GET    /api/admin/support/tickets/[id] — Get ticket (admin)
// PUT    /api/admin/support/tickets/[id] — Update ticket status/priority (admin)
// DELETE /api/admin/support/tickets/[id] — Delete ticket (admin)
// ============================================

import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { requireAdmin } from "@/lib/auth"

const prisma = new PrismaClient()

// ============================================
// GET — تفاصيل التذكرة
// ============================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAdmin(request)
    if (!auth.success) return auth.response

    const { id } = await params
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: "التذكرة غير موجودة" },
        { status: 404 }
      )
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error("[ADMIN SUPPORT] Error fetching ticket:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل التذكرة" },
      { status: 500 }
    )
  }
}

// ============================================
// PUT — تحديث حالة/أولوية التذكرة + إضافة رد
// ============================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAdmin(request)
    if (!auth.success) return auth.response

    const { id } = await params
    const body = await request.json()
    const { status, priority, category } = body

    const ticket = await prisma.supportTicket.findUnique({ where: { id } })
    if (!ticket) {
      return NextResponse.json(
        { error: "التذكرة غير موجودة" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (category) updateData.category = category

    // Auto-set resolved/closed timestamps
    if (status === "RESOLVED" && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date()
    }
    if (status === "CLOSED" && !ticket.closedAt) {
      updateData.closedAt = ticket.resolvedAt || new Date()
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      ticket: updated,
      message: "تم تحديث التذكرة بنجاح",
    })
  } catch (error) {
    console.error("[ADMIN SUPPORT] Error updating ticket:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث التذكرة" },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE — حذف التذكرة
// ============================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAdmin(request)
    if (!auth.success) return auth.response

    const { id } = await params
    await prisma.supportTicket.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: "تم حذف التذكرة بنجاح",
    })
  } catch (error) {
    console.error("[ADMIN SUPPORT] Error deleting ticket:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف التذكرة" },
      { status: 500 }
    )
  }
}
