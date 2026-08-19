// ============================================
// API: إدارة موديلات LLM (صاحب المنصة) — Admin only
// GET  — جلب كل الموديلات (admin auth required)
// POST — إضافة موديل جديد (admin auth required)
// PUT  — تحديث موديل (admin auth required)
// DELETE — حذف موديل (admin auth required)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePlatformOwner } from "@/lib/auth"

// --- جلب كل الموديلات (admin only) ---
export async function GET(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const models = await db.lLMModel.findMany({
      orderBy: [{ isActive: "desc" }, { tier: "asc" }, { priority: "asc" }],
    })

    const totalCalls = models.reduce((sum, m) => sum + m.totalCalls, 0)
    const totalCost = models.reduce((sum, m) => sum + m.totalCost, 0)
    const activeModels = models.filter(m => m.isActive).length

    return NextResponse.json({
      models,
      stats: {
        total: models.length,
        active: activeModels,
        totalCalls,
        totalCost: Math.round(totalCost * 100) / 100,
      },
    })
  } catch (error) {
    console.error("[GET_LLM_MODELS_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الموديلات" },
      { status: 500 },
    )
  }
}

// --- إضافة موديل جديد (admin only) ---
export async function POST(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const {
      name, provider, modelId, tier, baseUrl, apiKeyValue,
      capabilities, priceInput, priceOutput, maxTokens, maxContext,
      isActive, isDefault, priority,
    } = body

    if (!name || !provider || !modelId) {
      return NextResponse.json(
        { error: "اسم الموديل، المزود، ومعرف الموديل مطلوبين" },
        { status: 400 },
      )
    }

    if (isDefault) {
      await db.lLMModel.updateMany({
        where: { tier: tier ?? "MEDIUM", isDefault: true },
        data: { isDefault: false },
      })
    }

    const model = await db.lLMModel.create({
      data: {
        name,
        provider,
        modelId,
        tier: tier ?? "MEDIUM",
        baseUrl: baseUrl || null,
        apiKeyValue: apiKeyValue || null,
        capabilities: capabilities ? JSON.stringify(capabilities) : null,
        priceInput: priceInput ?? 0,
        priceOutput: priceOutput ?? 0,
        maxTokens: maxTokens ?? 4096,
        maxContext: maxContext ?? 128000,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        priority: priority ?? 5,
      },
    })

    return NextResponse.json({ model, message: "تم إضافة الموديل بنجاح" })
  } catch (error) {
    console.error("[CREATE_LLM_MODEL_ERROR]", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة الموديل" },
      { status: 500 },
    )
  }
}

// --- تحديث موديل (admin only) ---
export async function PUT(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "معرف الموديل مطلوب" }, { status: 400 })
    }

    if (updates.isDefault) {
      const existing = await db.lLMModel.findUnique({ where: { id } })
      if (existing) {
        await db.lLMModel.updateMany({
          where: { tier: existing.tier, isDefault: true },
          data: { isDefault: false },
        })
      }
    }

    if (updates.capabilities && Array.isArray(updates.capabilities)) {
      updates.capabilities = JSON.stringify(updates.capabilities)
    }

    const model = await db.lLMModel.update({ where: { id }, data: updates })
    return NextResponse.json({ model, message: "تم تحديث الموديل" })
  } catch (error) {
    console.error("[UPDATE_LLM_MODEL_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث الموديل" }, { status: 500 })
  }
}

// --- حذف موديل (admin only) ---
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "معرف الموديل مطلوب" }, { status: 400 })
    }

    await db.lLMModel.delete({ where: { id } })
    return NextResponse.json({ message: "تم حذف الموديل" })
  } catch (error) {
    console.error("[DELETE_LLM_MODEL_ERROR]", error)
    return NextResponse.json({ error: "حدث خطأ أثناء حذف الموديل" }, { status: 500 })
  }
}
