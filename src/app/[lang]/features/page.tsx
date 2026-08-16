// Features listing page - shows all BlivoAI features
import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { FeaturesContent } from "./features-content"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"
  return {
    title: isAr ? "ميزات BlivoAI — موظفين ذكاء اصطناعي متخصصين" : "BlivoAI Features — Specialized AI Employees",
    description: isAr
      ? "اكتشف جميع ميزات BlivoAI: موظفين AI متخصصين، أقسام منظمة، محادثات ذكية، تقارير وتحليلات، أمان متقدم، ودعم متعدد اللغات."
      : "Discover all BlivoAI features: specialized AI employees, organized departments, smart chats, reports & analytics, advanced security, and multi-language support.",
    openGraph: {
      title: isAr ? "ميزات BlivoAI" : "BlivoAI Features",
      description: isAr
        ? "اكتشف جميع ميزات منصة BlivoAI لتوظيف موظفين AI متخصصين"
        : "Discover all features of the BlivoAI AI employee platform",
      locale: isAr ? "ar_AR" : "en_US",
      type: "website",
      url: `${SITE_URL}/${lang}/features`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlivoAI" }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/features`,
      languages: {
        ar: `${SITE_URL}/ar/features`,
        en: `${SITE_URL}/en/features`,
        "x-default": `${SITE_URL}/ar/features`,
      },
    },
  }
}

export default async function FeaturesPage({ params }: { params: Promise<{ lang: string }> }) {
  return <FeaturesContent params={params} />
}