// Sitemap - SEO: Dynamic sitemap generation
// Fetches published blog posts from DB
// Includes all public pages with hreflang alternates

import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blivoai.com'

export const dynamic = 'force-dynamic'
export const revalidate = 14400

const EMPLOYEE_SLUGS = ['accountant', 'programmer', 'socialManager', 'hrManager', 'marketer', 'customerService']
const FEATURE_SLUGS = ['noHiring', 'noSalary', 'noErrors', '247', 'learns', 'specializedEmployees', 'organizedDepartments', 'freeMode', 'smartChats', 'reportsAnalytics', 'advancedSecurity', 'bizSpecializedEmployees', 'bizSmartDepartments', 'bizDirectConversations', 'bizSmartHRReports', 'bizMultiLanguage', 'bizAvailable247']

const STATIC_PAGES: { path: string; priority: number; freq: 'weekly' | 'monthly' | 'yearly' | 'daily' }[] = [
  { path: '', priority: 1.0, freq: 'weekly' },
  { path: 'pricing', priority: 0.9, freq: 'weekly' },
  { path: 'about', priority: 0.8, freq: 'monthly' },
  { path: 'blog', priority: 0.8, freq: 'daily' },
  { path: 'privacy', priority: 0.3, freq: 'yearly' },
  { path: 'terms', priority: 0.3, freq: 'yearly' },
  { path: 'api-docs', priority: 0.6, freq: 'monthly' },
  { path: 'download', priority: 0.5, freq: 'monthly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = ['ar', 'en'] as const
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const page of STATIC_PAGES) {
    const urlPath = page.path ? `/${page.path}` : ''
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${urlPath}`,
        lastModified: now,
        changeFrequency: page.freq,
        priority: locale === 'ar' ? page.priority : page.priority * 0.9,
        alternates: {
          languages: {
            ar: `${SITE_URL}/ar${urlPath}`,
            en: `${SITE_URL}/en${urlPath}`,
            'x-default': `${SITE_URL}/ar${urlPath}`,
          },
        },
      })
    }
  }

  for (const slug of EMPLOYEE_SLUGS) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}/employee/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: {
          languages: {
            ar: `${SITE_URL}/ar/employee/${slug}`,
            en: `${SITE_URL}/en/employee/${slug}`,
            'x-default': `${SITE_URL}/ar/employee/${slug}`,
          },
        },
      })
    }
  }

  for (const slug of FEATURE_SLUGS) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}/feature/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: {
            ar: `${SITE_URL}/ar/feature/${slug}`,
            en: `${SITE_URL}/en/feature/${slug}`,
            'x-default': `${SITE_URL}/ar/feature/${slug}`,
          },
        },
      })
    }
  }

  try {
    const posts = await db.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    })
    for (const post of posts) {
      for (const locale of locales) {
        entries.push({
          url: `${SITE_URL}/${locale}/blog/${post.slug}`,
          lastModified: post.updatedAt || post.publishedAt || now,
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: {
              ar: `${SITE_URL}/ar/blog/${post.slug}`,
              en: `${SITE_URL}/en/blog/${post.slug}`,
              'x-default': `${SITE_URL}/ar/blog/${post.slug}`,
            },
          },
        })
      }
    }
  } catch (error) {
    console.error('[SITEMAP] Error fetching blog posts:', error)
  }

  return entries
}

