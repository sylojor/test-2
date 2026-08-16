"use client"

import { useEffect } from "react"
import { use } from "react"
import type { Locale } from "@/lib/i18n-config"
import { i18n } from "@/lib/i18n-config"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
  params: Promise<{ lang: string }>
}

export default function Error({ error, reset, params }: ErrorPageProps) {
  const { lang: langStr } = use(params)
  const lang: Locale = i18n.locales.includes(langStr as Locale) ? (langStr as Locale) : i18n.defaultLocale
  const isAr = lang === "ar"

  useEffect(() => {
    console.error("[BLIVOAI_ERROR]", error)
  }, [error])

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8"
      dir="ltr"
    >
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl font-bold text-destructive/80">!</div>
        <h1 className="text-2xl font-semibold">
          {isAr ? "حدث خطأ غير متوقع" : "Something went wrong"}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {isAr
            ? "نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية."
            : "We apologize for the inconvenience. Please try again or return to the home page."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors text-sm min-h-[44px]"
          >
            {isAr ? "إعادة المحاولة" : "Try Again"}
          </button>
          <a
            href={`/${lang}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-border hover:bg-muted font-medium transition-colors text-sm min-h-[44px]"
          >
            {isAr ? "الرئيسية" : "Home"}
          </a>
        </div>
      </div>
    </div>
  )
}
