// ============================================
// Next.js Middleware — Server-Side Route Protection
//
// Protected routes require oec_token cookie.
// Full JWT verification is done by API routes;
// middleware is a UX-level guard to redirect early.
// ============================================

import { NextRequest, NextResponse } from "next/server"

// Routes that require authentication (cookie must exist)
const PROTECTED_PATHS = ["/ar/admin", "/en/admin"]

// Routes that are always public
const PUBLIC_PATHS = [
  "/ar", "/en", "/ar/login", "/en/login", "/ar/signup", "/en/signup",
  "/ar/about", "/en/about", "/ar/features", "/en/features",
  "/ar/pricing", "/en/pricing", "/ar/blog", "/en/blog",
  "/ar/contact", "/en/contact", "/ar/terms", "/en/terms",
  "/ar/privacy", "/en/privacy", "/ar/support", "/en/support",
  "/ar/employee", "/en/employee", "/ar/feature", "/en/feature",
  "/ar/download", "/en/download", "/ar/api-docs", "/en/api-docs",
  "/demo/", "/api/", "/_next/", "/favicon", "/robots.txt",
  "/sitemap.xml", "/manifest.json", "/og-image", "/logo.",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes, static assets, demo, and Next.js internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/demo/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next()
  }

  // Check if this is a protected path
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
  if (!isProtected) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const cookieHeader = request.headers.get("cookie") || ""
  const hasToken = cookieHeader.includes("oec_token=")

  if (!hasToken) {
    // Extract lang from path
    const lang = pathname.startsWith("/en") ? "en" : "ar"
    const loginUrl = new URL(`/${lang}/login`, request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
