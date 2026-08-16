// @ts-nocheck
"use client"

// ============================================
// Blog Article Detail Content
// Fetches article by slug, renders rich HTML content
// Shows images with alt/title/caption per language
// SEO: Injects Article JSON-LD structured data
// ============================================

import { useState, useEffect, use, useRef, useMemo } from "react"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Eye, ArrowLeft, Loader2, BookOpen } from "lucide-react"
import Link from "next/link"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"

interface BlogImageType {
  id: string
  url: string
  altAr?: string | null
  altEn?: string | null
  titleAr?: string | null
  titleEn?: string | null
  captionAr?: string | null
  captionEn?: string | null
  position: number
}

interface BlogPostType {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  contentAr: string
  contentEn: string
  excerptAr?: string | null
  excerptEn?: string | null
  coverImage?: string | null
  coverImageAltAr?: string | null
  coverImageAltEn?: string | null
  coverImageTitleAr?: string | null
  coverImageTitleEn?: string | null
  category?: string | null
  tags?: string | null
  metaTitleAr?: string | null
  metaTitleEn?: string | null
  metaDescAr?: string | null
  metaDescEn?: string | null
  status: string
  featured: boolean
  views: number
  publishedAt?: string | null
  createdAt: string
  author?: { id: string; name: string } | null
  images: BlogImageType[]
}

