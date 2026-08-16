// Robots - SEO: Dynamic robots.txt generation
import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blivoai.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/payment/',
          '/chat/',
          '/register/',
          '/signin/',
          '/signup/',
          '/login/',
          '/settings/',
          '/profile/',
          '/checkout/',
          '/_next/',
          '/auth',
          '/*?q=',
          '/*?upgrade=',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

