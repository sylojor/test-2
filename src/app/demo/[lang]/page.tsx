"use client"

import { use } from "react"
import { DemoPage } from "@/components/demo/demo-page"
import type { Locale } from "@/lib/i18n-config"

export default function DemoRoute({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale
  return <DemoPage lang={lang} />
}
