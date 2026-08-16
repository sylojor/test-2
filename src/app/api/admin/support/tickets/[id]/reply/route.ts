// ============================================
// POST /api/admin/support/tickets/[id]/reply — Admin reply
// ============================================

import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { requireAdmin } from "@/lib/auth"

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAdmin(request)
    if (!auth.success) return auth.response

    const { id } = await params
    const body = await request.json()
    const { content, status } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "يجب كتابة محتوى الرد" },
        { status: 400 }
      )
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } })
    if (!ticket) {
      return NextResponse.json(
        { error: "التذكرة غير موجودة" },
        { status: 404 }
      )
    }

    // Create message
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderType: "admin",
        senderName: auth.payload.email,
        content: content.trim(),
      },
    })

    // Update ticket status
    const newStatus = status || "WAITING_CUSTOMER"
    await prisma.supportTicket.update({
      where: { id },
      data: { status: newStatus, updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: "تم إرسال الرد بنجاح",
      data: message,
    })
  } catch (error) {
    console.error("[ADMIN SUPPORT] Error replying:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الرد" },
      { status: 500 }
    )
  }
}
