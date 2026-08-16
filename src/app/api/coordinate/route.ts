// ============================================
// API: المنسق الذكي (Coordinator)
//
// قبل ما الموظفين يردو على رسالة المستخدم،
// المنسق بيدرس الرسالة وبقرر مين الأفضل يرد
//
// المنطق:
// 1. إذا موظف واحد بس → هو يرد
// 2. إذا نادى المستخدم موظف واحد فقط بالاسم → هو بس يرد
// 3. إذا أسماء متعددة بالرسالة (مثل "مين أحسن أحمد ولا خالد") →
//    المنسق الذكي يقرر مين المخاطَب ومين المذكور
// 4. إذا ما نادى حد بالاسم → المنسق يقرر مين الأفضل
//
// الهدف: بدل سباق "أنا بقدر اخدمك"، المنسق يختار الأنسب
// + التفريق بين "نِداء" و"ذِكر"
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { sendToLLM } from "@/lib/llm-service"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { getAuthCompanyId, requireCompanyAccess, requireRole } from "@/lib/tenant"

interface EmployeeInfo {
  id: string
  name: string
  role: string
  specialization?: string
  departmentName?: string
}

export async function POST(request: NextRequest) {
  try {
    // === التحقق من الصلاحية ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const companyId = authPayload.companyId
    const { message, employees, departmentName } = body as {
      message: string
      employees: EmployeeInfo[]
      companyId: string
      departmentName?: string
    }

    if (!message || !employees || employees.length === 0) {
      return NextResponse.json({ error: "الرسالة والموظفين مطلوبين" }, { status: 400 })
    }

    // ============================================
    // الخطوة 1: إذا موظف واحد بس → هو يرد
    // ============================================
    if (employees.length === 1) {
      return NextResponse.json({
        selectedEmployees: [employees[0].id],
        reason: "موظف واحد متاح",
        coordinationType: "SINGLE_EMPLOYEE",
      })
    }

    // ============================================
    // الخطوة 2: فحص الأسماء المذكورة
    //
    // مهم: نفرّق بين "نِداء" و"ذِكر"
    // - نِداء: المستخدم يخاطب الموظف (مثل "أحمد كيف حالك؟")
    // - ذِكر: المستخدم يذكر اسم الموظف بالكلام (مثل "مين أحسن أحمد ولا خالد؟")
    //
    // إذا اسم واحد بس → نِداء → هو يرد
    // إذا أسماء متعددة → المنسق الذكي يقرر
    // ============================================
    const mentionedNames = findAllMentionedNames(message, employees)

    if (mentionedNames.length === 1) {
      // اسم واحد بس → المستخدم ناداه → هو يرد
      return NextResponse.json({
        selectedEmployees: [mentionedNames[0].id],
        reason: `المستخدم نادى ${mentionedNames[0].name} بالاسم`,
        coordinationType: "DIRECT_MENTION",
      })
    }

    // إذا أسماء متعددة أو ما في اسم → المنسق الذكي يقرر
    // أسماء متعددة = مثل "مين أحسن أحمد ولا خالد" → المنسق يفهم السياق
    const coordinationResult = await coordinateWithLLM(
      message,
      employees,
      companyId,
      departmentName,
      mentionedNames, // نمرر الأسماء المذكورة عشان المنسق يفهم السياق
    )

    return NextResponse.json(coordinationResult)
  } catch (error) {
    console.error("[COORDINATE_ERROR]", error)
    // في حالة الخطأ → نختار أول موظف (fallback آمن)
    return NextResponse.json({
      selectedEmployees: [],
      reason: "خطأ في التنسيق",
      coordinationType: "FALLBACK",
    })
  }
}

// ============================================
// البحث عن كل الأسماء المذكورة في رسالة المستخدم
// يدعم: الأسماء العربية والإنجليزية + التحويل بينهم
// ============================================

