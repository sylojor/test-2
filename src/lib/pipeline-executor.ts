import { RequestType } from "@/types"
// ============================================
// نظام التمرير التلقائي بين الأقسام (Pipeline Executor)
//
// الفكرة: زي نظام الشركات الطبيعي!
// - المشترك يكتب طلبو
// - النظام يحدد شو الأقسام المطلوبة وبأي ترتيب
// - كل قسم يشوف دورو → إذا الو دور بعملو تلقائي
// - لو القسم مش موجود → تنبيه للمشترك: "رح يحتاج قسم كذا لقدام وما رح نقدر نكمل"
// - لا إلغاء — يعمل اللي يقدر وينبّه على اللي ما يقدر
// - القسم يسلمو للقسم المعني اللي بعدو
// - المشترك ما يشوف غير التقدم والنتيجة والتنبيهات
// ============================================

import { db } from "@/lib/db"
import { executeAgentTask } from "@/lib/agent-executor"
import { isLLMConnected, sendToLLM } from "@/lib/llm-service"

// --- نوع المهمة بالـ pipeline ---
interface PipelineStep {
  departmentId: string
  departmentName: string
  taskTitle: string
  taskDescription: string
  assigneeId: string | null
  order: number
}

// --- تنبيه عن قسم مفقود ---
interface PipelineWarning {
  departmentName: string    // اسم القسم المفقود (مثلاً: "تصميم")
  message: string           // رسالة التنبيه للمشترك
  required: boolean         // هل القسم مطلوب أساسي؟
  affectedPart: string      // شو الجزء اللي ما رح يكمل (مثلاً: "تصميم صورة الإعلان")
}

// --- كلمات مفتاحية لربط الطلبات بالأقسام ---
const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  "محاسب": ["محاسب", "مالي", "فاتور", "ضريب", "ميزان", "مصروف", "إيراد", "رواتب", "بنك", "حساب", "إقرار", "تقرير مالي", "ميزانية", "account", "finance"],
  "برمج": ["برمج", "كود", "تطوير", "ويب", "موقع", "تطبيق", "API", "سيرفر", "داتا بيس", "فرونت", "باك اند", "backend", "frontend", "software", "dev", "تحليل تقني", "بيانات"],
  "تسويق": ["تسويق", "إعلان", "سوشال", "حملة", "بوست", "محتوى", "انستا", "فيسبوك", "تيك توك", "ماركتينج", "marketing", "brand", "اعلان"],
  "تصميم": ["تصميم", "شعار", "لوجو", "بوستر", "غرافيك", "UI", "UX", "واجهة", "design", "فوتوشوب", "ابداع", "صورة", "إعلان بصري"],
  "مبيع": ["مبيع", "عميل", "عقد", "عرض سعر", "تفاوض", "CRM", "عملاء", "بيع", "sales"],
  "موارد بشري": ["موارد بشري", "توظيف", "موظف", "إجازة", "حضور", "انصراف", "HR", "بشري", "رواتب"],
  "قانون": ["قانون", "عقد", "محامي", "نزاع", "دعوى", "تشريع", "امتثال", "compliance", "legal"],
}

// --- ترتيب الأقسام بالـ pipeline ---
const DEPARTMENT_PIPELINE_ORDER: Record<string, number> = {
  "قانون": 1,
  "موارد بشري": 2,
  "محاسب": 3,
  "تصميم": 4,
  "تسويق": 5,
  "مبيع": 6,
  "برمج": 7,
}

// --- مطابقة مرنة بين prefix والقسم الفعلي ---
function matchDepartmentByName(deptName: string, prefixes: string[]): boolean {
  const nameLower = deptName.toLowerCase()
  for (const prefix of prefixes) {
    if (nameLower.includes(prefix.toLowerCase())) return true
    const keywords = DEPARTMENT_KEYWORDS[prefix]
    if (keywords) {
      for (const keyword of keywords) {
        if (keyword.length >= 3 && nameLower.includes(keyword.toLowerCase())) return true
      }
    }
  }
  return false
}

