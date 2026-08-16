// ============================================
// API: Blog Images — Manage images inside a post
// POST: Add image to a post
// PATCH: Update image alt/title/caption
// DELETE: Remove image from post
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

// POST /api/blog/images — Add image to post
export async function POST(request: NextRequest) {
  try {
    const adminCheck = requireAdmin(request)
    if (!adminCheck.success) return adminCheck.response

    const body = await request.json()
    const { postId, url, altAr, altEn, titleAr, titleEn, captionAr, captionEn, position } = body

    if (!postId || !url) {
      return NextResponse.json({ error: "معرّف المقال ورابط الصورة مطلوب" }, { status: 400 })
    }

    // Verify post exists
    const post = await db.blogPost.findUnique({ where: { id: postId } })
    if (!post) return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 })

    const image = await db.blogImage.create({
      data: {
        postId, url,
        altAr: altAr || null, altEn: altEn || null,
        titleAr: titleAr || null, titleEn: titleEn || null,
        captionAr: captionAr || null, captionEn: captionEn || null,
        position: position || 0,
      }
    })

    return NextResponse.json({ image }, { status: 201 })
  } catch (error) {
    console.error("[BLOG_IMAGE_CREATE_ERROR]", error)
    return NextResponse.json({ error: "فشل إضافة الصورة" }, { status: 500 })
  }
}

// PATCH /api/blog/images — Update image metadata
export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = requireAdmin(request)
    if (!adminCheck.success) return adminCheck.response

    const body = await request.json()
    const { id, altAr, altEn, titleAr, titleEn, captionAr, captionEn, position } = body

    if (!id) return NextResponse.json({ error: "معرّف الصورة مطلوب" }, { status: 400 })

    const updateData: any = {}
    if (altAr !== undefined) updateData.altAr = altAr
    if (altEn !== undefined) updateData.altEn = altEn
    if (titleAr !== undefined) updateData.titleAr = titleAr
    if (titleEn !== undefined) updateData.titleEn = titleEn
    if (captionAr !== undefined) updateData.captionAr = captionAr
    if (captionEn !== undefined) updateData.captionEn = captionEn
    if (position !== undefined) updateData.position = position

    const image = await db.blogImage.update({ where: { id }, data: updateData })
    return NextResponse.json({ image })
  } catch (error) {
    console.error("[BLOG_IMAGE_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث الصورة" }, { status: 500 })
  }
}

// DELETE /api/blog/images — Remove image
export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = requireAdmin(request)
    if (!adminCheck.success) return adminCheck.response

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "معرّف الصورة مطلوب" }, { status: 400 })

    await db.blogImage.delete({ where: { id } })
    return NextResponse.json({ message: "تم حذف الصورة" })
  } catch (error) {
    console.error("[BLOG_IMAGE_DELETE_ERROR]", error)
    return NextResponse.json({ error: "فشل حذف الصورة" }, { status: 500 })
  }
}
