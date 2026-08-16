// ============================================
// API: مهام المشروع
// POST: إنشاء مهمة جديدة بالمشروع
// GET: جلب مهام مشروع
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "معرّف المشروع مطلوب" }, { status: 400 })
    }

    const tasks = await db.projectTask.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true, role: true, avatarColor: true } },
      },
      orderBy: { priority: "asc" },
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("[TASKS_LIST_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب المهام" }, { status: 500 })
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
    const { title, description, assigneeId, priority, dependsOnId, projectId, createdBy } = body

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "عنوان المهمة مطلوب" }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: "معرّف المشروع مطلوب" }, { status: 400 })
    }

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: "المشروع غير موجود" }, { status: 404 })
    }

    const task = await db.projectTask.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        assigneeId: assigneeId || null,
        priority: priority || 5,
        dependsOnId: dependsOnId || null,
        projectId,
        createdBy: createdBy || null,
        createdByType: createdBy ? "EMPLOYEE" : "USER",
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("[TASK_CREATE_ERROR]", error)
    return NextResponse.json({ error: "فشل إنشاء المهمة" }, { status: 500 })
  }
}
