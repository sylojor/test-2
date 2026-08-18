// ============================================
// Feature Detail Page
// Dynamic route for each BlivoAI feature/benefit
// SEO metadata with hreflang
// ============================================

export const dynamicParams = false
import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { FeatureDetailContent } from "./feature-detail-content"

const VALID_SLUGS = [
  // Original benefits
  "noHiring", "noSalary", "noErrors", "247", "learns",
  // Core features
  "specializedEmployees", "organizedDepartments", "freeMode", "smartChats", "reportsAnalytics", "advancedSecurity",
  // Business features
  "bizSpecializedEmployees", "bizSmartDepartments", "bizDirectConversations", "bizSmartHRReports", "bizMultiLanguage", "bizAvailable247",
]

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

// Feature metadata for SEO
const FEATURE_SEO: Record<string, { ar: { title: string; desc: string }; en: { title: string; desc: string } }> = {
  // Original benefits
  noHiring: {
    ar: { title: "بدون تعب التوظيف — BlivoAI", desc: "موظفك الذكي جاهز في ثواني بدون مقابلات أو إجراءات توظيف معقدة" },
    en: { title: "No Hiring Hassle — BlivoAI", desc: "Your AI employee is ready in seconds without interviews or complex hiring procedures" },
  },
  noSalary: {
    ar: { title: "بدون راتب شهري — BlivoAI", desc: "اشتراك بسيط وشفاف بدل الرواتب الشهرية والتكاليف الإدارية" },
    en: { title: "No Monthly Salary — BlivoAI", desc: "Simple and transparent subscription instead of monthly salaries and administrative costs" },
  },
  noErrors: {
    ar: { title: "بدون أخطاء بشرية — BlivoAI", desc: "كل رد من موظفك الذكي مدروس ومتخصص بدون أخطاء" },
    en: { title: "No Human Errors — BlivoAI", desc: "Every response from your AI employee is thoughtful and specialized with no errors" },
  },
  "247": {
    ar: { title: "شغل 24/7 — BlivoAI", desc: "موظفك الذكي شغال على مدار الساعة ما بيزعل ولا بيستقيل" },
    en: { title: "Works 24/7 — BlivoAI", desc: "Your AI employee works around the clock and never gets angry or quits" },
  },
  learns: {
    ar: { title: "بيتعلم من شركتك — BlivoAI", desc: "كل محادثة بتزيد خبرة موظفك الذكي وتحسن أداءو" },
    en: { title: "Learns From Your Company — BlivoAI", desc: "Every conversation increases your AI employee's expertise and improves performance" },
  },
  // Core features
  specializedEmployees: {
    ar: { title: "موظفين متخصصين — BlivoAI", desc: "كل موظف AI بيفهم السياق ويرد باحترافية — مش مجرد ردود ثابتة" },
    en: { title: "Specialized Employees — BlivoAI", desc: "Each AI employee understands context and responds professionally — not just fixed replies" },
  },
  organizedDepartments: {
    ar: { title: "أقسام منظمة — BlivoAI", desc: "رتّب موظفينك بأقسام — محادثات، اجتماعات، وتقارير HR" },
    en: { title: "Organized Departments — BlivoAI", desc: "Organize your employees in departments — chats, meetings, and HR reports" },
  },
  freeMode: {
    ar: { title: "وضع مجاني — BlivoAI", desc: "ابدأ مجاناً بدون تكاليف ولا تعقيد تقني" },
    en: { title: "Free Mode — BlivoAI", desc: "Start for free with no costs and no technical complexity" },
  },
  smartChats: {
    ar: { title: "محادثات ذكية — BlivoAI", desc: "تحكى مع موظفينك مباشرة — بيفهموك ويردوا باحترافية" },
    en: { title: "Smart Chats — BlivoAI", desc: "Talk to your employees directly — they understand and respond professionally" },
  },
  reportsAnalytics: {
    ar: { title: "تقارير وتحليلات — BlivoAI", desc: "تقارير أداء يومية وأسبوعية مع تحليلات ذكية لاتخاذ قرارات أفضل" },
    en: { title: "Reports & Analytics — BlivoAI", desc: "Daily and weekly performance reports with smart analytics for better decisions" },
  },
  advancedSecurity: {
    ar: { title: "أمان متقدم — BlivoAI", desc: "بياناتك محمية بتشفير كامل وخصوصية تامة" },
    en: { title: "Advanced Security — BlivoAI", desc: "Your data is protected with full encryption and complete privacy" },
  },
  // Business features
  bizSpecializedEmployees: {
    ar: { title: "موظفين متخصصين لأعمالك — BlivoAI", desc: "وظّف مدير تسويق، مدير HR، محاسب — كل واحد بيفهم شغله" },
    en: { title: "Specialized Business Employees — BlivoAI", desc: "Hire a marketing manager, HR director, accountant — each understands their role" },
  },
  bizSmartDepartments: {
    ar: { title: "أقسام ذكية — BlivoAI", desc: "نظّم موظفينك بأقسام حسب التخصص — التسويق، المبيعات، البرمجة" },
    en: { title: "Smart Departments — BlivoAI", desc: "Organize employees by specialization — marketing, sales, development" },
  },
  bizDirectConversations: {
    ar: { title: "محادثات مباشرة مع الموظفين — BlivoAI", desc: "تحكى مع كل موظف مباشرة — أعطيه مهام واطلب تقارير" },
    en: { title: "Direct Employee Conversations — BlivoAI", desc: "Talk to each employee directly — assign tasks and request reports" },
  },
  bizSmartHRReports: {
    ar: { title: "تقارير HR ذكية — BlivoAI", desc: "تقارير أداء يومية وأسبوعية لموظفينك لتقييم الأداء" },
    en: { title: "Smart HR Reports — BlivoAI", desc: "Daily and weekly performance reports to evaluate employee performance" },
  },
  bizMultiLanguage: {
    ar: { title: "دعم متعدد اللغات — BlivoAI", desc: "موظفينك يحكوا باللهجة اللي بدكها — شامي، مصري، خليجي، إنجليزي" },
    en: { title: "Multi-Language Support — BlivoAI", desc: "Employees speak your preferred dialect — Levantine, Egyptian, Gulf, English" },
  },
  bizAvailable247: {
    ar: { title: "متاح 24/7 — BlivoAI", desc: "موظفينك يشتغلوا طول الوقت — ما فيش عطل ولا استقالات" },
    en: { title: "Available 24/7 — BlivoAI", desc: "Your employees work around the clock — no holidays, no resignations" },
  },
}

export async function generateStaticParams() {
  return i18n.locales.flatMap((locale) =>
    VALID_SLUGS.map((slug) => ({ lang: locale, slug }))
  )
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params
  const isAr = lang === "ar"
  const seo = FEATURE_SEO[slug]
  if (!seo) return {}

  return {
    title: isAr ? seo.ar.title : seo.en.title,
    description: isAr ? seo.ar.desc : seo.en.desc,
    openGraph: {
      title: isAr ? seo.ar.title : seo.en.title,
      description: isAr ? seo.ar.desc : seo.en.desc,
      locale: isAr ? "ar_AR" : "en_US",
      type: "website",
      url: `${SITE_URL}/${lang}/feature/${slug}`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlivoAI" }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/feature/${slug}`,
      languages: {
        ar: `${SITE_URL}/ar/feature/${slug}`,
        en: `${SITE_URL}/en/feature/${slug}`,
        "x-default": `${SITE_URL}/ar/feature/${slug}`,
      },
    },
  }
}

// Server component — passes params to client content
export default async function FeatureDetailPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params
  return <FeatureDetailContent params={params} slug={slug} />
}
