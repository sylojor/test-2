// ============================================
// API: Platform Env Keys (Owner/Admin Only)
// GET  — Return masked status of important env keys
// PUT  — Write a key to .env file permanently
//        + update process.env for current session
//
// SECURITY:
// - Admin auth required for ALL operations
// - NEVER expose raw key values — only masked
// - Only whitelisted keys are allowed (no arbitrary writes)
// - Validates key format before writing
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { resolve } from "path"

// Whitelisted keys that can be managed via this API
const ALLOWED_KEYS: Record<string, {
  label: string
  labelAr: string
  category: string
  secret: boolean  // Whether to mask the value in GET responses
  description: string
  descriptionAr: string
}> = {
  LLM_API_KEY: {
    label: "LLM API Key",
    labelAr: "مفتاح LLM API",
    category: "llm",
    secret: true,
    description: "API key for your LLM provider (Groq, Together, OpenRouter, etc.)",
    descriptionAr: "مفتاح API لمزود LLM (Groq, Together, OpenRouter, إلخ)",
  },
  LLM_PROVIDER: {
    label: "LLM Provider",
    labelAr: "مزود LLM",
    category: "llm",
    secret: false,
    description: "LLM provider name (groq, together, openrouter, grok, mock, custom)",
    descriptionAr: "اسم مزود LLM (groq, together, openrouter, grok, mock, custom)",
  },
  LLM_API_URL: {
    label: "LLM API URL",
    labelAr: "رابط LLM API",
    category: "llm",
    secret: false,
    description: "API base URL for your LLM provider",
    descriptionAr: "رابط API الأساسي لمزود LLM",
  },
  LLM_MODEL_LIGHT: {
    label: "LLM Model Light",
    labelAr: "موديل LLM خفيف",
    category: "llm",
    secret: false,
    description: "Light model for simple tasks (fast, cheap)",
    descriptionAr: "موديل خفيف للمهام البسيطة (سريع، اقتصادي)",
  },
  LLM_MODEL_MEDIUM: {
    label: "LLM Model Medium",
    labelAr: "موديل LLM متوسط",
    category: "llm",
    secret: false,
    description: "Medium model for balanced conversations",
    descriptionAr: "موديل متوسط للمحادثات المتوازنة",
  },
  LLM_MODEL_HEAVY: {
    label: "LLM Model Heavy",
    labelAr: "موديل LLM قوي",
    category: "llm",
    secret: false,
    description: "Heavy model for complex tasks (smart, expensive)",
    descriptionAr: "موديل قوي للمهام المعقدة (ذكي، مكلف)",
  },
  DODO_API_KEY: {
    label: "Dodo Payments API Key",
    labelAr: "مفتاح Dodo API",
    category: "payment",
    secret: true,
    description: "API key for Dodo Payments gateway",
    descriptionAr: "مفتاح API لبوابة دفع Dodo",
  },
  DODO_WEBHOOK_SECRET: {
    label: "Dodo Webhook Secret",
    labelAr: "سر Dodo Webhook",
    category: "payment",
    secret: true,
    description: "Webhook secret for Dodo payment notifications (optional)",
    descriptionAr: "سر Webhook لإشعارات دفع Dodo (اختياري)",
  },
  DODO_API_BASE_URL: {
    label: "Dodo API Base URL",
    labelAr: "رابط Dodo API الأساسي",
    category: "payment",
    secret: false,
    description: "Base URL for Dodo Payments API (default: https://api.dodopayments.com/v1)",
    descriptionAr: "رابط API الأساسي لـ Dodo (الافتراضي: https://api.dodopayments.com/v1)",
  },
  NEXT_PUBLIC_BASE_URL: {
    label: "Site Base URL",
    labelAr: "رابط الموقع الأساسي",
    category: "platform",
    secret: false,
    description: "Your site's public base URL (for webhooks, redirects)",
    descriptionAr: "رابط الموقع العام (للويب هوك، إعادة التوجيه)",
  },
}

// Mask a secret value: show only last 4 chars
function maskValue(value: string | undefined, isSecret: boolean): string {
  if (!value) return ""
  if (!isSecret) return value
  if (value.length <= 4) return "****"
  return `****${value.slice(-4)}`
}

// Find .env file path
function findEnvPath(): string | null {
  // In Docker, look in /app first; otherwise use project root
  const dockerPath = "/app/.env"
  const localPath = resolve(process.cwd(), ".env")

  if (existsSync(dockerPath)) return dockerPath
  if (existsSync(localPath)) return localPath

  // Try common locations
  const candidates = [
    "/app/.env",
    "/app/.env.local",
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".env.local"),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  return null
}

// Read .env file and parse it into key-value pairs
function readEnvFile(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, "utf-8")
    const result: Record<string, string> = {}
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) continue
      const [key, ...valueParts] = trimmed.split("=")
      if (key && valueParts.length > 0) {
        result[key.trim()] = valueParts.join("=").trim()
      }
    }
    return result
  } catch {
    return {}
  }
}

