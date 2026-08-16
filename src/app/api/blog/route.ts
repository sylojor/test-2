// ============================================
// API: Blog Posts — CRUD operations
// POST: Create new blog post (admin only)
// GET: List published posts (public) or all posts (admin)
// PATCH: Update post (admin only)
// DELETE: Delete post (admin only)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAdmin, checkApiRateLimit, getClientIp } from "@/lib/auth"

// GET /api/blog — List blog posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAdmin = searchParams.get("admin") === "true"
    const category = searchParams.get("category")
    const slug = searchParams.get("slug")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    // If fetching a single post by slug
    if (slug) {
      const post = await db.blogPost.findUnique({
        where: { slug },
        include: { images: { orderBy: { position: "asc" } }, author: { select: { id: true, name: true } } }
      })
      if (!post) {
        return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 })
      }
      if (post.status !== "PUBLISHED" && !isAdmin) {
        return NextResponse.json({ error: "المقال غير متاح" }, { status: 404 })
      }
      if (post.status === "PUBLISHED") {
        await db.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } })
      }
      return NextResponse.json({ post })
    }

    // Build where clause
    const top = parseInt(searchParams.get("top") || "0")

    const where: any = {}
    if (!isAdmin) where.status = "PUBLISHED"
    if (category) where.category = category

    const total = await db.blogPost.count({ where })
    const posts = await db.blogPost.findMany({
      where,
      include: {
        images: true,
        author: { select: { id: true, name: true } }
      },
      orderBy: top > 0 ? { views: "desc" } : (isAdmin ? { createdAt: "desc" } : { publishedAt: "desc" }),
      skip: top > 0 ? 0 : (page - 1) * limit,
      take: top > 0 ? Math.min(top, 10) : limit,
    })

    return NextResponse.json({ posts, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("[BLOG_GET_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب المقالات" }, { status: 500 })
  }
}

