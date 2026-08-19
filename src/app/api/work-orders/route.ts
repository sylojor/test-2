// ============================================
// API طلبات العمل (Work Orders)
// المدير يكتب شو بدك والنظام يوزّع على الأقسام
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isLLMConnected, sendToLLM } from "@/lib/llm-service"
import { verifyAuth, unauthorizedResponse, forbiddenResponse, getUserCompanyId } from "@/lib/auth"
import { buildPipeline, createPipelineInDB, runFullPipeline } from "@/lib/pipeline-executor"

// --- كلمات مفتاحية لربط الطلبات بالأقسام ---
// كل مفتاح هو معرّف القسم (prefix)، والقيم هي كلمات مفتاحية
// بنطابق الكلمات المفتاحية على نص الطلب AND اسم القسم — مرن
const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  "محاسب": ["محاسب", "مالي", "فاتور", "ضريب", "ميزان", "مصروف", "إيراد", "رواتب", "بنك", "حساب", "إقرار", "تقرير مالي", "ميزانية", "account", "finance"],
  "برمج": ["برمج", "كود", "تطوير", "ويب", "موقع", "تطبيق", "API", "سيرفر", "داتا بيس", "فرونت", "باك اند", "backend", "frontend", "software", "dev"],
  "تسويق": ["تسويق", "إعلان", "سوشال", "حملة", "بوست", "محتوى", "انستا", "فيسبوك", "تيك توك", "ماركتينج", "marketing", "brand", "اعلان", "إعلان"],
  "تصميم": ["تصميم", "شعار", "لوجو", "بوستر", "غرافيك", "UI", "UX", "واجهة", "design", "فوتوشوب", "ابداع"],
  "مبيع": ["مبيع", "عميل", "عقد", "عرض سعر", "تفاوض", "CRM", "عملاء", "بيع", "sales"],
  "موارد بشري": ["موارد بشري", "توظيف", "موظف", "رواتب", "إجازة", "حضور", "انصراف", "HR", "بشري"],
  "قانون": ["قانون", "عقد", "محامي", "نزاع", "دعوى", "تشريع", "امتثال", "compliance", "legal"],
}

// --- مطابقة ذكية: بنطابق الكلمات المفتاحية على نص الطلب ---
function identifyRelevantDepartments(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase()
  const matchedDepartments: string[] = []

  for (const [deptPrefix, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        if (!matchedDepartments.includes(deptPrefix)) {
          matchedDepartments.push(deptPrefix)
        }
        break
      }
    }
  }

  return matchedDepartments
}

// --- مطابقة مرنة بين prefix والقسم الفعلي ---
// بدل ما نقارن prefix مع اسم القسم فقط، بنقارن كل الكلمات المفتاحية
function matchDepartmentByName(deptName: string, prefixes: string[]): boolean {
  const nameLower = deptName.toLowerCase()
  for (const prefix of prefixes) {
    // 1. الـ prefix نفسو موجود باسم القسم
    if (nameLower.includes(prefix.toLowerCase())) return true
    // 2. أي كلمة مفتاحية من القسم موجودة باسم القسم
    const keywords = DEPARTMENT_KEYWORDS[prefix]
    if (keywords) {
      for (const keyword of keywords) {
        if (keyword.length >= 3 && nameLower.includes(keyword.toLowerCase())) return true
      }
    }
  }
  return false
}