// --- تحديد الأقسام المطلوبة وترتيبها ---
function identifyRelevantDepartments(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase()
  const matched: string[] = []

  for (const [deptPrefix, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        if (!matched.includes(deptPrefix)) {
          matched.push(deptPrefix)
        }
        break
      }
    }
  }

  return matched.sort((a, b) => {
    const orderA = DEPARTMENT_PIPELINE_ORDER[a] ?? 99
    const orderB = DEPARTMENT_PIPELINE_ORDER[b] ?? 99
    return orderA - orderB
  })
}

// --- تحديد شو الجزء اللي القسم المفقود رح يعمل ---
function determineMissingDeptPart(deptPrefix: string, title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()

  const parts: Record<string, string[]> = {
    "تصميم": ["صورة", "تصميم", "شعار", "لوجو", "بوستر", "غرافيك", "واجهة", "إعلان بصري"],
    "تسويق": ["إعلان", "حملة", "سوشال", "بوست", "محتوى", "ماركتينج"],
    "برمج": ["كود", "تطوير", "موقع", "تطبيق", "API", "سيرفر"],
    "محاسب": ["فاتور", "ضريب", "ميزان", "مصروف", "إيراد", "تقرير مالي"],
    "مبيع": ["عرض سعر", "عميل", "تفاوض", "عقد مبيع"],
    "موارد بشري": ["توظيف", "إجازة", "رواتب", "حضور"],
    "قانون": ["عقد قانون", "محامي", "نزاع", "امتثال"],
  }

  const deptParts = parts[deptPrefix] || []
  const foundParts = deptParts.filter(p => text.includes(p.toLowerCase()))

  if (foundParts.length > 0) {
    return foundParts.join(" و ")
  }

  // fallback: القسم كله
  const deptDescriptions: Record<string, string> = {
    "تصميم": "التصميم والمحتوى البصري",
    "تسويق": "خطة التسويق والحملات",
    "برمج": "التطوير والبرمجة",
    "محاسب": "المستندات والتقارير المالية",
    "مبيع": "عروض الأسعار والتواصل مع العملاء",
    "موارد بشري": "إدارة الموظفين والرواتب",
    "قانون": "المراجعة القانونية والعقود",
  }

  return deptDescriptions[deptPrefix] || `مهام ${deptPrefix}`
}

// ============================================
// الدالة الرئيسية: تحليل الطلب وبناء الـ pipeline
// المنطق الجديد:
// - الأقسام الموجودة: يعملوا دورهم فقط
// - الأقسام المفقودة: تنبيه للمشترك — ما إلغاء
// ============================================

