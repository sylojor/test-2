// ============================================
// Privacy Policy Page
// Bilingual (AR/EN), theme-aware, responsive
// SEO metadata with hreflang
// ============================================

import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { PrivacyContent } from "./privacy-content"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"

  return {
    title: isAr ? "سياسة الخصوصية — BlivoAI" : "Privacy Policy — BlivoAI",
    description: isAr
      ? "كيف نحمي بياناتك ونحافظ على خصوصيتك"
      : "How we protect your data and maintain your privacy",
    openGraph: {
      title: isAr ? "سياسة الخصوصية — BlivoAI" : "Privacy Policy — BlivoAI",
      description: isAr
        ? "كيف نحمي بياناتك ونحافظ على خصوصيتك"
        : "How we protect your data and maintain your privacy",
      locale: isAr ? "ar_AR" : "en_US",
      type: "website",
      url: `${SITE_URL}/${lang}/privacy`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlivoAI" }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/privacy`,
      languages: {
        'ar': `${SITE_URL}/ar/privacy`,
        'en': `${SITE_URL}/en/privacy`,
        'x-default': `${SITE_URL}/ar/privacy`,
      },
    },
  }
}

export default function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  return <PrivacyContent params={params} />
}
