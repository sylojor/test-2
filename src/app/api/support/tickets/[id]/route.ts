// ============================================
// GET    /api/support/tickets/[id]?email=... — Get ticket details (public)
// POST   /api/support/tickets/[id] — Customer reply (public)
// ============================================

import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getClientIp, checkApiRateLimit } from "@/lib/auth"

const prisma = new PrismaClient()

// ============================================
// GET — عرض تفاصيل التذكرة + الرسائل
// ============================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "يجب تحديد البريد الإلكتروني" },
        { status: 400 }
      )
    }

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

    // Verify email matches
    if (ticket.customerEmail !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "البريد الإلكتروني لا يتطابق مع هذه التذكرة" },
        { status: 403 }
      )
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error("[SUPPORT] Error fetching ticket:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل التذكرة" },
      { status: 500 }
    )
  }
}

// ============================================
// POST — رد العميل على التذكرة
// ============================================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ip = getClientIp(request)

    // Rate limiting
    const rateCheck = checkApiRateLimit(ip, "default")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "طلبات كثيرة جداً — حاول بعد قليل" },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, content } = body

    if (!email || !content) {
      return NextResponse.json(
        { error: "يجب تحديد البريد الإلكتروني والمحتوى" },
        { status: 400 }
      )
    }

    if (content.trim().length === 0 || content.length > 5000) {
      return NextResponse.json(
        { error: "المحتوى يجب أن يكون بين 1 و 5000 حرف" },
        { status: 400 }
      )
    }

    // Find ticket and verify email
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: "التذكرة غير موجودة" },
        { status: 404 }
      )
    }

    if (ticket.customerEmail !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "البريد الإلكتروني لا يتطابق" },
        { status: 403 }
      )
    }

    if (ticket.status === "CLOSED") {
      return NextResponse.json(
        { error: "لا يمكن الرد على تذكرة مغلقة" },
        { status: 400 }
      )
    }

    // Create message and update ticket status
    const [message] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderType: "customer",
          senderName: ticket.customerName,
          content: content.trim(),
        },
      }),
      prisma.supportTicket.update({
        where: { id },
        data: {
          status: "OPEN",
          updatedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: "تم إرسال ردك بنجاح",
      data: message,
    })
  } catch (error) {
    console.error("[SUPPORT] Error replying to ticket:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الرد" },
      { status: 500 }
    )
  }
}