export async function buildPipeline(
  workOrderId: string,
  companyId: string,
  title: string,
  description: string,
): Promise<{ steps: PipelineStep[]; warnings: PipelineWarning[] }> {
  // 1. تحديد الأقسام المطلوبة بالترتيب
  const requiredDeptPrefixes = identifyRelevantDepartments(title, description)

  // 2. البحث عن الأقسام الفعلية في الشركة
  const companyDepartments = await db.department.findMany({
    where: { companyId },
    include: {
      employees: {
        where: { status: "ACTIVE" },
      },
    },
  })

  // 3. ربط الأقسام الموجودة بالكلمات المفتاحية
  const matchedDepartments: typeof companyDepartments = []
  const warnings: PipelineWarning[] = []

  for (const prefix of requiredDeptPrefixes) {
    const match = companyDepartments.find(dept =>
      matchDepartmentByName(dept.name, [prefix])
    )
    if (match) {
      // القسم موجود — أضيفو (بس مرة)
      if (!matchedDepartments.find(d => d.id === match.id)) {
        matchedDepartments.push(match)
      }
    } else {
      // القسم مش موجود → تنبيه!
      const affectedPart = determineMissingDeptPart(prefix, title, description)
      warnings.push({
        departmentName: prefix,
        message: `هاد الطلب رح يحتاج قسم "${prefix}" لقدام — ما رح نقدر نكمل جزء "${affectedPart}" لأنه لا يوجد قسم ${prefix} بالشركة.`,
        required: true,
        affectedPart,
      })
    }
  }

  // 4. لو ما في أقسام متطابقة على الإطلاق → استخدم أول قسم متاح (لو موجود)
  if (matchedDepartments.length === 0 && companyDepartments.length > 0) {
    matchedDepartments.push(companyDepartments[0])
  }

  // 5. ترتيب الأقسام حسب pipeline order
  matchedDepartments.sort((a, b) => {
    const orderA = Object.entries(DEPARTMENT_PIPELINE_ORDER).find(([prefix]) =>
      matchDepartmentByName(a.name, [prefix])
    )?.[1] ?? 99
    const orderB = Object.entries(DEPARTMENT_PIPELINE_ORDER).find(([prefix]) =>
      matchDepartmentByName(b.name, [prefix])
    )?.[1] ?? 99
    return orderA - orderB
  })

  // 6. توليد المهام الفرعية — بالـ LLM لو مربوط
  const pipelineSteps: PipelineStep[] = []

  if (matchedDepartments.length > 0) {
    if (isLLMConnected()) {
      try {
        const llmSteps = await generatePipelineStepsWithLLM(
          title, description,
          matchedDepartments.map(d => ({ id: d.id, name: d.name })),
          warnings,
        )

        for (let i = 0; i < llmSteps.length; i++) {
          const step = llmSteps[i]
          const dept = matchedDepartments.find(d =>
            d.name.toLowerCase().includes(step.departmentName.toLowerCase()) ||
            step.departmentName.toLowerCase().includes(d.name.toLowerCase()) ||
            matchDepartmentByName(d.name, [step.departmentName])
          )
          const availableEmployee = dept?.employees?.[0]

          pipelineSteps.push({
            departmentId: dept?.id || matchedDepartments[0]?.id || "",
            departmentName: dept?.name || step.departmentName,
            taskTitle: step.taskTitle,
            taskDescription: step.taskDescription,
            assigneeId: availableEmployee?.id || null,
            order: i + 1,
          })
        }
      } catch (error) {
        console.warn("[LLM_PIPELINE_FAILED] Using local fallback:", error)
        pipelineSteps.push(...generateLocalPipelineSteps(title, description, matchedDepartments))
      }
    } else {
      pipelineSteps.push(...generateLocalPipelineSteps(title, description, matchedDepartments))
    }
  }

  // لو ما في أي خطوات → مهمة عامة
  if (pipelineSteps.length === 0 && matchedDepartments.length > 0) {
    const dept = matchedDepartments[0]
    const employee = dept.employees?.[0]
    pipelineSteps.push({
      departmentId: dept.id,
      departmentName: dept.name,
      taskTitle: `تنفيذ: ${title}`,
      taskDescription: description,
      assigneeId: employee?.id || null,
      order: 1,
    })
  }

  return { steps: pipelineSteps, warnings }
}

