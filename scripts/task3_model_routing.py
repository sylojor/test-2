#!/usr/bin/env python3
"""Task 3: API Routes for Employee Model Routing"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

model_routing_content = r'''// ============================================
// API: توجيه الموديلات للموظف (Employee Model Routing)
// GET /api/employees/[id]/model-routing — جلب كل التوجيهات
// POST /api/employees/[id]/model-routing — إضافة/تحديث توجيه
// DELETE /api/employees/[id]/model-routing — حذف توجيه
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

// --- أنواع المهام الصالحة ---
const VALID_TASK_TYPES = [
  "CHAT",
  "GENERATION",
  "IMAGE",
  "ANALYSIS",
  "CODE",
  "DECISION",
  "TRANSLATION",
  "SUMMARIZATION",
]

// --- أسماء أنواع المهام بالعربي والإنجليزي ---
const TASK_TYPE_NAMES: Record<string, { ar: string; en: string; icon: string }> = {
  CHAT: { ar: "محادثة", en: "Chat", icon: "💬" },
  GENERATION: { ar: "توليد محتوى", en: "Content Generation", icon: "✍️" },
  IMAGE: { ar: "توليد صور", en: "Image Generation", icon: "🎨" },
  ANALYSIS: { ar: "تحليل", en: "Analysis", icon: "📊" },
  CODE: { ar: "كود", en: "Code", icon: "💻" },
  DECISION: { ar: "اتخاذ قرار", en: "Decision Making", icon: "⚖️" },
  TRANSLATION: { ar: "ترجمة", en: "Translation", icon: "🌐" },
  SUMMARIZATION: { ar: "تلخيص", en: "Summarization", icon: "📝" },
}

// --- جلب كل توجيهات الموديلات للموظف ---
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id } = await params

    // التأكد إنو الموظف موجود
    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // جلب التوجيهات مع تفاصيل الموديل
    const routings = await db.employeeModelRouting.findMany({
      where: { employeeId: id },
      include: {
        llmModel: {
          select: {
            id: true,
            name: true,
            provider: true,
            modelId: true,
            tier: true,
            isActive: true,
          },
        },
      },
      orderBy: { taskType: "asc" },
    })

    // جلب الموديلات المتاحة (لعرض خيارات للمستخدم)
    const availableModels = await db.llmModel.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
      select: {
        id: true,
        name: true,
        provider: true,
        modelId: true,
        tier: true,
      },
    })

    return NextResponse.json({
      routings,
      taskTypes: TASK_TYPE_NAMES,
      availableModels,
    })
  } catch (error) {
    console.error("[GET_EMPLOYEE_MODEL_ROUTING_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء جلب توجيهات الموديلات" }, { status: 500 })
  }
}

// --- إضافة/تحديث توجيه موديل ---
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id } = await params
    const body = await request.json()

    // التأكد من البيانات المطلوبة
    if (!body.taskType) {
      return NextResponse.json(
        { error: "نوع المهمة مطلوب" },
        { status: 400 },
      )
    }

    if (!VALID_TASK_TYPES.includes(body.taskType)) {
      return NextResponse.json(
        { error: "نوع المهمة غير صالح — الأنواع المتاحة: " + VALID_TASK_TYPES.join(", ") },
        { status: 400 },
      )
    }

    // التأكد إنو الموديل موجود لو تم تحديدو
    if (body.llmModelId) {
      const model = await db.llmModel.findUnique({ where: { id: body.llmModelId } })
      if (!model) {
        return NextResponse.json(
          { error: "الموديل غير موجود" },
          { status: 404 },
        )
      }
      if (!model.isActive) {
        return NextResponse.json(
          { error: "الموديل غير نشط" },
          { status: 400 },
        )
      }
    }

    // التأكد إنو الموظف موجود
    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // إنشاء أو تحديث التوجيه (upsert — لأنو كل نوع مهمة توجيه واحد فقط)
    const routing = await db.employeeModelRouting.upsert({
      where: { employeeId_taskType: { employeeId: id, taskType: body.taskType } },
      create: {
        employeeId: id,
        taskType: body.taskType,
        llmModelId: body.llmModelId || null,
        priority: body.priority || 5,
        isActive: body.isActive ?? true,
      },
      update: {
        llmModelId: body.llmModelId || null,
        priority: body.priority || 5,
        isActive: body.isActive ?? true,
      },
      include: {
        llmModel: {
          select: {
            id: true,
            name: true,
            provider: true,
            modelId: true,
            tier: true,
          },
        },
      },
    })

    // تسجيل في سجل المراجعة
    await db.auditLog.create({
      data: {
        companyId: employee.companyId,
        action: "employee_model_routing_updated",
        actorType: "USER",
        details: JSON.stringify({ employeeId: id, taskType: body.taskType, llmModelId: body.llmModelId }),
      },
    })

    return NextResponse.json({ routing })
  } catch (error) {
    console.error("[POST_EMPLOYEE_MODEL_ROUTING_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة/تحديث توجيه الموديل" }, { status: 500 })
  }
}

// --- حذف توجيه موديل ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id } = await params
    const routingId = request.nextUrl.searchParams.get("routingId")

    if (!routingId) {
      return NextResponse.json(
        { error: "معرف التوجيه مطلوب (routingId)" },
        { status: 400 },
      )
    }

    const existing = await db.employeeModelRouting.findFirst({
      where: { id: routingId, employeeId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: "التوجيه غير موجود" }, { status: 404 })
    }

    await db.employeeModelRouting.delete({ where: { id: routingId } })

    return NextResponse.json({ message: "تم حذف توجيه الموديل بنجاح" })
  } catch (error) {
    console.error("[DELETE_EMPLOYEE_MODEL_ROUTING_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء حذف توجيه الموديل" }, { status: 500 })
  }
}
'''

with sftp.open("/home/ubuntu/blivoai-demo/src/app/api/employees/[id]/model-routing/route.ts", "w") as f:
    f.write(model_routing_content.encode())
print("✓ model-routing/route.ts created")

sftp.close()
client.close()
print("\nTask 3 complete: Employee model routing API route created")
