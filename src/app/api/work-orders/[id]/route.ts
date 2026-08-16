// ============================================
// API طلب عمل واحد — GET / PATCH
// تحديث التقدم + إضافة تحديثات + إكمال مهام
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

// ============================================
// GET — جلب طلب عمل واحد بتفاصيله
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const workOrder = await db.workOrder.findUnique({
      where: { id },
      include: {
        subTasks: {
          include: {
            assignee: { select: { id: true, name: true, role: true, avatarColor: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        updates: {
          orderBy: { createdAt: "desc" },
        },
        assignedDepartment: { select: { id: true, name: true, color: true } },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ error: "طلب العمل مش موجود" }, { status: 404 })
    }

    return NextResponse.json({ workOrder })
  } catch (error) {
    console.error("Error fetching work order:", error)
    return NextResponse.json({ error: "فشل جلب طلب العمل" }, { status: 500 })
  }
}

// ============================================
// PATCH — تحديث طلب عمل
// - تحديث حالة مهمة فرعية
// - إضافة تحديث (من موظف أو مدير)
// - حساب التقدم تلقائياً
// ============================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()
    const { action, data } = body

    // --- التحقق من وجود الطلب ---
    const existing = await db.workOrder.findUnique({
      where: { id },
      include: { subTasks: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "طلب العمل مش موجود" }, { status: 404 })
    }

    switch (action) {
      // === إكمال مهمة فرعية ===
      case "complete_task": {
        const { taskId, result } = data
        const task = await db.workOrderTask.update({
          where: { id: taskId },
          data: {
            status: "COMPLETED",
            result: result || null,
            completedAt: new Date(),
          },
        })

        // حساب التقدم الجديد
        const allTasks = await db.workOrderTask.findMany({
          where: { workOrderId: id },
        })
        const completedCount = allTasks.filter(t => t.status === "COMPLETED").length
        const newProgress = Math.round((completedCount / allTasks.length) * 100)

        // تحديث حالة الطلب
        const newStatus = newProgress === 100 ? "COMPLETED" : newProgress > 0 ? "IN_PROGRESS" : existing.status

        await db.workOrder.update({
          where: { id },
          data: {
            progress: newProgress,
            status: newStatus,
            completedAt: newProgress === 100 ? new Date() : undefined,
          },
        })

        // إضافة تحديث
        await db.workOrderUpdate.create({
          data: {
            workOrderId: id,
            updatedByType: data.updatedByType || "EMPLOYEE",
            updatedById: data.updatedById,
            updatedByName: data.updatedByName || "موظف",
            content: result
              ? `أتممت "${task.title}" — ${result}`
              : `أتممت "${task.title}"`,
            type: "COMPLETION",
          },
        })

        return NextResponse.json({ progress: newProgress, status: newStatus })
      }

      // === تحديث مهمة فرعية (بدون إكمال) ===
      case "update_task": {
        const { taskId, status, assigneeId } = data
        const updateData: Record<string, unknown> = {}
        if (status) updateData.status = status
        if (assigneeId) updateData.assigneeId = assigneeId

        await db.workOrderTask.update({
          where: { id: taskId },
          data: updateData,
        })

        return NextResponse.json({ success: true })
      }

      // === إضافة تحديث من موظف ===
      case "add_update": {
        const { content, updatedByName, updatedById, updatedByType, type } = data

        await db.workOrderUpdate.create({
          data: {
            workOrderId: id,
            updatedByType: updatedByType || "EMPLOYEE",
            updatedById: updatedById,
            updatedByName: updatedByName || "موظف",
            content,
            type: type || "PROGRESS",
          },
        })

        return NextResponse.json({ success: true })
      }

      // === تسليم من قسم لقسم ===
      case "handoff": {
        const { fromDepartmentId, toDepartmentId, content, updatedByName } = data

        await db.workOrder.update({
          where: { id },
          data: { assignedDepartmentId: toDepartmentId },
        })

        await db.workOrderUpdate.create({
          data: {
            workOrderId: id,
            updatedByType: "EMPLOYEE",
            updatedByName: updatedByName || "موظف",
            content: content || `تم تسليم الطلب من قسم لقسم آخر`,
            type: "HANDOFF",
          },
        })

        return NextResponse.json({ success: true })
      }

      // === إلغاء طلب ===
      case "cancel": {
        await db.workOrder.update({
          where: { id },
          data: { status: "CANCELLED" },
        })

        await db.workOrderUpdate.create({
          data: {
            workOrderId: id,
            updatedByType: "USER",
            updatedByName: data.updatedByName || "المدير",
            content: "تم إلغاء طلب العمل",
            type: "STATUS_CHANGE",
          },
        })

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "action غير معروف" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error updating work order:", error)
    return NextResponse.json({ error: "فشل تحديث طلب العمل" }, { status: 500 })
  }
}
