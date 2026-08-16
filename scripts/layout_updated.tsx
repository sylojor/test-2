import type { Metadata, Viewport } from "next"
import { Inter, Noto_Sans_Arabic } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

// === Font System ===
// Inter: Clean, Apple-like Latin font (English + numbers)
// Noto Sans Arabic: Formal, professional Arabic font
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  display: "swap",
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blivoai.com"
const SITE_NAME = "BlivoAI"
const THEME_COLOR = "#0d9488" // teal-600 — BlivoAI brand color

// === SEO: Viewport configuration — NO ZOOM on mobile ===
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR },
  ],
}

// === SEO: Root metadata — applies to all pages as fallback ===
export const metadata: Metadata = {
  title: {
    default: "BlivoAI — Smart Chat + Business Management",
    template: "%s | BlivoAI",
  },
  description: "BlivoAI — AI platform combining intelligent chatbot with specialized AI employees for your company. Smart Chat + Business Management in one platform.",
  keywords: ["BlivoAI", "AI chatbot", "business management", "AI employees", "smart chat", "إدارة أعمال", "محادثة ذكية", "موظفين AI"],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "ar_AR",
    alternateLocale: "en_US",
    siteName: SITE_NAME,
    title: "BlivoAI — Smart Chat + Business Management",
    description: "AI platform combining intelligent chatbot with specialized AI employees for your company",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "BlivoAI — Smart Chat + Business Management",
    description: "AI platform combining intelligent chatbot with specialized AI employees",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'ar': `${SITE_URL}/ar`,
      'en': `${SITE_URL}/en`,
      'x-default': `${SITE_URL}/ar`,
    },
  },
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}

// === SEO: JSON-LD Structured Data ===
// Organization schema — tells Google who BlivoAI is
// WebSite schema — tells Google about the site and enables Sitelinks Search Box
function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/api/branding/logo.png`,
    description: "AI platform combining intelligent chatbot with specialized AI employees for your company",
    sameAs: [
      "https://twitter.com/blivoai",
      "https://linkedin.com/company/blivoai",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["Arabic", "English"],
    },
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: "BlivoAI — AI platform combining intelligent chatbot with specialized AI employees for your company",
    inLanguage: ["ar", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/en/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html suppressHydrationWarning lang="ar" dir="ltr">
      <head>
        <JsonLd />
      </head>
      <body
        className={`${inter.variable} ${notoSansArabic.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}