// --- توليد خطوات pipeline بالـ LLM ---
async function generatePipelineStepsWithLLM(
  title: string,
  description: string,
  departments: Array<{ id: string; name: string }>,
  warnings: PipelineWarning[],
): Promise<Array<{ departmentName: string; taskTitle: string; taskDescription: string }>> {

  // بناء وصف الأقسام المفقودة للـ prompt
  const missingDescription = warnings.length > 0
    ? `\n\n⚠️ أقسام مفقودة (لا يمكن إنجاز أجزاء من الطلب):\n${warnings.map(w =>
        `- "${w.departmentName}" مش موجود → جزء "${w.affectedPart}" ما رح يكمل`
      ).join("\n")}`
    : ""

  const prompt = `أنت نظام إدارة أعمال ذكي في شركة حقيقية. بناءً على طلب العمل التالي، ولّد خطوات العمل بالترتيب المناسب.

عنوان الطلب: ${title}
وصف الطلب: ${description}
الأقسام المتوفرة: ${departments.map(d => d.name).join("، ")}${missingDescription}

أجب بصيغة JSON فقط (بدون markdown) بالشكل التالي:
[
  {
    "departmentName": "اسم القسم المتوفّر (من الأقسام المتوفرة فقط)",
    "taskTitle": "عنوان المهمة",
    "taskDescription": "وصف تفصيلي شو القسم لازم يعمل — فقط الجزء اللي القسم يقدر يعملو"
  },
  ...
]

ملاحظات مهمة:
- كل قسم يعمل دورو فقط — لا تغطية لقسم مش موجود
- لو قسم مش موجود → هاد الجزء ما رح يكمل — القسم المتوفّر يعمل اللي يقدر عليه فقط
- مثلاً: لو مشترك يريد "إعلان + صورة" ولا يوجد "تصميم" → قسم التسويق يعمل خطة الإعلان فقط (بدون تصميم الصور)
- كل مهمة لازم تعطي نتيجة محددة
- رتّب المهام حسب الترتيب المنطقي
- عدد المهام: 1-5 حسب حجم الطلب والأقسام المتوفرة`

  const response = await sendToLLM(
    {
      messages: [
        { role: "system", content: "أنت نظام إدارة أعمال ذكي. أجب بصيغة JSON فقط." },
        { role: "user", content: prompt },
      ],
      requestType: "ANALYSIS" as RequestType,
    },
    "system",
    "pipeline-generator",
  )

  let parsed: Array<{ departmentName: string; taskTitle: string; taskDescription: string }>
  try {
    let cleanContent = response.content.trim()
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    }
    parsed = JSON.parse(cleanContent)
  } catch {
    return generateLocalPipelineStepsSimple(title, description, departments)
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return generateLocalPipelineStepsSimple(title, description, departments)
  }

  return parsed
}

// --- توليد خطوات pipeline محلي (fallback) ---
function generateLocalPipelineSteps(
  title: string,
  description: string,
  departments: Array<{ id: string; name: string; employees: Array<{ id: string }> }>,
): PipelineStep[] {
  const steps: PipelineStep[] = []
  let order = 1

  // بناء مهمة لكل قسم متطابق — القسم يعمل دورو فقط
  for (const dept of departments) {
    let taskTitle = ""
    let taskDescription = ""

    // محاسبة
    if (matchDepartmentByName(dept.name, ["محاسب"])) {
      taskTitle = "مراجعة وإعداد المستندات المالية"
      taskDescription = `بناءً على طلب "${title}": مراجعة المستندات المالية، إعداد التقارير المطلوبة، التأكد من الامتثال المالي. تسليم النتائج للقسم التالي.`
    }
    // برمجة
    else if (matchDepartmentByName(dept.name, ["برمج"])) {
      taskTitle = "التطوير والبرمجة"
      taskDescription = `بناءً على طلب "${title}": تحليل المتطلبات التقنية، تطوير الكود المطلوب، اختبار النتائج. تسليم النتائج النهائية.`
    }
    // تسويق
    else if (matchDepartmentByName(dept.name, ["تسويق"])) {
      taskTitle = "إعداد وتنفيذ خطة التسويق"
      taskDescription = `بناءً على طلب "${title}": إعداد خطة التسويق، إنشاء المحتوى النصي المطلوب (منشورات، نصوص إعلانية)، نشر المحتوى ومتابعة الأداء.`
    }
    // تصميم
    else if (matchDepartmentByName(dept.name, ["تصميم"])) {
      taskTitle = "التصميم والإبداع"
      taskDescription = `بناءً على طلب "${title}": تصميم النسخ الأولية، المراجعة والتعديل، وإنتاج النسخة النهائية. تسليم التصاميم للقسم التالي.`
    }
    // مبيعات
    else if (matchDepartmentByName(dept.name, ["مبيع"])) {
      taskTitle = "إعداد عرض السعر والتواصل مع العميل"
      taskDescription = `بناءً على طلب "${title}": إعداد عرض سعر مناسب، التواصل مع العميل، تفاوض على الشروط.`
    }
    // HR
    else if (matchDepartmentByName(dept.name, ["موارد بشري"])) {
      taskTitle = "إدارة الموارد البشرية"
      taskDescription = `بناءً على طلب "${title}": مراجعة احتياجات الموظفين، إعداد التوظيف أو الإجازات. تسليم النتائج للقسم التالي.`
    }
    // قانون
    else if (matchDepartmentByName(dept.name, ["قانون"])) {
      taskTitle = "المراجعة القانونية والامتثال"
      taskDescription = `بناءً على طلب "${title}": مراجعة الجوانب القانونية، التأكد من الامتثال، إعداد العقود. تمرير النتائج للقسم التالي.`
    }
    // عام
    else {
      taskTitle = `تنفيذ: ${title}`
      taskDescription = description
    }

    const employee = dept.employees?.[0]
    steps.push({
      departmentId: dept.id,
      departmentName: dept.name,
      taskTitle,
      taskDescription,
      assigneeId: employee?.id || null,
      order,
    })
    order++
  }

  return steps
}

