// ============================================
// API: Blog Image Upload
// POST: Upload image file to /app/data/uploads/blog/
// Returns: { url, width, height, filename }
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const UPLOAD_DIR = process.env.NODE_ENV === "production"
  ? "/app/data/uploads/blog"
  : path.join(process.cwd(), "data", "uploads", "blog")

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const adminCheck = requireAdmin(request)
    if (!adminCheck.success) return adminCheck.response

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Generate unique filename
    const ext = path.extname(file.name) || ".png"
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Get image dimensions
    let width = 0, height = 0
    try {
      // Simple dimension detection from buffer
      const buf = Buffer.from(bytes)
      if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) { // PNG
        width = buf.readUInt32BE(16)
        height = buf.readUInt32BE(20)
      } else if (buf.length > 24 && buf[0] === 0xFF && buf[1] === 0xD8) { // JPEG
        let offset = 2
        while (offset < buf.length) {
          if (buf[offset] !== 0xFF) break
          const marker = buf[offset + 1]
          if (marker === 0xC0 || marker === 0xC2) {
            height = buf.readUInt16BE(offset + 5)
            width = buf.readUInt16BE(offset + 7)
            break
          }
          const segLen = buf.readUInt16BE(offset + 2)
          offset += 2 + segLen
        }
      }
    } catch {}

    const url = `/api/uploads/blog/${filename}`
    return NextResponse.json({ url, width, height, filename })
  } catch (error) {
    console.error("[BLOG_UPLOAD_ERROR]", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
