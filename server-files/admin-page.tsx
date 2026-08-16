import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { AdminContent } from "./admin-content"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"
  return {
    title: isAr ? "لوحة التحكم — BlivoAI" : "Admin Panel — BlivoAI",
    robots: { index: false, follow: false }, // Admin pages not indexed
  }
}

export default async function AdminPage({ params }: { params: Promise<{ lang: string }> }) {
  // Always render AdminContent — it handles auth internally
  // If not authenticated, it shows a login form (NOT redirect to home)
  return <AdminContent params={params} />
}
