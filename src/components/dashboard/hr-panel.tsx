// ============================================
// لوحة HR — الموارد البشرية
// متابعة أداء الموظفين + تقارير + توصيات
// ============================================

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { IEmployee, IDepartment, ICompany, IHRReport, HRReportType } from "@/types"
import { getEmployeeStatusDisplay, getEmployeeStatusColor } from "@/lib/employee-generator"
import { toast } from "sonner"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface HRPanelProps {
  companyId: string
  employees: IEmployee[]
  departments: IDepartment[]
  company: ICompany | null
}

export function HRPanel({

  companyId,
  employees,
  departments,
  company,
}: HRPanelProps) {
  const language = useLocale()
  
  const [reports, setReports] = useState<IHRReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // ترجمة أنواع التقارير
  const REPORT_TYPE_LABELS: Record<string, string> = {
    DAILY: t("hr.daily", language),
    WEEKLY: t("hr.weekly", language),
    MONTHLY: t("hr.monthly", language),
    ON_DEMAND: t("hr.onDemand", language),
  }

  useEffect(() => {
    fetchReports()
  }, [companyId])

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/hr?companyId=${companyId}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (type: HRReportType) => {
    setGenerating(true)
    try {
      const now = new Date()
      let periodStart: Date
      switch (type) {
        case "DAILY":
          periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case "WEEKLY":
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "MONTHLY":
          periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }

      const res = await fetch("/api/hr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          type,
          periodStart: periodStart.toISOString(),
          periodEnd: now.toISOString(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setReports(prev => [data.report, ...prev])
        toast.success(t("hr.reportCreated", language))
      } else {
        toast.error(t("hr.reportFailed", language))
      }
    } catch {
      toast.error(t("hr.reportFailed", language))
    } finally {
      setGenerating(false)
    }
  }

  const activeEmployees = employees.filter(e => e.status === "ACTIVE")
  const totalEmployees = employees.filter(e => e.status !== "DELETED")

  // أداء كل قسم
  const deptPerformance = departments.map(dept => {
    const deptEmps = employees.filter(e => e.departmentId === dept.id && e.status === "ACTIVE")
    return {
      id: dept.id,
      name: dept.name,
      color: dept.color,
      employeeCount: deptEmps.length,
      employees: deptEmps,
    }
  })

  // أحدث تقرير
  const latestReport = reports[0]

  // توصيات وتنبيهات
  let recommendations: string[] = []
  let alerts: string[] = []

  if (latestReport?.recommendations) {
    try { recommendations = JSON.parse(latestReport.recommendations) } catch { /* ignore */ }
  }
  if (latestReport?.alerts) {
    try { alerts = JSON.parse(latestReport.alerts) } catch { /* ignore */ }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("hr.title", language)}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("hr.subtitle", language)}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => generateReport("DAILY")}
            disabled={generating}
          >
            {generating ? t("common.loading", language) : t("hr.daily", language)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground"
            onClick={() => generateReport("WEEKLY")}
            disabled={generating}
          >
            {t("hr.weekly", language)}
          </Button>
        </div>
      </div>

      {/* إحصائيات عامة */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground text-xs">{t("hr.employees", language)}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalEmployees.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground text-xs">{t("hr.activeEmployeesCount", language)}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeEmployees.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground text-xs">{t("hr.departmentsCount", language)}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{departments.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground text-xs">{t("hr.report", language)}</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{reports.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* تنبيهات */}
      {alerts.length > 0 && (
        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-red-600 dark:text-red-400 font-semibold text-sm">{t("hr.alerts", language)}</h3>
            {alerts.map((alert, i) => (
              <p key={i} className="text-red-700 dark:text-red-300/80 text-sm">⚠️ {alert}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* توصيات */}
      {recommendations.length > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/30">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-yellow-600 dark:text-yellow-400 font-semibold text-sm">{t("hr.recommendations", language)}</h3>
            {recommendations.map((rec, i) => (
              <p key={i} className="text-yellow-700 dark:text-yellow-300/80 text-sm">💡 {rec}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* أداء الأقسام */}
      <div>
        <h2 className="text-foreground font-semibold text-lg mb-3">{t("hr.performance", language)}</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {deptPerformance.map((dept) => (
            <Card key={dept.id} className="border-border overflow-hidden">
              <div className="h-1" style={{ backgroundColor: dept.color }} />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="font-medium" style={{ color: dept.color }}>{dept.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                    {dept.employeeCount} {t("departments.employees", language)}
                  </Badge>
                </div>

                {/* موظفين القسم مع حالة الأداء */}
                {dept.employees.length > 0 ? (
                  <div className="space-y-2">
                    {dept.employees.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: emp.avatarColor || dept.color }}
                        >
                          {emp.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: dept.color }}>
                            {emp.name}
                          </p>
                          <p className="text-muted-foreground text-[10px] truncate">{emp.role}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${getEmployeeStatusColor(emp.status)}`}
                        >
                          {getEmployeeStatusDisplay(emp.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs text-center py-2">{t("hr.noEmployeesYet", language)}</p>
                )}
              </CardContent>
            </Card>
          ))}

          {deptPerformance.length === 0 && (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">{t("hr.createDeptsFirst", language)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* التقارير السابقة */}
      <div>
        <h2 className="text-foreground font-semibold text-lg mb-3">{t("hr.report", language)}</h2>
        {reports.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-lg mb-2">📊</p>
              <p className="text-muted-foreground">{t("hr.noReports", language)}</p>
              <p className="text-muted-foreground text-sm mt-1">{t("hr.pressDailyReport", language)}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-foreground font-medium text-sm">{report.title}</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">{report.summary}</p>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${
                      report.type === "DAILY" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      report.type === "WEEKLY" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                      report.type === "MONTHLY" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {REPORT_TYPE_LABELS[report.type] || report.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-muted-foreground text-[10px]">{t("hr.active", language)}</p>
                      <p className="text-foreground text-sm font-semibold">{report.activeEmployees}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">{t("hr.tasksCompleted", language)}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">{report.tasksCompleted}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">{t("hr.tasksPending", language)}</p>
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm font-semibold">{report.tasksPending}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">{t("hr.tokens", language)}</p>
                      <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold">{Math.round(report.tokenUsage / 1000)}K</p>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-[10px]">
                    {new Date(report.createdAt).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
