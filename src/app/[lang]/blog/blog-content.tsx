"use client"

// ============================================
// Blog Content — Public listing of published posts
// Accepts serverPosts (from DB, for Google crawlers)
// Also fetches client-side for SPA navigation
// Uses cover image alt/title per language for accessibility
// ============================================

import { useState, useEffect, use } from "react"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Calendar, Eye, Loader2, TrendingUp } from "lucide-react"
import Link from "next/link"

interface BlogPostType {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  excerptAr?: string | null
  excerptEn?: string | null
  coverImage?: string | null
  category?: string | null
  featured: boolean
  views: number
  publishedAt?: string | null
}

interface BlogContentProps {
  params: Promise<{ lang: string }>
  serverPosts?: BlogPostType[]
}

export function BlogContent({ params, serverPosts: initialPosts }: BlogContentProps) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale
  const [posts, setPosts] = useState<BlogPostType[]>(initialPosts || [])
  const [loading, setLoading] = useState(!initialPosts || initialPosts.length === 0)
  const [topPosts, setTopPosts] = useState<BlogPostType[]>([])

  // Fetch top 10 most read
  useEffect(() => {
    async function loadTopPosts() {
      try {
        const res = await fetch("/api/blog?top=10")
        if (res.ok) {
          const data = await res.json()
          setTopPosts(data.posts || [])
        }
      } catch { /* silent */ }
    }
    loadTopPosts()
  }, [])

  // If no server posts, fetch client-side
  useEffect(() => {
    if (initialPosts && initialPosts.length > 0) return
    async function loadPosts() {
      try {
        const res = await fetch("/api/blog?limit=20")
        if (res.ok) {
          const data = await res.json()
          setPosts(data.posts || [])
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [initialPosts])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return lang === "ar"
      ? date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
      : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  // Sort: featured posts first
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return 0
  })

  return (
    <PublicPageLayout params={params}>
      <div className={`max-w-4xl mx-auto ${lang === "ar" ? "text-rtl" : ""}`}>
        {/* Header */}
        <div className="text-center py-8 sm:py-12">
          <div className="w-16 h-16 rounded-xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-brand" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {t("page.blog.title", lang)}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {t("page.blog.subtitle", lang)}
          </p>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
          </div>
        ) : sortedPosts.length === 0 ? (
          <Card className="border-border/50 max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-brand" />
              </div>
              <p className="text-foreground font-medium mb-2">
                {lang === "ar" ? "لا مقالات متاحة حالياً" : "No articles available yet"}
              </p>
              <p className="text-muted-foreground text-sm">
                {lang === "ar" ? "نحن نعمل على محتوى جديد — تابعنا!" : "We're working on new content — stay tuned!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 pb-8">
            {sortedPosts.map(post => {
              const coverAlt = lang === "ar" ? post.titleAr : post.titleEn
              return (
                <Link key={post.id} href={`/${lang}/blog/${post.slug}`} className="group">
                  <Card className="border-border/50 hover:border-brand/30 transition-all duration-300 overflow-hidden h-full">
                    {post.coverImage ? (
                      <div className="aspect-video overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.coverImage}
                          alt={coverAlt}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = '<div class=\"w-full h-full flex items-center justify-center\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20\"/></svg></div>'
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}

                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        {post.category && (
                          <span className="text-brand text-xs font-medium uppercase tracking-wide">{post.category}</span>
                        )}
                        {post.featured && (
                          <span className="text-xs font-medium bg-brand/10 text-brand px-1.5 py-0.5 rounded">
                            ★ {lang === "ar" ? "مميز" : "Featured"}
                          </span>
                        )}
                      </div>

                      <h2 className="text-foreground font-semibold text-base sm:text-lg leading-snug group-hover:text-brand transition-colors">
                        {lang === "ar" ? post.titleAr : post.titleEn}
                      </h2>

                      {(lang === "ar" ? post.excerptAr : post.excerptEn) && (
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                          {lang === "ar" ? post.excerptAr : post.excerptEn}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-muted-foreground text-xs pt-2">
                        {post.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(post.publishedAt)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {post.views} {lang === "ar" ? "مشاهدات" : "views"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {/* Top 10 Most Read */}
        {topPosts.length > 0 && (
          <div className="mt-12 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-bold text-foreground">
                {lang === "ar" ? "الأكثر قراءة" : "Most Read"}
              </h2>
            </div>
            <div className="space-y-3">
              {topPosts.slice(0, 10).map((post, idx) => (
                <Link key={post.id} href={`/${lang}/blog/${post.slug}`} className="group">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-brand/30 hover:bg-muted/50 transition-all">
                    <span className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-brand transition-colors">
                        {lang === "ar" ? post.titleAr : post.titleEn}
                      </p>
                      {post.category && (
                        <span className="text-xs text-muted-foreground">{post.category}</span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Eye className="w-3 h-3" /> {post.views}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicPageLayout>
  )
}