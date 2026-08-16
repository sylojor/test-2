// ============================================
// Employee Detail Page — Client Content
// Shows detailed info about a specific AI employee type
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

// Employee data — all content driven by slug
const EMPLOYEE_DATA: Record<string, {
  icon: string
  color: string
  sections: { titleKey: string; points: string[] }[]
}> = {
  accountant: {
    icon: "💰",
    color: "from-emerald-500/20 to-emerald-600/5",
    sections: [
      {
        titleKey: "page.employee.accountant.section1.title",
        points: [
          "page.employee.accountant.section1.p1",
          "page.employee.accountant.section1.p2",
          "page.employee.accountant.section1.p3",
          "page.employee.accountant.section1.p4",
        ],
      },
      {
        titleKey: "page.employee.accountant.section2.title",
        points: [
          "page.employee.accountant.section2.p1",
          "page.employee.accountant.section2.p2",
          "page.employee.accountant.section2.p3",
          "page.employee.accountant.section2.p4",
        ],
      },
      {
        titleKey: "page.employee.accountant.section3.title",
        points: [
          "page.employee.accountant.section3.p1",
          "page.employee.accountant.section3.p2",
          "page.employee.accountant.section3.p3",
        ],
      },
    ],
  },
  programmer: {
    icon: "💻",
    color: "from-blue-500/20 to-blue-600/5",
    sections: [
      {
        titleKey: "page.employee.programmer.section1.title",
        points: [
          "page.employee.programmer.section1.p1",
          "page.employee.programmer.section1.p2",
          "page.employee.programmer.section1.p3",
          "page.employee.programmer.section1.p4",
        ],
      },
      {
        titleKey: "page.employee.programmer.section2.title",
        points: [
          "page.employee.programmer.section2.p1",
          "page.employee.programmer.section2.p2",
          "page.employee.programmer.section2.p3",
          "page.employee.programmer.section2.p4",
        ],
      },
      {
        titleKey: "page.employee.programmer.section3.title",
        points: [
          "page.employee.programmer.section3.p1",
          "page.employee.programmer.section3.p2",
          "page.employee.programmer.section3.p3",
        ],
      },
    ],
  },
  socialManager: {
    icon: "📱",
    color: "from-pink-500/20 to-pink-600/5",
    sections: [
      {
        titleKey: "page.employee.socialManager.section1.title",
        points: [
          "page.employee.socialManager.section1.p1",
          "page.employee.socialManager.section1.p2",
          "page.employee.socialManager.section1.p3",
          "page.employee.socialManager.section1.p4",
        ],
      },
      {
        titleKey: "page.employee.socialManager.section2.title",
        points: [
          "page.employee.socialManager.section2.p1",
          "page.employee.socialManager.section2.p2",
          "page.employee.socialManager.section2.p3",
          "page.employee.socialManager.section2.p4",
        ],
      },
      {
        titleKey: "page.employee.socialManager.section3.title",
        points: [
          "page.employee.socialManager.section3.p1",
          "page.employee.socialManager.section3.p2",
          "page.employee.socialManager.section3.p3",
        ],
      },
    ],
  },
  hrManager: {
    icon: "👥",
    color: "from-violet-500/20 to-violet-600/5",
    sections: [
      {
        titleKey: "page.employee.hrManager.section1.title",
        points: [
          "page.employee.hrManager.section1.p1",
          "page.employee.hrManager.section1.p2",
          "page.employee.hrManager.section1.p3",
          "page.employee.hrManager.section1.p4",
        ],
      },
      {
        titleKey: "page.employee.hrManager.section2.title",
        points: [
          "page.employee.hrManager.section2.p1",
          "page.employee.hrManager.section2.p2",
          "page.employee.hrManager.section2.p3",
          "page.employee.hrManager.section2.p4",
        ],
      },
      {
        titleKey: "page.employee.hrManager.section3.title",
        points: [
          "page.employee.hrManager.section3.p1",
          "page.employee.hrManager.section3.p2",
          "page.employee.hrManager.section3.p3",
        ],
      },
    ],
  },
  marketer: {
    icon: "📈",
    color: "from-orange-500/20 to-orange-600/5",
    sections: [
      {
        titleKey: "page.employee.marketer.section1.title",
        points: [
          "page.employee.marketer.section1.p1",
          "page.employee.marketer.section1.p2",
          "page.employee.marketer.section1.p3",
          "page.employee.marketer.section1.p4",
        ],
      },
      {
        titleKey: "page.employee.marketer.section2.title",
        points: [
          "page.employee.marketer.section2.p1",
          "page.employee.marketer.section2.p2",
          "page.employee.marketer.section2.p3",
          "page.employee.marketer.section2.p4",
        ],
      },
      {
        titleKey: "page.employee.marketer.section3.title",
        points: [
          "page.employee.marketer.section3.p1",
          "page.employee.marketer.section3.p2",
          "page.employee.marketer.section3.p3",
        ],
      },
    ],
  },
  customerService: {
    icon: "🎧",
    color: "from-cyan-500/20 to-cyan-600/5",
    sections: [
      {
        titleKey: "page.employee.customerService.section1.title",
        points: [
          "page.employee.customerService.section1.p1",
          "page.employee.customerService.section1.p2",
          "page.employee.customerService.section1.p3",
          "page.employee.customerService.section1.p4",
        ],
      },
      {
        titleKey: "page.employee.customerService.section2.title",
        points: [
          "page.employee.customerService.section2.p1",
          "page.employee.customerService.section2.p2",
          "page.employee.customerService.section2.p3",
          "page.employee.customerService.section2.p4",
        ],
      },
      {
        titleKey: "page.employee.customerService.section3.title",
        points: [
          "page.employee.customerService.section3.p1",
          "page.employee.customerService.section3.p2",
          "page.employee.customerService.section3.p3",
        ],
      },
    ],
  },
}

const VALID_SLUGS = Object.keys(EMPLOYEE_DATA)

export function EmployeeDetailContent({ params, slug }: { params: Promise<{ lang: string }>; slug: string }) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale

  // If slug is invalid, show a not-found message
  const data = EMPLOYEE_DATA[slug]
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

  const titleKey = `page.employee.${slug}.title`
  const subtitleKey = `page.employee.${slug}.subtitle`
  const descKey = `page.employee.${slug}.desc`

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
              {t("page.employee.cta.title", lang)}
            </h3>
            <p className="text-muted-foreground text-sm mb-5">
              {t("page.employee.cta.desc", lang)}
            </p>
            <Link href={`/${lang}`}>
              <Button className="bg-brand hover:bg-brand-dark text-brand-foreground min-h-[44px]">
                {t("page.employee.cta.button", lang)}
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
