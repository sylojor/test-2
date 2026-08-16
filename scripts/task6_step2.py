#!/usr/bin/env python3
"""Task 6 Step 2: Create replaceEmployee API route"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

replace_route_content = '''// ============================================
// API: استبدال موظف بموظف آخر مع نقل البيانات
// POST /api/employees/replace — استبدال موظف (نقل التوكنات والتوجيهات)
// PATCH /api/employees/replace — حذف موظف (soft delete مع حفظ البيانات)
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
print("\nTask 6 complete")
