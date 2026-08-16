// ============================================
// Upgrade Dialog — shown when employee limit reached
// Shows available plans with pricing + features
// User selects a plan → redirected to Dodo Payments checkout
// Payment success → webhook updates subscription automatically
//
// Theme-aware — respects light/dark mode
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
import { CheckCircle2, Users, ArrowUpRight, Loader2, ExternalLink, AlertTriangle, Trash2, RefreshCw } from "lucide-react"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import type { SubscriptionPlan } from "@/types"
import { useLocale } from "@/hooks/use-locale"
import { useDashboardStore } from "@/stores/dashboard-store"
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
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentErrorCode, setPaymentErrorCode] = useState<string | null>(null)

  const currentPlanIdx = PLAN_ORDER.indexOf(currentPlan)

  // When user clicks "Pay & Upgrade" → redirect to Dodo checkout
  const handlePayAndUpgrade = async () => {
    if (!selectedPlan) return
    setLoading(true)

    const planInfo = SUBSCRIPTION_PLANS[selectedPlan]

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          amount: planInfo.price,
          currency: "USD",
          description: isArabic
            ? `ترقية BlivoAI — خطّة ${planInfo.nameAr} — $${planInfo.price}/شهر`
            : `BlivoAI Upgrade — ${planInfo.name} — $${planInfo.price}/month`,
          type: "subscription_upgrade",
          metadata: {
            targetPlan: selectedPlan,
            currentPlan,
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.checkoutUrl) {
          // Redirect user to payment page
          window.location.href = data.checkoutUrl
        } else {
          toast.error(isArabic ? "لم يتم إنشاء رابط الدفع" : "Payment checkout URL not generated")
        }
      } else if (res.status === 503) {
        // Payment gateway not configured
        const errData = await res.json()
        setPaymentError(errData.error)
        setPaymentErrorCode(errData.code)
        toast.error(isArabic ? "بوابة الدفع غير مفعّلة — تواصل مع إدارة المنصة" : "Payment gateway not configured — contact platform admin")
      } else {
        const errData = await res.json()
        toast.error(errData.error || (isArabic ? "فشل إنشاء جلسة الدفع" : "Failed to create checkout session"))
      }
    } catch {
      toast.error(isArabic ? "خطأ في الاتصال" : "Connection error")
    }

    setLoading(false)
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
              ? `خطتك الحالية (${SUBSCRIPTION_PLANS[currentPlan].nameAr}) محدودة بـ ${SUBSCRIPTION_PLANS[currentPlan].maxEmployees} موظفين فقط. اختر خطّة أعلى وادفع عشان تضيف موظفين أكتر.`
              : `Your current plan (${SUBSCRIPTION_PLANS[currentPlan].name}) is limited to ${SUBSCRIPTION_PLANS[currentPlan].maxEmployees} employees. Pick a higher plan and pay to add more.`
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

        {/* Payment not configured warning */}
        {paymentErrorCode === "PAYMENT_NOT_CONFIGURED" && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs">
              <p className="text-amber-700 dark:text-amber-400 font-medium">
                {isArabic ? "بوابة الدفع غير مفعّلة" : "Payment gateway not configured"}
              </p>
              <p className="text-amber-600/70 dark:text-amber-400/70 mt-1">
                {isArabic 
                  ? "تواصل مع إدارة المنصة عشان يفعّلوا نظام الدفع، أو احذف/استبدل موظف موجود عشان تفرغ مكان."
                  : "Contact platform admin to enable payments, or delete/replace an existing employee to free up a slot."
                }
              </p>
            </div>
          </div>
        )}

        {/* Alternative: manage existing employees */}
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <p className="text-muted-foreground text-xs font-medium mb-2">
            {isArabic ? "بدل الترقية، يمكنك إدارة الموظفين الحاليين:" : "Instead of upgrading, you can manage current employees:"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-destructive/10 hover:text-destructive text-xs flex items-center gap-1.5"
              onClick={() => {
                onOpenChange(false)
                // Navigate to employees tab
                const store = useDashboardStore.getState()
                store.setActiveTab("employees" as any)
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isArabic ? "حذف موظف" : "Delete employee"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs flex items-center gap-1.5"
              onClick={() => {
                onOpenChange(false)
                const store = useDashboardStore.getState()
                store.setActiveTab("employees" as any)
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isArabic ? "استبدال موظف" : "Replace employee"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground flex-1 hover:bg-muted"
            disabled={loading}
          >
            {isArabic ? "لا، بس أخّر" : "No, later"}
          </Button>
          <Button
            onClick={handlePayAndUpgrade}
            disabled={!selectedPlan || loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : selectedPlan ? (
              <span className="flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4" />
                {isArabic
                  ? `ادفع $${SUBSCRIPTION_PLANS[selectedPlan].price} وترقّي`
                  : `Pay $${SUBSCRIPTION_PLANS[selectedPlan].price} & Upgrade`
                }
              </span>
            ) : (
              isArabic ? "اختر خطّة" : "Select a plan"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
