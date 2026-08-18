// ============================================
// Next.js Proxy — i18n routing + security + rate limiting
// Next.js 16 uses "proxy.ts" (NOT "middleware.ts")
//
// Handles:
// - Redirecting "/" to the default locale "/ar/"
// - Locale detection from Accept-Language header
// - Rate limiting for API routes (100 req/min per IP)
// - Security headers
// - Blocking dangerous/suspicious paths (.env, .git, wp-admin, etc.)
// - Auto-blocking IPs that scan for sensitive files
// - Checking blocked IPs from in-memory cache
// - Admin route protection (cookie-based gate)
//
// NOTE: Full JWT verification is done in API routes via requireAdmin().
// The proxy only checks for cookie presence as a lightweight gate.
//
// Security endpoints use INTERNAL_SECURITY_KEY env var for auth.
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { i18n } from "@/lib/i18n-config"

// Internal security key for proxy -> security API calls
const INTERNAL_KEY = process.env.INTERNAL_SECURITY_KEY
const securityHeaders: Record<string, string> = INTERNAL_KEY
  ? { "Content-Type": "application/json", "x-internal-key": INTERNAL_KEY }
  : { "Content-Type": "application/json" }

// ============================================
// Suspicious path patterns — auto-block scanners
// ============================================
const SUSPICIOUS_PATHS: RegExp[] = [
  // Environment & secrets
  /^\/\.env/i,
  /^\/\.env\./i,
  /^\/\.git/i,
  /^\/\.aws/i,
  /^\/\.ssh/i,
  /^\/\.dockerenv/i,
  /^\/\.htaccess/i,
  /^\/\.htpasswd/i,
  /^\/secrets/i,
  /^\/api[-_]keys/i,
  /^\/private/i,
  /^\/config\./i,
  /^\/credentials/i,

  // WordPress / PHP targets (this is NOT a WordPress site)
  /^\/wp[-_]/i,
  /^\/wordpress/i,
  /^\/phpmyadmin/i,
  /^\/pma/i,
  /^\/adminer/i,
  /^\/\.php/i,

  // Server info & debugging
  /^\/server[-_]status/i,
  /^\/server[-_]info/i,
  /^\/debug/i,
  /^\/trace/i,
  /^\/actuator/i,
  /^\/swagger/i,

  // Database & backups
  /^\/backup/i,
  /^\/db[-_]/i,
  /^\/database/i,
  /^\/sql/i,
  /^\/dump/i,

  // Common attack paths
  /^\/cgi[-_]/i,
  /^\/shell/i,
  /^\/cmd/i,
  /^\/exec/i,
  /^\/upload[-_]shell/i,
  /^\/\.ini/i,
  /^\/\.log/i,
  /^\/\.conf/i,
  /^\/\.yaml/i,
  /^\/\.yml/i,
]

// --- Critical paths — immediate auto-block (no counter needed) ---
const CRITICAL_PATHS: RegExp[] = [
  /^\/\.env/i,
  /^\/\.env\./i,
  /^\/\.git/i,
  /^\/\.ssh/i,
  /^\/\.aws/i,
  /^\/\.dockerenv/i,
  /^\/wp[-_]/i,
  /^\/phpmyadmin/i,
  /^\/pma/i,
  /^\/adminer/i,
  /^\/shell/i,
  /^\/exec/i,
  /^\/cgi[-_]/i,
  /^\/upload[-_]shell/i,
]

// ============================================
// In-memory blocked IPs cache (fast lookup before DB check)
// ============================================
const blockedIpsCache = new Map<string, { reason: string; expiresAt: number }>()
const CACHE_REFRESH_INTERVAL = 60 * 1000 // refresh every 60s
let lastCacheRefresh = 0

// --- In-memory suspicious request counter per IP ---
const suspiciousCounter = new Map<string, { count: number; firstSeen: number }>()
const AUTO_BLOCK_THRESHOLD = 5 // auto-block after 5 suspicious requests
const COUNTER_WINDOW = 10 * 60 * 1000 // 10 minute window