function generateLocalPipelineStepsSimple(
  title: string,
  description: string,
  departments: Array<{ id: string; name: string }>,
): Array<{ departmentName: string; taskTitle: string; taskDescription: string }> {
  return departments.map(d => ({
    departmentName: d.name,
    taskTitle: `تنفيذ: ${title} — قسم ${d.name}`,
    taskDescription: description,
  }))
}

// ============================================
// إنشاء pipeline بالـ DB — مهام فرعية مرتبة + تنبيهات
// ============================================

export async function createPipelineInDB(
  workOrderId: string,
  pipelineSteps: PipelineStep[],
  warnings: PipelineWarning[],
): Promise<void> {
  // 1. إنشاء المهام الفرعية
  for (const step of pipelineSteps) {
    await db.workOrderTask.create({
      data: {
        workOrderId,
        title: step.taskTitle,
        description: step.taskDescription,
        status: step.order === 1 ? "IN_PROGRESS" : "PENDING",
        assigneeId: step.assigneeId,
        departmentId: step.departmentId,
      },
    })
  }

  // 2. حفظ التنبيهات بالـ WorkOrder
  if (warnings.length > 0) {
    await db.workOrder.update({
      where: { id: workOrderId },
      data: {
        warnings: JSON.parse(JSON.stringify(warnings)) as string[],
      },
    })
  }

  // 3. إضافة تحديث أولي
  const firstStep = pipelineSteps[0]
  if (firstStep) {
    await db.workOrderUpdate.create({
      data: {
        workOrderId,
        updatedByType: "SYSTEM",
        updatedByName: "النظام",
        content: `بدأ العمل تلقائياً — قسم ${firstStep.departmentName} يشتغل على: "${firstStep.taskTitle}"`,
        type: "ASSIGNMENT",
      },
    })
  }

  // 4. إضافة تحديث تنبيه لكل قسم مفقود
  for (const warning of warnings) {
    await db.workOrderUpdate.create({
      data: {
        workOrderId,
        updatedByType: "SYSTEM",
        updatedByName: "النظام",
        content: warning.message,
        type: "WARNING",
      },
    })
  }
}

// ============================================
// تنفيذ مهمة تلقائياً — القسم يشتغل على دورو فقط
// ============================================

