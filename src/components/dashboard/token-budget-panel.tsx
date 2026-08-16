// ============================================
// لوحة ميزانية التوكنات — نسخة المشتركين
// عرض: الميزانية، الاشتراك، الاستخدام حسب القسم/الموظف
// الشحن والترقية → يوجه لللوحة billing (Dodo Payments)
// لا يوجد تفاصيل موديلات — الموظفون يختارون تلقائياً
// ============================================

"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Coins } from "lucide-react"
import type { ICompany, TokenBudgetInfo } from "@/types"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { t } from "@/lib/i18n"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"

interface TokenBudgetPanelProps {
  company: ICompany | null
}

function formatTokenCount(count: number | undefined | null): string {
  if (count == null) return "0"
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`
  return count.toString()
}

function getAlertColor(level: string): string {
  switch (level) {
    case "normal": return "bg-emerald-500"
    case "warning": return "bg-yellow-500"
    case "critical": return "bg-orange-500"
    case "depleted": return "bg-red-500"
    default: return "bg-muted-foreground"
  }
}

function getAlertLabelKey(level: string): string {
  switch (level) {
    case "normal": return "tokenBudget.alert.normal"
    case "warning": return "tokenBudget.alert.warning"
    case "critical": return "tokenBudget.alert.critical"
    case "depleted": return "tokenBudget.alert.depleted"
    default: return "tokenBudget.alert.normal"
  }
}

function getAlertBadge(level: string): string {
  switch (level) {
    case "normal": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/30"
    case "warning": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800/30"
    case "critical": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-800/30"
    case "depleted": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-800/30"
    default: return "bg-muted text-muted-foreground"
  }
}

export function TokenBudgetPanel({ company }: TokenBudgetPanelProps) {
  const language = useLocale()
  const isArabic = language === "ar"
  const { setActiveTab } = useDashboardStore()
  const [budget, setBudget] = useState<TokenBudgetInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const loadBudget = useCallback(async () => {
    if (!company) return
    try {
      const res = await fetch(`/api/token-budget?companyId=${company.id}`)
      if (res.ok) {
        const data = await res.json()
        setBudget(data.budget)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadBudget()
  }, [loadBudget])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl">
        <p className="text-muted-foreground">{t("common.error", language)}</p>
      </div>
    )
  }

  const currentPlan = SUBSCRIPTION_PLANS[budget.subscription]

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl">
      {/* العنوان */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("tokenBudget.title", language)}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isArabic
              ? `ميزانية ${isArabic ? currentPlan.nameAr : currentPlan.name} — ${currentPlan.priceDisplay}`
              : `${currentPlan.name} budget — ${currentPlan.priceDisplay}`}
          </p>
        </div>
        {/* Redirect to billing for payment */}
        <Button
          onClick={() => setActiveTab("billing")}
          className="bg-gradient-to-r from-[#3F4A69] to-emerald-500 hover:from-[#3F4A69] hover:to-emerald-400 text-white min-h-[44px]"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {isArabic ? "شراء توكنات أو ترقية" : "Buy Tokens or Upgrade"}
        </Button>
      </div>

      {/* الخطة الحالية + الحالة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* الخطة */}
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-xs">{t("tokenBudget.currentPlan", language)}</p>
                <p className="text-foreground text-xl font-bold">{isArabic ? currentPlan.nameAr : currentPlan.name}</p>
              </div>
              <Badge className={getAlertBadge(budget.alertLevel)}>
                {t(getAlertLabelKey(budget.alertLevel), language)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">{t("tokenBudget.monthly", language)}</p>
                <p className="text-foreground font-semibold">{formatTokenCount(budget.monthly)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">{t("tokenBudget.perMonth", language)}</p>
                <p className="text-foreground font-semibold">{currentPlan.priceDisplay}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الاستخدام */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-foreground font-medium">{t("tokenBudget.used", language)}</p>
              <p className="text-muted-foreground text-sm">
                {formatTokenCount(budget.used)} / {formatTokenCount(budget.monthly)}
              </p>
            </div>
            {/* شريط التقدم */}
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all ${getAlertColor(budget.alertLevel)}`}
                  style={{ width: `${Math.min(100, budget.percentUsed * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{(budget.percentUsed * 100).toFixed(0)}% {t("tokenBudget.used", language)}</span>
                <span className="text-muted-foreground">{formatTokenCount(budget.remaining)} {t("tokenBudget.remaining", language)}</span>
              </div>
            </div>
            {/* الإضافات */}
            {budget.addOnsPurchased > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    <Coins className="w-3 h-3 inline mr-1" />
                    {t("tokenBudget.addOns", language)}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatTokenCount(budget.addOnsRemaining)} {t("tokenBudget.remainingAddOns", language)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-muted-foreground">{t("tokenBudget.purchased", language)}: {formatTokenCount(budget.addOnsPurchased)}</span>
                  <span className="text-muted-foreground">{t("tokenBudget.usedAddOns", language)}: {formatTokenCount(budget.addOnsUsed)}</span>
                </div>
              </div>
            )}
            {!budget.canOperate && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-sm rounded-lg p-3 flex items-center justify-between">
                <span>{t("tokenBudget.alert.depleted", language)}</span>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("billing")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  {isArabic ? "شراء توكنات" : "Buy Tokens"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* الاستخدام حسب القسم */}
      {Object.keys(budget.byDepartment).length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("tokenBudget.byDepartment", language)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(budget.byDepartment).map(([deptId, dept]) => (
              <div key={deptId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-foreground text-sm">{dept.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatTokenCount(dept.used)} {t("tokenBudget.used", language)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, dept.percentUsed * 100)}%`,
                      backgroundColor: dept.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* الاستخدام حسب الموظف */}
      {Object.keys(budget.byEmployee).length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">{t("tokenBudget.byEmployee", language)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(budget.byEmployee)
              .sort((a, b) => b[1].used - a[1].used)
              .map(([empId, emp]) => (
                <div key={empId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-foreground text-sm">{emp.name}</p>
                    <p className="text-muted-foreground text-xs">{emp.role}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-foreground text-sm font-medium">{formatTokenCount(emp.used)}</p>
                    <p className="text-muted-foreground text-xs">{(emp.percentOfTotal * 100).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
