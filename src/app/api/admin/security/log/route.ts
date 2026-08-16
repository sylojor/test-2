// ============================================
// Security Log API — Log suspicious requests
// Called by proxy.ts when it detects suspicious activity
// Protected by INTERNAL_SECURITY_KEY (shared with proxy.ts)
// POST: Create a security log entry
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

const INTERNAL_KEY = process.env.INTERNAL_SECURITY_KEY

export async function POST(request: NextRequest) {
  try {
    // Verify internal caller (proxy.ts)
    const key = request.headers.get("x-internal-key")
    if (!INTERNAL_KEY || key !== INTERNAL_KEY) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { ip, path, method, statusCode, userAgent, referer, isSuspicious, reason, blocked } = body

    if (!ip || !path) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create security log entry
    const log = await db.securityLog.create({
      data: {
        ip,
        path,
        method: method || "GET",
        statusCode: statusCode || 0,
        userAgent: userAgent || null,
        referer: referer || null,
        isSuspicious: isSuspicious || false,
        reason: reason || null,
        blocked: blocked || false,
      },
    })

    // If this request resulted in a block, also update/create the BlockedIP record
    if (blocked && ip) {
      const existingBlock = await db.blockedIP.findUnique({ where: { ip } })

      if (existingBlock) {
        // Increment request count
        await db.blockedIP.update({
          where: { ip },
          data: {
            requestCount: existingBlock.requestCount + 1,
            isActive: true,
            updatedAt: new Date(),
          },
        })
      }
      // Note: For auto-block creation, the auto-block endpoint handles it
    }

    return NextResponse.json({ log, message: "Security event logged" })
  } catch (error) {
    console.error("[Security Log] Error:", error)
    return NextResponse.json({ error: "Failed to log security event" }, { status: 500 })
  }
}
