// ============================================
// API: نظام HR — تقارير الموارد البشرية
// GET: جلب تقارير HR
// POST: إنشاء تقرير جديد
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
    const companyId = searchParams.get("companyId")
    const type = searchParams.get("type")

    if (!companyId) {
      return NextResponse.json({ error: "معرّف الشركة مطلوب" }, { status: 400 })
    }

    const where: Record<string, unknown> = { companyId }
    if (type) where.type = type

    const reports = await db.hRReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 30,
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("[HR_REPORTS_LIST_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب التقارير" }, { status: 500 })
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
    const { companyId, type, periodStart, periodEnd } = body

    if (!companyId) {
      return NextResponse.json({ error: "معرّف الشركة مطلوب" }, { status: 400 })
    }

    // جمع بيانات الأداء من قاعدة البيانات
    const employees = await db.employee.findMany({
      where: { companyId, status: { not: "DELETED" } },
      include: {
        tasks: { where: { status: "COMPLETED" } },
        tokenUsages: { 
          where: { 
            createdAt: { 
              gte: periodStart ? new Date(periodStart) : new Date(Date.now() - 24 * 60 * 60 * 1000),
              lte: periodEnd ? new Date(periodEnd) : new Date()
            } 
          } 
        },
      },
    })

    const activeEmployees = employees.filter(e => e.status === "ACTIVE").length
    const totalTasks = employees.reduce((sum, e) => sum + e.tasks.length, 0)
    const pendingTasks = await db.task.count({
      where: {
        employee: { companyId },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    })
    const totalTokenUsage = employees.reduce(
      (sum, e) => sum + e.tokenUsages.reduce((s, t) => s + t.totalTokens, 0),
      0,
    )

    // إنشاء التقرير
    const startDate = periodStart ? new Date(periodStart) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    const endDate = periodEnd ? new Date(periodEnd) : new Date()

    // توصيات ذكية
    const recommendations: string[] = []
    const alerts: string[] = []

    if (activeEmployees === 0) {
      alerts.push("ما فيش موظفين نشطين — وظّف موظفين لبدء العمل")
    }
    if (pendingTasks > activeEmployees * 5) {
      alerts.push(`عدد المهام المعلقة (${pendingTasks}) مرتفع مقارنة بعدد الموظفين (${activeEmployees})`)
      recommendations.push("فكّر بتوظيف موظفين إضافيين أو إعادة توزيع المهام")
    }
    if (totalTokenUsage > 400000) {
      recommendations.push("استهلاك التوكنات مرتفع — فكّر بترقية الاشتراك")
    }

    // أداء كل موظف
    const employeePerformance = employees
      .filter(e => e.status === "ACTIVE")
      .map(e => ({
        name: e.name,
        role: e.role,
        departmentId: e.departmentId,
        tasksCompleted: e.tasks.length,
        tokenUsage: e.tokenUsages.reduce((s, t) => s + t.totalTokens, 0),
      }))

    // أفضل/أسوأ موظف
    const bestEmployee = employeePerformance.sort((a, b) => b.tasksCompleted - a.tasksCompleted)[0]
    if (bestEmployee && bestEmployee.tasksCompleted > 0) {
      recommendations.push(`${bestEmployee.name} أكثر موظف إنتاجية — فكّر بتكليفه بمهام أهم`)
    }

    const report = await db.hRReport.create({
      data: {
        companyId,
        type: type || "DAILY",
        title: `تقرير ${type === "WEEKLY" ? "أسبوعي" : type === "MONTHLY" ? "شهري" : "يومي"} — ${endDate.toLocaleDateString("ar-EG")}`,
        summary: `${activeEmployees} موظف نشط من أصل ${employees.length} | ${totalTasks} مهمة مكتملة | ${pendingTasks} معلقة | ${Math.round(totalTokenUsage / 1000)}K توكن`,
        details: JSON.stringify({ employeePerformance, bestEmployee }),
        totalEmployees: employees.length,
        activeEmployees,
        tasksCompleted: totalTasks,
        tasksPending: pendingTasks,
        avgResponseTime: 0,
        tokenUsage: totalTokenUsage,
        recommendations: JSON.stringify(recommendations),
        alerts: JSON.stringify(alerts),
        periodStart: startDate,
        periodEnd: endDate,
      },
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error("[HR_REPORT_CREATE_ERROR]", error)
    return NextResponse.json({ error: "فشل إنشاء التقرير" }, { status: 500 })
  }
}
