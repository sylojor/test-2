"use client"

import { useParams } from "next/navigation"
import type { Locale } from "@/lib/i18n-config"
import { i18n } from "@/lib/i18n-config"

export function useLocale(): Locale {
  const params = useParams()
  const lang = params.lang as string
  if (i18n.locales.includes(lang as Locale)) {
    return lang as Locale
  }
  return i18n.defaultLocale
}
