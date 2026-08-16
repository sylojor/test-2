// ============================================
// API Docs Page — BlivoAI
// Documentation for developers
// Bilingual AR/EN, SEO metadata
// ============================================

import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { ApiDocsContent } from "./api-docs-content"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"
  return {
    title: isAr ? "توثيق API — BlivoAI" : "API Documentation — BlivoAI",
    description: isAr ? "توثيق API للمطورين — دمج BlivoAI في تطبيقك" : "API documentation for developers — integrate BlivoAI into your app",
    openGraph: {
      title: isAr ? "توثيق API — BlivoAI" : "API Documentation — BlivoAI",
      description: isAr ? "توثيق API للمطورين" : "API documentation for developers",
      url: `${SITE_URL}/${lang}/api-docs`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlivoAI" }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/api-docs`,
      languages: {
        'ar': `${SITE_URL}/ar/api-docs`,
        'en': `${SITE_URL}/en/api-docs`,
        'x-default': `${SITE_URL}/ar/api-docs`,
      },
    },
  }
}

export default function ApiDocsPage({ params }: { params: Promise<{ lang: string }> }) {
  return <ApiDocsContent params={params} />
}