// ============================================
// Helper: Get client IP from request headers
// ============================================
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp.trim()
  return "unknown"
}

// ============================================
// Helper: Create block response (403 Forbidden)
// ============================================
function createBlockResponse(ip: string, reason: string): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: "IP محظور — الوصول ممنوع",
      reason,
      ip,
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }
  )
}

// ============================================
// Allowed paths — never run security checks on these
// (Includes our own security API routes to prevent circular loops)
// ============================================
const SKIP_SECURITY_PATHS: RegExp[] = [
  /^\/ar\//,
  /^\/en\//,
  /^\/support/,
  /^\/api\/auth\//,
  /^\/api\/admin\/security\//,   // Security API routes — skip to prevent circular calls
  /^\/api\/admin\//,
  /^\/api\/branding\//,          // Dynamic branding file server — skip security checks
  /^\/api\/blog/i,
  /^\/api\/upload\//,
  /^\/api\/chat/i,
  /^\/favicon/i,
  /^\/logo/i,
  /^\/icon/i,
  /^\/apple-touch-icon/i,
  /^\/robots\.txt/i,
  /^\/sitemap/i,
  /^\/_next\//,
  /^\/uploads\//,
]

// ============================================
// Admin routes (both pages and API)
// ============================================
const ADMIN_PAGE_PREFIXES = [
  "/admin",
  "/ar/admin",
  "/en/admin",
]

const PROTECTED_PAGE_PREFIXES = [
  "/dashboard", "/company", "/employees", "/billing",
  "/settings", "/conversations", "/work-orders", "/projects",
  "/meetings", "/hr", "/tickets", "/api-keys",
  "/access-tokens",
]

const PROTECTED_API_PREFIXES = [
  "/api/employees", "/api/conversations", "/api/companies",
  "/api/work-orders", "/api/projects", "/api/meetings",
  "/api/hr", "/api/departments", "/api/payments/checkout",
  "/api/invoices", "/api/token-budget", "/api/api-keys",
  "/api/employee-requests", "/api/settings/",
  "/api/decisions", "/api/support/tickets", "/api/chat",
  "/api/coordinate",
]

const ADMIN_API_PREFIXES = [
  "/api/admin",
  "/api/blog/upload",
  "/api/upload/branding",
]

function isProtectedPageRoute(pathname: string): boolean {
  const allProtected = [...ADMIN_PAGE_PREFIXES, ...PROTECTED_PAGE_PREFIXES]
  return allProtected.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  )
}

function isAdminPageRoute(pathname: string): boolean {
  return ADMIN_PAGE_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  )
}

function isAdminApiRoute(pathname: string): boolean {
  return ADMIN_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

// ============================================
// Public routes that don't need auth
// ============================================
const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/resend-verify",
  "/api/auth/resend-code",
  "/api/auth/google",
  "/api/auth/google-client-id",
  "/api/auth/verify",
  "/api",
  "/api/blog",
  "/api/blog/images",
  "/api/support",
  "/api/plans",
  "/api/payments/webhook",
  "/api/payments/verify",
  "/api/track-visitor",
  "/api/cron",
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
}

// ============================================
// Rate Limiting (100 requests/minute per IP)
// ============================================
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 100

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

// ============================================
// Check if auth token cookie exists (lightweight gate)
// ============================================
function hasAuthToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) return true

  const cookieHeader = request.headers.get("cookie")
  if (cookieHeader) return cookieHeader.includes("oec_token=")

  return false
}

