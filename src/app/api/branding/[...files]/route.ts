// ============================================
// Dynamic Branding File Server (OPTIMIZED)
// Serves logo.png, logo.svg, favicon.ico from /app/data/branding/
// Falls back to /app/public/ if no custom branding exists
// In-memory cache + immutable cache headers for performance
// ============================================

import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

function getBrandingDir(): string {
  if (process.env.NODE_ENV === "production" && fs.existsSync("/app/data/branding")) {
    return "/app/data/branding"
  }
  const localPath = path.join(process.cwd(), "data", "branding")
  if (fs.existsSync(localPath)) return localPath
  if (process.env.NODE_ENV === "production" && fs.existsSync("/app/public")) {
    return "/app/public"
  }
  return path.join(process.cwd(), "public")
}

function getPublicDir(): string {
  if (process.env.NODE_ENV === "production" && fs.existsSync("/app/public")) {
    return "/app/public"
  }
  return path.join(process.cwd(), "public")
}

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/manifest+json",
}

const ALLOWED_FILES = [
  "logo.svg", "logo.png", "logo.jpg", "logo.jpeg", "logo.webp",
  "favicon.ico", "favicon-32x32.png", "favicon-16x16.png",
  "apple-touch-icon.png", "manifest.json", "logo-192.png", "logo-512.png",
]

// In-memory cache to avoid fs.readFileSync on every request
const fileCache = new Map<string, { buffer: Buffer; mtime: number; mime: string }>()

function getCachedFile(dir: string, filename: string): { buffer: Buffer; mime: string } | null {
  const cacheKey = `${dir}/${filename}`
  const filePath = path.join(dir, filename)

  const cached = fileCache.get(cacheKey)
  if (cached) {
    try {
      const stat = fs.statSync(filePath)
      if (stat.mtimeMs === cached.mtime) return { buffer: cached.buffer, mime: cached.mime }
    } catch { fileCache.delete(cacheKey) }
  }

  if (!fs.existsSync(filePath)) return null
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filename).toLowerCase()
  const mime = MIME_TYPES[ext] || "application/octet-stream"

  try {
    const stat = fs.statSync(filePath)
    fileCache.set(cacheKey, { buffer, mtime: stat.mtimeMs, mime })
  } catch {}

  return { buffer, mime }
}

function serveStatic(dir: string, filename: string): NextResponse | null {
  const result = getCachedFile(dir, filename)
  if (!result) return null
  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.mime,
      "Cache-Control": "public, max-age=3600, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

function findSourceImage(): Buffer | null {
  const dirs = [getBrandingDir(), getPublicDir()]
  const names = ["logo.png", "logo.svg", "logo.jpg", "logo.jpeg", "logo.webp"]
  for (const dir of dirs) {
    for (const name of names) {
      const p = path.join(dir, name)
      if (fs.existsSync(p)) return fs.readFileSync(p)
    }
  }
  return null
}

async function resizeSource(size: number): Promise<Buffer | null> {
  const src = findSourceImage()
  if (!src) return null
  try {
    const sharp = require("sharp")
    return await sharp(src).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  } catch (err) {
    console.error("[Branding API] Sharp resize failed:", err)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ files: string[] }> }
) {
  const { files } = await params
  const filename = files.join("/")

  if (!filename || !ALLOWED_FILES.includes(filename)) {
    return NextResponse.json({ error: filename ? "File not allowed" : "No filename" }, { status: filename ? 403 : 400 })
  }

  const brandingDir = getBrandingDir()
  const brandingResult = serveStatic(brandingDir, filename)
  if (brandingResult) return brandingResult

  const publicDir = getPublicDir()
  const publicResult = serveStatic(publicDir, filename)
  if (publicResult) return publicResult

  if (filename === "manifest.json") {
    const manifest = {
      name: "BlivoAI — Smart Chat + Business Management",
      short_name: "BlivoAI",
      description: "AI platform combining intelligent chatbot with specialized AI employees",
      start_url: "/",
      display: "standalone",
      background_color: "#0a0a0a",
      theme_color: "#0d9488",
      orientation: "portrait-primary",
      scope: "/",
      icons: [
        { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    }
    return new NextResponse(JSON.stringify(manifest), {
      status: 200,
      headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400, must-revalidate" },
    })
  }

  const DYNAMIC_SIZES: Record<string, number> = {
    "favicon-16x16.png": 16, "favicon-32x32.png": 32,
    "apple-touch-icon.png": 180, "logo-192.png": 192, "logo-512.png": 512,
  }

  if (filename in DYNAMIC_SIZES) {
    const buffer = await resizeSource(DYNAMIC_SIZES[filename]!)
    if (buffer) return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, must-revalidate", "X-Content-Type-Options": "nosniff" },
    })
  }

  if (filename === "favicon.ico") {
    const buffer = await resizeSource(32)
    if (buffer) return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { "Content-Type": "image/x-icon", "Cache-Control": "public, max-age=86400, must-revalidate", "X-Content-Type-Options": "nosniff" },
    })
  }

  return NextResponse.json({ error: "Branding file not found" }, { status: 404 })
}