// خريطة تحويل الأسماء العربية ↔ الإنجليزية الشائعة
const ARABIC_ENGLISH_NAMES: Record<string, string[]> = {
  // أحمد
  "احمد": ["ahmad", "ahmed", "ahemd"],
  "أحمد": ["ahmad", "ahmed", "ahemd"],
  // محمد
  "محمد": ["mohammad", "mohammed", "mohamed", "muhammad"],
  // خالد
  "خالد": ["khaled", "khalid", "khaled"],
  // سارة
  "سارة": ["sara", "sarah"],
  // فاطمة
  "فاطمة": ["fatima", "fatma"],
  // عمر
  "عمر": ["omar", "omer"],
  // يوسف
  "يوسف": ["yousef", "yusuf", "yousuf"],
  // علي
  "علي": ["ali"],
  // حسن
  "حسن": ["hassan", "hasan"],
  // إبراهيم
  "إبراهيم": ["ibrahim", "ibrahim", "ebrahim"],
  "ابراهيم": ["ibrahim", "ibrahim", "ebrahim"],
  // نور
  "نور": ["nour", "noor"],
  // ليلى
  "ليلى": ["layla", "laila", "leila"],
  // ريم
  "ريم": ["reem", "rim"],
  // حسين
  "حسين": ["hussein", "hussain", "husein"],
  // مريم
  "مريم": ["maryam", "mariam"],
  // عبدالله
  "عبدالله": ["abdullah", "abdallah"],
  // ناصر
  "ناصر": ["nasser", "naser"],
  // فيصل
  "فيصل": ["faisal", "faisal", "fesal"],
  // سلطان
  "سلطان": ["sultan"],
}

// بناء خريطة عكسية: إنجليزي → عربي
const ENGLISH_ARABIC_NAMES: Record<string, string[]> = {}
for (const [arName, enNames] of Object.entries(ARABIC_ENGLISH_NAMES)) {
  for (const enName of enNames) {
    if (!ENGLISH_ARABIC_NAMES[enName]) ENGLISH_ARABIC_NAMES[enName] = []
    if (!ENGLISH_ARABIC_NAMES[enName].includes(arName)) ENGLISH_ARABIC_NAMES[enName].push(arName)
  }
}

function findAllMentionedNames(message: string, employees: EmployeeInfo[]): EmployeeInfo[] {
  const msgLower = message.toLowerCase().trim()
  const found: EmployeeInfo[] = []
  const foundIds = new Set<string>()

  for (const emp of employees) {
    const nameLower = emp.name.toLowerCase()
    const nameParts = emp.name.split(' ').filter(p => p.length > 2)

    // فحص الاسم الكامل (مطابقة مباشرة)
    if (msgLower.includes(nameLower)) {
      if (!foundIds.has(emp.id)) {
        found.push(emp)
        foundIds.add(emp.id)
      }
      continue
    }

    // فحص أجزاء الاسم (الاسم الأول، الأخير...)
    let matched = false
    for (const part of nameParts) {
      if (msgLower.includes(part.toLowerCase())) {
        if (!foundIds.has(emp.id)) {
          found.push(emp)
          foundIds.add(emp.id)
        }
        matched = true
        break
      }
    }
    if (matched) continue

    // ============================================
    // فحص التحويل العربي ↔ إنجليزي
    // إذا الموظف اسمه "ahmad" والمستخدم كتب "احمد"
    // أو العكس: الموظف اسمه "خالد" والمستخدم كتب "khaled"
    // ============================================
    const empNameLower = emp.name.toLowerCase()

    // تحقق: هل اسم الموظف بالإنجليزي؟ → ابحث عن المقابل العربي
    if (ENGLISH_ARABIC_NAMES[empNameLower]) {
      for (const arName of ENGLISH_ARABIC_NAMES[empNameLower]) {
        if (msgLower.includes(arName.toLowerCase())) {
          if (!foundIds.has(emp.id)) {
            found.push(emp)
            foundIds.add(emp.id)
          }
          matched = true
          break
        }
      }
    }
    if (matched) continue

    // تحقق: هل اسم الموظف بالعربي؟ → ابحث عن المقابل الإنجليزي
    if (ARABIC_ENGLISH_NAMES[empNameLower] || ARABIC_ENGLISH_NAMES[emp.name]) {
      const equivalents = ARABIC_ENGLISH_NAMES[empNameLower] || ARABIC_ENGLISH_NAMES[emp.name] || []
      for (const enName of equivalents) {
        if (msgLower.includes(enName.toLowerCase())) {
          if (!foundIds.has(emp.id)) {
            found.push(emp)
            foundIds.add(emp.id)
          }
          matched = true
          break
        }
      }
    }
    if (matched) continue

    // فحص كل جزء من اسم الموظف مع التحويل
    for (const part of nameParts) {
      const partLower = part.toLowerCase()
      // إنجليزي → عربي
      if (ENGLISH_ARABIC_NAMES[partLower]) {
        for (const arName of ENGLISH_ARABIC_NAMES[partLower]) {
          if (msgLower.includes(arName.toLowerCase())) {
            if (!foundIds.has(emp.id)) {
              found.push(emp)
              foundIds.add(emp.id)
            }
            matched = true
            break
          }
        }
      }
      if (matched) break
      // عربي → إنجليزي
      if (ARABIC_ENGLISH_NAMES[partLower] || ARABIC_ENGLISH_NAMES[part]) {
        const eqs = ARABIC_ENGLISH_NAMES[partLower] || ARABIC_ENGLISH_NAMES[part] || []
        for (const enName of eqs) {
          if (msgLower.includes(enName.toLowerCase())) {
            if (!foundIds.has(emp.id)) {
              found.push(emp)
              foundIds.add(emp.id)
            }
            matched = true
            break
          }
        }
      }
      if (matched) break
    }
  }

  return found
}

