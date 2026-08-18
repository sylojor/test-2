import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { i18n, type Locale } from "@/lib/i18n-config"
import { LocaleSetter } from "@/components/locale-setter"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "BlivoAI Demo",
  description: "Explore the BlivoAI dashboard with sample data.",
  robots: "noindex, nofollow",
}

export default async function DemoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!i18n.locales.includes(lang as Locale)) {
    notFound()
  }
  const locale = lang as Locale

  return (
    <>
      <LocaleSetter locale={locale} />
      {children}
      <Toaster position="top-center" />
    </>
  )
}