// ============================================
// Locale detection from Accept-Language header
// ============================================
function getLocaleFromHeaders(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language")
  if (!acceptLanguage) return i18n.defaultLocale

  const languages = acceptLanguage
    .split(",")
    .map(lang => {
      const [code, priority] = lang.trim().split(";q=")
      return { code: code.trim().toLowerCase(), priority: priority ? parseFloat(priority) : 1 }
    })
    .sort((a, b) => b.priority - a.priority)

  for (const { code } of languages) {
    if (code.startsWith("ar")) return "ar"
    if (code.startsWith("en")) return "en"
  }

  return i18n.defaultLocale
}

// ============================================
// Periodic cleanup of rate limit + suspicious counters
// ============================================
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
      if (now > entry.resetAt) rateLimitStore.delete(key)
    })
    Array.from(suspiciousCounter.entries()).forEach(([key, value]) => {
      if (now - value.firstSeen > COUNTER_WINDOW) suspiciousCounter.delete(key)
    })
  }, 5 * 60 * 1000)
}

// ============================================
// Main Proxy Handler
// ============================================
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = (request.headers.get("host") || "").split(":")[0]

  // Support subdomain: redirect / to /support
  if (hostname === "support.blivoai.com") {
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL("/support", request.url))
    }
    return NextResponse.next()
  }
  const ip = getClientIp(request)
  const userAgent = request.headers.get("user-agent") || ""
  const referer = request.headers.get("referer") || ""

  // ============================================
  // STEP 1: Skip security checks for allowed public paths
  // (sitemap, robots.txt, locale routes, static assets, admin, etc.)
  // IMPORTANT: This must come BEFORE IP block check so public/crawlable
  // paths like sitemap.xml are never blocked by IP auto-ban.
  // ============================================
  if (SKIP_SECURITY_PATHS.some(pattern => pattern.test(pathname))) {
    return NextResponse.next()
  }

  // Skip static assets
  if (pathname.startsWith("/_next/static") || pathname.startsWith("/_next/image")) {
    return NextResponse.next()
  }

  // ============================================
  // STEP 1.5: Check if IP is blocked (in-memory cache)
  // Only applies to non-public paths (checked after skip list)
  // ============================================
  if (blockedIpsCache.has(ip) && blockedIpsCache.get(ip)!.expiresAt > Date.now()) {
    return createBlockResponse(ip, blockedIpsCache.get(ip)!.reason)
  }

  // ============================================
  // STEP 2: Block problematic query params (Google indexed template strings)
  // ============================================
  if (request.nextUrl.searchParams.has("q") || request.nextUrl.searchParams.has("upgrade")) {
    return new NextResponse(null, { status: 404 })
  }

  // Redirect /auth to /
  if (pathname === "/auth") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Block ref spam URLs
  if (request.nextUrl.searchParams.has("ref")) {
    return new NextResponse(null, { status: 404 })
  }

  // Old feature slug redirects (Google indexed old sitemap slugs)
  const OLD_FEATURE_REDIRECTS: Record<string, string> = {
    "ai-employees": "specializedEmployees",
    "smart-chat": "smartChats",
    "department-management": "organizedDepartments",
    "analytics-dashboard": "reportsAnalytics",
    "api-integration": "advancedSecurity",
    "multi-language": "bizMultiLanguage",
  }
  const featureMatch = pathname.match(/^\/(ar|en)\/feature\/([a-zA-Z0-9-]+)$/)
  if (featureMatch) {
    const newSlug = OLD_FEATURE_REDIRECTS[featureMatch[2]]
    if (newSlug) {
      return NextResponse.redirect(new URL(`/${featureMatch[1]}/feature/${newSlug}`, request.url))
    }
  }

  // Return 404 for non-existent .html pages and /faq
  if (pathname.endsWith(".html") || pathname === "/faq") {
    return new NextResponse(null, { status: 404 })
  }



  // ============================================
  // STEP 3: Check for suspicious/critical path patterns
  // ============================================
  const matchedSuspicious = SUSPICIOUS_PATHS.find(pattern => pattern.test(pathname))
  const isCritical = CRITICAL_PATHS.some(pattern => pattern.test(pathname))

  if (matchedSuspicious) {
    // Update suspicious counter for this IP
    const counter = suspiciousCounter.get(ip) || { count: 0, firstSeen: Date.now() }
    counter.count++
    suspiciousCounter.set(ip, counter)

    // Determine if we should auto-block
    const shouldBlock = isCritical || counter.count >= AUTO_BLOCK_THRESHOLD

    if (shouldBlock) {
      // Add to in-memory blocked cache (immediate effect)
      blockedIpsCache.set(ip, {
        reason: isCritical ? `Critical path: ${pathname}` : `Too many suspicious requests`,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      })

      // Reset counter after blocking
      suspiciousCounter.delete(ip)

      // Log to DB via internal API call (async, non-blocking)
      // Security API routes are in SKIP_SECURITY_PATHS so won't be intercepted
      try {
        fetch(new URL("/api/admin/security/auto-block", request.url), {
          method: "POST",
          headers: securityHeaders,
          body: JSON.stringify({
            ip,
            reason: isCritical
              ? `حظر تلقائي: وصول لمسار حرج (${pathname})`
              : `حظر تلقائي: ${counter.count} ريكويستات مشبوهة في 10 دقائق`,
            path: pathname,
            attemptDetail: `Method: ${request.method}, Path: ${pathname}, UA: ${userAgent.slice(0, 100)}`,
          }),
        }).catch(() => {}) // Fire-and-forget, don't block the response
      } catch {
        // Non-blocking — continue
      }

      return createBlockResponse(
        ip,
        isCritical ? `مسار حرج: ${pathname}` : `ريكويستات مشبوهة متكررة`
      )
    }

    // Not yet blocked, but suspicious — return 404 (don't reveal the file doesn't exist)
    // Also log this suspicious request
    try {
      fetch(new URL("/api/admin/security/log", request.url), {
        method: "POST",
        headers: securityHeaders,
        body: JSON.stringify({
          ip,
          path: pathname,
          method: request.method,
          statusCode: 404,
          userAgent,
          referer,
          isSuspicious: true,
          reason: isCritical
            ? `CRITICAL: حاول الوصول لملف حساس ${pathname}`
            : `حاول الوصول لمشبوه ${pathname}`,
          blocked: false,
        }),
      }).catch(() => {}) // Fire-and-forget
    } catch {
      // Non-blocking — continue
    }

    return new NextResponse(null, { status: 404 })
  }

  // ============================================
  // STEP 4: Refresh blocked IPs cache periodically
  // (Fetch from DB via security API)
  // ============================================
  if (Date.now() - lastCacheRefresh > CACHE_REFRESH_INTERVAL) {
    try {
      fetch(new URL("/api/admin/security/check-ip?ip=" + ip, request.url))
        .then(res => res.json())
        .then(data => {
          if (data.blocked) {
            blockedIpsCache.set(ip, { reason: data.reason, expiresAt: Date.now() + CACHE_REFRESH_INTERVAL })
          }
          lastCacheRefresh = Date.now()
        })
        .catch(() => { lastCacheRefresh = Date.now() })
    } catch {
      lastCacheRefresh = Date.now()
    }
  }

  // ============================================
  // STEP 5: Block dangerous static file paths
  // (Exact match paths like /docker-compose.yml, /.env, etc.)
  // ============================================
  const BLOCKED_STATIC_PATHS = [
    "/.env", "/.env.local", "/.env.production", "/.env.development", "/.env.test",
    "/.git", "/.gitignore", "/.gitmodules", "/.gitattributes",
    "/.dockerenv", "/.htaccess", "/.htpasswd",
    "/wp-config.php", "/config.php", "/database.yml", "/credentials",
    "/secrets", "/private", "/ssh", "/.ssh",
    "/.npmrc", "/.yarnrc",
    "/package-lock.json", "/yarn.lock", "/pnpm-lock.yaml",
    "/tsconfig.json", "/next.config.ts", "/next.config.js", "/next.config.mjs",
    "/prisma/schema.prisma", "/docker-compose.yml", "/docker-compose.yaml", "/Dockerfile",
  ]

  function isDangerousStaticPath(pathname: string): boolean {
    const normalized = pathname.toLowerCase()
    return BLOCKED_STATIC_PATHS.some(blocked =>
      normalized === blocked.toLowerCase() || normalized.startsWith(blocked.toLowerCase() + "/")
    ) ||
    normalized.includes("/.env") ||
    normalized.includes("/.git") ||
    normalized.includes("/.ssh") ||
    normalized.includes("/.htaccess") ||
    normalized.includes("/.htpasswd")
  }

  if (isDangerousStaticPath(pathname)) {
    // Auto-block IP trying to access dangerous server files
    blockedIpsCache.set(ip, {
      reason: `Dangerous file access: ${pathname}`,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    })

    // Log to DB
    try {
      fetch(new URL("/api/admin/security/auto-block", request.url), {
        method: "POST",
        headers: securityHeaders,
        body: JSON.stringify({
          ip,
          reason: `حظر تلقائي: وصول لملف سيرفر خطير (${pathname})`,
          path: pathname,
          attemptDetail: `Method: ${request.method}, Path: ${pathname}, UA: ${userAgent.slice(0, 100)}`,
        }),
      }).catch(() => {})
    } catch {
      // Non-blocking
    }

    return new NextResponse("Forbidden", { status: 403 })
  }

  // ============================================
  // STEP 5.5: Protected Page Routes — require auth token
  // Redirects unauthenticated users to login
  // ============================================
  if (isProtectedPageRoute(pathname) && !isAdminPageRoute(pathname)) {
    if (!hasAuthToken(request)) {
      const locale = pathname.startsWith("/en") ? "en" : "ar"
      const loginUrl = new URL(`/${locale}/login`, request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ============================================
  // STEP 6: Admin Page Routes — allow access
  // (Client-side handles auth/login display)
  // ============================================
  if (isAdminPageRoute(pathname)) {
    const response = NextResponse.next()
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; frame-src https://accounts.google.com; connect-src 'self' https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;")
    return response
  }

  // ============================================
  // STEP 7: i18n Routing — redirect bare paths to locale
  // ============================================
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    if (!pathname.startsWith("/api/")) {
      return NextResponse.next()
    }
  } else {
    const pathnameHasLocale = i18n.locales.some(
      locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    )

    if (!pathnameHasLocale) {
      const locale = getLocaleFromHeaders(request)
      const newUrl = request.nextUrl.clone()
      newUrl.pathname = `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`
      if (newUrl.pathname === `/${locale}`) {
        newUrl.pathname = `/${locale}/`
      }
      return NextResponse.redirect(newUrl)
    }
  }

  // ============================================
  // STEP 8: Protected API Route Protection
  // ============================================
  if (PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    if (!hasAuthToken(request)) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }
  }

  // ============================================
  // STEP 8.5: Admin API Route Protection (lightweight gate)
  // ============================================
  if (isAdminApiRoute(pathname)) {
    if (!hasAuthToken(request)) {
      return new NextResponse(
        JSON.stringify({ error: "غير مصرح — سجّل دخولك كمشرف" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      )
    }
    const response = NextResponse.next()
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; frame-src https://accounts.google.com; connect-src 'self' https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;")
    return response
  }

  // ============================================
  // STEP 9: Rate Limiting + Security Headers (API routes)
  // ============================================
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  if (!checkRateLimit(ip)) {
    return new NextResponse(
      JSON.stringify({ error: "طلبات كثيرة جداً — حاول بعد قليل", retryAfter: 60 }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      }
    )
  }

  const response = NextResponse.next()
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; frame-src https://accounts.google.com; connect-src 'self' https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;")

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
