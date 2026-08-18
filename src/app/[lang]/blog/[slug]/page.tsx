// ============================================
// Blog Article Detail Page
// Shows full article content with rich formatting
// SEO metadata, hreflang, structured data
// Server-fetches post for Google crawlers
// ============================================

import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { BlogArticleContent } from "./blog-article-content"
import { db } from "@/lib/db"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

export async function generateStaticParams() {
  try {
    const posts = await db.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    })
    const params: any[] = []
    for (const locale of i18n.locales) {
      for (const post of posts) {
        params.push({ lang: locale, slug: post.slug })
      }
    }
    return params
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_NOT_FOUND")) throw error
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params
  const isAr = lang === "ar"

  let title: string
  let description: string
  let ogTitle: string
  let ogDescription: string
  let post: any = null

  try {
    post = await db.blogPost.findUnique({
      where: { slug },
      select: {
        titleAr: true, titleEn: true, excerptAr: true, excerptEn: true,
        metaTitleAr: true, metaTitleEn: true, metaDescAr: true, metaDescEn: true,
        coverImage: true, publishedAt: true, updatedAt: true,
      },
    }) as any

    if (post) {
      title = isAr
        ? (post.metaTitleAr || post.titleAr || `مقال — BlivoAI`)
        : (post.metaTitleEn || post.titleEn || `Article — BlivoAI`)
      description = isAr
        ? (post.metaDescAr || post.excerptAr || "مقال من مدونة BlivoAI")
        : (post.metaDescEn || post.excerptEn || "Article from BlivoAI Blog")
      ogTitle = isAr ? (post.metaTitleAr || post.titleAr) : (post.metaTitleEn || post.titleEn)
      ogDescription = isAr
        ? (post.metaDescAr || post.excerptAr || "مقال من مدونة BlivoAI")
        : (post.metaDescEn || post.excerptEn || "Article from BlivoAI Blog")
    } else {
      title = isAr ? `مقال — BlivoAI` : `Article — BlivoAI`
      description = isAr ? "مقال من مدونة BlivoAI" : "Article from BlivoAI Blog"
      ogTitle = title
      ogDescription = description
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_NOT_FOUND")) throw error
    title = isAr ? `مقال — BlivoAI` : `Article — BlivoAI`
    description = isAr ? "مقال من مدونة BlivoAI" : "Article from BlivoAI Blog"
    ogTitle = title
    ogDescription = description
  }

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title: ogTitle,
      description: ogDescription,
      locale: isAr ? "ar_AR" : "en_US",
      url: `${SITE_URL}/${lang}/blog/${slug}`,
      publishedTime: post?.publishedAt?.toISOString(),
      modifiedTime: post?.updatedAt?.toISOString(),
      images: [{ url: post?.coverImage || "/og-image.png", width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `${SITE_URL}/${lang}/blog/${slug}`,
      languages: {
        'ar': `${SITE_URL}/ar/blog/${slug}`,
        'en': `${SITE_URL}/en/blog/${slug}`,
        'x-default': `${SITE_URL}/ar/blog/${slug}`,
      },
    },
  }
}

// Server component — fetches post from DB so Google sees content without JS
export default async function BlogArticlePage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params

  // Verify post exists — notFound() must be called outside try/catch
  // to propagate correctly through Next.js error boundary
  let postExists = false
  try {
    const post = await db.blogPost.findUnique({
      where: { slug },
      select: { status: true },
    })
    postExists = !!(post && post.status === "PUBLISHED")
  } catch {
    // DB not available — let client component handle it
  }

  if (!postExists) {
    notFound()
  }

  return <BlogArticleContent params={params} />
}
