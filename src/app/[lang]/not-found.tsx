"use client"

import { use } from "react"
import type { Locale } from "@/lib/i18n-config"
import { i18n } from "@/lib/i18n-config"

export default function NotFound({ params }: { params: Promise<{ lang: string }> }) {
  // Resolve params — use() must be called unconditionally (not in try/catch)
  const { lang: langStr } = use(params)
  const lang: Locale = i18n.locales.includes(langStr as Locale) ? (langStr as Locale) : i18n.defaultLocale

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-bold text-slate-700">404</div>
        <h1 className="text-2xl font-semibold">
          {lang === "ar" ? "الصفحة غير موجودة" : "Page Not Found"}
        </h1>
        <p className="text-slate-400">
          {lang === "ar"
            ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
            : "The page you are looking for does not exist or has been moved."
          }
        </p>
        <a
          href={`/${lang}/`}
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
        >
          {lang === "ar" ? "العودة للرئيسية" : "Go Home"}
        </a>
      </div>
    </div>
  )
}
