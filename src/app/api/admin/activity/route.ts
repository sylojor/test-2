// ============================================
// Platform Activity Log API
// GET: Fetch activity logs with filtering
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePlatformOwner } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const auth = requirePlatformOwner(request)
  if (!auth.success) return new NextResponse(auth.response.body, { status: auth.response.status, headers: auth.response.headers })

  try {
    const url = new URL(request.url)
    const action = url.searchParams.get("action") || ""
    const search = url.searchParams.get("search") || ""
    const success = url.searchParams.get("success") || ""
    const limit = parseInt(url.searchParams.get("limit") || "100")
    const page = parseInt(url.searchParams.get("page") || "1")

    const where: any = {}
    if (action) where.action = action
    if (success === "true") where.success = true
    if (success === "false") where.success = false
    if (search) {
      where.OR = [
        { userEmail: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
        { ip: { contains: search, mode: "insensitive" } },
        { path: { contains: search, mode: "insensitive" } },
        { error: { contains: search, mode: "insensitive" } },
      ]
    }

    const total = await db.activityLog.count({ where })
    const logs = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    })

    // --- Stats ---
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayLogs = await db.activityLog.count({ where: { createdAt: { gte: todayStart } } })
    const todayErrors = await db.activityLog.count({ where: { success: false, createdAt: { gte: todayStart } } })
    const loginCount = await db.activityLog.count({ where: { action: "login", success: true, createdAt: { gte: todayStart } } })
    const uploadCount = await db.activityLog.count({ where: { action: { in: ["upload_logo", "upload_favicon", "upload_blog_image"] }, createdAt: { gte: todayStart } } })

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: { todayLogs, todayErrors, loginCount, uploadCount },
    })
  } catch (error) {
    console.error("[Activity Log API] Error:", error)
    return NextResponse.json({ error: "Failed to load activity logs" }, { status: 500 })
  }
}
