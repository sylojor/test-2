// ============================================
// Blog Upload File Server
// Serves blog images from /app/data/uploads/blog/
// SEO: proper Content-Type + cache headers
// ============================================

import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const UPLOAD_DIR = process.env.NODE_ENV === "production"
  ? "/app/data/uploads/blog"
  : path.join(process.cwd(), "data", "uploads", "blog")

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  const { filename } = await params
  const safeFilename = filename.join("/")

  const ext = path.extname(safeFilename).toLowerCase()
  if (!MIME_TYPES[ext]) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 403 })
  }

  // Security: prevent path traversal
  if (safeFilename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
  }

  const filePath = path.join(UPLOAD_DIR, safeFilename)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  const buffer = fs.readFileSync(filePath)
  const mimeType = MIME_TYPES[ext] || "application/octet-stream"

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "index, follow",
    },
  })
}
