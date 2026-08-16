// ============================================
// لوحة الإعدادات — نسخة المشتركين فقط
// معلومات الشركة + إعدادات التواصل + الاشتراك
// لا يوجد إعدادات LLM — الموديلات تُدار تلقائياً
// الموظفون يعرفون شو الموديل المناسب لحالهم
// ============================================

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Settings, CreditCard, Sparkles, CheckCircle2,
} from "lucide-react"
import type { ICompany, SubscriptionPlan } from "@/types"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { t } from "@/lib/i18n"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"

interface SettingsPanelProps {
  company: ICompany | null
  isOwner?: boolean
}

// Dialect display labels
const dialectLabels: Record<string, string> = {
  ar: "عربي (فصحى)",
  ar_eg: "عربي (مصري)",
  ar_jo: "عربي (أردني)",
  ar_sa: "عربي (سعودي)",
  ar_lb: "عربي (لبناني)",
  ar_iq: "عربي (عراقي)",
  en: "English",
}

// Tone display labels — will be resolved at runtime with correct language
const toneLabels: Record<string, Record<string, string>> = {
  ar: {
    formal: "رسمي",
    friendly: "ودود",
    professional: "احترافي",
  },
  en: {
    formal: "Formal",
    friendly: "Friendly",
    professional: "Professional",
  },
}

// Subscription key map for translation
const SUBSCRIPTION_KEY_MAP: Record<string, string> = {
  FREE_TRIAL: "tokenBudget.plan.free",
  STARTER: "tokenBudget.plan.starter",
  PROFESSIONAL: "tokenBudget.plan.professional",
  ENTERPRISE: "tokenBudget.plan.enterprise",
}

export function SettingsPanel({ company }: SettingsPanelProps) {
  const language = useLocale()
  const isArabic = language === "ar"
  const { setActiveTab } = useDashboardStore()

  const [saving, setSaving] = useState(false)
  const [companyName, setCompanyName] = useState(company?.name ?? "")
  const [companyIndustry, setCompanyIndustry] = useState(company?.industry ?? "")
  const [companyDescription, setCompanyDescription] = useState(company?.description ?? "")

  if (!company) return null

  const subscription = (company.subscription ?? "FREE_TRIAL") as SubscriptionPlan
  const planInfo = SUBSCRIPTION_PLANS[subscription]

  // Save company info
  const handleSaveCompany = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/companies/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName,
          industry: companyIndustry,
          description: companyDescription,
        }),
      })
      if (res.ok) {
        // Success feedback
      }
    } catch {
      // Silent error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl overflow-x-hidden">
      {/* === Header === */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {t("settings.title", language)}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isArabic ? "إعدادات الشركة والاشتراك" : "Company & Subscription Settings"}
        </p>
      </div>

      {/* === AI Status — Simplified, no details === */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            {isArabic ? "الذكاء الاصطناعي" : "AI Engine"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                {isArabic ? "الذكاء الاصطناعي مفعّل ويعمل تلقائياً ✓" : "AI engine is active and runs automatically ✓"}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {isArabic
                ? "الموظفون الاصطناعيون يختارون تلقائياً الموديل المناسب لكل مهمة — لا حاجة لأي إعدادات منك. فقط أعطي الأمر وسيتم العمل فوراً."
                : "AI employees automatically select the best model for each task — no configuration needed from you. Just give an order and work begins instantly."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* === Company Info === */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">{t("settings.company", language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">{t("settings.company.name", language)}</Label>
            <Input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="bg-muted border-border text-foreground min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">{t("settings.company.industry", language)}</Label>
            <Input
              value={companyIndustry}
              onChange={e => setCompanyIndustry(e.target.value)}
              placeholder={t("settings.company.industryPlaceholder", language)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">{t("settings.company.description", language)}</Label>
            <Input
              value={companyDescription}
              onChange={e => setCompanyDescription(e.target.value)}
              placeholder={t("settings.company.descriptionPlaceholder", language)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[44px]"
            />
          </div>
          <Button
            onClick={handleSaveCompany}
            disabled={saving}
            size="sm"
            className="bg-brand hover:bg-brand-dark text-brand-foreground"
          >
            {saving ? "..." : t("save", language)}
          </Button>
        </CardContent>
      </Card>

      {/* === Communication Settings === */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">{t("settings.communication", language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
            <span className="text-foreground">{t("settings.communication.dialect", language)}</span>
            <span className="text-foreground font-medium">{dialectLabels[company.dialect] ?? company.dialect}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
            <span className="text-foreground">{t("settings.communication.tone", language)}</span>
            <span className="text-foreground font-medium">{toneLabels[language]?.[company.tone] ?? company.tone}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("settings.communication.changeNote", language)}
          </p>
        </CardContent>
      </Card>

      {/* === Subscription === */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">{t("settings.subscription", language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-foreground font-semibold text-lg">{t(SUBSCRIPTION_KEY_MAP[subscription] ?? "tokenBudget.plan.free", language)}</p>
              <p className="text-muted-foreground text-sm">{planInfo.priceDisplay}</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/30">
              {t(SUBSCRIPTION_KEY_MAP[subscription] ?? "tokenBudget.plan.free", language)}
            </Badge>
          </div>
          <ul className="space-y-1.5">
            {(isArabic ? planInfo.featuresAr || planInfo.features : (planInfo.featuresEn && planInfo.featuresEn.length > 0 ? planInfo.featuresEn : planInfo.features)).map((f, i) => (
              <li key={i} className="text-muted-foreground text-sm flex items-center gap-2">
                <span className="text-emerald-400">&#10003;</span> {f}
              </li>
            ))}
          </ul>
          {company.subscriptionEndAt && (
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground text-sm">{t("settings.subscription.renewal", language)}</span>
              <span className="text-foreground text-sm">
                {new Date(company.subscriptionEndAt as string | Date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
              </span>
            </div>
          )}
          {/* Go to Billing & Payment tab */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                {isArabic ? "لترقية خطتك أو شراء توكنات" : "To upgrade or buy tokens"}
              </span>
            </div>
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#3F4A69] to-emerald-500 hover:from-[#3F4A69] hover:to-emerald-400 text-white text-xs"
              onClick={() => setActiveTab("billing")}
            >
              <CreditCard className="w-3 h-3 mr-1" />
              {isArabic ? "الفواتير والدفع" : "Billing & Payment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
