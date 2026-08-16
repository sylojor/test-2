// ============================================
// About BlivoAI Page
// Bilingual (AR/EN), theme-aware, responsive
// SEO metadata with hreflang
// ============================================

import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { AboutContent } from "./about-content"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"

  return {
    title: isAr ? "عن BlivoAI — منصة ذكاء بلا حدود" : "About BlivoAI — Limitless Intelligence Platform",
    description: isAr
      ? "BlivoAI هي منصة ذكية تجمع محادثة ذكية وإدارة أعمال احترافية"
      : "BlivoAI is a smart platform combining intelligent chat and professional business management",
    openGraph: {
      title: isAr ? "عن BlivoAI" : "About BlivoAI",
      description: isAr
        ? "منصة تجمع محادثة ذكية وإدارة أعمال احترافية"
        : "Platform combining smart chat and professional business management",
      locale: isAr ? "ar_AR" : "en_US",
      type: "website",
      url: `${SITE_URL}/${lang}/about`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlivoAI" }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/about`,
      languages: {
        'ar': `${SITE_URL}/ar/about`,
        'en': `${SITE_URL}/en/about`,
        'x-default': `${SITE_URL}/ar/about`,
      },
    },
  }
}

export default function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  return <AboutContent params={params} />
}
