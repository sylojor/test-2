// ============================================
// API: Analytics (Visitor tracking, SEO, Head tags) — Admin only
// GET  — Visitor stats, page popularity, SEO data, head/footer tags (admin auth required)
// POST — Add/update head/footer tag (admin auth required)
// DELETE — Remove a head/footer tag (admin auth required)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePlatformOwner } from "@/lib/auth"

// --- GET: Analytics data (admin only) ---
export async function GET(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalVisitors, todayVisitors, weekVisitors, monthVisitors] = await Promise.all([
      db.visitor.count(),
      db.visitor.count({ where: { createdAt: { gte: todayStart } } }),
      db.visitor.count({ where: { createdAt: { gte: weekStart } } }),
      db.visitor.count({ where: { createdAt: { gte: monthStart } } }),
    ])

    const allVisitors: any[] = await db.visitor.findMany({
      take: 5000,
      orderBy: { createdAt: "desc" },
    })

    const uniqueIps = new Set<string>()
    const uniqueIpsToday = new Set<string>()
    const uniqueIpsWeek = new Set<string>()
    const uniqueIpsMonth = new Set<string>()
    const returningIps = new Map<string, number>()

    const arCount = allVisitors.filter(v => v.language === "ar").length
    const enCount = allVisitors.filter(v => v.language === "en").length

    allVisitors.forEach(v => {
      if (v.ip) {
        uniqueIps.add(v.ip)
        const created = new Date(v.createdAt)
        if (created >= todayStart) uniqueIpsToday.add(v.ip)
        if (created >= weekStart) uniqueIpsWeek.add(v.ip)
        if (created >= monthStart) uniqueIpsMonth.add(v.ip)
        returningIps.set(v.ip, (returningIps.get(v.ip) || 0) + 1)
      }
    })

    const returningVisitors = Array.from(returningIps.values()).filter(c => c > 1).length
    const newVisitors = uniqueIps.size - returningVisitors

    const pathCounts: Record<string, number> = {}
    const refCounts: Record<string, number> = {}
    const countryCounts: Record<string, number> = {}

    allVisitors.forEach(v => {
      pathCounts[v.path] = (pathCounts[v.path] || 0) + 1
      let ref = "Direct"
      if (v.referrer) {
        try {
          const u = new URL(v.referrer)
          const host = u.hostname
          if (host.includes("google")) ref = "Google"
          else if (host.includes("bing")) ref = "Bing"
          else if (host.includes("facebook") || host.includes("fb.com")) ref = "Facebook"
          else if (host.includes("twitter") || host.includes("x.com")) ref = "Twitter/X"
          else if (host.includes("linkedin")) ref = "LinkedIn"
          else if (host.includes("blivoai")) ref = "Internal"
          else ref = host
        } catch { ref = "Direct" }
      }
      refCounts[ref] = (refCounts[ref] || 0) + 1
      const country = v.country || "Unknown"
      countryCounts[country] = (countryCounts[country] || 0) + 1
    })

    const topPages = Object.entries(pathCounts)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    const topReferrers = Object.entries(refCounts)
      .filter(([source]) => source !== "Direct" && source !== "Internal")
      .map(([source, visitors]) => ({ source, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10)

    const topCountries = Object.entries(countryCounts)
      .filter(([country]) => country !== "Unknown")
      .map(([country, visitors]) => ({ country, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10)

    const sessionCounts = new Map<string, number>()
    allVisitors.forEach(v => {
      if (v.sessionId) {
        sessionCounts.set(v.sessionId, (sessionCounts.get(v.sessionId) || 0) + 1)
      }
    })
    const totalSessions = sessionCounts.size
    const bouncedSessions = Array.from(sessionCounts.values()).filter(c => c === 1).length
    const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0

    let sitemapSubmitted = false
    let robotsTxt = false
    let sitemapUrlCount = 0
    try {
      const [sitemapRes, robotsRes] = await Promise.all([
        fetch((process.env.NEXT_PUBLIC_APP_URL || "https://blivoai.com") + "/sitemap.xml", { cache: "no-store" }),
        fetch((process.env.NEXT_PUBLIC_APP_URL || "https://blivoai.com") + "/robots.txt", { cache: "no-store" }),
      ])
      sitemapSubmitted = sitemapRes.ok
      robotsTxt = robotsRes.ok
      if (sitemapRes.ok) {
        const sitemapContent = await sitemapRes.text()
        const locMatches = sitemapContent.match(/<loc>/g)
        sitemapUrlCount = locMatches ? locMatches.length : 0
      }
    } catch {}

    const headTags = await (db as any).headTag.findMany({
      where: { position: "head", isActive: true },
      orderBy: { createdAt: "desc" },
    })
    const footerTags = await (db as any).headTag.findMany({
      where: { position: "footer", isActive: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      visitors: { total: totalVisitors, today: todayVisitors, week: weekVisitors, month: monthVisitors },
      uniqueVisitors: { total: uniqueIps.size, today: uniqueIpsToday.size, week: uniqueIpsWeek.size, month: uniqueIpsMonth.size },
      returningVisitors,
      newVisitors,
      byLanguage: { ar: arCount, en: enCount },
      sessions: { total: totalSessions, bounceRate, pageViews: totalVisitors },
      topPages,
      topReferrers,
      topCountries,
      searchEngine: { googleIndexed: sitemapSubmitted && robotsTxt, indexedPages: sitemapUrlCount, sitemapSubmitted, robotsTxt },
      headTags,
      footerTags,
    })
  } catch (error) {
    console.error("[ANALYTICS_GET_ERROR]", error)
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 })
  }
}

// --- POST: Add/Update head/footer tag (admin only) ---
export async function POST(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { id, name, tagType, content, position, isActive } = body

    if (!name || !tagType || !content) {
      return NextResponse.json({ error: "name, tagType, and content required" }, { status: 400 })
    }

    if (id) {
      const updated = await (db as any).headTag.update({
        where: { id },
        data: { name, tagType, content, position: position || "head", isActive: isActive ?? true },
      })
      return NextResponse.json({ success: true, tag: updated })
    }

    const tag = await (db as any).headTag.create({
      data: { name, tagType, content, position: position || "head", isActive: isActive ?? true },
    })
    return NextResponse.json({ success: true, tag })
  } catch (error) {
    console.error("[ANALYTICS_POST_ERROR]", error)
    return NextResponse.json({ error: "Failed to save tag" }, { status: 500 })
  }
}

// --- DELETE: Remove head/footer tag (admin only) ---
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    await (db as any).headTag.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ANALYTICS_DELETE_ERROR]", error)
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 })
  }
}
