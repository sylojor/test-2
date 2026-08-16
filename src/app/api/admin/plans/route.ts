// ============================================
// API: إدارة الخطط (صاحب المنصة) — Admin only
// GET  — جلب كل الخطط
// POST — إضافة خطة جديدة
// PATCH — تحديث خطة
// DELETE — حذف خطة
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

// --- جلب كل الخطط ---
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const plans = await db.planConfig.findMany({
      orderBy: { order: "asc" },
    })

    // لو ما في خطط بالداتابيز، سجّل الافتراضية
    if (plans.length === 0) {
      const defaultPlans = await seedDefaultPlans()
      return NextResponse.json({ plans: defaultPlans })
    }

    return NextResponse.json({ plans })
  } catch (error) {
    console.error("[GET_PLANS_ADMIN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}

// --- إضافة خطة جديدة ---
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { planKey, name, nameAr, price, tokenBudget, maxEmployees, maxDepartments, features, featuresEn, isActive, order } = body

    if (!planKey || !name || !nameAr) {
      return NextResponse.json({ error: "مفتاح الخطة والاسم مطلوبان" }, { status: 400 })
    }

    // تحقق من عدم وجود خطة بنفس المفتاح
    const existing = await db.planConfig.findUnique({ where: { planKey } })
    if (existing) {
      return NextResponse.json({ error: "مفتاح الخطة موجود بالفعل" }, { status: 400 })
    }

    const plan = await db.planConfig.create({
      data: {
        planKey,
        name,
        nameAr,
        price: price ?? 0,
        tokenBudget: tokenBudget ?? 500000,
        maxEmployees: maxEmployees ?? 2,
        maxDepartments: maxDepartments ?? 1,
        features: JSON.stringify(features ?? []),
        featuresEn: JSON.stringify(featuresEn ?? []),
        isActive: isActive ?? true,
        order: order ?? 0,
      },
    })

    return NextResponse.json({ plan, message: "تم إضافة الخطة" })
  } catch (error) {
    console.error("[POST_PLAN_ADMIN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}

// --- تحديث خطة ---
export async function PATCH(request: NextRequest) {
  try {
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { id, data } = body

    if (!id || !data) {
      return NextResponse.json({ error: "المعرّف والبيانات مطلوبان" }, { status: 400 })
    }

    const updateData: Record<string, any> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr
    if (data.price !== undefined) updateData.price = data.price
    if (data.tokenBudget !== undefined) updateData.tokenBudget = data.tokenBudget
    if (data.maxEmployees !== undefined) updateData.maxEmployees = data.maxEmployees
    if (data.maxDepartments !== undefined) updateData.maxDepartments = data.maxDepartments
    if (data.features !== undefined) updateData.features = JSON.stringify(data.features)
    if (data.featuresEn !== undefined) updateData.featuresEn = JSON.stringify(data.featuresEn)
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.order !== undefined) updateData.order = data.order

    // لو بيتغيّر عدد الموظفين أو الأقسام، حدّث نص المميزات تلقائياً
    // (لو المستخدم ما عدّل المميزات يدوياً)
    if ((data.maxEmployees !== undefined || data.maxDepartments !== undefined) && data.features === undefined && data.featuresEn === undefined) {
      const currentPlan = await db.planConfig.findUnique({ where: { id } })
      if (currentPlan) {
        let arFeatures: string[] = []
        let enFeatures: string[] = []
        try { arFeatures = JSON.parse(currentPlan.features) } catch {}
        try { enFeatures = JSON.parse(currentPlan.featuresEn) } catch {}

        // حدّث نص الموظفين بالعربي
        if (data.maxEmployees !== undefined) {
          const count = data.maxEmployees
          const newAr = formatEmployeeCountAr(count)
          arFeatures = arFeatures.map(f => {
            if (/موظف/.test(f) && /(فقط)?$/.test(f.trim())) return newAr
            return f
          })
          const newEn = formatEmployeeCountEn(count)
          enFeatures = enFeatures.map(f => {
            if (/employee/i.test(f) && /(only)?$/.test(f.trim())) return newEn
            return f
          })
        }

        // حدّث نص الأقسام بالعربي
        if (data.maxDepartments !== undefined) {
          const count = data.maxDepartments
          const newAr = formatDeptCountAr(count)
          arFeatures = arFeatures.map(f => {
            if (/قسم/.test(f) && /(فقط)?$/.test(f.trim())) return newAr
            return f
          })
          const newEn = formatDeptCountEn(count)
          enFeatures = enFeatures.map(f => {
            if (/department/i.test(f) && /(only)?$/.test(f.trim())) return newEn
            return f
          })
        }

        updateData.features = JSON.stringify(arFeatures)
        updateData.featuresEn = JSON.stringify(enFeatures)
      }
    }

    const plan = await db.planConfig.update({
      where: { id },
      data: updateData,
    })

    // حدّث الشركات اللي على هالخطة
    if (data.tokenBudget !== undefined) {
      await db.company.updateMany({
        where: { subscription: plan.planKey },
        data: { tokenBudgetMonthly: data.tokenBudget },
      })
    }

    if (data.maxDepartments !== undefined) {
      await db.company.updateMany({
        where: { subscription: plan.planKey },
        data: { maxDepartments: data.maxDepartments },
      })
    }

    // حدّث كاش الموقع عشان التعديلات تظهر فوراً
    revalidatePath("/")
    revalidatePath("/api/plans")
    revalidatePath("/sitemap.xml")

    return NextResponse.json({ plan, message: "تم تحديث الخطة" })
  } catch (error) {
    console.error("[PATCH_PLAN_ADMIN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}

// --- حذف خطة ---
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "معرّف الخطة مطلوب" }, { status: 400 })
    }

    // تحقق من عدم وجود شركات على هالخطة
    const plan = await db.planConfig.findUnique({ where: { id } })
    if (!plan) {
      return NextResponse.json({ error: "الخطة غير موجودة" }, { status: 404 })
    }

    const companiesOnPlan = await db.company.count({
      where: { subscription: plan.planKey },
    })

    if (companiesOnPlan > 0) {
      return NextResponse.json({
        error: `لا يمكن حذف الخطة — يوجد ${companiesOnPlan} شركة مشتركة بها`,
      }, { status: 400 })
    }

    await db.planConfig.delete({ where: { id } })

    return NextResponse.json({ message: "تم حذف الخطة" })
  } catch (error) {
    console.error("[DELETE_PLAN_ADMIN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}

// --- تسجيل الخطط الافتراضية ---
async function seedDefaultPlans() {
  const defaults = [
    {
      planKey: "FREE_TRIAL",
      name: "Free Trial",
      nameAr: "تجربة مجانية",
      price: 0,
      tokenBudget: 500000,
      maxEmployees: 2,
      maxDepartments: 1,
      features: ["500K توكن شهرياً", "قسم واحد فقط", "موظفين اثنين فقط", "محادثة مباشرة مع الموظف", "دعم كل اللهجات"],
      featuresEn: ["500K tokens/month", "1 department only", "2 employees only", "Direct chat with employees", "All dialects supported"],
      isActive: true,
      order: 0,
    },
    {
      planKey: "STARTER",
      name: "Starter",
      nameAr: "أساسي",
      price: 29,
      tokenBudget: 3000000,
      maxEmployees: 5,
      maxDepartments: 3,
      features: ["3M توكن شهرياً", "3 أقسام", "5 موظفين", "محادثة بين الموظفين", "أقسام ومشاريع", "شحن توكنات إضافية"],
      featuresEn: ["3M tokens/month", "3 departments", "5 employees", "Employee cross-chat", "Departments & Projects", "Extra token top-ups"],
      isActive: true,
      order: 1,
    },
    {
      planKey: "PROFESSIONAL",
      name: "Professional",
      nameAr: "احترافي",
      price: 79,
      tokenBudget: 15000000,
      maxEmployees: 15,
      maxDepartments: 10,
      features: ["15M توكن شهرياً", "10 أقسام", "15 موظف", "محادثة بين الأقسام", "رفع ملفات وطلبات", "تقارير متقدمة", "شحن توكنات إضافية"],
      featuresEn: ["15M tokens/month", "10 departments", "15 employees", "Cross-department chat", "File uploads & requests", "Advanced reports", "Extra token top-ups"],
      isActive: true,
      order: 2,
    },
    {
      planKey: "ENTERPRISE",
      name: "Enterprise",
      nameAr: "مؤسسي",
      price: 199,
      tokenBudget: 50000000,
      maxEmployees: 999999,
      maxDepartments: 999999,
      features: ["50M توكن شهرياً", "أقسام غير محدودة", "موظفين غير محدودين", "كل الميزات", "أولوية بالدعم", "شحن توكنات إضافية بسعر مخفض"],
      featuresEn: ["50M tokens/month", "Unlimited departments", "Unlimited employees", "All features", "Priority support", "Discounted token top-ups"],
      isActive: true,
      order: 3,
    },
  ]

  const created = []
  for (const plan of defaults) {
    const p = await db.planConfig.create({
      data: {
        planKey: plan.planKey,
        name: plan.name,
        nameAr: plan.nameAr,
        price: plan.price,
        tokenBudget: plan.tokenBudget,
        maxEmployees: plan.maxEmployees,
        maxDepartments: plan.maxDepartments,
        features: JSON.stringify(plan.features),
        featuresEn: JSON.stringify(plan.featuresEn),
        isActive: plan.isActive,
        order: plan.order,
      },
    })
    created.push(p)
  }

  return created
}

// --- دوال مساعدة لتنسيق أعداد الموظفين والأقسام ---
const AR_NUMS: Record<number, string> = {
  1: "واحد", 2: "اثنين", 3: "ثلاثة", 4: "أربعة", 5: "خمسة",
  6: "ستة", 7: "سبعة", 8: "ثمانية", 9: "تسعة", 10: "عشرة",
  15: "خمسة عشر", 20: "عشرون",
}

function formatEmployeeCountAr(count: number): string {
  if (count >= 999999) return "موظفين غير محدودين"
  if (count === 1) return "موظف واحد فقط"
  const word = AR_NUMS[count] || String(count)
  return `موظفين ${word} فقط`
}

function formatEmployeeCountEn(count: number): string {
  if (count >= 999999) return "Unlimited employees"
  if (count === 1) return "1 employee only"
  return `${count} employees only`
}

function formatDeptCountAr(count: number): string {
  if (count >= 999999) return "أقسام غير محدودة"
  if (count === 1) return "قسم واحد فقط"
  const word = AR_NUMS[count] || String(count)
  return `${word} أقسام فقط`
}

function formatDeptCountEn(count: number): string {
  if (count >= 999999) return "Unlimited departments"
  if (count === 1) return "1 department only"
  return `${count} departments only`
}
