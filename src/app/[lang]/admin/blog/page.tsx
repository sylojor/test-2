// ============================================
// Blog Admin Page — Full CRUD with Rich Editor
// ============================================

import type { Metadata } from "next"
import { i18n } from "@/lib/i18n-config"
import { BlogAdminContent } from "./blog-admin-content"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const isAr = lang === "ar"
  return {
    title: isAr ? "إدارة المدونة — BlivoAI" : "Blog Management — BlivoAI",
    robots: { index: false, follow: false },
  }
}

export default async function BlogAdminPage({ params }: { params: Promise<{ lang: string }> }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Blog editor toolbar: reduce top/bottom padding, add bottom margin */
        div[class*="sticky"][class*="top-"] {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          margin-bottom: 40px !important;
        }
        /* Blog editor textarea: add top padding for gap */
        div[data-placeholder] {
          padding-top: 32px !important;
        }
      ` }} />
      <BlogAdminContent params={params} />
    </>
  )
}
