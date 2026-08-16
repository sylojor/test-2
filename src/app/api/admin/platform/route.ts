// ============================================
// API: إعدادات المنصة (Platform Branding & Settings) — Admin only
// GET  — جلب إعدادات المنصة (public — used by frontend for branding)
// PUT  — تحديث إعدادات المنصة (admin auth required)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

// --- جلب إعدادات المنصة (public for branding display) ---
export async function GET() {
  try {
    const settings = await db.platformSettings.findFirst()

    if (!settings) {
      return NextResponse.json({
        platformName: "BlivoAI",
        logoUrl: null,
        faviconUrl: null,
        primaryColor: "teal",
      })
    }

    // Return branding fields + feature toggles (safe for public use)
    return NextResponse.json({
      platformName: settings.platformName,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
      primaryColor: settings.primaryColor,
    })
  } catch (error) {
    console.error("[GET_PLATFORM_SETTINGS_ERROR]", error)
    return NextResponse.json({ error: "Failed to fetch platform settings" }, { status: 500 })
  }
}

// --- تحديث إعدادات المنصة (admin only) ---
export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { platformName, logoUrl, faviconUrl, primaryColor } = body as {
      platformName?: string
      logoUrl?: string | null
      faviconUrl?: string | null
      primaryColor?: string
    }

    const allowedColors = ["emerald", "teal", "green", "cyan", "amber", "orange", "red", "rose", "purple", "violet", "indigo", "blue", "sky", "slate", "gray", "zinc", "neutral", "stone"]
    if (primaryColor && !allowedColors.includes(primaryColor)) {
      return NextResponse.json(
        { error: `Invalid primary color. Allowed: ${allowedColors.join(", ")}` },
        { status: 400 }
      )
    }

    const existing = await db.platformSettings.findFirst()

    let settings
    if (existing) {
      settings = await db.platformSettings.update({
        where: { id: existing.id },
        data: {
          ...(platformName && { platformName }),
          ...(logoUrl !== undefined && { logoUrl }),
          ...(faviconUrl !== undefined && { faviconUrl }),
          ...(primaryColor && { primaryColor }),
        },
      })
    } else {
      settings = await db.platformSettings.create({
        data: {
          platformName: platformName || "BlivoAI",
          logoUrl: logoUrl ?? null,
          faviconUrl: faviconUrl ?? null,
          primaryColor: primaryColor || "teal",
                  },
      })
    }

    return NextResponse.json({
      platformName: settings.platformName,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
      primaryColor: settings.primaryColor,
      message: "Platform settings updated successfully",
    })
  } catch (error) {
    console.error("[PUT_PLATFORM_SETTINGS_ERROR]", error)
    return NextResponse.json({ error: "Failed to update platform settings" }, { status: 500 })
  }
}
