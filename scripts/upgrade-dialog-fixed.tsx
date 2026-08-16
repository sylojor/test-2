// ============================================
// Upgrade Dialog — shown when employee limit reached
// Shows available plans with pricing + features
// User selects a plan → API updates subscription
//
// FIX: Theme-aware — respects light/dark mode
// Uses semantic theme tokens (bg-card, text-foreground, etc.)
// and dark: prefix for theme-specific accents
// ============================================

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Users, ArrowUpRight, Loader2 } from "lucide-react"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import type { SubscriptionPlan, Locale } from "@/types"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import { toast } from "sonner"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: SubscriptionPlan
  companyId: string
  onUpgradeSuccess: (newPlan: SubscriptionPlan) => void
}

const PLAN_ORDER: SubscriptionPlan[] = ["FREE_TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"]

// Theme-aware plan colors — light + dark variants
const PLAN_COLORS: Record<SubscriptionPlan, { bg: string; border: string; badge: string; highlight: string }> = {
  FREE_TRIAL: {
    bg: "bg-muted/50 dark:bg-muted/30",
    border: "border-border",
    badge: "bg-muted text-muted-foreground",
    highlight: ""
  },
  STARTER: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-700/50",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-400",
    highlight: ""
  },
  PROFESSIONAL: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-300 dark:border-emerald-600/50",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    highlight: "ring-2 ring-emerald-500"
  },
  ENTERPRISE: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-700/50",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-600/20 dark:text-purple-400",
    highlight: ""
  },
}

export function UpgradeDialog({
  open,
  onOpenChange,
  currentPlan,
  companyId,
  onUpgradeSuccess,
}: UpgradeDialogProps) {
  const language = useLocale()
  const isArabic = language === "ar"
  const [upgrading, setUpgrading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)

  const currentPlanIdx = PLAN_ORDER.indexOf(currentPlan)

  const handleUpgrade = async () => {
    if (!selectedPlan) return
    setUpgrading(true)

    try {
      const res = await fetch("/api/companies/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          plan: selectedPlan,
        }),
      })

      if (res.ok) {
        toast.success(
          isArabic
            ? `تم الترقية لخطّة ${SUBSCRIPTION_PLANS[selectedPlan].nameAr} بنجاح!`
            : `Successfully upgraded to ${SUBSCRIPTION_PLANS[selectedPlan].name}!`
        )
        onUpgradeSuccess(selectedPlan)
        onOpenChange(false)
        setSelectedPlan(null)
      } else {
        const data = await res.json()
        toast.error(data.error || (isArabic ? "فشلت الترقية" : "Upgrade failed"))
      }
    } catch {
      toast.error(isArabic ? "خطأ في الاتصال" : "Connection error")
    }

    setUpgrading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border text-foreground max-w-lg sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-custom"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {isArabic ? "ترقية الاشتراك" : "Upgrade Subscription"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isArabic
              ? `خطتك الحالية (${SUBSCRIPTION_PLANS[currentPlan].nameAr}) محدودة بـ ${SUBSCRIPTION_PLANS[currentPlan].maxEmployees} موظفين فقط. اختر خطّة أعلى عشان تضيف موظفين أكتر.`
              : `Your current plan (${SUBSCRIPTION_PLANS[currentPlan].name}) is limited to ${SUBSCRIPTION_PLANS[currentPlan].maxEmployees} employees. Pick a higher plan to add more.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-2">
          {PLAN_ORDER.map((plan) => {
            const planInfo = SUBSCRIPTION_PLANS[plan]
            const colors = PLAN_COLORS[plan]
            const isCurrent = plan === currentPlan
            const isBelow = PLAN_ORDER.indexOf(plan) <= currentPlanIdx
            const isRecommended = plan === "PROFESSIONAL" && currentPlan === "FREE_TRIAL"

            return (
              <button
                key={plan}
                onClick={() => {
                  if (!isCurrent && !isBelow) setSelectedPlan(plan)
                }}
                disabled={isCurrent || isBelow}
                className={`w-full text-start p-3 sm:p-4 rounded-xl transition-all border ${
                  isCurrent
                    ? `${colors.bg} ${colors.border} opacity-50 cursor-not-allowed`
                    : isBelow
                    ? "opacity-30 cursor-not-allowed bg-muted/20 border-border"
                    : selectedPlan === plan
                    ? `bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-400/50 dark:ring-emerald-500/50 scale-[1.02]`
                    : `${colors.bg} ${colors.border} hover:scale-[1.01] hover:border-emerald-300 dark:hover:border-emerald-700/50`
                } ${isRecommended && !selectedPlan ? colors.highlight : ""}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-foreground">
                      {isArabic ? planInfo.nameAr : planInfo.name}
                    </span>
                    {isCurrent && (
                      <Badge className="text-xs bg-muted text-muted-foreground">
                        {isArabic ? "خطتك الحالية" : "Current"}
                      </Badge>
                    )}
                    {isRecommended && !isCurrent && (
                      <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        {isArabic ? "الأكثر طلبًا" : "Most Popular"}
                      </Badge>
                    )}
                  </div>
                  <span className="text-foreground font-bold text-base sm:text-lg">
                    {isArabic ? planInfo.priceDisplay : planInfo.priceDisplayEn}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    {planInfo.maxEmployees >= 999999
                      ? isArabic ? "موظفين غير محدودين" : "Unlimited employees"
                      : `${planInfo.maxEmployees} ${isArabic ? "موظفين" : "employees"}`
                    }
                  </span>
                </div>

                <ul className="space-y-0.5">
                  {(isArabic ? planInfo.features : planInfo.featuresEn).map((f, i) => (
                    <li key={i} className="text-muted-foreground text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600/70 dark:text-emerald-500/70" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground flex-1 hover:bg-muted"
            disabled={upgrading}
          >
            {isArabic ? "لا، بس أخّر" : "No, later"}
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={!selectedPlan || upgrading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
          >
            {upgrading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : selectedPlan ? (
              isArabic
                ? `ترقية لـ ${SUBSCRIPTION_PLANS[selectedPlan].nameAr}`
                : `Upgrade to ${SUBSCRIPTION_PLANS[selectedPlan].name}`
            ) : (
              isArabic ? "اختر خطّة" : "Select a plan"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
