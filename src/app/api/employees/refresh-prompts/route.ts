// ============================================
// API: تحديث System Prompts للموظفين الموجودين
//
// هاد الـ API بيحدّث الـ system prompts لكل الموظفين
// بيفيد لما نضيف تعليمات جديدة (مثل التنسيق والاسم)
// وبنحتاج الموظفين الموجودين يطبقوها
//
// POST /api/employees/refresh-prompts
// Body: { companyId: string }
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateEmployee } from "@/lib/employee-generator"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: "معرّف الشركة مطلوب" }, { status: 400 })
    }

    // جلب كل الموظفين النشطين بالشركة
    const employees = await db.employee.findMany({
      where: {
        companyId,
        status: { not: "DELETED" },
      },
      include: {
        department: true,
        company: true,
      },
    })

    if (employees.length === 0) {
      return NextResponse.json({ message: "لا يوجد موظفين لتحديثهم", updated: 0 })
    }

    let updatedCount = 0

    for (const emp of employees) {
      try {
        // إعادة توليد الـ System Prompt بنفس المعطيات
        const dialect = (emp.company?.dialect || "levantine") as any
        const tone = (emp.company?.tone || "friendly") as any
        const companyName = emp.company?.name || "الشركة"
        const departmentName = emp.department?.name

        const result = generateEmployee(
          emp.name,
          emp.role,
          dialect,
          tone,
          companyName,
          undefined, // roleDescription
          emp.specialization || undefined,
          departmentName,
        )

        // تحديث الـ System Prompt فقط
        await db.employee.update({
          where: { id: emp.id },
          data: {
            systemPrompt: result.systemPrompt,
            personality: result.personality,
          },
        })

        updatedCount++
      } catch (err) {
        console.error(`[REFRESH_PROMPT] Failed for employee ${emp.id}:`, err)
      }
    }

    return NextResponse.json({
      message: `تم تحديث ${updatedCount} من ${employees.length} موظف`,
      updated: updatedCount,
      total: employees.length,
    })
  } catch (error) {
    console.error("[REFRESH_PROMPTS_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث الـ System Prompts" }, { status: 500 })
  }
}
