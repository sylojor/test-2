// ============================================
// API: الفواتير — قائمة + إنشاء
// GET /api/invoices — جلب فواتير الشركة
// POST /api/invoices — إنشاء فاتورة جديدة
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth } from "@/lib/auth"

const PLAN_PRICES: Record<string, number> = {
  FREE_TRIAL: 0,
  STARTER: 29,
  PROFESSIONAL: 79,
  ENTERPRISE: 199,
}

const PLAN_NAMES: Record<string, Record<string, string>> = {
  STARTER: { ar: "الأساسية", en: "Starter" },
  PROFESSIONAL: { ar: "الاحترافية", en: "Professional" },
  ENTERPRISE: { ar: "المؤسسات", en: "Enterprise" },
}

// توليد رقم فاتورة فريد: INV-2026-0001
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await db.invoice.count({
    where: {
      invoiceNumber: { startsWith: `INV-${year}` },
    },
  })
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyAuth(request)
    if (!auth?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: any = { companyId: auth.companyId }
    if (status && status !== "ALL") {
      where.status = status
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
    ])

    return NextResponse.json({ invoices, total, page, limit })
  } catch (error) {
    console.error("[INVOICES_GET_ERROR]", error)
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyAuth(request)
    if (!auth?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { plan, description, dueDate } = body

    if (!plan || !dueDate) {
      return NextResponse.json({ error: "Plan and dueDate are required" }, { status: 400 })
    }

    const amount = PLAN_PRICES[plan] ?? 0
    const lang = body.lang || "ar"
    const invoiceNumber = await generateInvoiceNumber()

    const invoice = await db.invoice.create({
      data: {
        companyId: auth.companyId,
        userId: auth.userId,
        invoiceNumber,
        status: "PENDING",
        description: description || `تجديد اشتراك ${PLAN_NAMES[plan]?.[lang] || plan}`,
        planName: PLAN_NAMES[plan]?.[lang] || PLAN_NAMES[plan]?.en || plan,
        plan: plan as any,
        amount,
        currency: "USD",
        dueDate: new Date(dueDate),
      },
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error("[INVOICES_POST_ERROR]", error)
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}