// --- توليد مهام فرعية ذكية من وصف الطلب ---
function generateSubTasks(title: string, description: string, departmentNames: string[]): Array<{ title: string; departmentPrefix: string }> {
  const tasks: Array<{ title: string; departmentPrefix: string }> = []
  const text = `${title} ${description}`.toLowerCase()

  // محاسبة
  if (text.includes("محاسب") || text.includes("مالي") || text.includes("فاتور") || text.includes("ضريب")) {
    tasks.push({ title: "مراجعة المستندات المالية", departmentPrefix: "محاسب" })
    tasks.push({ title: "إعداد التقرير المالي", departmentPrefix: "محاسب" })
    if (text.includes("ضريب")) {
      tasks.push({ title: "إعداد الإقرار الضريبي", departmentPrefix: "محاسب" })
    }
  }

  // برمجة
  if (text.includes("برمج") || text.includes("تطوير") || text.includes("موقع") || text.includes("تطبيق") || text.includes("كود")) {
    tasks.push({ title: "تحليل المتطلبات التقنية", departmentPrefix: "برمج" })
    tasks.push({ title: "التطوير والبرمجة", departmentPrefix: "برمج" })
    tasks.push({ title: "الاختبار والتسليم", departmentPrefix: "برمج" })
  }

  // تسويق
  if (text.includes("تسويق") || text.includes("إعلان") || text.includes("سوشال") || text.includes("حملة")) {
    tasks.push({ title: "إعداد خطة التسويق", departmentPrefix: "تسويق" })
    tasks.push({ title: "إنشاء المحتوى", departmentPrefix: "تسويق" })
    tasks.push({ title: "نشر ومتابعة الأداء", departmentPrefix: "تسويق" })
  }

  // تصميم
  if (text.includes("تصميم") || text.includes("شعار") || text.includes("لوجو") || text.includes("غرافيك")) {
    tasks.push({ title: "استقبال المتطلبات الإبداعية", departmentPrefix: "تصميم" })
    tasks.push({ title: "تصميم النسخ الأولية", departmentPrefix: "تصميم" })
    tasks.push({ title: "المراجعة والتعديل النهائي", departmentPrefix: "تصميم" })
  }

  // لو ما في مهام محددة — مهمة عامة
  if (tasks.length === 0) {
    tasks.push({ title: `تنفيذ: ${title}`, departmentPrefix: departmentNames[0] || "عام" })
  }

  return tasks
}

// --- توليد مهام فرعية بالـ LLM (أذكى) ---
async function generateSubTasksWithLLM(
  title: string,
  description: string,
  departmentNames: string[],
): Promise<Array<{ title: string; departmentName: string }>> {
  if (!isLLMConnected()) {
    // لو الـ LLM مش مربوط → استخدم التوليد المحلي
    return generateSubTasks(title, description, departmentNames).map(t => ({
      title: t.title,
      departmentName: t.departmentPrefix,
    }))
  }

  try {
    const prompt = `أنت نظام إدارة مهام ذكي. بناءً على طلب العمل التالي، ولّد مهام فرعية مفصلة.

عنوان الطلب: ${title}
وصف الطلب: ${description}
الأقسام المتوفرة: ${departmentNames.join("، ")}

أجب بصيغة JSON فقط (بدون markdown) بالشكل التالي:
[
  { "title": "عنوان المهمة الفرعية", "departmentName": "اسم القسم" },
  ...
]

ملاحظات:
- كل مهمة لازم تكون محددة وقابلة للتنفيذ
- وزّع المهام على الأقسام المناسبة
- رتّب المهام حسب الترتيب المنطقي للتنفيذ
- لو في مهام لازم تننفذ بالتتابع (واحدة بعد التانية) → رتّبها بهاد الترتيب
- عدد المهام: 3-8 حسب حجم الطلب`

    const response = await sendToLLM(
      {
        messages: [
          { role: "system", content: "أنت نظام إدارة مهام ذكي. أجب بصيغة JSON فقط." },
          { role: "user", content: prompt },
        ],
        requestType: "ANALYSIS",
      },
      "system",
      "work-order-generator",
    )

    let parsed: Array<{ title: string; departmentName: string }>
    try {
      let cleanContent = response.content.trim()
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      }
      parsed = JSON.parse(cleanContent)
    } catch {
      // لو فشل الـ parsing → استخدم التوليد المحلي
      return generateSubTasks(title, description, departmentNames).map(t => ({
        title: t.title,
        departmentName: t.departmentPrefix,
      }))
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return generateSubTasks(title, description, departmentNames).map(t => ({
        title: t.title,
        departmentName: t.departmentPrefix,
      }))
    }

    return parsed
  } catch (error) {
    console.warn("[LLM_TASK_GEN_FAILED] Falling back to local:", error)
    return generateSubTasks(title, description, departmentNames).map(t => ({
      title: t.title,
      departmentName: t.departmentPrefix,
    }))
  }
}

