// ============================================
// Feature Detail Page — Client Content
// Shows detailed info about a specific BlivoAI feature/benefit
// Apple-inspired design, theme-aware, bilingual (AR/EN)
// ============================================

"use client"

import { use } from "react"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight } from "lucide-react"
import Link from "next/link"

// Feature data — all content driven by slug
const FEATURE_DATA: Record<string, {
  icon: string
  color: string
  sections: { titleKey: string; points: string[] }[]
}> = {
  // === Original benefits ===
  noHiring: {
    icon: "\u26a1",
    color: "from-yellow-500/20 to-yellow-600/5",
    sections: [
      {
        titleKey: "page.feature.noHiring.section1.title",
        points: [
          "page.feature.noHiring.section1.p1",
          "page.feature.noHiring.section1.p2",
          "page.feature.noHiring.section1.p3",
          "page.feature.noHiring.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.noHiring.section2.title",
        points: [
          "page.feature.noHiring.section2.p1",
          "page.feature.noHiring.section2.p2",
          "page.feature.noHiring.section2.p3",
          "page.feature.noHiring.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.noHiring.section3.title",
        points: [
          "page.feature.noHiring.section3.p1",
          "page.feature.noHiring.section3.p2",
          "page.feature.noHiring.section3.p3",
        ],
      },
    ],
  },
  noSalary: {
    icon: "\ud83d\udcb0",
    color: "from-green-500/20 to-green-600/5",
    sections: [
      {
        titleKey: "page.feature.noSalary.section1.title",
        points: [
          "page.feature.noSalary.section1.p1",
          "page.feature.noSalary.section1.p2",
          "page.feature.noSalary.section1.p3",
          "page.feature.noSalary.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.noSalary.section2.title",
        points: [
          "page.feature.noSalary.section2.p1",
          "page.feature.noSalary.section2.p2",
          "page.feature.noSalary.section2.p3",
          "page.feature.noSalary.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.noSalary.section3.title",
        points: [
          "page.feature.noSalary.section3.p1",
          "page.feature.noSalary.section3.p2",
          "page.feature.noSalary.section3.p3",
        ],
      },
    ],
  },
  noErrors: {
    icon: "\ud83d\udee1\ufe0f",
    color: "from-blue-500/20 to-blue-600/5",
    sections: [
      {
        titleKey: "page.feature.noErrors.section1.title",
        points: [
          "page.feature.noErrors.section1.p1",
          "page.feature.noErrors.section1.p2",
          "page.feature.noErrors.section1.p3",
          "page.feature.noErrors.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.noErrors.section2.title",
        points: [
          "page.feature.noErrors.section2.p1",
          "page.feature.noErrors.section2.p2",
          "page.feature.noErrors.section2.p3",
          "page.feature.noErrors.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.noErrors.section3.title",
        points: [
          "page.feature.noErrors.section3.p1",
          "page.feature.noErrors.section3.p2",
          "page.feature.noErrors.section3.p3",
        ],
      },
    ],
  },
  "247": {
    icon: "\ud83d\udd50",
    color: "from-purple-500/20 to-purple-600/5",
    sections: [
      {
        titleKey: "page.feature.247.section1.title",
        points: [
          "page.feature.247.section1.p1",
          "page.feature.247.section1.p2",
          "page.feature.247.section1.p3",
          "page.feature.247.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.247.section2.title",
        points: [
          "page.feature.247.section2.p1",
          "page.feature.247.section2.p2",
          "page.feature.247.section2.p3",
          "page.feature.247.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.247.section3.title",
        points: [
          "page.feature.247.section3.p1",
          "page.feature.247.section3.p2",
          "page.feature.247.section3.p3",
        ],
      },
    ],
  },
  learns: {
    icon: "\ud83e\udde0",
    color: "from-rose-500/20 to-rose-600/5",
    sections: [
      {
        titleKey: "page.feature.learns.section1.title",
        points: [
          "page.feature.learns.section1.p1",
          "page.feature.learns.section1.p2",
          "page.feature.learns.section1.p3",
          "page.feature.learns.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.learns.section2.title",
        points: [
          "page.feature.learns.section2.p1",
          "page.feature.learns.section2.p2",
          "page.feature.learns.section2.p3",
          "page.feature.learns.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.learns.section3.title",
        points: [
          "page.feature.learns.section3.p1",
          "page.feature.learns.section3.p2",
          "page.feature.learns.section3.p3",
        ],
      },
    ],
  },

  // === Core features ===
  specializedEmployees: {
    icon: "\ud83e\udd16",
    color: "from-indigo-500/20 to-indigo-600/5",
    sections: [
      {
        titleKey: "page.feature.specializedEmployees.section1.title",
        points: [
          "page.feature.specializedEmployees.section1.p1",
          "page.feature.specializedEmployees.section1.p2",
          "page.feature.specializedEmployees.section1.p3",
          "page.feature.specializedEmployees.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.specializedEmployees.section2.title",
        points: [
          "page.feature.specializedEmployees.section2.p1",
          "page.feature.specializedEmployees.section2.p2",
          "page.feature.specializedEmployees.section2.p3",
          "page.feature.specializedEmployees.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.specializedEmployees.section3.title",
        points: [
          "page.feature.specializedEmployees.section3.p1",
          "page.feature.specializedEmployees.section3.p2",
          "page.feature.specializedEmployees.section3.p3",
        ],
      },
    ],
  },
  organizedDepartments: {
    icon: "\ud83c\udfe2",
    color: "from-teal-500/20 to-teal-600/5",
    sections: [
      {
        titleKey: "page.feature.organizedDepartments.section1.title",
        points: [
          "page.feature.organizedDepartments.section1.p1",
          "page.feature.organizedDepartments.section1.p2",
          "page.feature.organizedDepartments.section1.p3",
          "page.feature.organizedDepartments.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.organizedDepartments.section2.title",
        points: [
          "page.feature.organizedDepartments.section2.p1",
          "page.feature.organizedDepartments.section2.p2",
          "page.feature.organizedDepartments.section2.p3",
          "page.feature.organizedDepartments.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.organizedDepartments.section3.title",
        points: [
          "page.feature.organizedDepartments.section3.p1",
          "page.feature.organizedDepartments.section3.p2",
          "page.feature.organizedDepartments.section3.p3",
        ],
      },
    ],
  },
  freeMode: {
    icon: "\u26a1",
    color: "from-amber-500/20 to-amber-600/5",
    sections: [
      {
        titleKey: "page.feature.freeMode.section1.title",
        points: [
          "page.feature.freeMode.section1.p1",
          "page.feature.freeMode.section1.p2",
          "page.feature.freeMode.section1.p3",
          "page.feature.freeMode.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.freeMode.section2.title",
        points: [
          "page.feature.freeMode.section2.p1",
          "page.feature.freeMode.section2.p2",
          "page.feature.freeMode.section2.p3",
          "page.feature.freeMode.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.freeMode.section3.title",
        points: [
          "page.feature.freeMode.section3.p1",
          "page.feature.freeMode.section3.p2",
          "page.feature.freeMode.section3.p3",
        ],
      },
    ],
  },
  smartChats: {
    icon: "\ud83d\udcac",
    color: "from-sky-500/20 to-sky-600/5",
    sections: [
      {
        titleKey: "page.feature.smartChats.section1.title",
        points: [
          "page.feature.smartChats.section1.p1",
          "page.feature.smartChats.section1.p2",
          "page.feature.smartChats.section1.p3",
          "page.feature.smartChats.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.smartChats.section2.title",
        points: [
          "page.feature.smartChats.section2.p1",
          "page.feature.smartChats.section2.p2",
          "page.feature.smartChats.section2.p3",
          "page.feature.smartChats.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.smartChats.section3.title",
        points: [
          "page.feature.smartChats.section3.p1",
          "page.feature.smartChats.section3.p2",
          "page.feature.smartChats.section3.p3",
        ],
      },
    ],
  },
  reportsAnalytics: {
    icon: "\ud83d\udcca",
    color: "from-emerald-500/20 to-emerald-600/5",
    sections: [
      {
        titleKey: "page.feature.reportsAnalytics.section1.title",
        points: [
          "page.feature.reportsAnalytics.section1.p1",
          "page.feature.reportsAnalytics.section1.p2",
          "page.feature.reportsAnalytics.section1.p3",
          "page.feature.reportsAnalytics.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.reportsAnalytics.section2.title",
        points: [
          "page.feature.reportsAnalytics.section2.p1",
          "page.feature.reportsAnalytics.section2.p2",
          "page.feature.reportsAnalytics.section2.p3",
          "page.feature.reportsAnalytics.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.reportsAnalytics.section3.title",
        points: [
          "page.feature.reportsAnalytics.section3.p1",
          "page.feature.reportsAnalytics.section3.p2",
          "page.feature.reportsAnalytics.section3.p3",
        ],
      },
    ],
  },
  advancedSecurity: {
    icon: "\ud83d\udee1\ufe0f",
    color: "from-slate-500/20 to-slate-600/5",
    sections: [
      {
        titleKey: "page.feature.advancedSecurity.section1.title",
        points: [
          "page.feature.advancedSecurity.section1.p1",
          "page.feature.advancedSecurity.section1.p2",
          "page.feature.advancedSecurity.section1.p3",
          "page.feature.advancedSecurity.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.advancedSecurity.section2.title",
        points: [
          "page.feature.advancedSecurity.section2.p1",
          "page.feature.advancedSecurity.section2.p2",
          "page.feature.advancedSecurity.section2.p3",
          "page.feature.advancedSecurity.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.advancedSecurity.section3.title",
        points: [
          "page.feature.advancedSecurity.section3.p1",
          "page.feature.advancedSecurity.section3.p2",
          "page.feature.advancedSecurity.section3.p3",
        ],
      },
    ],
  },

  // === Business features ===
  bizSpecializedEmployees: {
    icon: "\ud83d\udcbc",
    color: "from-violet-500/20 to-violet-600/5",
    sections: [
      {
        titleKey: "page.feature.bizSpecializedEmployees.section1.title",
        points: [
          "page.feature.bizSpecializedEmployees.section1.p1",
          "page.feature.bizSpecializedEmployees.section1.p2",
          "page.feature.bizSpecializedEmployees.section1.p3",
          "page.feature.bizSpecializedEmployees.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.bizSpecializedEmployees.section2.title",
        points: [
          "page.feature.bizSpecializedEmployees.section2.p1",
          "page.feature.bizSpecializedEmployees.section2.p2",
          "page.feature.bizSpecializedEmployees.section2.p3",
          "page.feature.bizSpecializedEmployees.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.bizSpecializedEmployees.section3.title",
        points: [
          "page.feature.bizSpecializedEmployees.section3.p1",
          "page.feature.bizSpecializedEmployees.section3.p2",
          "page.feature.bizSpecializedEmployees.section3.p3",
        ],
      },
    ],
  },
  bizSmartDepartments: {
    icon: "\ud83d\udcbb",
    color: "from-cyan-500/20 to-cyan-600/5",
    sections: [
      {
        titleKey: "page.feature.bizSmartDepartments.section1.title",
        points: [
          "page.feature.bizSmartDepartments.section1.p1",
          "page.feature.bizSmartDepartments.section1.p2",
          "page.feature.bizSmartDepartments.section1.p3",
          "page.feature.bizSmartDepartments.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.bizSmartDepartments.section2.title",
        points: [
          "page.feature.bizSmartDepartments.section2.p1",
          "page.feature.bizSmartDepartments.section2.p2",
          "page.feature.bizSmartDepartments.section2.p3",
          "page.feature.bizSmartDepartments.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.bizSmartDepartments.section3.title",
        points: [
          "page.feature.bizSmartDepartments.section3.p1",
          "page.feature.bizSmartDepartments.section3.p2",
          "page.feature.bizSmartDepartments.section3.p3",
        ],
      },
    ],
  },
  bizDirectConversations: {
    icon: "\ud83c\udf99\ufe0f",
    color: "from-pink-500/20 to-pink-600/5",
    sections: [
      {
        titleKey: "page.feature.bizDirectConversations.section1.title",
        points: [
          "page.feature.bizDirectConversations.section1.p1",
          "page.feature.bizDirectConversations.section1.p2",
          "page.feature.bizDirectConversations.section1.p3",
          "page.feature.bizDirectConversations.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.bizDirectConversations.section2.title",
        points: [
          "page.feature.bizDirectConversations.section2.p1",
          "page.feature.bizDirectConversations.section2.p2",
          "page.feature.bizDirectConversations.section2.p3",
          "page.feature.bizDirectConversations.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.bizDirectConversations.section3.title",
        points: [
          "page.feature.bizDirectConversations.section3.p1",
          "page.feature.bizDirectConversations.section3.p2",
          "page.feature.bizDirectConversations.section3.p3",
        ],
      },
    ],
  },
  bizSmartHRReports: {
    icon: "\ud83d\udcb8",
    color: "from-lime-500/20 to-lime-600/5",
    sections: [
      {
        titleKey: "page.feature.bizSmartHRReports.section1.title",
        points: [
          "page.feature.bizSmartHRReports.section1.p1",
          "page.feature.bizSmartHRReports.section1.p2",
          "page.feature.bizSmartHRReports.section1.p3",
          "page.feature.bizSmartHRReports.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.bizSmartHRReports.section2.title",
        points: [
          "page.feature.bizSmartHRReports.section2.p1",
          "page.feature.bizSmartHRReports.section2.p2",
          "page.feature.bizSmartHRReports.section2.p3",
          "page.feature.bizSmartHRReports.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.bizSmartHRReports.section3.title",
        points: [
          "page.feature.bizSmartHRReports.section3.p1",
          "page.feature.bizSmartHRReports.section3.p2",
          "page.feature.bizSmartHRReports.section3.p3",
        ],
      },
    ],
  },
  bizMultiLanguage: {
    icon: "\ud83c\udf10",
    color: "from-orange-500/20 to-orange-600/5",
    sections: [
      {
        titleKey: "page.feature.bizMultiLanguage.section1.title",
        points: [
          "page.feature.bizMultiLanguage.section1.p1",
          "page.feature.bizMultiLanguage.section1.p2",
          "page.feature.bizMultiLanguage.section1.p3",
          "page.feature.bizMultiLanguage.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.bizMultiLanguage.section2.title",
        points: [
          "page.feature.bizMultiLanguage.section2.p1",
          "page.feature.bizMultiLanguage.section2.p2",
          "page.feature.bizMultiLanguage.section2.p3",
          "page.feature.bizMultiLanguage.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.bizMultiLanguage.section3.title",
        points: [
          "page.feature.bizMultiLanguage.section3.p1",
          "page.feature.bizMultiLanguage.section3.p2",
          "page.feature.bizMultiLanguage.section3.p3",
        ],
      },
    ],
  },
  bizAvailable247: {
    icon: "\u23f0",
    color: "from-fuchsia-500/20 to-fuchsia-600/5",
    sections: [
      {
        titleKey: "page.feature.bizAvailable247.section1.title",
        points: [
          "page.feature.bizAvailable247.section1.p1",
          "page.feature.bizAvailable247.section1.p2",
          "page.feature.bizAvailable247.section1.p3",
          "page.feature.bizAvailable247.section1.p4",
        ],
      },
      {
        titleKey: "page.feature.bizAvailable247.section2.title",
        points: [
          "page.feature.bizAvailable247.section2.p1",
          "page.feature.bizAvailable247.section2.p2",
          "page.feature.bizAvailable247.section2.p3",
          "page.feature.bizAvailable247.section2.p4",
        ],
      },
      {
        titleKey: "page.feature.bizAvailable247.section3.title",
        points: [
          "page.feature.bizAvailable247.section3.p1",
          "page.feature.bizAvailable247.section3.p2",
          "page.feature.bizAvailable247.section3.p3",
        ],
      },
    ],
  },
}

const VALID_SLUGS = Object.keys(FEATURE_DATA)

export function FeatureDetailContent({ params, slug }: { params: Promise<{ lang: string }>; slug: string }) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale

  const data = FEATURE_DATA[slug]
  if (!data) {
    return (
      <PublicPageLayout params={params}>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">{lang === "ar" ? "الصفحة غير موجودة" : "Page not found"}</h1>
          <Link href={`/${lang}`} className="text-brand hover:underline">
            {lang === "ar" ? "العودة للرئيسية" : "Back to Home"}
          </Link>
        </div>
      </PublicPageLayout>
    )
  }

  const titleKey = `page.feature.${slug}.title`
  const subtitleKey = `page.feature.${slug}.subtitle`
  const descKey = `page.feature.${slug}.desc`

  return (
    <PublicPageLayout params={params}>
      {/* Hero */}
      <div className="text-center mb-10 sm:mb-14">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${data.color} mb-4 sm:mb-6`}>
          <span className="text-4xl">{data.icon}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
          {t(titleKey, lang)}
        </h1>
        <p className="text-brand text-lg sm:text-xl font-medium mb-3 sm:mb-4">
          {t(subtitleKey, lang)}
        </p>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          {t(descKey, lang)}
        </p>
      </div>

      {/* Detail sections */}
      <div className="space-y-6 sm:space-y-8 mb-10 sm:mb-14">
        {data.sections.map((section, idx) => (
          <Card key={idx} className="bg-card border-border/50 overflow-hidden">
            <CardContent className="p-5 sm:p-6 md:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-5 flex items-center gap-2">
                <span className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg bg-brand/10 flex items-center justify-center text-brand text-sm font-bold">
                  {idx + 1}
                </span>
                {t(section.titleKey, lang)}
              </h2>
              <ul className="space-y-3">
                {section.points.map((pointKey, pi) => (
                  <li key={pi} className="flex items-start gap-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    <Check className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                    <span>{t(pointKey, lang)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <Card className="bg-card border-brand/20 max-w-xl mx-auto">
          <CardContent className="p-5 sm:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
              {t("page.feature.cta.title", lang)}
            </h3>
            <p className="text-muted-foreground text-sm mb-5">
              {t("page.feature.cta.desc", lang)}
            </p>
            <Link href={`/${lang}?signup=true&ref=${slug}`}>
              <Button className="bg-brand hover:bg-brand-dark text-brand-foreground min-h-[44px]">
                {t("page.feature.cta.button", lang)}
                <ArrowRight className="w-4 h-4 ms-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PublicPageLayout>
  )
}

export { VALID_SLUGS }
