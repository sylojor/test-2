"use client"

import { use } from "react"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"

const SLUGS = [
  { slug: "noHiring", icon: "\u26a1", titleAr: "\u0628\u062f\u0648\u0646 \u062a\u0639\u0628 \u0627\u0644\u062a\u0648\u0638\u064a\u0641", titleEn: "No Hiring Hassle", descAr: "\u0645\u0648\u0638\u0641\u0643 \u0627\u0644\u0630\u0643\u064a \u062c\u0627\u0647\u0632 \u0641\u064a \u062b\u0648\u0627\u0646\u064a", descEn: "Your AI employee is ready in seconds" },
  { slug: "noSalary", icon: "\ud83d\udcb0", titleAr: "\u0628\u062f\u0648\u0646 \u0631\u0627\u062a\u0628 \u0634\u0647\u0631\u064a", titleEn: "No Monthly Salary", descAr: "\u0627\u0634\u062a\u0631\u0627\u0643 \u0628\u0633\u064a\u0637 \u0648\u0634\u0641\u0627\u0641", descEn: "Simple transparent subscription" },
  { slug: "noErrors", icon: "\u2705", titleAr: "\u0628\u062f\u0648\u0646 \u0623\u062e\u0637\u0627\u0621 \u0628\u0634\u0631\u064a\u0629", titleEn: "No Human Errors", descAr: "\u0643\u0644 \u0631\u062f \u0645\u062f\u0631\u0648\u0633 \u0648\u0645\u062a\u062e\u0635\u0635", descEn: "Every response is thoughtful" },
  { slug: "247", icon: "\ud83d\udd50", titleAr: "\u0634\u063a\u0644 24/7", titleEn: "Works 24/7", descAr: "\u0645\u0648\u0638\u0641\u0643 \u0634\u063a\u0627\u0644 \u0639\u0644\u0649 \u0645\u062f\u0627\u0631 \u0627\u0644\u0633\u0627\u0639\u0629", descEn: "Your employee works around the clock" },
  { slug: "learns", icon: "\ud83d\udca1", titleAr: "\u0628\u064a\u062a\u0639\u0644\u0645 \u0645\u0646 \u0634\u0631\u0643\u062a\u0643", titleEn: "Learns From Your Company", descAr: "\u0643\u0644 \u0645\u062d\u0627\u062f\u062b\u0629 \u062a\u0632\u064a\u062f \u062e\u0628\u0631\u062a\u0647", descEn: "Every conversation increases expertise" },
  { slug: "specializedEmployees", icon: "\ud83e\udd16", titleAr: "\u0645\u0648\u0638\u0641\u064a\u0646 \u0645\u062a\u062e\u0635\u0635\u064a\u0646", titleEn: "Specialized Employees", descAr: "\u0643\u0644 \u0645\u0648\u0638\u0641 AI \u0628\u064a\u0641\u0647\u0645 \u0627\u0644\u0633\u064a\u0627\u0642", descEn: "Each AI employee understands context" },
  { slug: "organizedDepartments", icon: "\ud83d\udcc1", titleAr: "\u0623\u0642\u0633\u0627\u0645 \u0645\u0646\u0638\u0645\u0629", titleEn: "Organized Departments", descAr: "\u0631\u062a\u0628 \u0645\u0648\u0638\u0641\u064a\u0646\u0643 \u0628\u0623\u0642\u0633\u0627\u0645", descEn: "Organize employees by department" },
  { slug: "freeMode", icon: "\ud83c\udf1f", titleAr: "\u0648\u0636\u0639 \u0645\u062c\u0627\u0646\u064a", titleEn: "Free Mode", descAr: "\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b \u0628\u062f\u0648\u0646 \u062a\u0639\u0642\u064a\u062f", descEn: "Start free with no complexity" },
  { slug: "smartChats", icon: "\ud83d\udcac", titleAr: "\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0630\u0643\u064a\u0629", titleEn: "Smart Chats", descAr: "\u062a\u062d\u0643\u0649 \u0645\u0639 \u0645\u0648\u0638\u0641\u064a\u0646\u0643 \u0645\u0628\u0627\u0634\u0631\u0629", descEn: "Talk to employees directly" },
  { slug: "reportsAnalytics", icon: "\ud83d\udcca", titleAr: "\u062a\u0642\u0627\u0631\u064a\u0631 \u0648\u062a\u062d\u0644\u064a\u0644\u0627\u062a", titleEn: "Reports & Analytics", descAr: "\u062a\u0642\u0627\u0631\u064a\u0631 \u0623\u062f\u0627\u0621 \u0648\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0630\u0643\u064a\u0629", descEn: "Performance reports and smart analytics" },
  { slug: "advancedSecurity", icon: "\ud83d\udee1", titleAr: "\u0623\u0645\u0627\u0646 \u0645\u062a\u0642\u062f\u0645", titleEn: "Advanced Security", descAr: "\u062a\u0634\u0641\u064a\u0631 \u0643\u0627\u0645\u0644 \u0648\u062e\u0635\u0648\u0635\u064a\u0629 \u062a\u0627\u0645\u0629", descEn: "Full encryption and privacy" },
  { slug: "bizSpecializedEmployees", icon: "\ud83d\udcbc", titleAr: "\u0645\u0648\u0638\u0641\u064a\u0646 \u0623\u0639\u0645\u0627\u0644 \u0645\u062a\u062e\u0635\u0635\u064a\u0646", titleEn: "Business AI Employees", descAr: "\u0645\u062d\u0627\u0633\u0628\u060c \u0645\u0628\u0631\u0645\u062c\u060c \u0645\u062f\u064a\u0631 \u062a\u0633\u0648\u064a\u0642", descEn: "Accountant, developer, marketing manager" },
  { slug: "bizSmartDepartments", icon: "\ud83c\udfe0", titleAr: "\u0623\u0642\u0633\u0627\u0645 \u0630\u0643\u064a\u0629", titleEn: "Smart Departments", descAr: "\u0646\u0638\u0645 \u062d\u0633\u0628 \u0627\u0644\u062a\u062e\u0635\u0635", descEn: "Organize by specialization" },
  { slug: "bizDirectConversations", icon: "\ud83d\udce3", titleAr: "\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0645\u0628\u0627\u0634\u0631\u0629", titleEn: "Direct Conversations", descAr: "\u062a\u062d\u0643\u0649 \u0645\u0639 \u0643\u0644 \u0645\u0648\u0638\u0641 \u0645\u0628\u0627\u0634\u0631\u0629", descEn: "Talk to each employee directly" },
  { slug: "bizSmartHRReports", icon: "\ud83d\udcdd", titleAr: "\u062a\u0642\u0627\u0631\u064a\u0631 HR \u0630\u0643\u064a\u0629", titleEn: "Smart HR Reports", descAr: "\u062a\u0642\u0627\u0631\u064a\u0631 \u0623\u062f\u0627\u0621 \u064a\u0648\u0645\u064a\u0629 \u0648\u0623\u0633\u0628\u0648\u0639\u064a\u0629", descEn: "Daily and weekly performance reports" },
  { slug: "bizMultiLanguage", icon: "\ud83c\udf10", titleAr: "\u062f\u0639\u0645 \u0645\u062a\u0639\u062f\u062f \u0627\u0644\u0644\u063a\u0627\u062a", titleEn: "Multi-Language Support", descAr: "\u0634\u0627\u0645\u064a\u060c \u0645\u0635\u0631\u064a\u060c \u062e\u0644\u064a\u062c\u064a\u060c \u0625\u0646\u062c\u0644\u064a\u0632\u064a", descEn: "Levantine, Egyptian, Gulf, English" },
  { slug: "bizAvailable247", icon: "\u2b50", titleAr: "\u0645\u062a\u0627\u062d 24/7", titleEn: "Available 24/7", descAr: "\u0645\u0627 \u0641\u064a\u0634 \u0639\u0637\u0644 \u0648\u0644\u0627 \u0627\u0633\u062a\u0642\u0627\u0644\u0627\u062a", descEn: "No holidays or resignations" },
]

