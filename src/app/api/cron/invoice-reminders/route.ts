// ============================================
// Cron: تذكير الفواتير — 48 ساعة قبل الاستحقاق
// GET /api/cron/invoice-reminders?secret=CRON_SECRET
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendInvoiceEmail, sendSubscriptionExpiringEmail } from "@/lib/email-service"

const CRON_SECRET = process.env.CRON_SECRET
if (!CRON_SECRET) {
  console.error("[CRITICAL] CRON_SECRET not set — cron endpoints disabled")
}

// Rate limiting: max 1 execution per 55 minutes
let lastCronExecution = 0
const CRON_MIN_INTERVAL_MS = 55 * 60 * 1000

function formatDate(date: Date, lang: string): string {
  return date.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Rate limit check
    const now = Date.now()
    if (now - lastCronExecution < CRON_MIN_INTERVAL_MS) {
      return NextResponse.json({ error: "Cron rate limited" }, { status: 429 })
    }
    lastCronExecution = now

    if (!CRON_SECRET || searchParams.get("secret") !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const nowDate = new Date()
    const results = { sent48h: 0, sent24h: 0, sentExpired: 0, errors: [] as string[] }

    // 48 ساعة قبل الاستحقاق
    const h48 = new Date(nowDate.getTime() + 48 * 60 * 60 * 1000)
    const h47 = new Date(nowDate.getTime() + 47 * 60 * 60 * 1000)
    const invoices48h = await db.invoice.findMany({
      where: { status: "PENDING", reminder48hSent: false, dueDate: { gte: h47, lte: h48 } },
      include: { user: true, company: true },
    })
    for (const inv of invoices48h) {
      try {
        const lang = (inv.company?.dialect || "ar") as "ar" | "en"
        const sent = await sendInvoiceEmail(inv.user.email, {
          userName: inv.user.name, companyName: inv.company?.name, lang,
          invoiceNumber: inv.invoiceNumber, amount: `$${inv.amount}`, currency: inv.currency,
          dueDate: formatDate(inv.dueDate, lang), planName: inv.planName || undefined,
          actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"}/${lang}/dashboard`,
        })
        if (sent) {
          await db.invoice.update({ where: { id: inv.id }, data: { reminder48hSent: true } })
          results.sent48h++
        }
      } catch (e: any) { results.errors.push(`48h ${inv.invoiceNumber}: ${e.message}`) }
    }

    // 24 ساعة قبل الاستحقاق
    const h24 = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000)
    const h23 = new Date(nowDate.getTime() + 23 * 60 * 60 * 1000)
    const invoices24h = await db.invoice.findMany({
      where: { status: "PENDING", reminder24hSent: false, dueDate: { gte: h23, lte: h24 } },
      include: { user: true, company: true },
    })
    for (const inv of invoices24h) {
      try {
        const lang = (inv.company?.dialect || "ar") as "ar" | "en"
        const sent = await sendSubscriptionExpiringEmail(inv.user.email, {
          userName: inv.user.name, companyName: inv.company?.name, lang,
          dueDate: formatDate(inv.dueDate, lang), planName: inv.planName || undefined,
          amount: `$${inv.amount}`, invoiceNumber: inv.invoiceNumber,
          actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://blivoai.com"}/${lang}/dashboard`,
        })
        if (sent) {
          await db.invoice.update({ where: { id: inv.id }, data: { reminder24hSent: true } })
          results.sent24h++
        }
      } catch (e: any) { results.errors.push(`24h ${inv.invoiceNumber}: ${e.message}`) }
    }

    // فواتير منتهية
    const expired = await db.invoice.findMany({
      where: { status: "PENDING", reminderExpiredSent: false, dueDate: { lt: nowDate } },
    })
    for (const inv of expired) {
      await db.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE", reminderExpiredSent: true } })
      results.sentExpired++
    }

    console.log("[INVOICE_CRON]", JSON.stringify(results))
    return NextResponse.json({ success: true, ...results, checkedAt: new Date().toISOString() })
  } catch (error) {
    console.error("[INVOICE_CRON_ERROR]", error)
    return NextResponse.json({ error: "Cron failed" }, { status: 500 })
  }
}
