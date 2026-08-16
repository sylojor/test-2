// ============================================
// API: Load default content from i18n translations into DB — Admin only
// POST — Import default content for a section (admin auth required)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { translations } from "@/lib/i18n"
import type { Language } from "@/lib/i18n"
import { requireAdmin } from "@/lib/auth"

function getValue(lang: Language, path: string): string {
  return translations[lang]?.[path] || ""
}

interface FieldDef {
  itemKey: string
  enPath: string
  arPath: string
}

const SECTION_MAP: Record<string, FieldDef[]> = {
  hero: [
    { itemKey: "badge", enPath: "landing.hero.subtitle", arPath: "landing.hero.subtitle" },
    { itemKey: "title", enPath: "landing.hero.title", arPath: "landing.hero.title" },
    { itemKey: "subtitle", enPath: "app.subtitle", arPath: "app.subtitle" },
    { itemKey: "description", enPath: "landing.hero.description", arPath: "landing.hero.description" },
    { itemKey: "cta", enPath: "landing.cta.start", arPath: "landing.cta.start" },
  ],
  features: [
    { itemKey: "badge", enPath: "app.subtitle", arPath: "app.subtitle" },
    { itemKey: "title", enPath: "landing.feature.1.title", arPath: "landing.feature.1.title" },
    { itemKey: "subtitle", enPath: "landing.feature.1.desc", arPath: "landing.feature.1.desc" },
    { itemKey: "item_1_title", enPath: "landing.feature.1.title", arPath: "landing.feature.1.title" },
    { itemKey: "item_1_desc", enPath: "landing.feature.1.desc", arPath: "landing.feature.1.desc" },
    { itemKey: "item_2_title", enPath: "landing.feature.2.title", arPath: "landing.feature.2.title" },
    { itemKey: "item_2_desc", enPath: "landing.feature.2.desc", arPath: "landing.feature.2.desc" },
    { itemKey: "item_3_title", enPath: "landing.feature.3.title", arPath: "landing.feature.3.title" },
    { itemKey: "item_3_desc", enPath: "landing.feature.3.desc", arPath: "landing.feature.3.desc" },
    { itemKey: "item_4_title", enPath: "landing.feature.4.title", arPath: "landing.feature.4.title" },
    { itemKey: "item_4_desc", enPath: "landing.feature.4.desc", arPath: "landing.feature.4.desc" },
    { itemKey: "item_5_title", enPath: "landing.feature.5.title", arPath: "landing.feature.5.title" },
    { itemKey: "item_5_desc", enPath: "landing.feature.5.desc", arPath: "landing.feature.5.desc" },
    { itemKey: "item_6_title", enPath: "landing.feature.6.title", arPath: "landing.feature.6.title" },
    { itemKey: "item_6_desc", enPath: "landing.feature.6.desc", arPath: "landing.feature.6.desc" },
  ],
  pricing: [
    { itemKey: "title", enPath: "app.title", arPath: "app.title" },
    { itemKey: "subtitle", enPath: "app.subtitle", arPath: "app.subtitle" },
    { itemKey: "free_label", enPath: "landing.cta.start", arPath: "landing.cta.start" },
  ],
  faq: [
    { itemKey: "title", enPath: "app.title", arPath: "app.title" },
    { itemKey: "subtitle", enPath: "app.subtitle", arPath: "app.subtitle" },
  ],
  footer: [
    { itemKey: "brand", enPath: "app.title", arPath: "app.title" },
    { itemKey: "description", enPath: "app.description", arPath: "app.description" },
  ],
  about: [
    { itemKey: "title", enPath: "app.title", arPath: "app.title" },
    { itemKey: "subtitle", enPath: "app.subtitle", arPath: "app.subtitle" },
  ],
  download: [
    { itemKey: "title", enPath: "app.title", arPath: "app.title" },
    { itemKey: "subtitle", enPath: "app.subtitle", arPath: "app.subtitle" },
  ],
  api_docs: [
    { itemKey: "badge", enPath: "app.subtitle", arPath: "app.subtitle" },
    { itemKey: "title", enPath: "app.title", arPath: "app.title" },
    { itemKey: "subtitle", enPath: "app.description", arPath: "app.description" },
  ],
  privacy: [
    { itemKey: "title", enPath: "app.title", arPath: "app.title" },
    { itemKey: "subtitle", enPath: "app.subtitle", arPath: "app.subtitle" },
  ],
  terms: [
    { itemKey: "title", enPath: "app.title", arPath: "app.title" },
    { itemKey: "subtitle", enPath: "app.subtitle", arPath: "app.subtitle" },
  ],
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { section } = body

    if (!section) {
      return NextResponse.json({ error: "section required" }, { status: 400 })
    }

    const fields = SECTION_MAP[section]
    if (!fields) {
      return NextResponse.json({
        error: `Unknown section: ${section}. Available: ${Object.keys(SECTION_MAP).join(", ")}`,
      }, { status: 400 })
    }

    await db.contentSection.deleteMany({ where: { section } })

    let count = 0
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      const valueEn = getValue("en", field.enPath)
      const valueAr = getValue("ar", field.arPath)

      if (valueEn || valueAr) {
        await db.contentSection.create({
          data: {
            section,
            itemKey: field.itemKey,
            valueEn,
            valueAr,
            sortOrder: i,
            isActive: true,
          },
        })
        count++
      }
    }

    return NextResponse.json({ success: true, count, message: `Loaded ${count} items from defaults` })
  } catch (error) {
    console.error("[LOAD_DEFAULTS_ERROR]", error)
    return NextResponse.json({ error: "Failed to load defaults" }, { status: 500 })
  }
}
