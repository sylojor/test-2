// @ts-nocheck
// ============================================
// API: إنشاء موظف جديد — النسخة الذكية
// POST /api/employees
// 
// المسار: صاحب الشركة يرسل اسم + مسمى وظيفي + تخصص (حرّ — أي تخصص يريده) + قسم
// القيود:
// - لازم يحدد تخصص واحد فقط (أي تخصص يريده المستخدم — مش محكوم بقائمة)
// - لازم يكون مربوط بقسم
// - ما يتجاوز عدد الموظفين المسموح بالاشتراك
// - موظف واحد ما يعمل كل شي — كل موظف تخصص واحد فقط لا يتجاوزه
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateEmployee } from "@/lib/employee-generator"
import { generateEmployeeWithLLM } from "@/lib/employee-llm-generator"
import { getPlanFromDB } from "@/lib/plan-db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import type { Dialect, Tone, SubscriptionPlan } from "@/types"

export async function POST(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, role, roleDescription, companyId, departmentId, specialization, language } = body

    // --- التحقق من المدخلات ---
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "اسم الموظف مطلوب" },
        { status: 400 },
      )
    }

    if (!role || typeof role !== "string" || role.trim().length === 0) {
      return NextResponse.json(
        { error: "المسمى الوظيفي مطلوب" },
        { status: 400 },
      )
    }

    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { error: "معرّف الشركة مطلوب" },
        { status: 400 },
      )
    }

    // التخصص مطلوب!
    if (!specialization || typeof specialization !== "string" || specialization.trim().length === 0) {
      return NextResponse.json(
        { error: "التخصص مطلوب — كل موظف لازم يكون عندو تخصص واحد فقط" },
        { status: 400 },
      )
    }

    // القسم مطلوب!
    if (!departmentId || typeof departmentId !== "string") {
      return NextResponse.json(
        { error: "القسم مطلوب — لازم الموظف يكون مربوط بقسم" },
        { status: 400 },
      )
    }

    // --- جلب بيانات الشركة ---
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        employees: { where: { status: { in: ["SETUP", "ACTIVE", "AWAITING_APPROVAL"] } } },
        departments: true,
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: "الشركة غير موجودة" },
        { status: 404 },
      )
    }

    // --- التحقق من حدود الاشتراك ---
    const planInfo = await getPlanFromDB(company.subscription)
    
    // تحقق من عدد الموظفين
    if (planInfo && company.employees.length >= planInfo.maxEmployees) {
      return NextResponse.json(
        { 
          error: `وصلت للحد الأقصى من الموظفين (${planInfo.maxEmployees}) بخطتك الحالية (${planInfo.nameAr}). بدك ترقي خطتك عشان تضيف موظفين أكتر.`,
          code: "EMPLOYEE_LIMIT_REACHED",
          currentPlan: company.subscription,
          maxEmployees: planInfo.maxEmployees,
        },
        { status: 403 },
      )
    }

    // تحقق من وجود القسم
    const department = company.departments.find(d => d.id === departmentId)
    if (!department) {
      return NextResponse.json(
        { error: "القسم المحدد غير موجود — اختار قسم صحيح" },
        { status: 400 },
      )
    }

    // --- توليد الموظف باستخدام المحرك الذكي ---
    const generated = await generateEmployeeWithLLM(
      name.trim(),
      role.trim(),
      company.dialect as Dialect,
      company.tone as Tone,
      company.name,
      roleDescription,
      specialization.trim(),
      department.name,
      language,
    )

    // --- حفظ الموظف في قاعدة البيانات ---
    const employee = await db.employee.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        specialization: specialization.trim(),
        status: "SETUP",
        personality: generated.personality,
        systemPrompt: generated.systemPrompt,
        capabilities: JSON.stringify(generated.capabilities),
        constraints: JSON.stringify(generated.constraints),
        suggestedCapabilities: JSON.stringify(generated.suggestedCapabilities),
        approvalMode: "ALWAYS_APPROVE",
        companyId: company.id,
        departmentId: department.id,
      },
    })

    // --- تسجيل الحدث ---
    await db.auditLog.create({
      data: {
        companyId: company.id,
        action: "employee_created",
        actorType: "USER",
        actorId: company.ownerId,
        actorName: "صاحب الشركة",
        details: JSON.stringify({
          employeeId: employee.id,
          employeeName: employee.name,
          employeeRole: employee.role,
          specialization: specialization.trim(),
          departmentId: department.id,
          departmentName: department.name,
          suggestedCapabilities: generated.suggestedCapabilities.length,
        }),
      },
    })

    // --- الرجوع بالنتيجة ---
    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        specialization: employee.specialization,
        status: employee.status,
        personality: employee.personality,
        capabilities: employee.capabilities,
        constraints: employee.constraints,
        suggestedCapabilities: employee.suggestedCapabilities,
        approvalMode: employee.approvalMode,
        departmentId: employee.departmentId,
        createdAt: employee.createdAt,
      },
      setupQuestions: generated.setupQuestions,
      suggestedCapabilities: generated.suggestedCapabilities,
      // معلومات الاشتراك
      subscription: {
        plan: company.subscription,
        employeesUsed: company.employees.length + 1,
        employeesMax: planInfo?.maxEmployees ?? Infinity,
      },
    }, { status: 201 })

  } catch (error) {
    console.error("[CREATE_EMPLOYEE_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الموظف" },
      { status: 500 },
    )
  }
}
