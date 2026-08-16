// ============================================
// API: /api/users — User Management
// GET: list all users (admin only)
// DELETE: delete a user by ID (admin only, cannot delete self)
// ============================================

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePlatformOwner } from "@/lib/auth"

// Bilingual error messages
const errors = {
  fetchFailed: { ar: "حدث خطأ أثناء جلب المستخدمين", en: "Failed to fetch users" },
  idRequired: { ar: "معرف المستخدم مطلوب", en: "User ID is required" },
  cannotDeleteSelf: { ar: "لا يمكنك حذف حسابك الخاص", en: "You cannot delete your own account" },
  userNotFound: { ar: "المستخدم غير موجود", en: "User not found" },
  deleteFailed: { ar: "حدث خطأ أثناء حذف المستخدم", en: "Failed to delete user" },
  deleted: (name: string, email: string) => ({
    ar: `تم حذف المستخدم ${name} (${email})`,
    en: `User ${name} (${email}) has been deleted`
  }),
}

function getLang(request: NextRequest): "ar" | "en" {
  const lang = request.nextUrl.searchParams.get("lang")
    || request.headers.get("x-lang")
    || "ar"
  return lang === "en" ? "en" : "ar"
}

function errMsg(key: "ar" | "en", msg: { ar: string; en: string }) {
  return msg[key]
}

// GET /api/users — List all users with their company info
export async function GET(request: NextRequest) {
  const auth = requirePlatformOwner(request)
  if (!auth.success) return auth.response

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            subscription: true,
          },
        },
        ownedCompany: {
          select: {
            id: true,
            name: true,
            subscription: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return Response.json({ users })
  } catch (error) {
    console.error("[API /api/users GET] Error:", error)
    const lang = getLang(request)
    return Response.json(
      { error: errMsg(lang, errors.fetchFailed) },
      { status: 500 }
    )
  }
}

// DELETE /api/users?id=xxx — Delete a user (cannot delete self)
export async function DELETE(request: NextRequest) {
  const auth = requirePlatformOwner(request)
  if (!auth.success) return auth.response

  const lang = getLang(request)
  const userId = request.nextUrl.searchParams.get("id")
  if (!userId) {
    return Response.json(
      { error: errMsg(lang, errors.idRequired) },
      { status: 400 }
    )
  }

  // Cannot delete yourself
  if (userId === auth.payload.userId) {
    return Response.json(
      { error: errMsg(lang, errors.cannotDeleteSelf) },
      { status: 400 }
    )
  }

  try {
    // Check user exists and get related company info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true,
        ownedCompany: { select: { id: true } },
      },
    })

    if (!user) {
      return Response.json(
        { error: errMsg(lang, errors.userNotFound) },
        { status: 404 }
      )
    }

    // If user owns a company, delete it first (Company onDelete: Cascade handles related records)
    if (user.ownedCompany) {
      await db.company.delete({ where: { id: user.ownedCompany.id } })
    }

    // Delete the user
    await db.user.delete({ where: { id: userId } })

    return Response.json({
      success: true,
      message: errMsg(lang, errors.deleted(user.name, user.email)),
    })
  } catch (error) {
    console.error("[API /api/users DELETE] Error:", error)
    return Response.json(
      { error: errMsg(lang, errors.deleteFailed) },
      { status: 500 }
    )
  }
}