// ============================================
// المنسق الذكي — يستخدم LLM لاختيار الأنسب
// ============================================
async function coordinateWithLLM(
  userMessage: string,
  employees: EmployeeInfo[],
  companyId: string,
  departmentName?: string,
  mentionedNames?: EmployeeInfo[],
): Promise<{
  selectedEmployees: string[]
  reason: string
  coordinationType: string
}> {
  // بناء قائمة الموظفين المتاحين مع تخصصاتهم
  const employeeList = employees.map((emp, idx) => 
    `${idx + 1}. ${emp.name} — ${emp.role} (ID: ${emp.id})${emp.specialization ? ` | تخصص: ${emp.specialization}` : ''}${emp.departmentName ? ` | قسم: ${emp.departmentName}` : ''}`
  ).join('\n')

  // معلومات عن الأسماء المذكورة
  const mentionedInfo = mentionedNames && mentionedNames.length > 0
    ? `\n\nالأسماء المذكورة في الرسالة: ${mentionedNames.map(n => n.name).join('، ')}\nملاحظة مهمة: ذكر اسم موظف في الرسالة لا يعني بالضرورة أن المستخدم يناديه. مثلاً "مين أحسن أحمد ولا خالد؟" المستخدم يسأل أحمد عن خالد — لا يخاطب خالد.`
    : ''

  const systemPrompt = `أنت منسق ذكي في شركة. مهمتك: تحليل رسالة المستخدم واختيار الموظف الأنسب للرد.

القواعد الصارمة:
1. اختر موظف واحد فقط — الأنسب للرد على الرسالة
2. الفرق بين "نِداء" و"ذِكر":
   - نِداء: المستخدم يخاطب الموظف مباشرة (مثل "أحمد كيف حالك؟" أو "يا خالد شلونك؟") → الموظف المُنادى يرد
   - ذِكر: المستخدم يذكر اسم الموظف ضمن الكلام (مثل "مين أحسن أحمد ولا خالد؟" أو "خالد قالي...") → الموظف المُخاطَب يرد، مش المذكور
3. إذا المستخدم يخاطب شخص بالاسم ويسأله عن شخص ثاني → الشخص المخاطَب يرد
4. إذا ما في نِداء واضح → اختر الأنسب حسب التخصص
5. اختيارك يجب أن يكون مبنياً على السياق الكامل للرسالة
6. أجب بتنسيق JSON فقط — بدون أي نص إضافي

الموظفون المتاحون:
${employeeList}
${departmentName ? `\nالقسم: ${departmentName}` : ''}
${mentionedInfo}

أجب بالتنسيق التالي:
{
  "selectedEmployeeId": "معرّف الموظف المختار",
  "reason": "سبب الاختيار باختصار",
  "confidence": 0.9
}

مهم: أجب بـ JSON فقط — بدون markdown أو backticks أو أي نص إضافي.`

  try {
    const response = await sendToLLM(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        requestType: "CHAT",
        model: "LIGHT" as any, // استخدام موديل خفيف — ما يحتاج موديل قوي للتنسيق
      },
      companyId,
      "coordinator", // معرّف وهمي للمنسق
    )

    // استخراج JSON من الرد
    const content = response.content.trim()
    
    // محاولة استخراج JSON
    let parsed: any
    try {
      // تنظيف الرد — إزالة markdown code blocks إذا موجودة
      const cleaned = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
      
      parsed = JSON.parse(cleaned)
    } catch {
      // إذا فشل parsing → نختار بناءً على كلمات مفتاحية
      return selectByKeywords(userMessage, employees, departmentName)
    }

    // التحقق من صحة البيانات
    const selectedId = parsed.selectedEmployeeId
    const selectedEmployee = employees.find(e => e.id === selectedId)

    if (selectedEmployee) {
      return {
        selectedEmployees: [selectedId],
        reason: parsed.reason || `تم اختيار ${selectedEmployee.name} بناءً على تخصصه`,
        coordinationType: "LLM_COORDINATED",
      }
    }

    // إذا الـ ID ما تطابق → fallback
    return selectByKeywords(userMessage, employees, departmentName)
  } catch (error) {
    console.error("[COORDINATE_LLM_ERROR]", error)
    // Fallback: اختيار بناءً على كلمات مفتاحية
    return selectByKeywords(userMessage, employees, departmentName)
  }
}

