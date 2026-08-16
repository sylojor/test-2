"use client"

import { useEffect } from "react"
import type { Locale } from "@/lib/i18n-config"
import { setLanguage } from "@/lib/i18n"

// ============================================
// Client component that sets <html> lang attribute
// and syncs the i18n language with the URL locale
// so ALL notifications/toasts use the correct language
// Layout direction changes based on locale (rtl for Arabic, ltr for English)
// changes per-element for Arabic content
// ============================================

export function LocaleSetter({ locale }: { locale: Locale }) {
  useEffect(() => {
    // Sync i18n language so t() uses the correct language
    // This fixes: error toasts showing Arabic on English pages
    setLanguage(locale)
    // Set the correct lang attribute for accessibility and SEO
    document.documentElement.lang = locale
    // Set direction based on locale for SEO and accessibility
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
  }, [locale])

  return null
}