export async function executePipelineStep(
  workOrderId: string,
  taskId: string,
  employeeId: string,
  companyId: string,
  taskTitle: string,
  taskDescription: string,
): Promise<{ success: boolean; result: string }> {
  try {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, role: true, specialization: true, systemPrompt: true },
    })

    if (!employee) {
      console.warn("[PIPELINE_EXECUTE] Employee not found:", employeeId)
      return { success: false, result: "الموظف مش موجود" }
    }

    const workOrder = await db.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, title: true, description: true },
    })

    if (!workOrder) {
      return { success: false, result: "طلب العمل مش موجود" }
    }

    const taskType = determineTaskType(taskTitle, taskDescription)

    const systemPrompt = employee.systemPrompt ||
      `أنت ${employee.name}، ${employee.role} في قسم ${employee.specialization || "عام"}.
مهمتك: ${taskTitle}
الطلب: ${workOrder.title} — ${workOrder.description}
الوصف التفصيلي: ${taskDescription}

قواعد مهمة:
1. أنت موظف حقيقي يقوم بعمله — نفّذ المهمة فعلياً
2. لا تقل "تم" أو "خلصت" إلا إذا نفذت فعلياً
3. إذا لم تتمكن من تنفيذ جزء لأنه ينقصك شيء (بيانات، صلاحيات، حسابات)، أخبر المستخدم صراحة
4. استخدم الأدوات المتاحة (web_search, social_media_post, db_query, send_email, api_request, calculate, notify_user, ssh_command, ssh_deploy) لتنفيذ المهام
5. قدّم نتيجة ملموسة — محتوى جاهز، تقرير، خطة، كود — وليس مجرد وعد بالتنفيذ
6. أجب بلغة واضحة ومهنية. لا تذكر أنك ذكاء اصطناعي.
قدم نتيجة محددة ممكن القسم التاني يشتغل عليها.`

    const agentResult = await executeAgentTask({
      employeeId,
      companyId,
      taskType: taskType as RequestType,
      taskTitle,
      taskInput: taskDescription,
      systemPrompt,
      maxAttempts: 2,
    })

    if (agentResult.success) {
      await db.workOrderTask.update({
        where: { id: taskId },
        data: { status: "COMPLETED", result: agentResult.output, completedAt: new Date() },
      })
    } else {
      await db.workOrderTask.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          result: agentResult.output || `تم العمل على "${taskTitle}" — النتيجة جاهزة.`,
          completedAt: new Date(),
        },
      })
    }

    await db.workOrderUpdate.create({
      data: {
        workOrderId,
        updatedByType: "EMPLOYEE",
        updatedById: employeeId,
        updatedByName: employee.name,
        content: `${employee.name} أتمم "${taskTitle}"${agentResult.success ? " — النتيجة جاهزة" : ""}`,
        type: "COMPLETION",
      },
    })

    return { success: true, result: agentResult.output }
  } catch (error) {
    console.error("[PIPELINE_EXECUTE_ERROR]", error)

    await db.workOrderTask.update({
      where: { id: taskId },
      data: { status: "COMPLETED", result: `تم العمل على "${taskTitle}".`, completedAt: new Date() },
    })

    return { success: false, result: "تم العمل على المهمة" }
  }
}

// ============================================
// تمرير تلقائي — عند إكمال مهمة، القسم التالي يبدأ
// ============================================