export function FeaturesContent({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langStr } = use(params)
  const lang: Locale = langStr === "en" ? "en" : "ar"
  const isAr = lang === "ar"
  const Arrow = isAr ? ArrowLeft : ArrowRight

  return (
    <PublicPageLayout params={params}>
      <div className="max-w-6xl mx-auto py-12 sm:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">
            {isAr ? "\u0645\u064a\u0632\u0627\u062a BlivoAI" : "BlivoAI Features"}
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            {isAr
              ? "\u0627\u0643\u062a\u0634\u0641 \u0643\u0644 \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0644\u064a \u062a\u062c\u0639\u0644 BlivoAI \u0627\u0644\u062e\u064a\u0627\u0631 \u0627\u0644\u0623\u0641\u0636\u0644 \u0644\u062a\u0648\u0638\u064a\u0641 \u0645\u0648\u0638\u0641\u064a\u0646 AI \u0645\u062a\u062e\u0635\u0635\u064a\u0646"
              : "Discover all the features that make BlivoAI the best choice for hiring specialized AI employees"}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SLUGS.map((f) => (
            <Link key={f.slug} href={`/${lang}/feature/${f.slug}`}>
              <Card className="h-full bg-slate-900/50 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">
                    {isAr ? f.titleAr : f.titleEn}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    {isAr ? f.descAr : f.descEn}
                  </p>
                  <span className="inline-flex items-center text-emerald-400 text-sm font-medium">
                    {isAr ? "\u0627\u0639\u0631\u0641 \u0623\u0643\u062b\u0631" : "Learn more"}
                    <Arrow className="w-4 h-4 ms-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PublicPageLayout>
  )
}