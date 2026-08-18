// ============================================
// API Pipeline — تشغيل/إعادة تشغيل pipeline تلقائي
// POST: تشغيل pipeline لطلب موجود
// GET: جلب حالة pipeline + التنبيهات
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { buildPipeline, createPipelineInDB, runFullPipeline } from "@/lib/pipeline-executor"

// ============================================
// POST — تشغيل pipeline لطلب عمل
// ============================================
export async function POST(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    // IDOR FIX: Verify company ownership — use auth payload, not client-supplied ID
    const authCompanyId = authPayload.companyId || authPayload.ownedCompany?.id
    if (!authCompanyId) {
      return NextResponse.json({ error: "لا توجد شركة مرتبطة" }, { status: 403 })
    }

    const body = await request.json()
    const { workOrderId, title, description, action } = body
    const companyId = authCompanyId // Always use authenticated company ID

    if (!workOrderId) {
      return NextResponse.json({ error: "workOrderId و companyId مطلوبين" }, { status: 400 })
    }

    // --- إعادة تشغيل pipeline ---
    if (action === "rerun") {
      const workOrder = await db.workOrder.findUnique({
        where: { id: workOrderId },
        select: { id: true, title: true, description: true, companyId: true, status: true },
      })

      if (!workOrder) {
        return NextResponse.json({ error: "طلب العمل مش موجود" }, { status: 404 })
      }

      if (workOrder.status === "COMPLETED" || workOrder.status === "CANCELLED") {
        return NextResponse.json({ error: "لا يمكن إعادة تشغيل pipeline لطلب مكتمل أو ملغى" }, { status: 400 })
      }

      // حذف المهام الفرعية القديمة
      await db.workOrderTask.deleteMany({
        where: { workOrderId },
      })

      // حذف التحديثات القديمة (keep first only)
      const updates = await db.workOrderUpdate.findMany({
        where: { workOrderId },
        orderBy: { createdAt: "desc" },
      })
      if (updates.length > 1) {
        const toDelete = updates.slice(1).map(u => u.id)
        await db.workOrderUpdate.deleteMany({
          where: { id: { in: toDelete } },
        })
      }

      // بناء pipeline جديد
      const { steps: pipelineSteps, warnings } = await buildPipeline(
        workOrderId,
        workOrder.companyId,
        workOrder.title,
        workOrder.description,
      )

      await createPipelineInDB(workOrderId, pipelineSteps, warnings)

      const hasWarnings = warnings.length > 0

      // تشغيل pipeline (async - non-blocking)
      setTimeout(async () => {
        try {
          await runFullPipeline(workOrderId, workOrder.companyId, hasWarnings)
        } catch (error) {
          console.error("[PIPELINE_RERUN_ASYNC_ERROR]", error)
        }
      }, 2000)

      return NextResponse.json({
        success: true,
        message: "Pipeline تم إعادة تشغيله",
        steps: pipelineSteps.length,
        warnings: warnings.map(w => ({
          departmentName: w.departmentName,
          message: w.message,
          affectedPart: w.affectedPart,
        })),
        pipelineSteps: pipelineSteps.map(s => ({
          department: s.departmentName,
          task: s.taskTitle,
          order: s.order,
        })),
      })
    }

    // --- تشغيل pipeline جديد ---
    const workOrder = await db.workOrder.findUnique({
      where: { id: workOrderId },
      select: { title: true, description: true },
    })

    if (!workOrder) {
      return NextResponse.json({ error: "طلب العمل مش موجود" }, { status: 404 })
    }

    const { steps: pipelineSteps, warnings } = await buildPipeline(
      workOrderId,
      companyId,
      title || workOrder.title,
      description || workOrder.description,
    )

    await createPipelineInDB(workOrderId, pipelineSteps, warnings)

    const hasWarnings = warnings.length > 0

    // تشغيل pipeline (async)
    setTimeout(async () => {
      try {
        await runFullPipeline(workOrderId, companyId, hasWarnings)
      } catch (error) {
        console.error("[PIPELINE_RUN_ASYNC_ERROR]", error)
      }
    }, 2000)

    return NextResponse.json({
      success: true,
      steps: pipelineSteps.length,
      warnings: warnings.map(w => ({
        departmentName: w.departmentName,
        message: w.message,
        affectedPart: w.affectedPart,
      })),
      pipelineSteps: pipelineSteps.map(s => ({
        department: s.departmentName,
        task: s.taskTitle,
        order: s.order,
      })),
    })
  } catch (error) {
    console.error("Pipeline API error:", error)
    return NextResponse.json({ error: "فشل تشغيل pipeline" }, { status: 500 })
  }
}

// ============================================
// GET — جلب حالة pipeline لطلب عمل + التنبيهات
// ============================================
export async function GET(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const workOrderId = searchParams.get("workOrderId")

    if (!workOrderId) {
      return NextResponse.json({ error: "workOrderId مطلوب" }, { status: 400 })
    }

    const workOrder = await db.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        subTasks: {
          include: {
            assignee: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        updates: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        assignedDepartment: { select: { id: true, name: true, color: true } },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ error: "طلب العمل مش موجود" }, { status: 404 })
    }

    // جلب التنبيهات
    const warnings = Array.isArray(workOrder.warnings) ? workOrder.warnings : []

    // بناء حالة pipeline — المشترك يرى هذا (بدون تفاصيل تقنية)
    const pipelineStatus = {
      id: workOrder.id,
      title: workOrder.title,
      description: workOrder.description,
      status: workOrder.status,
      progress: workOrder.progress,
      currentDepartment: workOrder.assignedDepartment?.name || "غير معين",
      warnings: warnings,
      steps: workOrder.subTasks.map(task => ({
        id: task.id,
        title: task.title,
        assignee: task.assignee?.name || "غير معين",
        status: task.status,
        result: task.status === "COMPLETED" ? task.result : null,
      })),
      recentUpdates: workOrder.updates.map(u => ({
        content: u.content,
        type: u.type,
        by: u.updatedByName,
        at: u.createdAt,
      })),
    }

    return NextResponse.json({ pipelineStatus })
  } catch (error) {
    console.error("Pipeline GET error:", error)
    return NextResponse.json({ error: "فشل جلب حالة pipeline" }, { status: 500 })
  }
}