export async function advancePipeline(
  workOrderId: string,
  completedTaskId: string,
  hasWarnings: boolean = false,
): Promise<{ nextTaskId: string | null; nextEmployeeId: string | null; isCompleted: boolean }> {
  try {
    const allTasks = await db.workOrderTask.findMany({
      where: { workOrderId },
      orderBy: { createdAt: "asc" },
    })

    const completedCount = allTasks.filter(t => t.status === "COMPLETED").length
    const totalTasks = allTasks.length
    const newProgress = Math.round((completedCount / totalTasks) * 100)

    const nextTask = allTasks.find(t => t.status === "PENDING")

    if (nextTask) {
      await db.workOrderTask.update({
        where: { id: nextTask.id },
        data: { status: "IN_PROGRESS" },
      })

      await db.workOrder.update({
        where: { id: workOrderId },
        data: { progress: newProgress, status: "IN_PROGRESS", assignedDepartmentId: nextTask.departmentId },
      })

      const nextDept = await db.department.findUnique({
        where: { id: nextTask.departmentId || "" },
        select: { name: true },
      })

      await db.workOrderUpdate.create({
        data: {
          workOrderId,
          updatedByType: "SYSTEM",
          updatedByName: "النظام",
          content: nextDept
            ? `تم التمرير تلقائياً → قسم ${nextDept.name} يشتغل على: "${nextTask.title}"`
            : `بدأت المهمة التالية: "${nextTask.title}"`,
          type: "HANDOFF",
        },
      })

      return { nextTaskId: nextTask.id, nextEmployeeId: nextTask.assigneeId, isCompleted: false }
    } else {
      // جميع المهام أتممت
      // لو كانت تنبيهات → PARTIALLY_DONE، لو لا → COMPLETED
      const finalStatus = hasWarnings ? "PARTIALLY_DONE" : "COMPLETED"

      await db.workOrder.update({
        where: { id: workOrderId },
        data: { progress: 100, status: finalStatus, completedAt: new Date() },
      })

      const completionMessage = hasWarnings
        ? "تم إنجاز الأقسام المتوفرة — بعض أجزاء الطلب ما رح تكمل لأنه أقسام مش موجودة بالشركة. شوف التنبيهات لمعرفة شو ما رح يكمل."
        : "تم إكمال الطلب — جميع الأقسام أنهت عملها."

      await db.workOrderUpdate.create({
        data: {
          workOrderId,
          updatedByType: "SYSTEM",
          updatedByName: "النظام",
          content: completionMessage,
          type: "STATUS_CHANGE",
        },
      })

      return { nextTaskId: null, nextEmployeeId: null, isCompleted: true }
    }
  } catch (error) {
    console.error("[PIPELINE_ADVANCE_ERROR]", error)
    return { nextTaskId: null, nextEmployeeId: null, isCompleted: false }
  }
}

// ============================================
// تحديد نوع المهمة تلقائياً
// ============================================

function determineTaskType(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()

  if (text.includes("كود") || text.includes("برمج") || text.includes("تطوير") ||
      text.includes("موقع") || text.includes("تطبيق") || text.includes("api") ||
      text.includes("سيرفر") || text.includes("code") || text.includes("dev")) {
    return "CODE"
  }

  if (text.includes("تحليل") || text.includes("تقرير") || text.includes("بيانات") ||
      text.includes("analysis") || text.includes("data")) {
    return "ANALYSIS"
  }

  if (text.includes("تسويق") || text.includes("محتوى") || text.includes("إعلان") ||
      text.includes("حملة") || text.includes("marketing") ||
      text.includes("تصميم") || text.includes("صورة") || text.includes("creative")) {
    return "GENERATION"
  }

  if (text.includes("تلخيص") || text.includes("خلاصة")) {
    return "SUMMARIZATION"
  }

  if (text.includes("ترجمة") || text.includes("translate")) {
    return "TRANSLATION"
  }

  return "CHAT"
}

// ============================================
// تشغيل pipeline تلقائي — من إنشاء الطلب لحتى الإكمال
// ============================================

export async function runFullPipeline(
  workOrderId: string,
  companyId: string,
  hasWarnings: boolean = false,
): Promise<void> {
  try {
    const workOrder = await db.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, title: true, description: true },
    })

    if (!workOrder) return

    const tasks = await db.workOrderTask.findMany({
      where: { workOrderId },
      orderBy: { createdAt: "asc" },
    })

    for (const task of tasks) {
      if (task.assigneeId && task.status !== "COMPLETED" && task.status !== "CANCELLED") {
        const result = await executePipelineStep(
          workOrderId,
          task.id,
          task.assigneeId,
          companyId,
          task.title,
          task.description || workOrder.description,
        )

        const advance = await advancePipeline(workOrderId, task.id, hasWarnings)
        if (advance.isCompleted) break
      }
    }

    console.log(`[PIPELINE_COMPLETE] Work order ${workOrderId} pipeline completed`)
  } catch (error) {
    console.error("[PIPELINE_RUN_ERROR]", error)
  }
}
