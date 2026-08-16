// ============================================
// Privacy Policy — Client Content
// Apple-inspired design, theme-aware
// Bilingual (AR/EN)
// ============================================

"use client"

import { use } from "react"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Settings, Lock, Clock, Cookie, Mail } from "lucide-react"

const SECTIONS = [
  { titleKey: "page.privacy.collect.title", descKey: "page.privacy.collect.desc", Icon: Database },
  { titleKey: "page.privacy.use.title", descKey: "page.privacy.use.desc", Icon: Settings },
  { titleKey: "page.privacy.security.title", descKey: "page.privacy.security.desc", Icon: Lock },
  { titleKey: "page.privacy.retention.title", descKey: "page.privacy.retention.desc", Icon: Clock },
  { titleKey: "page.privacy.cookies.title", descKey: "page.privacy.cookies.desc", Icon: Cookie },
  { titleKey: "page.privacy.contact.title", descKey: "page.privacy.contact.desc", Icon: Mail },
]

export function PrivacyContent({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale

  return (
    <PublicPageLayout params={params}>
      {/* Hero */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
          {t("page.privacy.title", lang)}
        </h1>
        <p className="text-brand text-lg sm:text-xl font-medium mb-4 sm:mb-6">
          {t("page.privacy.subtitle", lang)}
        </p>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {t("page.privacy.intro", lang)}
        </p>
      </div>

      {/* Policy Sections */}
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
        {t("page.privacy.lastUpdated", lang)}
      </div>
    </PublicPageLayout>
  )
}
