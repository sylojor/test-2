// ============================================
// API: Translate text EN → AR using Groq — Admin only
// POST — Translate English text to Arabic (admin auth required)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePlatformOwner } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const authResult = requirePlatformOwner(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { text, targetLang = "ar" } = body

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text required" }, { status: 400 })
    }

    const groqModel: any = await (db as any).lLMModel.findFirst({
      where: { provider: "groq", isActive: true },
      orderBy: { priority: "asc" },
    })

    const model: any = groqModel || await (db as any).lLMModel.findFirst({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    })

    if (!model) {
      return NextResponse.json({ error: "No active LLM model available for translation" }, { status: 503 })
    }

    const apiKey = model.apiKeyValue || process.env.LLM_API_KEY || process.env.GROQ_API_KEY || ""
    if (!apiKey) {
      return NextResponse.json({ error: "No API key configured for translation" }, { status: 503 })
    }

    const baseUrl = model.baseUrl || "https://api.groq.com/openai/v1"

    const prompt = `You are a professional translator. Translate the following English text to Arabic.
Rules:
- Keep the same meaning and tone
- Use natural, fluent Arabic (not literal translation)
- Keep any technical terms, brand names, or proper nouns as-is (e.g., "BlivoAI", "API", "GitHub")
- Keep any markdown formatting if present
- Return ONLY the translated text, no explanations

Text to translate:
${text}`

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Translate now." },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return NextResponse.json({ error: `Translation failed: ${errText.substring(0, 200)}` }, { status: 502 })
    }

    const data = await resp.json()
    const translated = data.choices?.[0]?.message?.content?.trim() || ""

    return NextResponse.json({
      success: true,
      translated,
      original: text,
    })
  } catch (error) {
    console.error("[TRANSLATE_ERROR]", error)
    return NextResponse.json({ error: "Failed to translate" }, { status: 500 })
  }
}
