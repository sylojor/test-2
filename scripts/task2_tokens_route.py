#!/usr/bin/env python3
"""Task 2: API Routes for Employee Tokens"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

# === tokens/route.ts — List/Add/Update/Delete tokens for an employee ===
tokens_route_content = r'''// ============================================
// API: توكنات الوصول للموظف (Employee Access Tokens)
// GET /api/employees/[id]/tokens — جلب كل التوكنات
// POST /api/employees/[id]/tokens — إضافة توكن جديد
// PATCH /api/employees/[id]/tokens — تحديث توكن
// DELETE /api/employees/[id]/tokens — حذف توكن
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

// --- أسماء المنصات بالعربي والإنجليزي ---
const PLATFORM_NAMES: Record<string, { ar: string; en: string }> = {
  FACEBOOK: { ar: "فيسبوك", en: "Facebook" },
  INSTAGRAM: { ar: "إنستغرام", en: "Instagram" },
  TWITTER: { ar: "تويتر/X", en: "Twitter/X" },
  LINKEDIN: { ar: "لينكدإن", en: "LinkedIn" },
  GOOGLE: { ar: "جوجل", en: "Google" },
  TIKTOK: { ar: "تيك توك", en: "TikTok" },
  YOUTUBE: { ar: "يوتيوب", en: "YouTube" },
  SNAPCHAT: { ar: "سناب شات", en: "Snapchat" },
  WHATSAPP_BUSINESS: { ar: "واتساب بزنس", en: "WhatsApp Business" },
  EMAIL: { ar: "بريد إلكتروني", en: "Email" },
  STRIPE: { ar: "سترايب (دفع)", en: "Stripe" },
  SHOPIFY: { ar: "شوبيفاي (متجر)", en: "Shopify" },
  CUSTOM_API: { ar: "API مخصص", en: "Custom API" },
  OTHER: { ar: "منصة أخرى", en: "Other" },
}

// --- جلب كل توكنات الموظف ---
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id } = await params

    // التأكد إنو الموظف موجود
    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    const tokens = await db.employeeAccessToken.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: "desc" },
    })

    // إخفاء التوكن — نعرض آخر 4 حروف فقط
    const maskedTokens = tokens.map(token => ({
      ...token,
      accessToken: token.accessToken.length > 4
        ? "****" + token.accessToken.slice(-4)
        : "****",
      refreshToken: token.refreshToken
        ? (token.refreshToken.length > 4
          ? "****" + token.refreshToken.slice(-4)
          : "****")
        : null,
    }))

    return NextResponse.json({ tokens: maskedTokens, platforms: PLATFORM_NAMES })
  } catch (error) {
    console.error("[GET_EMPLOYEE_TOKENS_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء جلب التوكنات" }, { status: 500 })
  }
}

// --- إضافة توكن جديد ---
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id } = await params
    const body = await request.json()

    // التأكد من البيانات المطلوبة
    if (!body.platform || !body.accessToken) {
      return NextResponse.json(
        { error: "المنصة وتوكن الوصول مطلوبين" },
        { status: 400 },
      )
    }

    // التأكد إنو المنصة صالحة
    const validPlatforms = ["FACEBOOK", "INSTAGRAM", "TWITTER", "LINKEDIN", "GOOGLE", "TIKTOK", "YOUTUBE", "SNAPCHAT", "WHATSAPP_BUSINESS", "EMAIL", "STRIPE", "SHOPIFY", "CUSTOM_API", "OTHER"]
    if (!validPlatforms.includes(body.platform)) {
      return NextResponse.json(
        { error: "المنصة غير صالحة" },
        { status: 400 },
      )
    }

    // التأكد إنو الموظف موجود
    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // التأكد إنو ما في توكن لنفس المنصة — كل منصة توكن واحد
    const existing = await db.employeeAccessToken.findUnique({
      where: { employeeId_platform: { employeeId: id, platform: body.platform } },
    })

    if (existing) {
      return NextResponse.json(
        { error: "يوجد توكن لهذه المنصة بالفعل — حدّثه بدلاً من إضافة جديد" },
        { status: 409 },
      )
    }

    // إنشاء التوكن
    const token = await db.employeeAccessToken.create({
      data: {
        employeeId: id,
        platform: body.platform,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken || null,
        tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
        scopes: body.scopes || null,
        platformUserId: body.platformUserId || null,
        platformName: body.platformName || null,
        platformAvatar: body.platformAvatar || null,
        metadata: body.metadata || null,
      },
    })

    // تسجيل في سجل المراجعة
    await db.auditLog.create({
      data: {
        companyId: employee.companyId,
        action: "employee_token_added",
        actorType: "USER",
        details: JSON.stringify({ employeeId: id, platform: body.platform }),
      },
    })

    // إخفاء التوكن في الرد
    return NextResponse.json({
      token: {
        ...token,
        accessToken: "****" + token.accessToken.slice(-4),
        refreshToken: token.refreshToken ? "****" + token.refreshToken.slice(-4) : null,
      },
    })
  } catch (error) {
    console.error("[POST_EMPLOYEE_TOKEN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة التوكن" }, { status: 500 })
  }
}

// --- تحديث توكن (بمعرف التوكن من query param) ---
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id } = await params
    const body = await request.json()
    const tokenId = request.nextUrl.searchParams.get("tokenId")

    if (!tokenId) {
      return NextResponse.json(
        { error: "معرف التوكن مطلوب (tokenId)" },
        { status: 400 },
      )
    }

    // التأكد إنو التوكن موجود وبيتبع للموظف
    const existing = await db.employeeAccessToken.findFirst({
      where: { id: tokenId, employeeId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: "التوكن غير موجود" }, { status: 404 })
    }

    // الحقول المسموح تحديثها
    const allowedFields = ["isActive", "scopes", "metadata", "accessToken", "refreshToken", "tokenExpiresAt", "platformUserId", "platformName", "platformAvatar"]
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // تحويل تاريخ الانتهاء لو موجود
    if (updateData.tokenExpiresAt) {
      updateData.tokenExpiresAt = new Date(updateData.tokenExpiresAt as string)
    }

    const token = await db.employeeAccessToken.update({
      where: { id: tokenId },
      data: updateData,
    })

    return NextResponse.json({
      token: {
        ...token,
        accessToken: "****" + token.accessToken.slice(-4),
        refreshToken: token.refreshToken ? "****" + token.refreshToken.slice(-4) : null,
      },
    })
  } catch (error) {
    console.error("[PATCH_EMPLOYEE_TOKEN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث التوكن" }, { status: 500 })
  }
}

// --- حذف توكن (بمعرف التوكن من query param) ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id } = await params
    const tokenId = request.nextUrl.searchParams.get("tokenId")

    if (!tokenId) {
      return NextResponse.json(
        { error: "معرف التوكن مطلوب (tokenId)" },
        { status: 400 },
      )
    }

    const existing = await db.employeeAccessToken.findFirst({
      where: { id: tokenId, employeeId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: "التوكن غير موجود" }, { status: 404 })
    }

    await db.employeeAccessToken.delete({ where: { id: tokenId } })

    // تسجيل في سجل المراجعة
    const employee = await db.employee.findUnique({ where: { id } })
    if (employee) {
      await db.auditLog.create({
        data: {
          companyId: employee.companyId,
          action: "employee_token_deleted",
          actorType: "USER",
          details: JSON.stringify({ employeeId: id, platform: existing.platform }),
        },
      })
    }

    return NextResponse.json({ message: "تم حذف التوكن بنجاح" })
  } catch (error) {
    console.error("[DELETE_EMPLOYEE_TOKEN_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء حذف التوكن" }, { status: 500 })
  }
}
'''

# Write tokens/route.ts
with sftp.open("/home/ubuntu/blivoai-demo/src/app/api/employees/[id]/tokens/route.ts", "w") as f:
    f.write(tokens_route_content.encode())
print("✓ tokens/route.ts created")

# === tokens/[tokenId]/route.ts — Get/Update/Delete single token ===
token_id_route_content = r'''// ============================================
// API: توكن واحد للموظف (Single Employee Access Token)
// GET /api/employees/[id]/tokens/[tokenId] — جلب توكن واحد
// PATCH /api/employees/[id]/tokens/[tokenId] — تحديث توكن
// DELETE /api/employees/[id]/tokens/[tokenId] — حذف توكن
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"

// --- جلب توكن واحد ---
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tokenId: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id, tokenId } = await params

    const token = await db.employeeAccessToken.findFirst({
      where: { id: tokenId, employeeId: id },
    })

    if (!token) {
      return NextResponse.json({ error: "التوكن غير موجود" }, { status: 404 })
    }

    // إخفاء التوكن — نعرض آخر 4 حروف فقط
    return NextResponse.json({
      token: {
        ...token,
        accessToken: token.accessToken.length > 4
          ? "****" + token.accessToken.slice(-4)
          : "****",
        refreshToken: token.refreshToken
          ? (token.refreshToken.length > 4
            ? "****" + token.refreshToken.slice(-4)
            : "****")
          : null,
      },
    })
  } catch (error) {
    console.error("[GET_EMPLOYEE_TOKEN_DETAIL_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء جلب التوكن" }, { status: 500 })
  }
}

// --- تحديث توكن ---
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tokenId: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id, tokenId } = await params
    const body = await request.json()

    const existing = await db.employeeAccessToken.findFirst({
      where: { id: tokenId, employeeId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: "التوكن غير موجود" }, { status: 404 })
    }

    const allowedFields = ["isActive", "scopes", "metadata", "accessToken", "refreshToken", "tokenExpiresAt", "platformUserId", "platformName", "platformAvatar"]
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (updateData.tokenExpiresAt) {
      updateData.tokenExpiresAt = new Date(updateData.tokenExpiresAt as string)
    }

    const token = await db.employeeAccessToken.update({
      where: { id: tokenId },
      data: updateData,
    })

    return NextResponse.json({
      token: {
        ...token,
        accessToken: "****" + token.accessToken.slice(-4),
        refreshToken: token.refreshToken ? "****" + token.refreshToken.slice(-4) : null,
      },
    })
  } catch (error) {
    console.error("[PATCH_EMPLOYEE_TOKEN_DETAIL_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث التوكن" }, { status: 500 })
  }
}

// --- حذف توكن ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tokenId: string }> },
) {
  try {
    const authPayload = verifyAuth(request)
    if (!authPayload) return unauthorizedResponse()

    const { id, tokenId } = await params

    const existing = await db.employeeAccessToken.findFirst({
      where: { id: tokenId, employeeId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: "التوكن غير موجود" }, { status: 404 })
    }

    await db.employeeAccessToken.delete({ where: { id: tokenId } })

    return NextResponse.json({ message: "تم حذف التوكن بنجاح" })
  } catch (error) {
    console.error("[DELETE_EMPLOYEE_TOKEN_DETAIL_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء حذف التوكن" }, { status: 500 })
  }
}
'''

with sftp.open("/home/ubuntu/blivoai-demo/src/app/api/employees/[id]/tokens/[tokenId]/route.ts", "w") as f:
    f.write(token_id_route_content.encode())
print("✓ tokens/[tokenId]/route.ts created")

sftp.close()
client.close()
print("\nTask 2 complete: Employee token API routes created")
