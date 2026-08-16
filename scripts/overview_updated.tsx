// ============================================
// لوحة النظرة العامة (Overview) — النسخة المحدّثة
// تعرض: إحصائيات، ميزانية التوكنات، حالة الاشتراك
// ✅ متوافق مع Light + Dark Mode
// ✅ عقدة على الموبايل — مسافات أقل
// ============================================

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ICompany, IEmployee, IDepartment, IProject } from "@/types"
import { getEmployeeStatusDisplay, getProjectStatusDisplay } from "@/lib/employee-generator"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { useDashboardStore } from "@/stores/dashboard-store"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface OverviewPanelProps {
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  projects: IProject[]
}

function formatTokens(count: number | undefined | null): string {
  if (count == null) return "0"
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`
  return count.toString()
}

export function OverviewPanel({ company, employees, departments, projects }: OverviewPanelProps) {
  
  const language = useLocale()
  const active = employees.filter(e => e.status === "ACTIVE").length
  const setup = employees.filter(e => e.status === "SETUP").length
  const total = employees.length
  const activeProjects = projects.filter(p => p.status === "IN_PROGRESS").length
  const completedProjects = projects.filter(p => p.status === "COMPLETED").length

  // معلومات الاشتراك
  const subscription = company?.subscription ?? "FREE_TRIAL"
  const planInfo = SUBSCRIPTION_PLANS[subscription]

  // حالة التوكن
  const tokenBudgetMonthly = company?.tokenBudgetMonthly ?? 0
  const tokenUsedMonthly = company?.tokenUsedMonthly ?? 0
  const tokenPercent = tokenBudgetMonthly > 0
    ? Math.min(100, (tokenUsedMonthly / tokenBudgetMonthly) * 100)
    : 0
  const tokenColor = tokenPercent >= 100 ? "bg-red-500" : tokenPercent >= 80 ? "bg-yellow-500" : "bg-emerald-500"
  const addOnsRemaining = company ? Math.max(0, (company.tokenAddOnsPurchased ?? 0) - (company.tokenAddOnsUsed ?? 0)) : 0

  const stats = [
    { label: t("overview.totalEmployees", language), value: total, color: "text-foreground" },
    { label: t("status.active", language), value: active, color: "text-emerald-600 dark:text-emerald-400" },
    { label: t("overview.setupEmployees", language), value: setup, color: "text-yellow-600 dark:text-yellow-400" },
    { label: t("departments.title", language), value: departments.length, color: "text-blue-600 dark:text-blue-400" },
    { label: t("overview.activeProjects", language), value: activeProjects, color: "text-purple-600 dark:text-purple-400" },
    { label: t("overview.completedProjects", language), value: completedProjects, color: "text-green-600 dark:text-green-400" },
  ]

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-2 sm:space-y-4 md:space-y-6 max-w-5xl">
      {/* ترحيب — عقد على الموبايل */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">
          {t("overview.welcome", language)}{company ? ` ${company.name}` : ""}!
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          {t("overview.welcomeDesc", language)}
        </p>
      </div>

      {/* إحصائيات — عقدة على الموبايل */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-1.5 sm:gap-3 md:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-2 sm:p-3 md:p-4 text-center">
              <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-muted-foreground text-[10px] sm:text-xs mt-0.5 sm:mt-1 line-clamp-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* الاشتراك + ميزانية التوكنات — عقدة على الموبايل */}
      {company && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
          {/* الاشتراك */}
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-0">
              <CardTitle className="text-sm sm:text-base">{t("overview.subscription", language)}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-semibold text-sm sm:text-lg">{planInfo.nameAr}</p>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">{planInfo.priceDisplay}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/30 text-[10px] sm:text-xs">
                  {planInfo.name}
                </Badge>
              </div>
              <ul className="space-y-0.5 sm:space-y-1">
                {planInfo.features.slice(0, 3).map((f, i) => (
                  <li key={i} className="text-muted-foreground text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* ميزانية التوكنات */}
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-0">
              <CardTitle className="text-sm sm:text-base">{t("tokenBudget.title", language)}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">{t("tokenBudget.used", language)}</span>
                  <span className="text-foreground">{formatTokens(tokenUsedMonthly)} / {formatTokens(tokenBudgetMonthly)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 sm:h-3">
                  <div
                    className={`h-2 sm:h-3 rounded-full transition-all ${tokenColor}`}
                    style={{ width: `${tokenPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-muted-foreground">
                    {(100 - tokenPercent).toFixed(0)}% {t("overview.monthlyRemaining", language)}
                  </span>
                  {addOnsRemaining > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      + {formatTokens(addOnsRemaining)} {t("overview.addOns", language)}
                    </span>
                  )}
                </div>
                {tokenPercent >= 100 && addOnsRemaining === 0 && (
                  <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800/30 text-red-600 dark:text-red-400 text-[10px] sm:text-xs rounded-lg p-1.5 sm:p-2">
                    {t("overview.budgetDepleted", language)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* الأقسام — عقدة على الموبايل */}
      {departments.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-0">
            <CardTitle className="text-sm sm:text-base">{t("departments.title", language)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-3">
            {departments.map((dept) => {
              const deptEmployees = employees.filter(e => e.departmentId === dept.id && e.status !== "DELETED")
              return (
                <div key={dept.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-xs sm:text-sm font-medium truncate">{dept.name}</p>
                    <p className="text-muted-foreground text-[10px] sm:text-xs">{deptEmployees.length} {t("departments.employees", language)}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* المشاريع — عقدة على الموبايل */}
      {projects.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-0">
            <CardTitle className="text-sm sm:text-base">{t("projects.title", language)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-3">
            {projects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-xs sm:text-sm font-medium truncate">{project.name}</p>
                  {project.departmentId && departments.find(d => d.id === project.departmentId) && (
                    <p className="text-muted-foreground text-[10px] sm:text-xs">
                      {departments.find(d => d.id === project.departmentId)?.name}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px] sm:text-xs ml-2 shrink-0">
                  {getProjectStatusDisplay(project.status)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* حالة الموظفين — عقدة على الموبايل */}
      {employees.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-0">
            <CardTitle className="text-sm sm:text-base">{t("overview.employeeStatus", language)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-3">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-foreground text-xs sm:text-sm font-medium shrink-0"
                    style={{ backgroundColor: emp.avatarColor || "#10b981" }}
                  >
                    {emp.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-xs sm:text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-muted-foreground text-[10px] sm:text-xs truncate">{emp.role}</p>
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0 ml-2">
                  {getEmployeeStatusDisplay(emp.status)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* رسالة لو ما فيش موظفين */}
      {employees.length === 0 && (
        <Card>
          <CardContent className="p-4 sm:p-8 text-center space-y-2 sm:space-y-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 className="text-foreground font-medium text-sm sm:text-base">{t("overview.noEmployeesYet", language)}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto">
              {t("overview.hireFirst", language)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}