// ============================================
// Payment Select — Post-Signup Plan Selection
// Shows plans with monthly/yearly toggle
// Triggers Dodo checkout on plan selection
// ============================================

"use client"

import { useState, useEffect } from "react"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Sparkles, Building2, Crown, Zap, Users, Coins, Loader2, ArrowLeft, CreditCard } from "lucide-react"
import { toast } from "sonner"

interface PlanFromDB {
  id: string
  planKey: string
  name: string
  nameAr: string
  price: number
  tokenBudget: number
  maxEmployees: number
  maxDepartments: number
  features: string
  featuresEn: string
  isActive: boolean
  order: number
}

interface PaymentSelectProps {
  lang: Locale
  companyId: string
  featureRef?: string
  onBack: () => void
  onSkip: () => void
}

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  FREE_TRIAL: Sparkles,
  STARTER: Zap,
  PROFESSIONAL: Building2,
  ENTERPRISE: Crown,
}

export function PaymentSelectContent({ lang, companyId, featureRef, onBack, onSkip }: PaymentSelectProps) {
  const [plans, setPlans] = useState<PlanFromDB[]>([])
  const [loading, setLoading] = useState(true)
  const [isYearly, setIsYearly] = useState(false)
  const [payingPlan, setPayingPlan] = useState<string | null>(null)

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/plans")
        if (res.ok) {
          const data = await res.json()
          setPlans(data.plans || [])
        }
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    loadPlans()
  }, [])

  const getPrice = (price: number) => {
    if (isYearly && price > 0) return Math.round(price * 0.85)
    return price
  }

  const formatPrice = (price: number) => {
    if (price === 0) return lang === "ar" ? "مجاني" : "Free"
    return `$${price}`
  }

  const yearlySavings = (price: number) => {
    if (price === 0) return 0
    return Math.round(price * 12 * 0.15)
  }

  const handleSelectPlan = async (plan: PlanFromDB) => {
    if (plan.price === 0) {
      onSkip()
      return
    }

    setPayingPlan(plan.planKey)
    try {
      const billingCycle = isYearly ? "yearly" : "monthly"
      const price = getPrice(plan.price)
      const amount = billingCycle === "yearly" ? price * 12 : price
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          amount: price,
          currency: "USD",
          description: `BlivoAI ${(lang === "ar" ? plan.nameAr : plan.name)} — ${billingCycle}`,
          type: "subscription_upgrade",
          metadata: {
            targetPlan: plan.planKey,
            billingCycle,
            isRecurring: "true",
            autoRenew: "true",
            lang,
            featureRef: featureRef || "",
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        } else {
          toast.error(lang === "ar" ? "لم يتم إنشاء رابط الدفع" : "Checkout URL not created")
          setPayingPlan(null)
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        if (errData.code === "PAYMENT_NOT_CONFIGURED") {
          toast.error(lang === "ar" ? "بوابة الدفع غير مضبوطة بعد" : "Payment gateway not configured yet")
        } else {
          toast.error(lang === "ar" ? "فشل إنشاء الدفع" : "Payment creation failed")
        }
        setPayingPlan(null)
      }
    } catch {
      toast.error(lang === "ar" ? "خطأ في الاتصال" : "Connection error")
      setPayingPlan(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "جاري تحميل الخطط..." : "Loading plans..."}</p>
        </div>
      </div>
    )
  }

  const activePlans = plans.filter(p => p.isActive)
  const popularIndex = Math.floor(activePlans.length / 2)

  return (
    <div className="min-h-screen bg-background text-foreground" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand" />
              <span className="font-semibold text-sm sm:text-base">{t("payment.title", lang)}</span>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted min-h-[44px]"
          >
            {t("payment.skip", lang)}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-10 sm:py-16 max-w-5xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t("payment.selectPlan", lang)}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            {featureRef
              ? t("payment.refMessage", lang)
              : t("payment.subtitle", lang)
            }
          </p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium transition-colors ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
            {lang === "ar" ? "شهري" : "Monthly"}
          </span>
          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${isYearly ? "bg-brand" : "bg-muted"}`}
            aria-label={lang === "ar" ? "تبديل بين شهري وسنوي" : "Toggle monthly/yearly"}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isYearly ? "translate-x-7" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm font-medium transition-colors ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
            {lang === "ar" ? "سنوي" : "Yearly"}
          </span>
          {isYearly && (
            <span className="bg-green-500/10 text-green-500 text-xs font-medium px-2.5 py-1 rounded-full">
              -15% {lang === "ar" ? "خصم" : "off"}
            </span>
          )}
        </div>

        {/* Plans Grid */}
        {activePlans.length > 0 ? (
          <div className={`grid gap-5 sm:gap-6 ${activePlans.length <= 3 ? `grid-cols-1 md:grid-cols-${Math.min(activePlans.length, 3)}` : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
            {activePlans.map((plan, idx) => {
              const Icon = PLAN_ICONS[plan.planKey] || Sparkles
              const isPopular = idx === popularIndex
              const displayPrice = getPrice(plan.price)
              const features: string[] = []
              try {
                const parsed = JSON.parse(lang === "ar" ? plan.features : plan.featuresEn)
                if (Array.isArray(parsed) && parsed.length > 0) features.push(...parsed)
              } catch {}
              const savings = yearlySavings(plan.price)
              const isPaying = payingPlan === plan.planKey
              const totalYearly = isYearly && plan.price > 0 ? displayPrice * 12 : 0

              return (
                <Card
                  key={plan.id}
                  className={`relative bg-card border-border/50 flex flex-col ${
                    isPopular
                      ? "border-brand shadow-lg shadow-brand/10 scale-[1.02] md:scale-105"
                      : "hover:border-brand/30"
                  } transition-all`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {t("payment.popular", lang)}
                    </div>
                  )}
                  <CardHeader className="pb-3 text-center">
                    <div className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-brand" />
                    </div>
                    <CardTitle className="text-foreground text-lg">
                      {lang === "ar" ? plan.nameAr : plan.name}
                    </CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-4xl font-bold text-foreground">{formatPrice(displayPrice)}</span>
                      {displayPrice > 0 && (
                        <span className="text-muted-foreground text-sm">
                          /{lang === "ar" ? "شهر" : "mo"}
                        </span>
                      )}
                    </div>
                    {isYearly && savings > 0 && (
                      <p className="text-green-500 text-xs mt-1">
                        {lang === "ar"
                          ? `توفير $${savings}/سنة — المجموع $${totalYearly}`
                          : `Save $${savings}/year — Total $${totalYearly}`
                        }
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="grid grid-cols-3 gap-2 mb-5 p-3 rounded-lg bg-muted/50">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-foreground font-semibold text-sm">
                          <Users className="w-3.5 h-3.5 text-brand" />
                          {plan.maxEmployees >= 999999 ? "∞" : plan.maxEmployees}
                        </div>
                        <div className="text-muted-foreground text-[10px] mt-0.5">
                          {lang === "ar" ? "موظفين" : "employees"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-foreground font-semibold text-sm">
                          <Building2 className="w-3.5 h-3.5 text-brand" />
                          {plan.maxDepartments >= 999999 ? "∞" : plan.maxDepartments}
                        </div>
                        <div className="text-muted-foreground text-[10px] mt-0.5">
                          {lang === "ar" ? "أقسام" : "departments"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-foreground font-semibold text-sm">
                          <Coins className="w-3.5 h-3.5 text-brand" />
                          {(() => {
                            const b = isYearly ? Math.round(plan.tokenBudget * 1.15) : plan.tokenBudget
                            if (b >= 1000000) return `${(b / 1000000).toFixed(0)}M`
                            if (b >= 1000) return `${(b / 1000).toFixed(0)}K`
                            return b.toString()
                          })()}
                        </div>
                        <div className="text-muted-foreground text-[10px] mt-0.5">tokens</div>
                      </div>
                    </div>

                    <ul className="flex-1 space-y-2.5 mb-6">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isPaying}
                      className={`w-full min-h-[44px] text-sm font-medium transition-all ${
                        isPopular
                          ? "bg-brand text-white hover:bg-brand/90"
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                    >
                      {isPaying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : plan.price === 0 ? (
                        t("payment.startFree", lang)
                      ) : (
                        <>
                          {isYearly
                            ? t("payment.payYearly", lang)
                            : t("payment.payMonthly", lang)
                          }
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {lang === "ar" ? "لا توجد خطط متاحة" : "No plans available"}
          </div>
        )}
      </div>
    </div>
  )
}
