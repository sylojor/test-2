// @ts-nocheck
// ============================================
// توليد الموظفين بالـ LLM — سيرفر فقط
//
// هاد الملف مفصول عن employee-generator.ts
// عشان ما يسبب مشاكل بالـ client bundle
// لأنه بيستورد llm-service.ts اللي بيستورد
// موديولات سيرفر فقط (z-ai-web-dev-sdk, child_process, etc.)
// ============================================

import type { Dialect, Tone, GenerateEmployeeResult } from "@/types"
import { generateEmployee, generatePersonality, generateSystemPrompt } from "@/lib/employee-generator"
import { isLLMConnected, sendToLLM } from "@/lib/llm-service"

// ============================================
// الدالة الرئيسية — توليد الموظف بالـ LLM (ذكي)
//
// لو الـ LLM مربوط → بيولّد الموظف بالذكاء الاصطناعي (أذكى وأشمل)
// لو الـ LLM مش مربوط → بيستخدم التوليد المحلي (القوالب)
// ============================================
export async function generateEmployeeWithLLM(
  name: string,
  role: string,
  dialect: Dialect,
  tone: Tone,
  companyName: string,
  roleDescription?: string,
  specialization?: string,
  departmentName?: string,
  language?: string,
): Promise<GenerateEmployeeResult> {
  // حاول تستخدم الـ LLM لو مربوط
  if (isLLMConnected()) {
    try {
      return await generateEmployeeViaLLM(name, role, dialect, tone, companyName, roleDescription, specialization, departmentName, language)
    } catch (error) {
      console.warn("[LLM_EMPLOYEE_GEN_FAILED] Falling back to local generation:", error)
      // لو فشل → ارجع للتوليد المحلي
    }
  }

  // التوليد المحلي (القوالب)
  return generateEmployee(name, role, dialect, tone, companyName, roleDescription, specialization, departmentName, language)
}

// ============================================
// توليد الموظف بالـ LLM — بيطّلع شخصية فريدة
// وبيقترح قدرات ناقصة المدير ممكن نسيها
// ============================================
async function generateEmployeeViaLLM(
  name: string,
  role: string,
  dialect: Dialect,
  tone: Tone,
  companyName: string,
  roleDescription?: string,
  specialization?: string,
  departmentName?: string,
  language?: string,
): Promise<GenerateEmployeeResult> {
  const DIALECT_NAMES: Record<Dialect, string> = {
    levantine: "شامي (أردني/سوري/لبناني/فلسطيني)",
    egyptian: "مصري",
    gulf: "خليجي (سعودي/إماراتي/كويتي)",
    iraqi: "عراقي",
    moroccan: "مغربي",
    formal: "عربية فصحى",
    english: "English",
  }

  const TONE_NAMES: Record<Tone, string> = {
    friendly: "ودية ودافئة",
    formal: "رسمية ومحترمة",
    casual: "عفوية ومريحة",
    professional: "مهنية متوازنة",
    playful: "مرحة ومسلّية",
  }

  const isEnglish = language === "en" || dialect === "english"
  const langInstruction = isEnglish
    ? "All text fields must be in English."
    : "All text fields must be in Arabic (except English dialect)."
  const personalityLang = isEnglish ? "English" : "Arabic"
  const promptLang = isEnglish ? "English" : "Arabic"

  const prompt = `Generate a detailed employee profile for a company called "${companyName}".

Employee details:
- Name: ${name}
- Role: ${role}
- Dialect: ${DIALECT_NAMES[dialect]}
- Tone: ${TONE_NAMES[tone]}
${roleDescription ? `- Role description: ${roleDescription}` : ""}
${specialization ? `- Specialization: ${specialization}` : ""}
${departmentName ? `- Department: ${departmentName}` : ""}

Generate a JSON object with these fields:
{
  "personality": "A 2-3 sentence personality description in ${personalityLang}",
  "personalityTraits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "capabilities": ["capability1", "capability2", ...],
  "suggestedCapabilities": ["suggested capability the manager might have missed", ...],
  "constraints": ["constraint1", "constraint2", ...],
  "setupQuestions": ["question to ask the manager during setup in ${promptLang}", ...],
  "systemPrompt": "Full system prompt in ${promptLang} (at least 500 chars) that defines the employee's behavior, personality, and rules"
}

Rules:
- ${langInstruction}
- capabilities: specific to this role, not generic
- suggestedCapabilities: what the manager might have forgotten (e.g., if role is "محاسب" suggest "إقرار ضريبي")
- constraints: realistic limits for this role
- setupQuestions: 3-5 questions to customize the employee during onboarding
- systemPrompt: comprehensive, includes personality, dialect instructions, tone, capabilities, and rules
- Return ONLY the JSON object, no markdown code blocks`

  const response = await sendToLLM(
    { messages: [{ role: "user", content: prompt }], requestType: "GENERATION" },
    "employee-generator",
    "employee-generator",
  )

  // محاولة استخراج الـ JSON من الرد
  let parsed: Record<string, unknown>
  try {
    // تنظيف الرد — إزالة markdown code blocks لو موجودة
    let cleanContent = response.content.trim()
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    }
    parsed = JSON.parse(cleanContent)
  } catch {
    // لو فشل الـ parsing → استخدم التوليد المحلي
    return generateEmployee(name, role, dialect, tone, companyName, roleDescription, specialization, departmentName, language)
  }

  const capabilities = Array.isArray(parsed.capabilities) ? parsed.capabilities as string[] : []
  const suggestedCapabilities = Array.isArray(parsed.suggestedCapabilities) ? parsed.suggestedCapabilities as string[] : []
  const constraints = Array.isArray(parsed.constraints) ? parsed.constraints as string[] : []
  const setupQuestions = Array.isArray(parsed.setupQuestions) ? parsed.setupQuestions as string[] : []
  const personalityTraits = Array.isArray(parsed.personalityTraits) ? parsed.personalityTraits as string[] : []
  const personality = typeof parsed.personality === "string" ? parsed.personality : generatePersonality(name, role, personalityTraits)

  // الـ systemPrompt: لو الـ LLM ولّد واحد كامل → استخدمو، وإلا → ولّدو محلياً
  let systemPrompt = typeof parsed.systemPrompt === "string" ? parsed.systemPrompt : ""
  if (!systemPrompt || systemPrompt.length < 200) {
    systemPrompt = generateSystemPrompt(name, role, personality, capabilities, constraints, dialect, tone, companyName, specialization, departmentName)
  }

  return {
    name,
    role,
    personality,
    personalityTraits,
    systemPrompt,
    capabilities,
    suggestedCapabilities,
    constraints,
    setupQuestions,
  }
}
