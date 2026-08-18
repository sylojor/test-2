// ============================================
// Employee Detail Page
// Dynamic route for each AI employee type
// SEO metadata with hreflang
// ============================================

export const dynamicParams = false
import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { EmployeeDetailContent } from "./employee-detail-content"

const VALID_SLUGS = ["accountant", "programmer", "socialManager", "hrManager", "marketer", "customerService"]

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

// Employee metadata for SEO
const EMPLOYEE_SEO: Record<string, { ar: { title: string; desc: string }; en: { title: string; desc: string } }> = {
  accountant: {
    ar: { title: "المحاسب الذكي — BlivoAI", desc: "محاسب AI بيفهم الفواتير والتقارير المالية ويقدم رؤى محاسبية دقيقة لشركتك" },
    en: { title: "AI Accountant — BlivoAI", desc: "An AI accountant that understands invoices, financial reports, and provides accurate accounting insights for your company" },
  },
  programmer: {
    ar: { title: "المبرمج الذكي — BlivoAI", desc: "مبرمج AI بيكتب كود احترافي ويفهم متطلبات مشروعك ويقدم حلول تقنية متكاملة" },
    en: { title: "AI Programmer — BlivoAI", desc: "An AI programmer that writes professional code, understands project requirements, and delivers complete technical solutions" },
  },
  socialManager: {
    ar: { title: "مدير السوشال ميديا الذكي — BlivoAI", desc: "مدير سوشال ميديا AI بيخطط المحتوى ويتابع الحسابات ويحسن تواجدك الرقمي" },
    en: { title: "AI Social Media Manager — BlivoAI", desc: "An AI social media manager that plans content, monitors accounts, and improves your digital presence" },
  },
  hrManager: {
    ar: { title: "مدير الموارد البشرية الذكي — BlivoAI", desc: "مدير HR ذكي بيتابع الأداء ويرفع التقارير ويحسن بيئة العمل في شركتك" },
    en: { title: "AI HR Manager — BlivoAI", desc: "An AI HR manager that tracks performance, submits reports, and improves your company work environment" },
  },
  marketer: {
    ar: { title: "المسوق الذكي — BlivoAI", desc: "مسوق AI بيخطط الحملات الإعلانية ويدرس الجمهور المستهدف ويحسن عائد الاستثمار" },
    en: { title: "AI Marketer — BlivoAI", desc: "An AI marketer that plans advertising campaigns, studies target audiences, and improves ROI" },
  },
  customerService: {
    ar: { title: "موظف خدمة الزبائن الذكي — BlivoAI", desc: "موظف خدمة زبائن AI بيرد على الاستفسارات باحترافية عالية على مدار الساعة" },
    en: { title: "AI Customer Service — BlivoAI", desc: "An AI customer service agent that responds to inquiries professionally around the clock" },
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
  const seo = EMPLOYEE_SEO[slug]
  if (!seo) return {}

  return {
    title: isAr ? seo.ar.title : seo.en.title,
    description: isAr ? seo.ar.desc : seo.en.desc,
    openGraph: {
      title: isAr ? seo.ar.title : seo.en.title,
      description: isAr ? seo.ar.desc : seo.en.desc,
      locale: isAr ? "ar_AR" : "en_US",
      type: "website",
      url: `${SITE_URL}/${lang}/employee/${slug}`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlivoAI" }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/employee/${slug}`,
      languages: {
        ar: `${SITE_URL}/ar/employee/${slug}`,
        en: `${SITE_URL}/en/employee/${slug}`,
        "x-default": `${SITE_URL}/ar/employee/${slug}`,
      },
    },
  }
}

// Server component — passes params to client content
export default async function EmployeeDetailPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params

  return <EmployeeDetailContent params={params} slug={slug} />
}
