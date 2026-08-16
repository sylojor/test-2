// ============================================
// About BlivoAI — Client Content
// Apple-inspired design, theme-aware
// Bilingual (AR/EN)
// ============================================

"use client"

import { use } from "react"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Shield, Zap, Heart, Target, Users } from "lucide-react"

const VALUES = [
  { key: "page.about.values.1", Icon: Zap },
  { key: "page.about.values.2", Icon: Shield },
  { key: "page.about.values.3", Icon: Eye },
  { key: "page.about.values.4", Icon: Heart },
]

export function AboutContent({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale

  return (
    <PublicPageLayout params={params}>
      {/* Hero */}
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
          {t("page.about.title", lang)}
        </h1>
        <p className="text-brand text-lg sm:text-xl font-medium mb-4 sm:mb-6">
          {t("page.about.subtitle", lang)}
        </p>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {t("page.about.intro", lang)}
        </p>
      </div>

      {/* Vision & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 sm:mb-16">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-foreground">
              <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-brand/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-brand" />
              </div>
              {t("page.about.vision.title", lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t("page.about.vision.desc", lang)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-foreground">
              <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-brand/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-brand" />
              </div>
              {t("page.about.mission.title", lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t("page.about.mission.desc", lang)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Values */}
      <div className="mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-6 sm:mb-8">
          {t("page.about.values.title", lang)}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {VALUES.map(({ key, Icon }) => (
            <div
              key={key}
              className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-card border border-border/50 hover:border-brand/30 transition-all"
            >
              <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-brand" />
              </div>
              <p className="text-foreground font-medium leading-relaxed">{t(key, lang)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="text-center">
        <Card className="bg-card border-border/50 max-w-2xl mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-center gap-2.5 text-foreground">
              <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-brand/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-brand" />
              </div>
              {t("page.about.team.title", lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t("page.about.team.desc", lang)}
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicPageLayout>
  )
}