// ============================================
// اختيار بالكلمات المفتاحية — Fallback
// ============================================
function selectByKeywords(
  userMessage: string,
  employees: EmployeeInfo[],
  departmentName?: string,
): {
  selectedEmployees: string[]
  reason: string
  coordinationType: string
} {
  const msgLower = userMessage.toLowerCase()

  // كلمات مفتاحية لكل تخصص
  const keywordMap: Record<string, string[]> = {
    social: ["سوشيال", "منصات", "تواصل اجتماعي", "محتوى", "بوست", "انستغرام", "فيسبوك", "تويتر", "social", "media", "content", "post", "instagram"],
    hr: ["موارد بشرية", "توظيف", "موظفين", "رواتب", "إجازة", "hr", "human resources", "employee", "salary", "hire"],
    marketing: ["تسويق", "حملات", "إعلان", "عميل", "market", "campaign", "ad", "customer", "بروموشن"],
    sales: ["مبيعات", "بيع", "صفقة", "عقد", "sale", "deal", "contract", "مبيع"],
    tech: ["تقني", "برمج", "كود", "موقع", "تطبيق", "سيرفر", "tech", "code", "develop", "program", "app", "website", "bug", "خطأ تقني"],
    finance: ["مالي", "محاسب", "ميزانية", "فواتير", "ضريب", "finance", "account", "budget", "invoice", "tax", "مال"],
    design: ["تصميم", "جرافيك", "شعار", "لوجو", "design", "graphic", "logo", "صور", "فوتوشوب"],
    legal: ["قانون", "محام", "عقد", "legal", "lawyer", "contract", "حقوق"],
    support: ["دعم", "خدمة", "شكوى", "support", "service", "complaint", "مشكلة"],
  }

  // حساب نقاط لكل موظف
  const scores = employees.map(emp => {
    let score = 0
    const roleLower = emp.role.toLowerCase()
    const specLower = (emp.specialization || "").toLowerCase()
    const combined = `${roleLower} ${specLower}`

    // فحص كل فئة كلمات مفتاحية
    for (const [category, keywords] of Object.entries(keywordMap)) {
      const categoryMatches = keywords.filter(kw => msgLower.includes(kw)).length
      if (categoryMatches > 0) {
        // إذا دور الموظف يطابق الفئة
        if (combined.includes(category) || keywords.some(kw => combined.includes(kw))) {
          score += categoryMatches * 10
        }
      }
    }

    // نقاط إضافية إذا اسم القسم موجود بالرسالة
    if (departmentName && msgLower.includes(departmentName.toLowerCase())) {
      score += 5
    }

    return { employee: emp, score }
  })

  // ترتيب حسب النقاط
  scores.sort((a, b) => b.score - a.score)

  // إذا أعلى نقاط > 0 → نختار الأنسب
  if (scores[0].score > 0) {
    return {
      selectedEmployees: [scores[0].employee.id],
      reason: `تم اختيار ${scores[0].employee.name} بناءً على تخصصه (${scores[0].employee.role}) — الأنسب للرد`,
      coordinationType: "KEYWORD_MATCHED",
    }
  }

  // لو ما في تطابق → نختار الأول
  return {
    selectedEmployees: [employees[0].id],
    reason: `رسالة عامة — تم اختيار ${employees[0].name} (${employees[0].role})`,
    coordinationType: "GENERAL_FALLBACK",
  }
}
