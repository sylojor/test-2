// ============================================
// لوحة الفواتير — Invoices Panel
// عرض الفواتير مع فلترة حسب الحالة
// ============================================

"use client"

import { useState, useEffect, useCallback } from "react"
import { useLocale } from "@/hooks/use-locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileText, Clock, CheckCircle, AlertTriangle, XCircle,
  ChevronDown, Download, Filter, RefreshCw
} from "lucide-react"

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  description: string
  planName: string | null
  amount: number
  currency: string
  issuedAt: string
  dueDate: string
  paidAt: string | null
  reminder48hSent: boolean
  reminder24hSent: boolean
}

const STATUS_CONFIG: Record<string, Record<string, any>> = {
  PENDING:   { ar: "مطلوبة", en: "Pending",    color: "bg-amber-100 text-amber-800", icon: Clock, border: "border-amber-200" },
  PAID:      { ar: "مدفوعة", en: "Paid",       color: "bg-emerald-100 text-emerald-800", icon: CheckCircle, border: "border-emerald-200" },
  OVERDUE:   { ar: "متأخرة", en: "Overdue",    color: "bg-red-100 text-red-800", icon: AlertTriangle, border: "border-red-200" },
  DRAFT:     { ar: "مسودة", en: "Draft",      color: "bg-slate-100 text-slate-800", icon: FileText, border: "border-slate-200" },
  CANCELLED: { ar: "ملغاة", en: "Cancelled",   color: "bg-gray-100 text-gray-600", icon: XCircle, border: "border-gray-200" },
}

export function InvoicesPanel() {
  const language = useLocale()
  const isRTL = language === "ar"
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")
  const [total, setTotal] = useState(0)

  const t = (ar: string, en: string) => (language === "ar" ? ar : en)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "ALL") params.set("status", filter)
      const res = await fetch(`/api/invoices?${params}`)
      const data = await res.json()
      if (data.invoices) {
        setInvoices(data.invoices)
        setTotal(data.total)
      }
    } catch (e) {
      console.error("Failed to fetch invoices:", e)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    })
  }

  const filterOptions = [
    { value: "ALL", label: t("الكل", "All") },
    { value: "PENDING", label: t("مطلوبة", "Pending") },
    { value: "PAID", label: t("مدفوعة", "Paid") },
    { value: "OVERDUE", label: t("متأخرة", "Overdue") },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            {t("الفواتير", "Invoices")}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {t(`إجمالي ${total} فاتورة`, `${total} total invoices`)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={fetchInvoices} disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all cursor-pointer ${
                  filter === opt.value
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">{t("لا توجد فواتير حالياً", "No invoices yet")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT
            const StatusIcon = cfg.icon
            return (
              <Card key={inv.id} className={`bg-slate-900 border ${cfg.border} hover:border-slate-600 transition-colors`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${cfg.color} mt-0.5`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-white">{inv.invoiceNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg[language]}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1 truncate">{inv.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>{t("الإصدار", "Issued")}: {formatDate(inv.issuedAt)}</span>
                          <span>{t("الاستحقاق", "Due")}: {formatDate(inv.dueDate)}</span>
                          {inv.planName && (
                            <span className="text-emerald-500">{inv.planName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`${isRTL ? 'text-left' : 'text-right'} flex-shrink-0`}>
                      <div className="text-xl font-bold text-white">
                        ${inv.amount.toFixed(2)} <span className="text-sm text-slate-400">{inv.currency}</span>
                      </div>
                      {inv.paidAt && (
                        <p className="text-xs text-emerald-500 mt-1">
                          {t(`مدفوعة ${formatDate(inv.paidAt)}`, `Paid ${formatDate(inv.paidAt)}`)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
