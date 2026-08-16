// ============================================
// Security Check-IP API — Used by proxy.ts to check if IP is blocked
// Returns: { blocked: boolean, reason?: string }
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  // Security: This endpoint is internal-only (called by proxy.ts)
// Reject requests from external IPs
const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  || request.headers.get("x-real-ip")?.trim()
  || "unknown"
if (clientIp !== "127.0.0.1" && clientIp !== "::1" && clientIp !== "unknown") {
  return NextResponse.json({ error: "Internal only" }, { status: 403 })
}

try {
    const url = new URL(request.url)
    const ip = url.searchParams.get("ip") || "unknown"

    if (ip === "unknown") {
      return NextResponse.json({ blocked: false })
    }

    // Check if IP is in the blocked list and currently active
    const blockedIp = await db.blockedIP.findUnique({
      where: { ip },
    })

    if (blockedIp && blockedIp.isActive) {
      return NextResponse.json({
        blocked: true,
        reason: blockedIp.reason,
        autoBlocked: blockedIp.autoBlocked,
        blockedAt: blockedIp.createdAt,
        path: blockedIp.path,
      })
    }

    return NextResponse.json({ blocked: false })
  } catch (error) {
    console.error("[Security Check-IP] Error:", error)
    // On error, don't block — fail open for safety
    return NextResponse.json({ blocked: false })
  }
}
