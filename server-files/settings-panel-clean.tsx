// ============================================
// لوحة الإعدادات — للمشترك فقط
// المشترك يشوف: إعدادات الشركة + الاشتراك + المنصات
// الـ API Keys و بوابة الدفع = في لوحة تحكم صاحب المنصة فقط
// ============================================

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings } from "lucide-react"
import type { ICompany } from "@/types"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface SettingsPanelProps {
  company: ICompany | null
}

const SUBSCRIPTION_KEY_MAP: Record<string, string> = {
  FREE_TRIAL: "tokenBudget.plan.free",
  STARTER: "tokenBudget.plan.starter",
  PROFESSIONAL: "tokenBudget.plan.professional",
  ENTERPRISE: "tokenBudget.plan.enterprise",
}

export function SettingsPanel({ company }: SettingsPanelProps) {
  const language = useLocale()
  const isArabic = language === "ar"

  if (!company) return null

  const subscription = company.subscription ?? "FREE_TRIAL"
  const planInfo = SUBSCRIPTION_PLANS[subscription]

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {t("settings.title", language)}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isArabic ? "إعدادات الشركة والاشتراك" : "Company & Subscription Settings"}
        </p>
      </div>

      {/* الاشتراك */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">{t("settings.subscription", language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-foreground font-semibold text-lg">
                {t(SUBSCRIPTION_KEY_MAP[subscription] ?? "tokenBudget.plan.free", language)}
              </p>
              <p className="text-muted-foreground text-sm">
                {isArabic ? planInfo.priceDisplay : planInfo.priceDisplayEn}
              </p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/30">
              {t(SUBSCRIPTION_KEY_MAP[subscription] ?? "tokenBudget.plan.free", language)}
            </Badge>
          </div>
          <ul className="space-y-1.5">
            {(isArabic ? planInfo.features : planInfo.featuresEn).map((f, i) => (
              <li key={i} className="text-muted-foreground text-sm flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400">&#10003;</span> {f}
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
          <Button
            variant="outline"
            className="w-full border-emerald-600 text-emerald-400 hover:bg-emerald-900/20"
            onClick={() => {
              window.location.reload()
            }}
          >
            {t("settings.subscription.upgrade", language)}
          </Button>
        </CardContent>
      </Card>

      {/* المنصات */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">{t("settings.platforms", language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">{t("settings.platforms.desc", language)}</p>
            <Button variant="outline" className="mt-3 border-border text-foreground">
              {t("settings.platforms.connectFacebook", language)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
