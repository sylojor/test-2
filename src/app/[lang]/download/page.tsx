// ============================================
// Download Page — BlivoAI
// Get the app, SDKs, and integrations
// Bilingual AR/EN, SEO metadata
// ============================================

import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { DownloadContent } from "./download-content"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"
  return {
    title: isAr ? "تحميل — BlivoAI" : "Download — BlivoAI",
    description: isAr ? "حمل تطبيق BlivoAI وSDKs والتكاملات" : "Get the BlivoAI app, SDKs, and integrations",
    openGraph: {
      title: isAr ? "تحميل — BlivoAI" : "Download — BlivoAI",
      description: isAr ? "حمل تطبيق BlivoAI" : "Get the BlivoAI app",
      url: `${SITE_URL}/${lang}/download`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlivoAI" }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/download`,
      languages: {
        'ar': `${SITE_URL}/ar/download`,
        'en': `${SITE_URL}/en/download`,
        'x-default': `${SITE_URL}/ar/download`,
      },
    },
  }
}

export default function DownloadPage({ params }: { params: Promise<{ lang: string }> }) {
  return <DownloadContent params={params} />
}
