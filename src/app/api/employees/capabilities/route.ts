// ============================================
// API: تعديل قدرات الموظف
// PATCH /api/employees/[id]/capabilities
// 
// المدير يقدر يضيف/يحذف/يعدل قدرات الموظف بعد إنشائو
// الموظف بيتعلم القدرات الجديدة فوراً
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()
    const { addCapabilities, removeCapabilities, updateSystemPrompt } = body

    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // القدرات الحالية
    let capabilities: string[] = []
    try {
      capabilities = employee.capabilities ? JSON.parse(employee.capabilities) : []
      if (!Array.isArray(capabilities)) capabilities = []
    } catch {
      capabilities = []
    }

    // إضافة قدرات جديدة
    if (addCapabilities && Array.isArray(addCapabilities)) {
      capabilities = [...capabilities, ...addCapabilities.filter((c: string) => !capabilities.includes(c))]
    }

    // حذف قدرات
    if (removeCapabilities && Array.isArray(removeCapabilities)) {
      capabilities = capabilities.filter(c => !removeCapabilities.includes(c))
    }

    // تحديث الـ System Prompt لو مطلوب
    let systemPrompt = employee.systemPrompt || ""
    if (updateSystemPrompt !== false) {
      // أعد توليد قسم القدرات بالـ system prompt
      const capabilitiesSection = capabilities.length > 0
        ? `# قدراتك\n${capabilities.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
        : ""

      // استبدال قسم القدرات القديم بالجديد
      const promptParts = systemPrompt.split("# قدراتك")
      if (promptParts.length > 1) {
        const afterCapabilities = promptParts[1].split(/#\s/).slice(1).join("# ")
        systemPrompt = `${promptParts[0]}${capabilitiesSection}\n\n# ${afterCapabilities}`
      } else {
        systemPrompt = `${systemPrompt}\n\n${capabilitiesSection}`
      }
    }

    // حفظ التحديثات
    const updated = await db.employee.update({
      where: { id },
      data: {
        capabilities: JSON.stringify(capabilities),
        systemPrompt,
      },
    })

    return NextResponse.json({
      employee: {
        id: updated.id,
        name: updated.name,
        capabilities: updated.capabilities,
      },
      capabilities,
    })
  } catch (error) {
    console.error("[CAPABILITIES_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث القدرات" }, { status: 500 })
  }
}
