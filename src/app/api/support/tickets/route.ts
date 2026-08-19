// ============================================// POST /api/support/tickets — Create new support ticket (public)// GET  /api/support/tickets?email=... — List user tickets by email (public)// ============================================

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getClientIp, checkApiRateLimit } from "@/lib/auth"

// Using shared db instance to avoid connection pool exhaustion

// Generate ticket number: SUP-2026-0001
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const lastTicket = await db.supportTicket.findFirst({
    where: {
      ticketNumber: { startsWith: `SUP-${year}` },
    },
    orderBy: { ticketNumber: "desc" },
    select: { ticketNumber: true },
  })

  let nextNum = 1
  if (lastTicket) {
    const parts = lastTicket.ticketNumber.split("-")
    nextNum = parseInt(parts[2]) + 1
  }
  return `SUP-${year}-${String(nextNum).padStart(4, "0")}`
}

// ============================================
// POST — إنشاء تذكرة جديدة
// ============================================
export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const ip = getClientIp(request)
    const rateCheck = checkApiRateLimit(ip, "auth")
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "طلبات كثيرة جداً — حاول بعد قليل" },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { customerName, customerEmail, subject, description, category, priority, name, email, message } = body

    // Normalize field names (frontend uses name/email/message)
    const fName = customerName || name
    const fEmail = customerEmail || email
    const fDesc = description || message

    // Validation
    if (!fName || !fEmail || !subject || !fDesc) {
      return NextResponse.json(
        { error: "يجب ملء جميع الحقول المطلوبة" },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(fEmail)) {
      return NextResponse.json(
        { error: "بريد إلكتروني غير صالح" },
        { status: 400 }
      )
    }

    // Length limits
    if (subject.length > 200) {
      return NextResponse.json(
        { error: "عنوان التذكرة طويل جداً (الحد الأقصى 200 حرف)" },
        { status: 400 }
      )
    }
    if (fDesc.length > 5000) {
      return NextResponse.json(
        { error: "وصف التذكرة طويل جداً (الحد الأقصى 5000 حرف)" },
        { status: 400 }
      )
    }

    const ticketNumber = await generateTicketNumber()
    const userAgent = request.headers.get("user-agent") || null

    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        customerName: fName.trim(),
        customerEmail: fEmail.trim().toLowerCase(),
        subject: subject.trim(),
        description: fDesc.trim(),
        category: category || "GENERAL",
        priority: priority || "MEDIUM",
        ip,
        userAgent,
      },
      include: {
        messages: true,
      },
    })

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
      message: `تم إنشاء التذكرة بنجاح! رقم التذكرة: ${ticketNumber}`,
    })
  } catch (error) {
    console.error("[SUPPORT] Error creating ticket:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء التذكرة" },
      { status: 500 }
    )
  }
}

// ============================================
// GET — البحث عن تذاكر بالبريد الإلكتروني
// ============================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "يجب تحديد البريد الإلكتروني" },
        { status: 400 }
      )
    }

    const tickets = await db.supportTicket.findMany({
      where: {
        customerEmail: email.trim().toLowerCase(),
      },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error("[SUPPORT] Error fetching tickets:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء البحث" },
      { status: 500 }
    )
  }
}
