// ============================================
// API: مراقبة الوكلاء (صاحب المنصة) — Admin only
// GET — جلب جلسات الوكلاء + إحصائيات (admin auth required)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { getActiveAgentSessions, getAgentStats } from "@/lib/agent-executor"
import { db } from "@/lib/db"
import { requirePlatformOwner } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const [activeSessions, stats] = await Promise.all([
      getActiveAgentSessions(),
      getAgentStats(),
    ])

    const recentSessions = await db.agentSession.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: { id: true, name: true, role: true, companyId: true },
        },
        llmModel: {
          select: { id: true, name: true, provider: true, modelId: true },
        },
      },
    })

    const modelPerformance = await db.lLMModel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        provider: true,
        tier: true,
        totalCalls: true,
        totalTokensIn: true,
        totalTokensOut: true,
        totalCost: true,
        lastUsedAt: true,
      },
      orderBy: { totalCalls: "desc" },
    })

    return NextResponse.json({
      stats,
      activeSessions,
      recentSessions,
      modelPerformance,
    })
  } catch (error) {
    console.error("[GET_AGENTS_ADMIN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