// ============================================
// GET — جلب طلبات العمل
// ============================================
export async function GET(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const userCompanyId = getUserCompanyId(authPayload)
    if (!userCompanyId) { return forbiddenResponse("No company") }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const status = searchParams.get("status")

    if (!companyId) {
      return NextResponse.json({ error: "companyId مطلوب" }, { status: 400 })
    }

    const where: Record<string, unknown> = { companyId }
    if (status) {
      where.status = status
    }

    const workOrders = await db.workOrder.findMany({
      where,
      include: {
        subTasks: {
          include: {
            assignee: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        updates: {
          orderBy: { createdAt: "desc" },
        },
        assignedDepartment: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ workOrders })
  } catch (error) {
    console.error("Error fetching work orders:", error)
    return NextResponse.json({ error: "فشل جلب طلبات العمل" }, { status: 500 })
  }
}

// ============================================
// POST — إنشاء طلب عمل جديد
// المشترك يكتب شو بدك → النظام يوزّع تلقائياً على الأقسام
// كل قسم يشوف دورو → يعملو → يسلمو للقسم المعني اللي بعدو
// ============================================
export async function POST(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const userCompanyId = getUserCompanyId(authPayload)
    if (!userCompanyId) { return forbiddenResponse("No company") }

    const body = await request.json()
    const { companyId, createdById, createdByName, title, description, priority, deadline } = body

    if (!companyId || !title || !description) {
      return NextResponse.json({ error: "companyId و title و description مطلوبين" }, { status: 400 })
    }

    // --- 1. إنشاء طلب العمل ---
    const workOrder = await db.workOrder.create({
      data: {
        companyId,
        createdById: createdById || "system",
        createdByName: createdByName || "المدير",
        title,
        description,
        priority: priority || 5,
        status: "SUBMITTED",
        progress: 0,
        deadline: deadline ? new Date(deadline) : null,
        // تحديث أولي
        updates: {
          create: {
            updatedByType: "SYSTEM",
            updatedByName: "النظام",
            content: "تم استلام الطلب — النظام يعمل تلقائياً",
            type: "ASSIGNMENT",
          },
        },
      },
    })

    // --- 2. بناء pipeline تلقائياً ---
    // النظام يحدد الأقسام المطلوبة وترتيبها + التنبيهات
    const { steps: pipelineSteps, warnings } = await buildPipeline(
      workOrder.id,
      companyId,
      title,
      description,
    )

    // --- 3. إنشاء المهام الفرعية بالـ DB + التنبيهات ---
    await createPipelineInDB(workOrder.id, pipelineSteps, warnings)

    // --- 4. تحديث حالة الطلب ---
    if (pipelineSteps.length > 0) {
      await db.workOrder.update({
        where: { id: workOrder.id },
        data: {
          status: "IN_PROGRESS",
          assignedDepartmentId: pipelineSteps[0].departmentId,
        },
      })
    }

    // --- 5. تشغيل pipeline تلقائياً (async — بدون blocking) ---
    const hasWarnings = warnings.length > 0
    setTimeout(async () => {
      try {
        await runFullPipeline(workOrder.id, companyId, hasWarnings)
      } catch (error) {
        console.error("[PIPELINE_AUTO_RUN_ERROR]", error)
      }
    }, 3000)

    // --- 6. جلب الطلب الكامل ---
    const fullWorkOrder = await db.workOrder.findUnique({
      where: { id: workOrder.id },
      include: {
        subTasks: {
          include: {
            assignee: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        updates: {
          orderBy: { createdAt: "desc" },
        },
        assignedDepartment: { select: { id: true, name: true, color: true } },
      },
    })

    const pipelineMessage = warnings.length > 0
      ? `النظام يعمل تلقائياً — لكن ${warnings.length} قسم مش موجود: ${warnings.map(w => w.departmentName).join("، ")}. شوف التنبيهات لمعرفة شو ما رح يكمل.`
      : "النظام يعمل تلقائياً — كل قسم سينجز دوره"

    return NextResponse.json({
      workOrder: fullWorkOrder,
      pipelineInfo: {
        steps: pipelineSteps.length,
        departments: pipelineSteps.map(s => s.departmentName),
        warnings: warnings.map(w => ({
          departmentName: w.departmentName,
          message: w.message,
          affectedPart: w.affectedPart,
        })),
        autoStarted: true,
        message: pipelineMessage,
      },
    }, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating work order:", error)
    return NextResponse.json({ error: "فشل إنشاء طلب العمل" }, { status: 500 })
  }
}
