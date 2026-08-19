// ============================================
// GET    /api/admin/support/tickets — List all tickets (admin)
// ============================================

import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { requirePlatformOwner } from "@/lib/auth"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const auth = requirePlatformOwner(request)
    if (!auth.success) return auth.response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "25")

    const where: Record<string, unknown> = {}
    if (status && status !== "ALL") where.status = status
    if (priority && priority !== "ALL") where.priority = priority
    if (category && category !== "ALL") where.category = category
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ]
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
          category: true,
          customerName: true,
          customerEmail: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ])

    // Stats
    const [openCount, inProgressCount, waitingCount, resolvedCount, closedCount] =
      await Promise.all([
        prisma.supportTicket.count({ where: { status: "OPEN" } }),
        prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
        prisma.supportTicket.count({ where: { status: "WAITING_CUSTOMER" } }),
        prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
        prisma.supportTicket.count({ where: { status: "CLOSED" } }),
      ])

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        open: openCount,
        inProgress: inProgressCount,
        waiting: waitingCount,
        resolved: resolvedCount,
        closed: closedCount,
        total,
      },
    })
  } catch (error) {
    console.error("[ADMIN SUPPORT] Error listing tickets:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل التذاكر" },
      { status: 500 }
    )
  }
}
