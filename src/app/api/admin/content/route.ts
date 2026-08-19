// ============================================
// API: Content Management (Landing page sections) — Admin only
// GET  — Get content by section (admin auth required)
// POST — Bulk save content items (admin auth required)
// PUT  — Upsert single content item (admin auth required)
// DELETE — Delete a content item (admin auth required)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePlatformOwner } from "@/lib/auth"

const dbAny = db as any

// --- GET: Content by section (admin only) ---
export async function GET(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section")

    if (!section) {
      const allItems = await dbAny.contentSection.findMany({
        orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
      })
      const sections: Record<string, { items: { itemKey: string; valueEn: string; valueAr: string; icon?: string | null; isActive: boolean }[] }> = {}
      for (const item of allItems) {
        if (!sections[item.section]) sections[item.section] = { items: [] }
        sections[item.section].items.push({
          itemKey: item.itemKey,
          valueEn: item.valueEn,
          valueAr: item.valueAr,
          icon: item.icon,
          isActive: item.isActive,
        })
      }
      return NextResponse.json({ sections })
    }

    const items = await dbAny.contentSection.findMany({
      where: { section },
      orderBy: { sortOrder: "asc" },
    })

    const content: Record<string, { en: string; ar: string; icon?: string | null; isActive: boolean }> = {}
    for (const item of items) {
      content[item.itemKey] = {
        en: item.valueEn,
        ar: item.valueAr,
        icon: item.icon,
        isActive: item.isActive,
      }
    }

    return NextResponse.json({ section, content, count: items.length })
  } catch (error) {
    console.error("[CONTENT_GET_ERROR]", error)
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 })
  }
}

// --- POST: Bulk save content items (admin only) ---
export async function POST(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { section, items } = body

    if (!section || !Array.isArray(items)) {
      return NextResponse.json({ error: "section and items[] required" }, { status: 400 })
    }

    await dbAny.contentSection.deleteMany({ where: { section } })

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      await dbAny.contentSection.create({
        data: {
          section,
          itemKey: item.itemKey,
          valueEn: item.valueEn || "",
          valueAr: item.valueAr || "",
          icon: item.icon || null,
          sortOrder: i,
          isActive: item.isActive ?? true,
        },
      })
    }

    return NextResponse.json({ success: true, count: items.length })
  } catch (error) {
    console.error("[CONTENT_POST_ERROR]", error)
    return NextResponse.json({ error: "Failed to save content" }, { status: 500 })
  }
}

// --- PUT: Upsert single content item (admin only) ---
export async function PUT(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { section, itemKey, valueEn, valueAr, icon, sortOrder, isActive } = body

    if (!section || !itemKey) {
      return NextResponse.json({ error: "section and itemKey required" }, { status: 400 })
    }

    const item = await dbAny.contentSection.upsert({
      where: { section_itemKey: { section, itemKey } },
      update: {
        valueEn: valueEn ?? "",
        valueAr: valueAr ?? "",
        icon: icon ?? null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
      create: {
        section,
        itemKey,
        valueEn: valueEn ?? "",
        valueAr: valueAr ?? "",
        icon: icon ?? null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error("[CONTENT_PUT_ERROR]", error)
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 })
  }
}

// --- DELETE: Remove a content item (admin only) ---
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section")
    const itemKey = searchParams.get("itemKey")

    if (!section || !itemKey) {
      return NextResponse.json({ error: "section and itemKey required" }, { status: 400 })
    }

    await dbAny.contentSection.deleteMany({ where: { section, itemKey } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CONTENT_DELETE_ERROR]", error)
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 })
  }
}
