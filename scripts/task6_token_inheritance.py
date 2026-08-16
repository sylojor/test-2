#!/usr/bin/env python3
"""Task 6: Data Preservation on Employee Changes - Create token-inheritance.ts and replaceEmployee API route"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

# ============================================
# 1. Create token-inheritance.ts
# ============================================
token_inheritance_content = '''// ============================================
// نظام وراثة التوكنات وحفظ البيانات عند تغيير الموظف
// (Token Inheritance & Data Preservation)
//
// عندما يتم استبدال موظف بموظف آخر:
// - توكنات الموظف القديم تتوقف (isActive=false)
// - نسخ من التوكنات تنشأ للموظف الجديد مع inheritedFromEmployeeId
// - الموديلات الموجهة تنتقل أيضاً
//
// عندما يتم حذف موظف (soft delete):
// - حالة الموظف = DELETED
// - التوكنات تتوقف لكنها تبقى محفوظة
// ============================================

import { db } from "@/lib/db"

// --- استبدال موظف بموظف آخر — نقل البيانات ---
export async function replaceEmployeeWithInheritance(
  oldEmployeeId: string,
  newEmployeeId: string,
  companyId: string,
): Promise<{
  tokensTransferred: number
  routingsTransferred: number
  success: boolean
  message: string
}> {
  try {
    // 1. التأكد من وجود الموظفين
    const oldEmployee = await db.employee.findUnique({ where: { id: oldEmployeeId } })
    const newEmployee = await db.employee.findUnique({ where: { id: newEmployeeId } })

    if (!oldEmployee) {
      return { tokensTransferred: 0, routingsTransferred: 0, success: false, message: "الموظف القديم غير موجود" }
    }
    if (!newEmployee) {
      return { tokensTransferred: 0, routingsTransferred: 0, success: false, message: "الموظف الجديد غير موجود" }
    }

    // 2. إيقاف توكنات الموظف القديم (deactivate)
    const oldTokens = await db.employeeAccessToken.updateMany({
      where: { employeeId: oldEmployeeId, isActive: true },
      data: { isActive: false },
    })

    // 3. إنشاء نسخ من التوكنات للموظف الجديد مع inheritedFromEmployeeId
    const activeTokens = await db.employeeAccessToken.findMany({
      where: { employeeId: oldEmployeeId },
    })

    let tokensTransferred = 0
    for (const token of activeTokens) {
      // فحص هل الموظف الجديد ما عنده توكن للمنصة دي
      const existingNewToken = await db.employeeAccessToken.findUnique({
        where: { employeeId_platform: { employeeId: newEmployeeId, platform: token.platform } },
      })

      if (!existingNewToken) {
        await db.employeeAccessToken.create({
          data: {
            employeeId: newEmployeeId,
            platform: token.platform,
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            tokenExpiresAt: token.tokenExpiresAt,
            scopes: token.scopes,
            platformUserId: token.platformUserId,
            platformName: token.platformName,
            platformAvatar: token.platformAvatar,
            inheritedFromEmployeeId: oldEmployeeId,
            inheritedAt: new Date(),
            metadata: token.metadata,
            isActive: true, // التوكن الجديد نشط
          },
        })
        tokensTransferred++
      }
    }

    // 4. نقل توجيهات الموديلات للموظف الجديد
    const oldRoutings = await db.employeeModelRouting.findMany({
      where: { employeeId: oldEmployeeId, isActive: true },
    })

    let routingsTransferred = 0
    for (const routing of oldRoutings) {
      // فحص هل الموظف الجديد ما عنده توجيه لنوع المهمة دي
      const existingNewRouting = await db.employeeModelRouting.findUnique({
        where: { employeeId_taskType: { employeeId: newEmployeeId, taskType: routing.taskType } },
      })

      if (!existingNewRouting) {
        await db.employeeModelRouting.create({
          data: {
            employeeId: newEmployeeId,
            taskType: routing.taskType,
            llmModelId: routing.llmModelId,
            priority: routing.priority,
            isActive: true,
          },
        })
        routingsTransferred++
      }
    }

    // 5. تحديث حالة الموظف القديم — استبدال
    await db.employee.update({
      where: { id: oldEmployeeId },
      data: {
        status: "REPLACED",
        replacedByEmployeeId: newEmployeeId,
        replacedAt: new Date(),
      },
    })

    // 6. تسجيل في سجل المراجعة
    await db.auditLog.create({
      data: {
        companyId,
        action: "employee_replaced",
        actorType: "USER",
        details: JSON.stringify({
          oldEmployeeId,
          newEmployeeId,
          oldEmployeeName: oldEmployee.name,
          newEmployeeName: newEmployee.name,
          tokensTransferred,
          routingsTransferred,
        }),
      },
    })

    return {
      tokensTransferred,
      routingsTransferred,
      success: true,
      message: `تم استبدال ${oldEmployee.name} بـ ${newEmployee.name} — نقل ${tokensTransferred} توكن و ${routingsTransferred} توجيه`,
    }
  } catch (error) {
    console.error("[REPLACE_EMPLOYEE_ERROR]", error)
    return {
      tokensTransferred: 0,
      routingsTransferred: 0,
      success: false,
      message: `حدث خطأ أثناء استبدال الموظف: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
    }
  }
}

// --- حذف موظف (soft delete) — حفظ البيانات ---
export async function softDeleteEmployee(
  employeeId: string,
  companyId: string,
): Promise<{
  success: boolean
  message: string
  tokensDeactivated: number
}> {
  try {
    const employee = await db.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return { success: false, message: "الموظف غير موجود", tokensDeactivated: 0 }
    }

    // 1. إيقاف توكنات الموظف (deactivate — لا حذف)
    const tokensResult = await db.employeeAccessToken.updateMany({
      where: { employeeId, isActive: true },
      data: { isActive: false },
    })

    // 2. إيقاف توجيهات الموديلات
    await db.employeeModelRouting.updateMany({
      where: { employeeId, isActive: true },
      data: { isActive: false },
    })

    // 3. تحديث حالة الموظف — محذوف (soft delete)
    await db.employee.update({
      where: { id: employeeId },
      data: { status: "DELETED" },
    })

    // 4. تسجيل في سجل المراجعة
    await db.auditLog.create({
      data: {
        companyId,
        action: "employee_soft_deleted",
        actorType: "USER",
        details: JSON.stringify({
          employeeId,
          employeeName: employee.name,
          employeeRole: employee.role,
          tokensDeactivated: tokensResult.count,
        }),
      },
    })

    return {
      success: true,
      message: `تم حذف ${employee.name} (بياناته محفوظة) — ${tokensResult.count} توكن متوقف`,
      tokensDeactivated: tokensResult.count,
    }
  } catch (error) {
    console.error("[SOFT_DELETE_EMPLOYEE_ERROR]", error)
    return {
      success: false,
      message: `حدث خطأ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
      tokensDeactivated: 0,
    }
  }
}
'''

with sftp.open("/home/ubuntu/blivoai-demo/src/lib/token-inheritance.ts", "w") as f:
    f.write(token_inheritance_content.encode())
print("✓ token-inheritance.ts created")

# ============================================
# 2. Create replaceEmployee API route
# ============================================
python3 /home/z/my-project/scripts/ssh_cmd.py "mkdir -p ~/blivoai-demo/src/app/api/employees/replace"

replace_route_content = '''// ============================================
// API: استبدال موظف بموظف آخر مع نقل البيانات
// POST /api/employees/replace
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { replaceEmployeeWithInheritance, softDeleteEmployee } from "@/lib/token-inheritance"

// --- استبدال موظف ---
export async function POST(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const body = await request.json()

    // التأكد من البيانات المطلوبة
    if (!body.oldEmployeeId || !body.newEmployeeId || !body.companyId) {
      return NextResponse.json(
        { error: "معرف الموظف القديم والجديد والشركة مطلوبين" },
        { status: 400 },
      )
    }

    const result = await replaceEmployeeWithInheritance(
      body.oldEmployeeId,
      body.newEmployeeId,
      body.companyId,
    )

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }
  } catch (error) {
    console.error("[REPLACE_EMPLOYEE_API_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء استبدال الموظف" },
      { status: 500 },
    )
  }
}

// --- حذف موظف (soft delete مع حفظ البيانات) ---
export async function PATCH(request: NextRequest) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const body = await request.json()

    if (!body.employeeId || !body.companyId) {
      return NextResponse.json(
        { error: "معرف الموظف والشركة مطلوبين" },
        { status: 400 },
      )
    }

    const result = await softDeleteEmployee(
      body.employeeId,
      body.companyId,
    )

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }
  } catch (error) {
    console.error("[SOFT_DELETE_EMPLOYEE_API_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الموظف" },
      { status: 500 },
    )
  }
}
'''

with sftp.open("/home/ubuntu/blivoai-demo/src/app/api/employees/replace/route.ts", "w") as f:
    f.write(replace_route_content.encode())
print("✓ replace/route.ts created")

sftp.close()
client.close()
print("\nTask 6 complete: Token inheritance and replace API created")
