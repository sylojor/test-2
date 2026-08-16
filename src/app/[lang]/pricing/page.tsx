// ============================================
// Pricing BlivoAI Page — Server Component
// Bilingual (AR/EN), theme-aware, responsive
// SEO metadata with hreflang — PRICES FROM DATABASE
// ============================================

import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { PricingContent } from "./pricing-content"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"

  // Fetch real prices from database
  let priceDescription = isAr
    ? "خطط مرنة تنمو مع عملك. فترة تجريبية مجانية، ألغِ أي وقت."
    : "Flexible plans that grow with your business. Free trial, cancel anytime."

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/plans`, { cache: "no-store" })
    if (res.ok) {
      const data = await res.json()
      const plans = (data.plans || []).filter((p: { isActive: boolean }) => p.isActive)
      if (plans.length > 0) {
        const names = plans.map((p: { name: string; nameAr: string; price: number }) =>
          `${isAr ? p.nameAr : p.name} ($${p.price === 0 ? (isAr ? "مجاني" : "Free") : p.price})`
        )
        priceDescription = isAr
          ? `خطط اشتراك: ${names.join("، ")}. فترة تجريبية مجانية، ألغِ أي وقت.`
          : `Subscription plans: ${names.join(", ")}. Free trial, cancel anytime.`
      }
    }
  } catch {
    // fallback to generic description
  }

  return {
    title: isAr ? "أسعار BlivoAI — خطط بسيطة وشفافة" : "BlivoAI Pricing — Simple & Transparent Plans",
    description: priceDescription,
    openGraph: {
      title: isAr ? "أسعار BlivoAI" : "BlivoAI Pricing",
      description: priceDescription,
      locale: isAr ? "ar_AR" : "en_US",
      type: "website",
      url: `${SITE_URL}/${lang}/pricing`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlivoAI" }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/pricing`,
      languages: {
        'ar': `${SITE_URL}/ar/pricing`,
        'en': `${SITE_URL}/en/pricing`,
        'x-default': `${SITE_URL}/ar/pricing`,
      },
    },
  }
}

export default function PricingPage({ params }: { params: Promise<{ lang: string }> }) {
  return <PricingContent params={params} />
}
