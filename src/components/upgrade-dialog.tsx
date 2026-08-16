// ============================================
// Upgrade Dialog — shown when employee limit reached
// OWNER: Can upgrade directly via Dodo checkout
// NON-OWNER: Sees "ask your admin" message
// ============================================

"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldAlert, Trash2, RefreshCw, Users, ArrowRight } from "lucide-react"
import { SUBSCRIPTION_PLANS, getPlansFromAPI, clearPlansCache, type PlanDetail } from "@/lib/subscription-plans"
import type { SubscriptionPlan } from "@/types"
import { useLocale } from "@/hooks/use-locale"
import { useDashboardStore } from "@/stores/dashboard-store"
import { toast } from "sonner"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: SubscriptionPlan
  companyId: string
  isOwner: boolean
  onUpgradeSuccess: (newPlan: SubscriptionPlan) => void
}

export function UpgradeDialog({
  open,
  onOpenChange,
  currentPlan,
  companyId,
  isOwner,
  onUpgradeSuccess,
}: UpgradeDialogProps) {
  const language = useLocale()
  const isArabic = language === "ar"
  const [allPlans, setAllPlans] = useState<Record<string, PlanDetail>>(SUBSCRIPTION_PLANS)
  const [loading, setLoading] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [showTestPayment, setShowTestPayment] = useState(false)

  useEffect(() => {
    if (open) {
      clearPlansCache()
      getPlansFromAPI().then(plans => {
        setAllPlans(plans)
      })
      // Fetch platform settings to check if test button should show
      fetch("/api/admin/platform")
        .then(r => r.json())
        .then(data => setShowTestPayment(data.showTestPayment ?? false))
        .catch(() => {})
    }
  }, [open])

  const currentPlanInfo = allPlans[currentPlan] || SUBSCRIPTION_PLANS[currentPlan]

  // Get upgradeable plans (higher price than current)
  const upgradePlans = Object.entries(allPlans)
    .filter(([key, plan]) => plan.price > currentPlanInfo.price && plan.price > 0)
    .sort((a, b) => a[1].price - b[1].price)

  const goToEmployeesTab = () => {
    onOpenChange(false)
    const store = useDashboardStore.getState()
    store.setActiveTab("employees" as never)
  }

  const goToBillingTab = () => {
    onOpenChange(false)
    const store = useDashboardStore.getState()
    store.setActiveTab("billing" as never)
  }

  // Direct checkout for a specific plan
  const handleUpgradeNow = async (targetPlanKey: string, plan: PlanDetail) => {
    setLoading(targetPlanKey)
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          amount: plan.price,
          currency: "USD",
          description: `BlivoAI ${isArabic ? plan.nameAr : plan.name} Subscription`,
          type: "subscription_upgrade",
          metadata: {
            targetPlan: targetPlanKey,
            billingCycle,
            isRecurring: "true",
            autoRenew: "true",
            lang: language,
          },
        }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        toast.error(isArabic ? "لم يتم إنشاء رابط الدفع" : "Checkout URL not created")
        setLoading(null)
      }
    } catch {
      toast.error(isArabic ? "خطأ في الاتصال" : "Connection error")
      setLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border text-foreground max-w-lg max-h-[85vh] overflow-y-auto"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {isArabic ? "حدود الاشتراك" : "Subscription Limit"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isArabic
              ? `خطتك الحالية (${currentPlanInfo.nameAr}) محدودة بـ ${currentPlanInfo.maxEmployees >= 999999 ? "∞" : currentPlanInfo.maxEmployees} موظفين.`
              : `Your current plan (${currentPlanInfo.name}) is limited to ${currentPlanInfo.maxEmployees >= 999999 ? "∞" : currentPlanInfo.maxEmployees} employees.`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Current plan info */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-foreground">
                {isArabic ? currentPlanInfo.nameAr : currentPlanInfo.name}
              </span>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/30">
              {currentPlanInfo.price === 0
                ? (isArabic ? "مجاني" : "Free")
                : `$${currentPlanInfo.price}/${isArabic ? "شهر" : "mo"}`}
            </Badge>
          </div>
          <ul className="space-y-1">
            {(isArabic ? currentPlanInfo.features : currentPlanInfo.featuresEn || currentPlanInfo.features).slice(0, 3).map((f, i) => (
              <li key={i} className="text-muted-foreground text-xs flex items-center gap-1.5">
                <span className="text-emerald-500">&#10003;</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {isOwner ? (
          <>
            {/* Monthly / Yearly toggle */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border self-start">
              <button
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setBillingCycle("monthly")}
              >
                {isArabic ? "شهري" : "Monthly"}
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  billingCycle === "yearly"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setBillingCycle("yearly")}
              >
                {isArabic ? "سنوي" : "Yearly"}
              </button>
            </div>

            {/* OWNER: Show upgrade plans with direct checkout */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {isArabic ? "خطط أعلى متاحة:" : "Available upgrade plans:"}
              </p>
              {upgradePlans.map(([planKey, plan]) => {
                const isPaying = loading === planKey
                return (
                  <div
                    key={planKey}
                    className="p-4 rounded-xl border border-border hover:border-brand/30 bg-muted/20 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-foreground font-semibold text-sm">
                          {isArabic ? plan.nameAr : plan.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {plan.maxEmployees >= 999999
                            ? (isArabic ? "موظفين غير محدود" : "Unlimited employees")
                            : `${plan.maxEmployees} ${isArabic ? "موظف" : "employees"}`}
                          {" — "}
                          {(plan.tokenBudget / 1_000_000).toFixed(plan.tokenBudget >= 10_000_000 ? 0 : 1)}M tokens
                        </p>
                      </div>
                      <span className="text-foreground font-bold text-lg">
                        ${billingCycle === "yearly" ? Math.round(plan.price * 12 * 0.85) : plan.price}
                        <span className="text-xs text-muted-foreground font-normal">
                          /{isArabic ? (billingCycle === "yearly" ? "سنة" : "شهر") : (billingCycle === "yearly" ? "year" : "mo")}
                        </span>
                      </span>
                    </div>
                    <Button
                      onClick={() => handleUpgradeNow(planKey, plan)}
                      disabled={isPaying}
                      className="w-full bg-gradient-to-r from-[#3F4A69] to-emerald-500 hover:from-[#3F4A69] hover:to-emerald-400 text-white text-sm min-h-[44px]"
                    >
                      {isPaying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {isArabic ? "ترقية الآن" : "Upgrade Now"}
                          <ArrowRight className={`w-4 h-4 ${isArabic ? "mr-2 rotate-180" : "ml-2"}`} />
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>

            {upgradePlans.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-2">
                {isArabic ? "أنت على أعلى خطة متاحة" : "You\'re on the highest available plan"}
              </p>
            )}

            {/* Go to billing for more options */}
            {/* TEST PAYMENT - $0.01 — only shown when admin enables it */}
            {showTestPayment && (
            <button
              onClick={async () => {
                setLoading("test")
                try {
                  const res = await fetch("/api/payments/test-checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ companyId, lang: language }),
                  })
                  const data = await res.json()
                  if (data.checkoutUrl) {
                    window.location.href = data.checkoutUrl
                  } else {
                    toast.error(isArabic ? "لم يتم إنشاء رابط الاختبار" : "Test checkout failed")
                    setLoading(null)
                  }
                } catch {
                  toast.error(isArabic ? "خطأ في الاتصال" : "Connection error")
                  setLoading(null)
                }
              }}
              disabled={loading === "test"}
              className="w-full py-2 rounded-lg border border-dashed border-yellow-400/50 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 text-xs font-medium hover:bg-yellow-500/10 transition-all flex items-center justify-center gap-2"
            >
              {loading === "test" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              {isArabic ? "اختبار الدفع - $0.01" : "Test Payment - $0.01"}
            </button>
            )}

            <Button
              variant="outline"
              onClick={goToBillingTab}
              className="w-full border-border text-foreground hover:bg-muted text-sm"
            >
              {isArabic ? "إدارة الاشتراك والفوترة" : "Manage Subscription & Billing"}
            </Button>
          </>
        ) : (
          <>
            {/* NON-OWNER: Ask admin message */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-700 dark:text-blue-400 font-medium">
                  {isArabic ? "تواصل مع صاحب الشركة" : "Contact your company owner"}
                </p>
                <p className="text-blue-600/70 dark:text-blue-400/70 mt-1.5">
                  {isArabic
                    ? "فقط صاحب الشركة يقدر يرقّي الاشتراك. تواصل معه عشان يرقّي الخطتك."
                    : "Only the company owner can upgrade the subscription. Contact them to upgrade your plan."}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Manage existing employees */}
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <p className="text-muted-foreground text-xs font-medium mb-2">
            {isArabic ? "بدل الترقية، يمكنك إدارة الموظفين الحاليين:" : "Instead of upgrading, you can manage current employees:"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-destructive/10 hover:text-destructive text-xs flex items-center gap-1.5"
              onClick={goToEmployeesTab}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isArabic ? "حذف موظف" : "Delete employee"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs flex items-center gap-1.5"
              onClick={goToEmployeesTab}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isArabic ? "استبدال موظف" : "Replace employee"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
