// ============================================
// Public Page Layout — Shared header/footer
// for About, Privacy, Terms, Blog pages
// Apple-inspired design, theme-aware
// Mobile-responsive, bilingual (AR/EN)
// ============================================

"use client"

import { use } from "react"
import Link from "next/link"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft } from "lucide-react"

interface PublicPageLayoutProps {
  params: Promise<{ lang: string }>
  children: React.ReactNode
}

export function PublicPageLayout({ params, children }: PublicPageLayoutProps) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale
  const isRTL = lang === "ar"
  // Layout always LTR — BackArrow always points left for "back" action
  const BackArrow = ArrowLeft

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="ltr">
      {/* Header */}
      <header className="border-b border-border/50 px-4 sm:px-6 py-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-v2.png" alt="BlivoAI Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg tracking-tight text-foreground">BlivoAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${lang}`}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <BackArrow className="w-4 h-4" />
              <span className="hidden sm:inline">{t("page.about.backHome", lang)}</span>
            </Link>
            <ThemeToggle />
            <Link
              href={lang === "ar" ? `/en` : `/ar`}
              className="text-muted-foreground hover:text-foreground text-xs px-2 py-1.5 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"
            >
              {lang === "ar" ? "EN" : "عربي"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 sm:px-6 py-6 sm:py-8 bg-background mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs sm:text-sm">
            &copy; 2026 BlivoAI &mdash; {t("landing.footer.rights", lang)}
          </p>
          <div className="flex gap-4 sm:gap-6">
            <Link href={`/${lang}/pricing`} className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors min-h-[44px] flex items-center">
              {lang === "ar" ? "الأسعار" : "Pricing"}
            </Link>
            <Link href={`/${lang}/privacy`} className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors min-h-[44px] flex items-center">
              {t("landing.footer.privacy", lang)}
            </Link>
            <Link href={`/${lang}/terms`} className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors min-h-[44px] flex items-center">
              {t("landing.footer.terms", lang)}
            </Link>
            <Link href={`/${lang}/about`} className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors min-h-[44px] flex items-center">
              {lang === "ar" ? "عن بليفوAI" : "About"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
