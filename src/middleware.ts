// ============================================
// Next.js Middleware — Server-side route protection
// Protects sensitive routes from unauthenticated access
// ============================================

import { NextRequest, NextResponse } from "next/server"

const PROTECTED_ROUTES = [
  "/dashboard",
  "/company",
  "/employees",
  "/billing",
  "/settings",
  "/conversations",
  "/work-orders",
  "/projects",
  "/meetings",
  "/hr",
  "/tickets",
  "/api-keys",
  "/access-tokens",
  "/admin",
]

const API_PROTECTED_PREFIXES = [
  "/api/admin/",
  "/api/employees",
  "/api/conversations",
  "/api/companies",
  "/api/work-orders",
  "/api/projects",
  "/api/meetings",
  "/api/hr",
  "/api/departments",
  "/api/payments/checkout",
  "/api/invoices",
  "/api/token-budget",
  "/api/api-keys",
  "/api/employee-requests",
  "/api/settings/",
  "/api/decisions",
  "/api/support/tickets",
  "/api/chat",
  "/api/coordinate",
]

// Public routes that should never be blocked
const PUBLIC_API_ROUTES = [
  "/api/auth/",
  "/api/plans",
  "/api/blog",
  "/api/track-visitor",
  "/api/branding/",
  "/api/uploads/blog/",
  "/api/payments/webhook",
  "/api/payments/verify",
  "/api/support/tickets", // public support portal
  "/api/google-client-id",
  "/api/v1/chat", // legacy API
  "/api/cron/",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("oec_token")?.value
    || request.headers.get("authorization")?.replace("Bearer ", "")

  // Protect page routes
  for (const route of PROTECTED_ROUTES) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      if (!token) {
        const loginUrl = new URL("/en/login", request.url)
        loginUrl.searchParams.set("redirect", pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  // Protect API routes (return 401 instead of redirect)
  if (pathname.startsWith("/api/")) {
    const isPublicApi = PUBLIC_API_ROUTES.some(r => pathname.startsWith(r))
    if (!isPublicApi) {
      const needsProtection = API_PROTECTED_PREFIXES.some(r => pathname.startsWith(r))
      if (needsProtection && !token) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|icon-|apple-touch-icon|og-image|opengraph|demo).*)",
  ],
}
