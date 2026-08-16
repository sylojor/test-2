// ============================================
// [lang] Layout — Locale-aware nested layout
// ============================================

import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { i18n, type Locale } from "@/lib/i18n-config"
import { LocaleSetter } from "@/components/locale-setter"
import { Toaster } from "@/components/ui/sonner"
import { SeoContent } from "@/components/seo-content"
import { VisitorTracker } from "@/components/visitor-tracker"


const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"

  return {

    title: isAr ? "BlivoAI — ذكاء بلا حدود" : "BlivoAI — Limitless Intelligence",
    description: isAr
      ? "محادثة ذكية + إدارة أعمال — منصة تجمع شات بوت ذكي وموظفين AI متخصصين"
      : "Smart Chat + Business Management — AI platform combining intelligent chatbot with specialized AI employees",
    openGraph: {
      title: isAr ? "BlivoAI — محادثة ذكية + إدارة أعمال" : "BlivoAI — Smart Chat + Business Management",
      description: isAr
        ? "منصة تجمع محادثة ذكية وإدارة أعمال احترافية"
        : "Platform combining smart chat and professional business management",
      locale: isAr ? "ar_AR" : "en_US",
      type: "website",
      url: `${SITE_URL}/${lang}`,
      siteName: "BlivoAI",
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: isAr ? "BlivoAI — ذكاء بلا حدود" : "BlivoAI — Limitless Intelligence",
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: isAr ? "BlivoAI — محادثة ذكية + إدارة أعمال" : "BlivoAI — Smart Chat + Business Management",
      description: isAr
        ? "منصة تجمع محادثة ذكية وإدارة أعمال احترافية"
        : "Platform combining smart chat and professional business management",
      images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}`,
      languages: {
        'ar': `${SITE_URL}/ar`,
        'en': `${SITE_URL}/en`,
        'x-default': `${SITE_URL}/ar`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!i18n.locales.includes(lang as Locale)) {
    notFound()
  }
  const locale = lang as Locale
  return (
    <>
      <LocaleSetter locale={locale} />
      
      <SeoContent lang={locale} />
      {children}
      <VisitorTracker lang={locale} />
      <Toaster position="top-center" />
    </>
  )
}