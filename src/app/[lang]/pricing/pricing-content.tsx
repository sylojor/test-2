// ============================================
// Pricing BlivoAI — Client Content
// Fetches plans from DB (admin-configured)
// Monthly + Yearly (15% discount) toggle
// Apple-inspired design, theme-aware, bilingual
// ============================================

"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Sparkles, Building2, Crown, HelpCircle, Loader2, Zap, Users, Coins } from "lucide-react"

interface PricingContentProps {
  params: Promise<{ lang: string }>
}

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

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  FREE_TRIAL: Sparkles,
  STARTER: Zap,
  PROFESSIONAL: Building2,
  ENTERPRISE: Crown,
}

const FAQ_ITEMS = [
  { qKey: "page.pricing.faq.1.q", aKey: "page.pricing.faq.1.a" },
  { qKey: "page.pricing.faq.2.q", aKey: "page.pricing.faq.2.a" },
  { qKey: "page.pricing.faq.3.q", aKey: "page.pricing.faq.3.a" },
  { qKey: "page.pricing.faq.4.q", aKey: "page.pricing.faq.4.a" },
  { qKey: "page.pricing.faq.5.q", aKey: "page.pricing.faq.5.a" },
]

export function PricingContent({ params }: PricingContentProps) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale
  const [plans, setPlans] = useState<PlanFromDB[]>([])
  const [loading, setLoading] = useState(true)
  const [isYearly, setIsYearly] = useState(false)

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/plans")
        if (res.ok) {
          const data = await res.json()
          setPlans(data.plans || [])
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    loadPlans()
  }, [])

  if (loading) {
    return (
      <PublicPageLayout params={params}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      </PublicPageLayout>
    )
  }

  const activePlans = plans.filter(p => p.isActive)
  const popularIndex = Math.floor(activePlans.length / 2)

  const getPrice = (price: number) => {
    if (isYearly && price > 0) {
      return Math.round(price * 0.85) // 15% discount
    }
    return price
  }

  const formatPrice = (price: number) => {
    if (price === 0) return lang === "ar" ? "مجاني" : "Free"
    return `$${price}`
  }

  const formatBudget = (budget: number) => {
    const adjusted = isYearly ? Math.round(budget * 1.15) : budget
    if (adjusted >= 1000000) return `${(adjusted / 1000000).toFixed(0)}M`
    if (adjusted >= 1000) return `${(adjusted / 1000).toFixed(0)}K`
    return adjusted.toString()
  }

  const yearlySavings = (price: number) => {
    if (price === 0) return 0
    return Math.round(price * 12 * 0.15)
  }

  return (
    <PublicPageLayout params={params}>
      {/* Hero */}
      <div className="text-center mb-10 sm:mb-14">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
          {t("page.pricing.title", lang)}
        </h1>
        <p className="text-brand text-lg sm:text-xl font-medium mb-4 sm:mb-6">
          {t("page.pricing.subtitle", lang)}
        </p>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {t("page.pricing.intro", lang)}
        </p>
      </div>

      {/* Monthly / Yearly Toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
          {lang === "ar" ? "شهري" : "Monthly"}
        </span>
        <button
          type="button"
          onClick={() => setIsYearly(!isYearly)}
          className={`relative w-12 h-6 rounded-full transition-colors ${isYearly ? "bg-brand" : "bg-muted"}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isYearly ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
        <span className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
          {lang === "ar" ? "سنوي" : "Yearly"}
        </span>
        {isYearly && (
          <span className="bg-green-500/10 text-green-500 text-xs font-medium px-2 py-0.5 rounded-full">
            -15% {lang === "ar" ? "خصم" : "off"}
          </span>
        )}
      </div>

      {/* Pricing Cards */}
      {activePlans.length > 0 ? (
        <div className={`grid gap-6 mb-12 sm:mb-16 ${activePlans.length <= 3 ? "grid-cols-1 md:grid-cols-" + activePlans.length : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
          {activePlans.map((plan, idx) => {
            const Icon = PLAN_ICONS[plan.planKey] || Sparkles
            const isPopular = idx === popularIndex
            const displayPrice = getPrice(plan.price)
            const features: string[] = []
            try {
              const parsed = JSON.parse(lang === "ar" ? plan.features : plan.featuresEn)
              if (Array.isArray(parsed) && parsed.length > 0) {
                features.push(...parsed)
              }
            } catch {
              // ignore parse errors
            }
            const savings = yearlySavings(plan.price)

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
                    {t("page.pricing.popular", lang)}
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
                  {/* Yearly savings hint */}
                  {isYearly && savings > 0 && (
                    <p className="text-green-500 text-xs mt-1">
                      {lang === "ar" ? `توفير $${savings}/سنة` : `Save $${savings}/year`}
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
                  <Link
                    href={`/${lang}`}
                    className={`w-full py-2.5 px-4 rounded-xl text-center text-sm font-medium transition-all min-h-[44px] flex items-center justify-center ${
                      isPopular
                        ? "bg-brand text-white hover:bg-brand/90"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t("page.pricing.cta", lang)}
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {lang === "ar" ? "لا توجد خطط متاحة حالياً" : "No plans available"}
        </div>
      )}

      {/* FAQ Section */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-6 sm:mb-8 flex items-center justify-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-brand" />
          {t("page.pricing.faq.title", lang)}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FAQ_ITEMS.map(({ qKey, aKey }) => (
            <div
              key={qKey}
              className="p-4 sm:p-5 rounded-xl bg-card border border-border/50"
            >
              <h3 className="text-foreground font-semibold mb-2 text-sm sm:text-base">{t(qKey, lang)}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t(aKey, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicPageLayout>
  )
}