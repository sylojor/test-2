// ============================================
// Blog Listing Page — Full Blog System
// Shows published blog posts with cover images
// Bilingual (AR/EN), SEO metadata with hreflang
// Server-side fetches posts for Google crawlers
// ============================================

import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { db } from "@/lib/db"
import { BlogContent } from "./blog-content"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"

  return {
    title: isAr ? "مدونة BlivoAI — أفكار وتحليلات" : "BlivoAI Blog — Ideas & Insights",
    description: isAr
      ? "أفكار، تحليلات، وأخبار من عالم الذكاء الاصطناعي وإدارة الأعمال"
      : "Ideas, insights, and news from the world of AI and business management",
    openGraph: {
      title: isAr ? "مدونة BlivoAI" : "BlivoAI Blog",
      description: isAr
        ? "أفكار، تحليلات، وأخبار من عالم الذكاء الاصطناعي وإدارة الأعمال"
        : "Ideas, insights, and news from the world of AI and business management",
      locale: isAr ? "ar_AR" : "en_US",
      type: "website",
      url: `${SITE_URL}/${lang}/blog`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlivoAI" }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/blog`,
      languages: {
        'ar': `${SITE_URL}/ar/blog`,
        'en': `${SITE_URL}/en/blog`,
        'x-default': `${SITE_URL}/ar/blog`,
      },
    },
  }
}

// Server component — fetches posts from DB for Google
export default async function BlogPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params

  // Fetch posts server-side for SEO (crawlers see this without JS)
  let serverPosts: Array<{
    id: string; slug: string; titleAr: string; titleEn: string;
    excerptAr: string | null; excerptEn: string | null;
    coverImage: string | null; publishedAt: string | null; views: number;
    category: string | null; featured: boolean;
  }> = []

  try {
    const posts = await db.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true, slug: true, titleAr: true, titleEn: true,
        excerptAr: true, excerptEn: true, coverImage: true,
        publishedAt: true, views: true, category: true, featured: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
    })
    serverPosts = posts.map(p => ({
      ...p,
      publishedAt: p.publishedAt?.toISOString() || null,
    }))
  } catch {
    // DB might not be available
  }

  return <BlogContent params={params} serverPosts={serverPosts} />
}