// ============================================
// Billing & Payment Panel — BlivoAI
// Shows: Current Plan, Upgrade Options (monthly/yearly),
// Token Purchase, Payment Method, Auto-Renewal
// Integrates with Dodo Payments for checkout
// ============================================

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  CreditCard, Crown, Zap, Loader2, ShieldAlert,
  CheckCircle2, Calendar, Coins, Building2, Users, Sparkles,
} from "lucide-react"
import type { ICompany, SubscriptionPlan } from "@/types"
import { SUBSCRIPTION_PLANS, TOKEN_ADD_ON_PACKAGES, getPlansFromAPI, clearPlansCache, type PlanDetail } from "@/lib/subscription-plans"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import { useDashboardStore } from "@/stores/dashboard-store"
import { toast } from "sonner"

interface BillingPanelProps {
  company: ICompany | null
}

// Yearly price = 15% discount off monthly * 12
const YEARLY_DISCOUNT = 0.85

export function BillingPanel({ company }: BillingPanelProps) {
  const language = useLocale()
  const isArabic = language === "ar"
  const { setActiveTab } = useDashboardStore()

  const [loading, setLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [autoRenew, setAutoRenew] = useState(true)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [dynamicPlans, setDynamicPlans] = useState<Record<string, PlanDetail>>(SUBSCRIPTION_PLANS)
  const [sortedPlanKeys, setSortedPlanKeys] = useState<string[]>([])

  useEffect(() => {
    clearPlansCache()
    getPlansFromAPI().then(plans => {
      setDynamicPlans(plans)
      const keys = Object.keys(plans).sort((a, b) => (plans[a]?.price ?? 0) - (plans[b]?.price ?? 0))
      setSortedPlanKeys(keys)
    })
  }, [])

  if (!company) return null

  const subscription = company.subscription ?? "FREE_TRIAL"
  const planInfo = dynamicPlans[subscription] || SUBSCRIPTION_PLANS[subscription]
  const currentPlanPrice = planInfo?.price ?? 0

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toString()
  }

  // Get display price based on billing cycle
  const getDisplayPrice = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return isArabic ? "مجاني" : "Free"
    if (billingCycle === "yearly") {
      const yearlyPrice = Math.round(monthlyPrice * YEARLY_DISCOUNT * 12)
      return `$${yearlyPrice}`
    }
    return `$${monthlyPrice}`
  }

  const getPerLabel = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return ""
    return billingCycle === "yearly"
      ? (isArabic ? "/سنة" : "/year")
      : (isArabic ? "/شهر" : "/mo")
  }

  // Handle subscription upgrade checkout
  const handleUpgrade = async (targetPlan: SubscriptionPlan) => {
    setLoading(`plan-${targetPlan}`)
    setCheckoutError(null)

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          amount: dynamicPlans[targetPlan]?.price || SUBSCRIPTION_PLANS[targetPlan].price,
          currency: "USD",
          description: `BlivoAI ${dynamicPlans[targetPlan]?.name || SUBSCRIPTION_PLANS[targetPlan].name} Subscription`,
          type: "subscription_upgrade",
          metadata: {
            targetPlan,
            currentPlan: subscription,
            isRecurring: "true",
            autoRenew: String(autoRenew),
            billingCycle,
            lang: language,
          },
        }),
      })

      const data = await response.json()
      console.log("[UPGRADE_CHECKOUT_RES]", response.status, data)

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      if (data.code === "PAYMENT_NOT_CONFIGURED") {
        setCheckoutError(t("billing.notConfigured", language))
      } else {
        setCheckoutError(t("billing.checkoutError", language))
      }
      toast.error(data.error || (isArabic ? "فشل إنشاء الدفع" : "Payment creation failed"))
    } catch (err) {
      console.error("[UPGRADE_CHECKOUT_ERR]", err)
      setCheckoutError(t("billing.checkoutError", language))
      toast.error(isArabic ? "خطأ في الاتصال" : "Connection error")
    } finally {
      setLoading(null)
    }
  }

  // Handle token purchase checkout
  const handleBuyTokens = async (pkg: { tokens: number; price: number; label: string }) => {
    setLoading(`tokens-${pkg.tokens}`)
    setCheckoutError(null)

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          amount: pkg.price,
          currency: "USD",
          description: `BlivoAI Token Add-On: ${pkg.label}`,
          type: "token_addon",
          metadata: {
            type: "token_addon",
            tokenAmount: pkg.tokens.toString(),
            currentPlan: subscription,
            lang: language,
          },
        }),
      })

      const data = await response.json()
      console.log("[TOKEN_CHECKOUT_RES]", response.status, data)

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      if (data.code === "PAYMENT_NOT_CONFIGURED") {
        setCheckoutError(t("billing.notConfigured", language))
      } else {
        setCheckoutError(t("billing.checkoutError", language))
      }
      toast.error(data.error || (isArabic ? "فشل إنشاء الدفع" : "Payment creation failed"))
    } catch (err) {
      console.error("[TOKEN_CHECKOUT_ERR]", err)
      setCheckoutError(t("billing.checkoutError", language))
      toast.error(isArabic ? "خطأ في الاتصال" : "Connection error")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* === Header === */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-foreground text-xl font-bold">{t("billing.title", language)}</h1>
          <p className="text-muted-foreground text-sm">
            {isArabic
              ? `خطة ${planInfo.nameAr} — ${planInfo.priceDisplay}`
              : `${planInfo.name} plan — ${planInfo.priceDisplay}`}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {checkoutError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-red-700 dark:text-red-400">{checkoutError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 ml-auto"
            onClick={() => setCheckoutError(null)}
          >
            ✕
          </Button>
        </div>
      )}

      {/* === TEST PAYMENT BUTTON === */}
      <button
        onClick={async () => {
          setLoading("test")
          try {
            const res = await fetch("/api/payments/test-checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ companyId: company.id, lang: language }),
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
        className="w-full py-3 rounded-xl border-2 border-dashed border-yellow-400/60 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-sm font-semibold transition-all flex items-center justify-center gap-2"
      >
        {loading === "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {isArabic ? "اختبار الدفع - $0.01" : "Test Payment - $0.01"}
      </button>

      {/* === Current Plan === */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-blue-600" />
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Crown className="w-4 h-4 text-emerald-500" />
            {t("billing.currentPlan", language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3F4A69] to-emerald-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-foreground font-bold text-lg">
                  {isArabic ? planInfo.nameAr : planInfo.name}
                </p>
                <p className="text-muted-foreground text-sm">
                  {planInfo.price === 0
                    ? (isArabic ? "مجاني" : "Free")
                    : `$${planInfo.price}${t("billing.perMonth", language)}`}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/30 text-sm px-3 py-1">
              {t("billing.current", language)}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <Coins className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-foreground font-semibold">{formatTokens(planInfo.tokenBudget)}</p>
              <p className="text-muted-foreground text-xs">{t("billing.tokenBudget", language)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <Users className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-foreground font-semibold">
                {planInfo.maxEmployees >= 999999
                  ? t("billing.unlimited", language)
                  : planInfo.maxEmployees}
              </p>
              <p className="text-muted-foreground text-xs">{t("billing.maxEmployees", language)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
              <Building2 className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-foreground font-semibold">
                {planInfo.maxDepartments >= 999999
                  ? t("billing.unlimited", language)
                  : planInfo.maxDepartments}
              </p>
              <p className="text-muted-foreground text-xs">{t("billing.maxDepartments", language)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">{t("billing.planFeatures", language)}</p>
            {(isArabic ? planInfo.features : planInfo.featuresEn || planInfo.features).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-foreground">{f}</span>
              </div>
            ))}
          </div>

          {company.subscriptionEndAt && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">{t("billing.renewalDate", language)}</span>
              <span className="text-foreground text-sm font-medium">
                {new Date(company.subscriptionEndAt as string | Date).toLocaleDateString(
                  isArabic ? "ar-EG" : "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === Payment Method & Auto-Renew === */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-500" />
            {t("billing.paymentMethod", language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">
                  {isArabic ? "بطاقة فيزا — **** 4242" : "Visa card — **** 4242"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isArabic ? "ستحفظ البطاقة تلقائياً عند أول دفع عبر Dodo" : "Card saved automatically on first Dodo payment"}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-muted-foreground text-xs">
              Visa
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                autoRenew ? "bg-emerald-500/15" : "bg-muted"
              }`}>
                <Zap className={`w-4 h-4 ${autoRenew ? "text-emerald-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">{t("billing.autoRenew", language)}</p>
                <p className="text-muted-foreground text-xs">
                  {autoRenew ? t("billing.autoRenew.on", language) : t("billing.autoRenew.off", language)}
                </p>
              </div>
            </div>
            <Switch
              checked={autoRenew}
              onCheckedChange={setAutoRenew}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* === Manage Plans === */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Crown className="w-4 h-4 text-emerald-500" />
              {isArabic ? "إدارة الخطط" : "Manage Plans"}
            </CardTitle>
            {/* Monthly / Yearly toggle */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border">
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
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  billingCycle === "yearly"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setBillingCycle("yearly")}
              >
                {isArabic ? "سنوي" : "Yearly"}
                <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[9px] px-1.5 py-0 border-0">
                  {isArabic ? "خصم ١٥٪" : "-15%"}
                </Badge>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sortedPlanKeys.map((planKey) => {
              const plan = dynamicPlans[planKey]
              if (!plan) return null
              const isCurrentPlan = planKey === subscription
              const isUpgrade = plan.price > currentPlanPrice
              const isLoading = loading === `plan-${planKey}`
              const isPopular = planKey === "PROFESSIONAL"
              const displayPrice = getDisplayPrice(plan.price)
              const perLabel = getPerLabel(plan.price)
              return (
                <div
                  key={planKey}
                  className={`relative p-4 rounded-xl border transition-all space-y-3 ${
                    isCurrentPlan
                      ? "bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/20"
                      : "bg-muted/30 border-border hover:border-emerald-500/20"
                  }`}
                >
                  {isPopular && !isCurrentPlan && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 border-emerald-300 text-[10px] px-2 py-0.5">
                        {isArabic ? "الأكثر طلباً" : "Most Popular"}
                      </Badge>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5">
                        {t("billing.current", language)}
                      </Badge>
                    </div>
                  )}

                  <div className="text-center pt-1">
                    <p className="text-foreground font-bold text-base">
                      {isArabic ? plan.nameAr : plan.name}
                    </p>
                    <p className={`font-bold text-2xl mt-1 ${
                      isCurrentPlan ? "text-emerald-500" : "text-foreground"
                    }`}>
                      {displayPrice}
                    </p>
                    {perLabel && (
                      <p className="text-muted-foreground text-xs">{perLabel}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      {formatTokens(plan.tokenBudget)} {t("billing.tokens", language)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3 h-3 text-blue-500" />
                      {plan.maxEmployees >= 999999
                        ? t("billing.unlimited", language)
                        : `${plan.maxEmployees} ${isArabic ? "موظف" : "employees"}`}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3 text-purple-500" />
                      {plan.maxDepartments >= 999999
                        ? t("billing.unlimited", language)
                        : `${plan.maxDepartments} ${isArabic ? "قسم" : "departments"}`}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {(isArabic ? plan.features : plan.featuresEn || plan.features).slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{f}</span>
                      </div>
                    ))}
                  </div>

                  {isCurrentPlan ? (
                    <div className="w-full py-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-center text-xs font-medium">
                      {isArabic ? "خطتك الحالية" : "Your current plan"}
                    </div>
                  ) : (
                    <Button
                      className={`w-full text-sm ${
                        isUpgrade
                          ? "bg-gradient-to-r from-[#3F4A69] to-emerald-500 hover:from-[#3F4A69] hover:to-emerald-400 text-white"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground border border-border"
                      }`}
                      disabled={loading !== null}
                      onClick={() => handleUpgrade(planKey as SubscriptionPlan)}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {isLoading
                        ? t("billing.processing", language)
                        : isUpgrade
                          ? (isArabic ? "ترقية" : "Upgrade")
                          : (isArabic ? "تخفيض" : "Downgrade")}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* === Token Purchase === */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            {t("billing.tokenPurchase", language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-3">
            {isArabic
              ? "اشترِ توكنات إضافية عشان تستمر بالشغل حتى لو ميزانية شهرك خلصت. التوكنات الإضافية تبقى عندك حتى تخلصها."
              : "Buy extra tokens to keep working even after your monthly budget runs out. Add-on tokens persist until fully consumed."}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TOKEN_ADD_ON_PACKAGES.map((pkg) => {
              const isLoading = loading === `tokens-${pkg.tokens}`
              return (
                <div
                  key={pkg.tokens}
                  className="p-4 rounded-lg bg-muted/30 border border-border hover:border-yellow-500/30 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold text-sm">
                        {formatTokens(pkg.tokens)} {t("billing.tokens", language)}
                      </p>
                      <p className="text-yellow-500 font-bold">${pkg.price}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs"
                    disabled={loading !== null}
                    onClick={() => handleBuyTokens(pkg)}
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {isLoading
                      ? t("billing.processing", language)
                      : t("billing.buyTokens", language)}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