export function BlogArticleContent({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang: langStr, slug } = use(params)
  const lang = langStr as Locale
  const [post, setPost] = useState<BlogPostType | null>(null)
  const [loading, setLoading] = useState(true)
  const [relatedPosts, setRelatedPosts] = useState<any[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  // Null guard for post
  if (!post) return null

  // Process content HTML: swap figure bilingual data attributes based on language
  if (!post) return null;
  const processedContent = useMemo(() => {
    const raw = lang === "ar" ? post?.contentAr : post?.contentEn
    if (!raw) return ""
    // Replace figure data-alt/title/caption attributes with the correct language version
    // The WYSIWYG editor stores both AR and EN in data attributes, and the visible
    // text uses the editor's current language. Since contentAr already has Arabic
    // visible text and contentEn already has English visible text, the figures
    // are already correct. We just need to make sure inline-code styling works.
    return raw
  }, [lang, post?.contentAr, post?.contentEn])

  useEffect(() => {
    async function loadPost() {
      try {
        const res = await fetch(`/api/blog?slug=${slug}`)
        if (res.ok) {
          const data = await res.json()
          setPost(data.post)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    loadPost()
  }, [slug])

  // Fetch related posts (same category, excluding current)
  useEffect(() => {
    if (!post) return
    async function loadRelated() {
      try {
        if (res.ok) {
          const data = await res.json()
          setRelatedPosts(related)
        }
      } catch { /* silent */ }
    }
    loadRelated()
  }, [post])

  // After content renders, process figure elements to apply correct language
  // alt/title/caption from data attributes, and style inline-code elements
  useEffect(() => {
    if (!contentRef.current) return
    const figures = contentRef.current.querySelectorAll("figure.article-image")
    figures.forEach(fig => {
      const img = fig.querySelector("img")
      const caption = fig.querySelector("figcaption")
      // Swap alt/title/caption to current language from data attributes
      if (img) {
        const altVal = lang === "ar" ? fig.getAttribute("data-alt-ar") : fig.getAttribute("data-alt-en")
        const titleVal = lang === "ar" ? fig.getAttribute("data-title-ar") : fig.getAttribute("data-title-en")
        if (altVal) img.setAttribute("alt", altVal)
        if (titleVal) img.setAttribute("title", titleVal)
      }
      if (caption) {
        const captionVal = lang === "ar" ? fig.getAttribute("data-caption-ar") : fig.getAttribute("data-caption-en")
        if (captionVal) caption.textContent = captionVal
      }
    })
    // Style inline-code elements
    const codeEls = contentRef.current.querySelectorAll("code.inline-code")
    codeEls.forEach((el: any) => {
      el.style.padding = "2px 6px"
      el.style.borderRadius = "4px"
      el.style.fontSize = "0.85em"
      el.style.fontFamily = "monospace"
      el.style.backgroundColor = "rgba(0,0,0,0.06)"
    })
  }, [processedContent, lang])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    // Use Gregorian calendar explicitly — "ar-EG" always outputs Gregorian dates in Arabic
    return lang === "ar"
      ? date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
      : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  // Get localized values
  const title = lang === "ar" ? post?.titleAr : post?.titleEn
  const content = lang === "ar" ? post?.contentAr : post?.contentEn
  const excerpt = lang === "ar" ? post?.excerptAr : post?.excerptEn
  const coverAlt = lang === "ar" ? post?.coverImageAltAr : post?.coverImageAltEn
  const coverTitle = lang === "ar" ? post?.coverImageTitleAr : post?.coverImageTitleEn
  // SEO metadata for meta tags
  const metaTitle = lang === "ar" ? post?.metaTitleAr : post?.metaTitleEn
  const metaDesc = lang === "ar" ? post?.metaDescAr : post?.metaDescEn

  if (loading) {
    return (
      <PublicPageLayout params={params as any}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
          {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-lg font-bold text-foreground mb-4">
              {lang === "ar" ? "مقالات ذات صلة" : "Related Articles"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {relatedPosts.map((rp: any) => (
                <Link key={rp.id} href={`/${lang}/blog/${rp.slug}`} className="group">
                  <div className="flex gap-3 p-3 rounded-lg border border-border/50 hover:border-brand/30 hover:bg-muted/50 transition-all">
                    {rp.coverImage ? (
                      <img src={rp.coverImage} alt={lang === "ar" ? rp.titleAr : rp.titleEn} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-brand transition-colors">
                        {lang === "ar" ? rp.titleAr : rp.titleEn}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {rp.views}</span>
                        {rp.publishedAt && <span>{new Date(rp.publishedAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {month: "short", day: "numeric"})}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
    </PublicPageLayout>
    )
  }

  if (!post) {
    return (
      <PublicPageLayout params={params as any}>
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium">
            {lang === "ar" ? "المقال غير موجود" : "Article not found"}
          </p>
          <Link href={`/${lang}/blog`}>
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {lang === "ar" ? "رجوع للمدونة" : "Back to blog"}
            </Button>
          </Link>
        </div>
      </PublicPageLayout>
    )
  }

  // Parse tags
  const tagsList = post.tags ? JSON.parse(post.tags) : []

  // === SEO: Article JSON-LD Structured Data ===
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt || metaDesc || "",
    image: post.coverImage || `${SITE_URL}/logo-v2.png`,
    url: `${SITE_URL}/${lang}/blog/${post.slug}`,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: (post as any).updatedAt || post.createdAt,
    author: post.author ? {
      "@type": "Person",
      name: post.author.name,
    } : {
      "@type": "Organization",
      name: "BlivoAI",
    },
    publisher: {
      "@type": "Organization",
      name: "BlivoAI",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo-v2.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/${lang}/blog/${post.slug}`,
    },
    inLanguage: lang === "ar" ? "ar" : "en",
    articleSection: post.category || undefined,
    wordCount: (content || "").length,
  }

  return (
    <PublicPageLayout params={params as any}>
      {/* SEO: Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* SEO: Meta title & description override via document.title */}
      {metaTitle && (
        <title>{metaTitle}</title>
      )}

      <article className="max-w-3xl mx-auto py-8" itemScope itemType="https://schema.org/Article">
        {/* Sticky toolbar — follows user while scrolling */}
        <div className="sticky top-[57px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/90 backdrop-blur-sm border-b border-border/50 mb-6">
          <div className="flex items-center justify-between">
            <Link href={`/${lang}/blog`} className="text-muted-foreground hover:text-brand text-sm flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === "ar" ? "رجوع للمدونة" : "Back to blog"}</span>
            </Link>
            <h2 className="text-foreground font-medium text-sm truncate max-w-[200px] sm:max-w-[400px]">
              {title}
            </h2>
          </div>
        </div>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="mb-6 rounded-xl overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={coverAlt || title || ""}
              title={coverTitle || ""}
              className="w-full object-cover max-h-[400px]"
              itemProp="image"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<div class=\"w-full py-12 flex items-center justify-center\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20\"/></svg></div>'
                }
              }}
            />
          </div>
        )}

        {/* Category + Tags */}
        <div className="flex items-center gap-2 mb-3">
          {post.category && (
            <span className="text-brand text-xs font-medium uppercase tracking-wide" itemProp="articleSection">
              {post.category}
            </span>
          )}
          {tagsList.map((tag: string) => (
            <span key={tag} className="text-muted-foreground text-xs bg-muted px-2 py-1 rounded">{tag}</span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-snug mb-4" itemProp="headline">
          {title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-muted-foreground text-sm mb-8 border-b border-border pb-4">
          {post.author && <span itemProp="author">{post.author.name}</span>}
          {post.publishedAt && (
            <span className="flex items-center gap-1" itemProp="datePublished">
              <Calendar className="w-3.5 h-3.5" /> {formatDate(post.publishedAt)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {post.views} {lang === "ar" ? "مشاهدات" : "views"}
          </span>
        </div>

        {/* Content — Rendered as HTML from WYSIWYG editor */}
        {/* Content is stored as HTML from the contentEditable WYSIWYG editor */}
        {/* Figure elements with bilingual data attributes are rendered correctly per language */}
        <style dangerouslySetInnerHTML={{ __html: `
          .article-content h1 { font-size: 1.875rem !important; font-weight: 800 !important; margin: 1em 0 0.4em !important; line-height: 1.2 !important; color: var(--foreground) !important; }
          .article-content h2 { font-size: 1.5rem !important; font-weight: 700 !important; margin: 0.8em 0 0.3em !important; line-height: 1.25 !important; color: var(--foreground) !important; }
          .article-content h3 { font-size: 1.25rem !important; font-weight: 600 !important; margin: 0.6em 0 0.2em !important; line-height: 1.3 !important; color: var(--foreground) !important; }
          .article-content a { color: var(--brand) !important; text-decoration: underline !important; text-underline-offset: 2px !important; }
          .article-content a:hover { opacity: 0.8 !important; }
          .article-content blockquote { border-right: 4px solid var(--brand) !important; padding: 0.5em 1em !important; margin: 1em 0 !important; font-style: italic !important; }
          .article-content ul { list-style-type: disc !important; padding-left: 1.5em !important; }
          .article-content ol { list-style-type: decimal !important; padding-left: 1.5em !important; }
          .article-content code.inline-code { background: rgba(0,0,0,0.06) !important; padding: 2px 6px !important; border-radius: 4px !important; font-size: 0.875em !important; }
        ` }} />
        <div
          className="article-content prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-brand prose-strong:text-foreground prose-blockquote:border-brand prose-code:text-foreground prose-li:text-foreground/90"
          itemProp="articleBody"
          ref={contentRef}
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />

        {/* Article Images with alt/title/caption */}
        {post.images.length > 0 && (
          <div className="mt-8 space-y-6">
            {post.images.sort((a, b) => a.position - b.position).map(img => (
              <figure key={img.id} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={lang === "ar" ? (img.altAr || "") : (img.altEn || "")}
                  title={lang === "ar" ? (img.titleAr || "") : (img.titleEn || "")}
                  className="rounded-xl mx-auto max-w-full"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                  }}
                />
                {(lang === "ar" ? img.captionAr : img.captionEn) && (
                  <figcaption className="text-muted-foreground text-sm mt-2">
                    {lang === "ar" ? img.captionAr : img.captionEn}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        {/* Language switch for same article */}
        <div className="mt-8 pt-6 border-t border-border flex items-center gap-4">
          <Link href={`/${lang === "ar" ? "en" : "ar"}/blog/${post.slug}`} className="text-brand hover:text-brand-dark text-sm">
            {lang === "ar" ? "Read in English" : "اقرأ بالعربي"}
          </Link>
        </div>
      </article>
    </PublicPageLayout>
  )
}
