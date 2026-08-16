// ============================================
// API: Track visitor — public, no auth required
// POST — Record a page visit
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, referrer, country, sessionId, language } = body || {}

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")?.trim()
      || request.headers.get("cf-connecting-ip")?.trim()
      || "unknown"

    const userAgent = request.headers.get("user-agent") || "unknown"

    // Only track valid paths (not API routes, not static assets)
    if (!path || path.startsWith("/api/") || path.startsWith("/_next") || path.includes(".")) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    await db.visitor.create({
      data: {
        path: path || "/",
        referrer: referrer || null,
        country: country || null,
        ip,
        sessionId: sessionId || null,
        userAgent: userAgent.slice(0, 500),
        language: language || null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[track-visitor] Error:", error)
    return NextResponse.json({ ok: true, error: "tracking_failed" })
  }
}

