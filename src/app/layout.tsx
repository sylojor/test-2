import type { Metadata, Viewport } from "next"
import { Inter, Noto_Sans_Arabic } from "next/font/google"
import "./globals.css"
import { GoogleAnalytics } from "@/components/google-analytics"
import { ThemeProvider } from "@/components/theme-provider"

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
const THEME_COLOR = "#0d9488"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR },
  ],
}

export const metadata: Metadata = {
  title: { default: "BlivoAI — Smart Chat + Business Management", template: "%s | BlivoAI" },
  description: "BlivoAI — AI platform combining intelligent chatbot with specialized AI employees for your company.",
  keywords: ["BlivoAI", "AI chatbot", "business management", "AI employees", "smart chat"],
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
    url: SITE_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BlivoAI — Smart Chat + Business Management",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 } },
  alternates: {
    canonical: SITE_URL + "/ar",
    languages: {
      "ar": SITE_URL + "/ar",
      "en": SITE_URL + "/en",
      "x-default": SITE_URL + "/ar",
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

function JsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_URL + "/logo.png",
  }
  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["ar", "en"],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(site) }} />
    </>
  )
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html suppressHydrationWarning dir="ltr" lang="ar">
      <head>

        <JsonLd />
      </head>
      <body className={`${inter.variable} ${notoSansArabic.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <GoogleAnalytics />
      </body>
    </html>
  )
}
