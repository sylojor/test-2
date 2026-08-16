// ============================================
// API: إعداد الموظف (Setup)
// POST /api/employees/setup
// 
// بعد إنشاء الموظف، صاحب الشركة بيجاوب على أسئلة التهيئة
// الموظف بيتحوّل من SETUP → ACTIVE
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import type { ApprovalMode } from "@/types"

export async function POST(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { employeeId, answers, approvalMode, acceptedCapabilities } = body

    // --- التحقق ---
    if (!employeeId) {
      return NextResponse.json(
        { error: "معرّف الموظف مطلوب" },
        { status: 400 },
      )
    }

    if (!answers || typeof answers !== "object" || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: "أجوبة التهيئة مطلوبة" },
        { status: 400 },
      )
    }

    const validModes: ApprovalMode[] = ["ALWAYS_APPROVE", "AUTO_WITH_NOTIFY", "AUTO_SILENT"]
    const mode: ApprovalMode = validModes.includes(approvalMode) ? approvalMode : "ALWAYS_APPROVE"

    // --- جلب الموظف ---
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    })

    if (!employee) {
      return NextResponse.json(
        { error: "الموظف غير موجود" },
        { status: 404 },
      )
    }

    if (employee.status !== "SETUP") {
      return NextResponse.json(
        { error: "الموظف ليس بحالة تهيئة" },
        { status: 400 },
      )
    }

    // --- تحديث System Prompt بأجوبة التهيئة ---
    const setupContext = Object.entries(answers)
      .map(([question, answer]) => `سؤال: ${question}\nجواب: ${answer}`)
      .join("\n\n")

    // --- دمج القدرات المقبولة ---
    let updatedCapabilities: string[] = []
    try {
      updatedCapabilities = employee.capabilities ? JSON.parse(employee.capabilities) : []
      if (!Array.isArray(updatedCapabilities)) updatedCapabilities = []
    } catch {
      updatedCapabilities = []
    }
    if (acceptedCapabilities && Array.isArray(acceptedCapabilities) && acceptedCapabilities.length > 0) {
      updatedCapabilities = [...updatedCapabilities, ...acceptedCapabilities]
    }

    // --- تحديث System Prompt ---
    const capabilitiesSection = updatedCapabilities.length > 0
      ? `\n# قدراتك المحدّثة\n${updatedCapabilities.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`
      : ""

    const enhancedSystemPrompt = `${employee.systemPrompt || ""}

# معلومات التهيئة (من صاحب الشركة)
${setupContext}
${capabilitiesSection}

# تعليمات إضافية من التهيئة
- استخدم المعلومات أعلاه لفهم طبيعة العمل وأسلوب التواصل
- طبّق تفضيلات صاحب الشركة بكل تفاصيلها
- لو صار تعارض بين التعليمات الأساسية ومعلومات التهيئة — التزم بمعلومات التهيئة`

    // --- حفظ ذاكرة الموظف من الأجوبة ---
    const memoryPromises = Object.entries(answers).map(([question, answer]) =>
      db.employeeMemory.upsert({
        where: {
          employeeId_category_key: {
            employeeId: employee.id,
            category: "setup",
            key: question.substring(0, 100), // مفتاح مختصر
          },
        },
        create: {
          employeeId: employee.id,
          category: "setup",
          key: question.substring(0, 100),
          value: answer as string,
        },
        update: {
          value: answer as string,
        },
      })
    )

    // --- حفظ ذاكرة الشركة من الأجوبة المهمة ---
    const companyMemoryPromises = Object.entries(answers).map(([question, answer]) =>
      db.companyMemory.upsert({
        where: {
          companyId_category_key: {
            companyId: employee.companyId,
            category: "employee_setup",
            key: `${employee.name}_${question.substring(0, 80)}`,
          },
        },
        create: {
          companyId: employee.companyId,
          category: "employee_setup",
          key: `${employee.name}_${question.substring(0, 80)}`,
          value: answer as string,
        },
        update: {
          value: answer as string,
        },
      })
    )

    // --- تنفيذ كل التحديثات ---
    await Promise.all([
      ...memoryPromises,
      ...companyMemoryPromises,
      db.employee.update({
        where: { id: employeeId },
        data: {
          status: "ACTIVE",
          approvalMode: mode,
          systemPrompt: enhancedSystemPrompt,
          capabilities: JSON.stringify(updatedCapabilities),
        },
      }),
      db.auditLog.create({
        data: {
          companyId: employee.companyId,
          action: "employee_setup_completed",
          actorType: "USER",
          details: JSON.stringify({
            employeeId: employee.id,
            employeeName: employee.name,
            approvalMode: mode,
          }),
        },
      }),
    ])

    return NextResponse.json({
      message: "تم إعداد الموظف بنجاح — جاهز للعمل!",
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        status: "ACTIVE",
        approvalMode: mode,
      },
    })

  } catch (error) {
    console.error("[SETUP_EMPLOYEE_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إعداد الموظف" },
      { status: 500 },
    )
  }
}