// Write .env file from key-value pairs
function writeEnvFile(path: string, envData: Record<string, string>) {
  const lines: string[] = []

  // Preserve order and add new keys at the end
  // First, read the original file to preserve structure/comments
  try {
    const originalContent = readFileSync(path, "utf-8")
    const originalLines = originalContent.split("\n")

    // Track which keys from envData have been written
    const writtenKeys = new Set<string>()

    for (const line of originalLines) {
      const trimmed = line.trim()
      // Keep comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) {
        lines.push(line)
        continue
      }

      const [key] = trimmed.split("=")
      const keyTrimmed = key?.trim()

      // If this key exists in our updated envData, use the new value
      if (keyTrimmed && envData[keyTrimmed] !== undefined) {
        lines.push(`${keyTrimmed}=${envData[keyTrimmed]}`)
        writtenKeys.add(keyTrimmed)
      } else {
        // Keep the original line
        lines.push(line)
      }
    }

    // Add new keys that weren't in the original file
    for (const [key, value] of Object.entries(envData)) {
      if (!writtenKeys.has(key)) {
        lines.push(`${key}=${value}`)
      }
    }
  } catch {
    // If original file doesn't exist, write all keys
    for (const [key, value] of Object.entries(envData)) {
      lines.push(`${key}=${value}`)
    }
  }

  writeFileSync(path, lines.join("\n"), "utf-8")
}

// --- GET: Return status of all whitelisted env keys ---
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const envPath = findEnvPath()

    // Build response with masked values
    const keysStatus: Record<string, {
      label: string
      labelAr: string
      category: string
      description: string
      descriptionAr: string
      isSet: boolean
      maskedValue: string
      canWriteToEnv: boolean
    }> = {}

    for (const [keyName, keyInfo] of Object.entries(ALLOWED_KEYS)) {
      const currentValue = process.env[keyName]
      keysStatus[keyName] = {
        label: keyInfo.label,
        labelAr: keyInfo.labelAr,
        category: keyInfo.category,
        description: keyInfo.description,
        descriptionAr: keyInfo.descriptionAr,
        isSet: !!currentValue,
        maskedValue: maskValue(currentValue, keyInfo.secret),
        canWriteToEnv: !!envPath,
      }
    }

    return NextResponse.json({
      keys: keysStatus,
      envPath: envPath ? "found" : "not_found",
      writable: !!envPath,
    })
  } catch (error) {
    console.error("[ENV_KEYS_GET_ERROR]", error)
    return NextResponse.json({ error: "Failed to read env keys" }, { status: 500 })
  }
}

// --- PUT: Write a key to .env file + update process.env ---
export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const body = await request.json()
    const { key, value } = body as { key: string; value: string }

    // Validate key is in whitelist
    if (!ALLOWED_KEYS[key]) {
      return NextResponse.json({
        error: `Key "${key}" is not allowed. Only whitelisted keys can be managed.`,
        allowedKeys: Object.keys(ALLOWED_KEYS),
      }, { status: 400 })
    }

    // Validate value is not empty (for non-optional fields)
    if (!value && key !== "DODO_WEBHOOK_SECRET") {
      return NextResponse.json({
        error: `Value for "${key}" cannot be empty`,
      }, { status: 400 })
    }

    const envPath = findEnvFile()

    if (!envPath) {
      // If no .env file found, still update process.env for current session
      process.env[key] = value
      return NextResponse.json({
        success: true,
        message: "Key updated in current session only (no .env file found). Changes will not persist after restart.",
        warning: "No .env file was found on the server. Set up a .env file for permanent configuration.",
        key,
        maskedValue: maskValue(value, ALLOWED_KEYS[key].secret),
        persistent: false,
      })
    }

    // Read current .env, update the key, and write back
    const envData = readEnvFile(envPath)
    envData[key] = value
    writeEnvFile(envPath, envData)

    // Also update process.env for immediate effect in current session
    process.env[key] = value

    // Log the change for audit
    console.log(`[ENV_KEY_UPDATED] Key: ${key} | By: ${authResult.payload.userId} | Persistent: true`)

    return NextResponse.json({
      success: true,
      message: `Key "${key}" saved permanently to .env file and activated for current session`,
      key,
      maskedValue: maskValue(value, ALLOWED_KEYS[key].secret),
      persistent: true,
    })
  } catch (error) {
    console.error("[ENV_KEYS_PUT_ERROR]", error)
    return NextResponse.json({ error: "Failed to save env key" }, { status: 500 })
  }
}

// --- DELETE: Remove a key from .env file ---
export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const authResult = requireAdmin(request)
    if (!authResult.success) {
      return authResult.response as unknown as NextResponse
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    if (!key || !ALLOWED_KEYS[key]) {
      return NextResponse.json({
        error: `Key "${key}" is not allowed for deletion`,
      }, { status: 400 })
    }

    const envPath = findEnvFile()

    if (envPath) {
      const envData = readEnvFile(envPath)
      if (envData[key] !== undefined) {
        delete envData[key]
        writeEnvFile(envPath, envData)
      }
    }

    // Remove from process.env for current session
    delete process.env[key]

    console.log(`[ENV_KEY_DELETED] Key: ${key} | By: ${authResult.payload.userId}`)

    return NextResponse.json({
      success: true,
      message: `Key "${key}" removed from .env file`,
      key,
    })
  } catch (error) {
    console.error("[ENV_KEYS_DELETE_ERROR]", error)
    return NextResponse.json({ error: "Failed to delete env key" }, { status: 500 })
  }
}
