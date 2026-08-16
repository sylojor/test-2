// ============================================
// لوحة القرارات — النسخة المحدّثة
// يجيب بيانات حقيقية من API ويدعم المراجعة
// ============================================

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useCallback } from "react"
import type { IEmployee, IDecision } from "@/types"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface DecisionWithEmployee extends Omit<IDecision, 'createdAt' | 'reviewedAt'> {
  createdAt: string
  reviewedAt?: string
  employee: {
    id: string
    name: string
    role: string
    avatarColor?: string
  }
}

interface DecisionsPanelProps {
  employees: IEmployee[]
  companyId: string | undefined
  onReview: (decisionId: string, approved: boolean, note?: string) => Promise<void>
}

const STATUS_DISPLAY: Record<string, { labelKey: string; color: string }> = {
  PENDING: { labelKey: "decisions.pending", color: "bg-orange-100 text-orange-800" },
  APPROVED: { labelKey: "decisions.approved", color: "bg-green-100 text-green-800" },
  REJECTED: { labelKey: "decisions.rejected", color: "bg-red-100 text-red-800" },
  AUTO_EXECUTED: { labelKey: "decisions.autoExecuted", color: "bg-blue-100 text-blue-800" },
  CANCELLED: { labelKey: "decisions.cancelled", color: "bg-slate-100 text-slate-800" },
}

const TYPE_DISPLAY: Record<string, string> = {
  POST_PUBLISH: "decisions.type.postPublish",
  COMMENT_REPLY: "decisions.type.commentReply",
  MESSAGE_REPLY: "decisions.type.messageReply",
  CONTENT_CREATE: "decisions.type.contentCreate",
  SCHEDULE_CHANGE: "decisions.type.scheduleChange",
  BUDGET_ALLOCATION: "decisions.type.budgetAllocation",
  TASK_ASSIGNMENT: "decisions.type.taskAssignment",
  OTHER: "decisions.type.other",
}

export function DecisionsPanel({ employees, companyId, onReview }: DecisionsPanelProps) {
  const language = useLocale()
  
  const [decisions, setDecisions] = useState<DecisionWithEmployee[]>([])
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL")

  // جلب القرارات من الـ API
  const fetchDecisions = useCallback(async () => {
    if (!companyId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("companyId", companyId)
      if (filter !== "ALL") {
        params.set("status", filter)
      }

      const res = await fetch(`/api/decisions?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setDecisions(data.decisions || [])
      } else {
        console.error("Failed to fetch decisions:", await res.text())
      }
    } catch (error) {
      console.error("Error fetching decisions:", error)
    } finally {
      setLoading(false)
    }
  }, [companyId, filter])

  useEffect(() => {
    fetchDecisions()
  }, [fetchDecisions])

  // المراجعة (موافقة/رفض)
  const handleReview = async (decisionId: string, approved: boolean) => {
    setSubmitting(prev => ({ ...prev, [decisionId]: true }))
    try {
      await onReview(decisionId, approved, reviewNote[decisionId])
      // حدّث القائمة محلياً
      setDecisions(prev =>
        prev.map(d =>
          d.id === decisionId
            ? {
                ...d,
                status: approved ? "APPROVED" : "REJECTED",
                reviewNote: reviewNote[decisionId] || undefined,
                reviewedAt: new Date().toISOString(),
              }
            : d
        )
      )
      // مسح الملاحظة
      setReviewNote(prev => {
        const next = { ...prev }
        delete next[decisionId]
        return next
      })
    } catch (error) {
      console.error("Error reviewing decision:", error)
    } finally {
      setSubmitting(prev => ({ ...prev, [decisionId]: false }))
    }
  }

  // حساب عدد القرارات حسب الحالة
  const pendingCount = decisions.filter(d => d.status === "PENDING").length

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl">
      {/* الرأس */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("decisions.title", language)}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("decisions.subtitle", language)}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            {pendingCount} {t("decisions.pending", language)}
          </Badge>
        )}
      </div>

      {/* فلاتر */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm transition-all min-h-[44px] ${
              filter === f
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 font-medium"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            {f === "ALL" ? t("common.noData", language) : t(STATUS_DISPLAY[f]?.labelKey ?? f, language)}
          </button>
        ))}
      </div>

      {/* التحميل */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{t("decisions.loading", language)}</p>
        </div>
      ) : decisions.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-3">⚖️</div>
            <p className="text-muted-foreground">
              {t("decisions.noDecisions", language)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {decisions.map((dec) => (
            <Card key={dec.id} className="border-border">
              <CardContent className="p-5 space-y-4">
                {/* رأس القرار */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-foreground font-medium">{dec.title}</h3>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${STATUS_DISPLAY[dec.status]?.color ?? ""}`}
                      >
                        {t(STATUS_DISPLAY[dec.status]?.labelKey ?? dec.status, language)}
                      </Badge>
                      {dec.type && TYPE_DISPLAY[dec.type] && (
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                          {t(TYPE_DISPLAY[dec.type], language)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* أفاتار الموظف */}
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium"
                        style={{ backgroundColor: dec.employee?.avatarColor || "#10b981" }}
                      >
                        {dec.employee?.name?.charAt(0) || "?"}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {dec.employee?.name || ""} • {dec.employee?.role || ""}
                        {" • "}
                        {new Date(dec.createdAt).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* التفاصيل */}
                <p className="text-muted-foreground text-sm">{dec.description}</p>
                
                {dec.reasoning && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground text-sm">{dec.reasoning}</p>
                  </div>
                )}

                {/* ملاحظة المراجعة (لو تمت المراجعة) */}
                {dec.reviewNote && dec.status !== "PENDING" && (
                  <div className="bg-muted/30 rounded-lg p-3 border border-border">
                    <p className="text-muted-foreground text-sm">{dec.reviewNote}</p>
                  </div>
                )}

                {/* أزرار المراجعة — بس للقرارات المعلّقة */}
                {dec.status === "PENDING" && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <Textarea
                      value={reviewNote[dec.id] ?? ""}
                      onChange={(e) => setReviewNote(prev => ({ ...prev, [dec.id]: e.target.value }))}
                      placeholder="..."
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[60px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReview(dec.id, true)}
                        disabled={submitting[dec.id]}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                      >
                        {submitting[dec.id] ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                            ...
                          </span>
                        ) : (
                          t("decisions.approve", language)
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReview(dec.id, false)}
                        disabled={submitting[dec.id]}
                        variant="outline"
                        className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
                      >
                        {t("decisions.reject", language)}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
