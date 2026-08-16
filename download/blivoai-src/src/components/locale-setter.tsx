"use client"

import { useEffect } from "react"
import type { Locale } from "@/lib/i18n-config"

// ============================================
// Client component that sets <html> lang attribute
// Layout direction stays LTR always — only text direction
// changes per-element for Arabic content
// ============================================

export function LocaleSetter({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale
    // Layout ALWAYS LTR — elements don't shift when language changes
    // Arabic text gets RTL direction via CSS class "text-rtl"
    document.documentElement.dir = "ltr"
  }, [locale])

  return null
}