// POST /api/blog — Create new blog post (admin only)
export async function POST(request: NextRequest) {
  try {
    const adminCheck = requireAdmin(request)
    if (!adminCheck.success) return adminCheck.response

    const rateLimit = checkApiRateLimit(getClientIp(request), "admin")
    if (!rateLimit.allowed) return NextResponse.json({ error: "طلبات كثيرة" }, { status: 429 })

    const body = await request.json()
    const { slug, titleAr, titleEn, contentAr, contentEn, excerptAr, excerptEn,
            coverImage, coverImageAltAr, coverImageAltEn, coverImageTitleAr, coverImageTitleEn,
            category, tags, metaTitleAr, metaTitleEn, metaDescAr, metaDescEn, status, featured, images } = body

    if (!slug || !titleAr || !titleEn || !contentAr || !contentEn) {
      return NextResponse.json({ error: "العنوان والمحتوى بالعربي والإنجليزي مطلوب" }, { status: 400 })
    }

    const existingSlug = await db.blogPost.findUnique({ where: { slug } })
    if (existingSlug) return NextResponse.json({ error: "هاد الslug مسجل فعلاً" }, { status: 409 })

    const post = await db.blogPost.create({
      data: {
        slug: slug.trim().toLowerCase(),
        titleAr, titleEn, contentAr, contentEn,
        excerptAr: excerptAr || "", excerptEn: excerptEn || "",
        coverImage: coverImage || null,
        coverImageAltAr, coverImageAltEn, coverImageTitleAr, coverImageTitleEn,
        category: category || null,
        tags: tags ? JSON.stringify(tags) : null,
        metaTitleAr, metaTitleEn, metaDescAr, metaDescEn,
        authorId: adminCheck.payload.userId,
        status: status || "DRAFT",
        featured: featured || false,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        images: images ? {
          create: images.map((img: any, idx: number) => ({
            url: img.url, altAr: img.altAr, altEn: img.altEn,
            titleAr: img.titleAr, titleEn: img.titleEn,
            captionAr: img.captionAr, captionEn: img.captionEn,
            position: idx,
          }))
        } : undefined,
      },
      include: { images: { orderBy: { position: "asc" } }, author: { select: { id: true, name: true } } }
    })

    // حدّث السايت ماب والكاش فوراً
    if (post.status === "PUBLISHED") {
      revalidatePath("/sitemap.xml")
      revalidatePath("/blog")
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error("[BLOG_CREATE_ERROR]", error)
    return NextResponse.json({ error: "فشل إنشاء المقال" }, { status: 500 })
  }
}

// PATCH /api/blog — Update blog post (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = requireAdmin(request)
    if (!adminCheck.success) return adminCheck.response

    const body = await request.json()
    const { id, slug, titleAr, titleEn, contentAr, contentEn, excerptAr, excerptEn,
            coverImage, coverImageAltAr, coverImageAltEn, coverImageTitleAr, coverImageTitleEn,
            category, tags, metaTitleAr, metaTitleEn, metaDescAr, metaDescEn, status, featured } = body

    if (!id) return NextResponse.json({ error: "معرّف المقال مطلوب" }, { status: 400 })

    const existing = await db.blogPost.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 })

    const updateData: any = {}
    if (slug) updateData.slug = slug.trim().toLowerCase()
    if (titleAr) updateData.titleAr = titleAr
    if (titleEn) updateData.titleEn = titleEn
    if (contentAr) updateData.contentAr = contentAr
    if (contentEn) updateData.contentEn = contentEn
    if (excerptAr !== undefined) updateData.excerptAr = excerptAr
    if (excerptEn !== undefined) updateData.excerptEn = excerptEn
    if (coverImage !== undefined) updateData.coverImage = coverImage
    if (coverImageAltAr !== undefined) updateData.coverImageAltAr = coverImageAltAr
    if (coverImageAltEn !== undefined) updateData.coverImageAltEn = coverImageAltEn
    if (coverImageTitleAr !== undefined) updateData.coverImageTitleAr = coverImageTitleAr
    if (coverImageTitleEn !== undefined) updateData.coverImageTitleEn = coverImageTitleEn
    if (category !== undefined) updateData.category = category
    if (tags) updateData.tags = JSON.stringify(tags)
    if (metaTitleAr !== undefined) updateData.metaTitleAr = metaTitleAr
    if (metaTitleEn !== undefined) updateData.metaTitleEn = metaTitleEn
    if (metaDescAr !== undefined) updateData.metaDescAr = metaDescAr
    if (metaDescEn !== undefined) updateData.metaDescEn = metaDescEn
    if (status) {
      updateData.status = status
      if (status === "PUBLISHED" && !existing.publishedAt) updateData.publishedAt = new Date()
      if (status === "ARCHIVED") updateData.publishedAt = null
    }
    if (featured !== undefined) updateData.featured = featured

    const post = await db.blogPost.update({
      where: { id }, data: updateData,
      include: { images: { orderBy: { position: "asc" } }, author: { select: { id: true, name: true } } }
    })

    // حدّث السايت ماب والكاش
    revalidatePath("/sitemap.xml")
    revalidatePath("/blog")
    if (post.slug) revalidatePath(`/${post.slug}`)

    return NextResponse.json({ post })
  } catch (error) {
    console.error("[BLOG_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "فشل تحديث المقال" }, { status: 500 })
  }
}

// DELETE /api/blog — Delete blog post (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = requireAdmin(request)
    if (!adminCheck.success) return adminCheck.response

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "معرّف المقال مطلوب" }, { status: 400 })

    const existing = await db.blogPost.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 })

    await db.blogPost.delete({ where: { id } })

    // حدّث السايت ماب والكاش
    revalidatePath("/sitemap.xml")
    revalidatePath("/blog")

    return NextResponse.json({ message: "تم حذف المقال" })
  } catch (error) {
    console.error("[BLOG_DELETE_ERROR]", error)
    return NextResponse.json({ error: "فشل حذف المقال" }, { status: 500 })
  }
}
