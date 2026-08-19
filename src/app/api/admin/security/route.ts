// ============================================
// Security Admin API — Main endpoint
// GET: List blocked IPs + suspicious logs + stats
// POST: Block an IP manually
// DELETE: Unblock an IP
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePlatformOwner } from "@/lib/auth"

export async function GET(request: NextRequest) {
  // --- Auth check ---
  const auth = requirePlatformOwner(request)
  if (!auth.success) return new NextResponse(auth.response.body, { status: auth.response.status, headers: auth.response.headers })

  try {
    const url = new URL(request.url)
    const filter = url.searchParams.get("filter") || "all"
    const search = url.searchParams.get("search") || ""

    // --- Build filter conditions ---
    const where: any = {}
    if (filter === "active") where.isActive = true
    if (filter === "auto") where.autoBlocked = true
    if (filter === "manual") where.autoBlocked = false
    if (search) {
      where.OR = [
        { ip: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { path: { contains: search, mode: "insensitive" } },
        { attemptDetail: { contains: search, mode: "insensitive" } },
      ]
    }

    // --- Fetch blocked IPs ---
    const blockedIps = await db.blockedIP.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    // --- Fetch suspicious logs ---
    const suspiciousLogs = await db.securityLog.findMany({
      where: { isSuspicious: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    // --- Stats ---
    const activeBlocks = await db.blockedIP.count({ where: { isActive: true } })
    const autoBlocks = await db.blockedIP.count({ where: { isActive: true, autoBlocked: true } })
    const manualBlocks = await db.blockedIP.count({ where: { isActive: true, autoBlocked: false } })
    const totalSuspicious = await db.securityLog.count({ where: { isSuspicious: true } })
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todaySuspicious = await db.securityLog.count({
      where: { isSuspicious: true, createdAt: { gte: todayStart } },
    })
    const totalBlocked = await db.securityLog.count({ where: { blocked: true } })

    return NextResponse.json({
      blockedIps,
      suspiciousLogs,
      stats: { activeBlocks, autoBlocks, manualBlocks, totalSuspicious, todaySuspicious, totalBlocked },
    })
  } catch (error) {
    console.error("[Security API] Error fetching data:", error)
    return NextResponse.json({ error: "Failed to load security data" }, { status: 500 })
  }
}

// --- POST: Block an IP manually ---
export async function POST(request: NextRequest) {
  const auth = requirePlatformOwner(request)
  if (!auth.success) return new NextResponse(auth.response.body, { status: auth.response.status, headers: auth.response.headers })

  try {
    const body = await request.json()
    const { ip, reason } = body

    if (!ip) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }

    // Check if already blocked
    const existing = await db.blockedIP.findUnique({ where: { ip } })

    if (existing && existing.isActive) {
      // Update existing block (increment count)
      const updated = await db.blockedIP.update({
        where: { ip },
        data: {
          reason: reason || existing.reason,
          requestCount: existing.requestCount + 1,
          blockedBy: auth.payload.email,
          updatedAt: new Date(),
        },
      })
      return NextResponse.json({ blocked: updated, message: "IP already blocked — count updated" })
    }

    if (existing && !existing.isActive) {
      // Re-block previously unblocked IP
      const reblocked = await db.blockedIP.update({
        where: { ip },
        data: {
          isActive: true,
          reason: reason || "Manual block",
          blockedBy: auth.payload.email,
          autoBlocked: false,
          requestCount: existing.requestCount + 1,
          unblockedAt: null,
          updatedAt: new Date(),
        },
      })
      return NextResponse.json({ blocked: reblocked, message: "IP re-blocked" })
    }

    // Create new block
    const blocked = await db.blockedIP.create({
      data: {
        ip,
        reason: reason || "Manual block",
        blockedBy: auth.payload.email,
        autoBlocked: false,
        isActive: true,
      },
    })

    // Also log this action
    await db.securityLog.create({
      data: {
        ip,
        path: "/api/admin/security",
        method: "POST",
        statusCode: 200,
        userAgent: request.headers.get("user-agent") || "",
        referer: request.headers.get("referer") || "",
        isSuspicious: false,
        reason: `Manual block by ${auth.payload.email}: ${reason || "Manual block"}`,
        blocked: true,
      },
    })

    return NextResponse.json({ blocked, message: "IP blocked successfully" })
  } catch (error) {
    console.error("[Security API] Error blocking IP:", error)
    return NextResponse.json({ error: "Failed to block IP" }, { status: 500 })
  }
}

// --- DELETE: Unblock an IP ---
export async function DELETE(request: NextRequest) {
  const auth = requirePlatformOwner(request)
  if (!auth.success) return new NextResponse(auth.response.body, { status: auth.response.status, headers: auth.response.headers })

  try {
    const body = await request.json()
    const { ip } = body

    if (!ip) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }

    const existing = await db.blockedIP.findUnique({ where: { ip } })

    if (!existing) {
      return NextResponse.json({ error: "IP not found in block list" }, { status: 404 })
    }

    if (!existing.isActive) {
      return NextResponse.json({ message: "IP is already unblocked" })
    }

    // Unblock the IP
    const unblocked = await db.blockedIP.update({
      where: { ip },
      data: {
        isActive: false,
        unblockedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Log the unblock action
    await db.securityLog.create({
      data: {
        ip,
        path: "/api/admin/security",
        method: "DELETE",
        statusCode: 200,
        userAgent: request.headers.get("user-agent") || "",
        referer: request.headers.get("referer") || "",
        isSuspicious: false,
        reason: `Unblocked by ${auth.payload.email}`,
        blocked: false,
      },
    })

    return NextResponse.json({ unblocked, message: "IP unblocked successfully" })
  } catch (error) {
    console.error("[Security API] Error unblocking IP:", error)
    return NextResponse.json({ error: "Failed to unblock IP" }, { status: 500 })
  }
}
