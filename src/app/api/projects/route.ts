// ============================================
// API: إدارة المشاريع
// GET: جلب مشاريع الشركة
// POST: إنشاء مشروع جديد
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { getAuthCompanyId, requireCompanyAccess, requireRole } from "@/lib/tenant"

export async function GET(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const companyId = authPayload.companyId
    const departmentId = searchParams.get("departmentId")

    const where: Record<string, unknown> = { companyId }
    if (departmentId) where.departmentId = departmentId

    const projects = await db.project.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, color: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, role: true } },
          },
          orderBy: { priority: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("[PROJECTS_LIST_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب المشاريع" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, description, departmentId, priority, deadline,  } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "اسم المشروع مطلوب" }, { status: 400 })
    }

    const company = await db.company.findUnique({ where: { id: companyId } })
    if (!company) {
      return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 })
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        departmentId: departmentId || null,
        priority: priority || 5,
        deadline: deadline ? new Date(deadline) : null,
        companyId,
        createdBy: company.ownerId,
        createdByType: "USER",
      },
      include: {
        department: { select: { id: true, name: true, color: true } },
      },
    })

    await db.auditLog.create({
      data: {
        companyId,
        action: "project_created",
        actorType: "USER",
        actorId: company.ownerId,
        actorName: "صاحب الشركة",
        details: JSON.stringify({ projectId: project.id, projectName: project.name }),
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error("[PROJECT_CREATE_ERROR]", error)
    return NextResponse.json({ error: "فشل إنشاء المشروع" }, { status: 500 })
  }
}
