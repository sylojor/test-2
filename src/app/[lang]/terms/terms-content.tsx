// ============================================
// Terms of Service — Client Content
// Apple-inspired design, theme-aware
// Bilingual (AR/EN)
// ============================================

"use client"

import { use } from "react"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, UserCircle, FileText, CreditCard, AlertTriangle, RefreshCw } from "lucide-react"

const SECTIONS = [
  { titleKey: "page.terms.service.title", descKey: "page.terms.service.desc", Icon: Briefcase },
  { titleKey: "page.terms.accounts.title", descKey: "page.terms.accounts.desc", Icon: UserCircle },
  { titleKey: "page.terms.content.title", descKey: "page.terms.content.desc", Icon: FileText },
  { titleKey: "page.terms.payment.title", descKey: "page.terms.payment.desc", Icon: CreditCard },
  { titleKey: "page.terms.liability.title", descKey: "page.terms.liability.desc", Icon: AlertTriangle },
  { titleKey: "page.terms.changes.title", descKey: "page.terms.changes.desc", Icon: RefreshCw },
]

export function TermsContent({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale

  return (
    <PublicPageLayout params={params}>
      {/* Hero */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
          {t("page.terms.title", lang)}
        </h1>
        <p className="text-brand text-lg sm:text-xl font-medium mb-4 sm:mb-6">
          {t("page.terms.subtitle", lang)}
        </p>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {t("page.terms.intro", lang)}
        </p>
      </div>

      {/* Terms Sections */}
      <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
        {SECTIONS.map(({ titleKey, descKey, Icon }, index) => (
          <Card key={titleKey} className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-foreground">
                <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-brand/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <span className="text-lg sm:text-xl">{t(titleKey, lang)}</span>
                <span className="text-muted-foreground text-xs ml-auto rtl:ml-0 rtl:mr-auto">{index + 1}/6</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {t(descKey, lang)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Last Updated */}
      <div className="text-center text-muted-foreground text-sm pt-4 border-t border-border/50">
        {t("page.terms.lastUpdated", lang)}
      </div>
    </PublicPageLayout>
  )
}
