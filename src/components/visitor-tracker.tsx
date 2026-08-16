"use client"

// ============================================
// Visitor Tracker — records page visits to /api/track-visitor
// Runs once per page load, sends path, referrer, language
// ============================================

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

export function VisitorTracker({ lang }: { lang: string }) {
  const pathname = usePathname()
  const tracked = useRef(new Set<string>())

  useEffect(() => {
    // Don't track admin, API, or static paths
    if (pathname.startsWith("/admin") || pathname.startsWith("/api") || pathname.startsWith("/_next")) return

    // Don't track the same path twice in this session
    if (tracked.current.has(pathname)) return
    tracked.current.add(pathname)

    // Get or create session ID
    let sessionId = sessionStorage.getItem("blivo_session_id")
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem("blivo_session_id", sessionId)
    }

    // Fire and forget
    fetch("/api/track-visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        sessionId,
        language: lang,
      }),
    }).catch(() => {})
  }, [pathname, lang])

  return null // invisible component
}

