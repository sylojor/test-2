import paramiko
import base64

def ssh_exec(command, timeout=120):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# ============================================
# Write optimized upload route that produces much smaller files
# Key optimizations:
# - Logo PNG: palette=true, compressionLevel=9 (8-bit PNG ~10x smaller)
# - Logo PNG: reduce to 256x256 instead of 512x512 for web use
# - Favicon: only 16x16 ICO (single image, not double) — much smaller
# - Favicon PNG: palette=true, compressionLevel=9
# ============================================

new_route = '''// ============================================
// Branding Upload API — Logo & Favicon (Optimized)
// Logo: 256x256 palette PNG (~5-20KB instead of 360KB)
// Favicon: 16x16 ICO only (~80-200 bytes instead of 290+)
//
// Saves to /app/data/branding/ — Persistent Docker volume
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import path from "path"
import fs from "fs"

function getBrandingDir(): string {
  if (process.env.NODE_ENV === "production") {
    const brandingDir = "/app/data/branding"
    if (!fs.existsSync(brandingDir)) {
      fs.mkdirSync(brandingDir, { recursive: true })
    }
    return brandingDir
  }
  const localDir = path.join(process.cwd(), "data", "branding")
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true })
  }
  return localDir
}

function saveBrandingFile(filename: string, buffer: Buffer): void {
  const brandingDir = getBrandingDir()
  fs.writeFileSync(path.join(brandingDir, filename), buffer)
}

async function createDataUriSvgWrapper(pngBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = require("sharp")
    const thumbnailBuffer = await sharp(pngBuffer)
      .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ palette: true, compressionLevel: 9 })
      .toBuffer()

    const base64Data = thumbnailBuffer.toString("base64")
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <image href="data:image/png;base64,${base64Data}" width="256" height="256"/>
</svg>`
    return Buffer.from(svgContent)
  } catch {
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#666" rx="32"/>
  <text x="128" y="140" font-size="100" fill="#fff" text-anchor="middle" font-family="sans-serif">B</text>
</svg>`
    return Buffer.from(fallbackSvg)
  }
}

// --- Create minimal ICO with just 1 image (16x16) ---
// This produces the smallest possible favicon file
function createMinimalIco(png16: Buffer): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)   // Reserved
  header.writeUInt16LE(1, 2)   // Type: ICO
  header.writeUInt16LE(1, 4)   // Count: 1 image

  const entry = Buffer.alloc(16)
  entry.writeUInt8(16, 0)      // Width: 16
  entry.writeUInt8(16, 1)      // Height: 16
  entry.writeUInt8(0, 2)       // Color palette: 0
  entry.writeUInt8(0, 3)       // Reserved
  entry.writeUInt16LE(1, 4)    // Color planes
  entry.writeUInt16LE(32, 6)   // Bits per pixel
  entry.writeUInt32LE(png16.length, 8)  // Image size
  entry.writeUInt32LE(22, 12)  // Offset: 6 + 16 = 22

  return Buffer.concat([header, entry, png16])
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.success) {
    return new NextResponse(
      JSON.stringify({ error: "Unauthorized — admin access required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (!type || (type !== "logo" && type !== "favicon"))
      return NextResponse.json({ error: "Type must be logo or favicon" }, { status: 400 })

    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (type === "logo") {
      const logoExt = path.extname(file.name).toLowerCase()
      const isSvg = logoExt === ".svg"
      const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(logoExt)

      if (!isSvg && !isImage)
        return NextResponse.json({ error: "Logo must be SVG, PNG, JPG, or WEBP" }, { status: 400 })

      const sharp = require("sharp")

      if (isSvg) {
        saveBrandingFile("logo.svg", buffer)
        try {
          const pngBuffer = await sharp(buffer)
            .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ palette: true, compressionLevel: 9 })
            .toBuffer()
          saveBrandingFile("logo.png", pngBuffer)
        } catch {
          console.log("[Logo Upload] SVG saved, PNG fallback skipped")
        }
        return NextResponse.json({
          success: true, message: "Logo (SVG) uploaded",
          pngPath: "/api/branding/logo.png", svgPath: "/api/branding/logo.svg", size: file.size,
        })
      }

      // Image logo — resize to 256x256 palette PNG (optimized for minimal size)
      const pngBuffer = await sharp(buffer)
        .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ palette: true, compressionLevel: 9 })
        .toBuffer()

      saveBrandingFile("logo.png", pngBuffer)

      // Also save a 512x512 non-palette version for OG/meta tags (higher quality)
      try {
        const hiResPng = await sharp(buffer)
          .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ compressionLevel: 9 })
          .toBuffer()
        saveBrandingFile("logo-512.png", hiResPng)
      } catch {}

      const svgWrapperBuffer = await createDataUriSvgWrapper(pngBuffer)
      saveBrandingFile("logo.svg", svgWrapperBuffer)

      const savedSize = pngBuffer.length
      return NextResponse.json({
        success: true,
        message: `Logo uploaded — ${savedSize} bytes (optimized 256x256 palette PNG)`,
        pngPath: "/api/branding/logo.png",
        svgPath: "/api/branding/logo.svg",
        size: savedSize,
      })
    }

    if (type === "favicon") {
      const favExt = path.extname(file.name).toLowerCase()
      const isIco = favExt === ".ico"
      const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(favExt)
      if (!isIco && !isImage)
        return NextResponse.json({ error: "Favicon must be ICO, PNG, or WEBP" }, { status: 400 })

      const sharp = require("sharp")

      if (isIco) {
        saveBrandingFile("favicon.ico", buffer)
        try {
          const png16 = await sharp(buffer)
            .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ palette: true, compressionLevel: 9 })
            .toBuffer()
          saveBrandingFile("favicon-16x16.png", png16)
        } catch {}
        return NextResponse.json({
          success: true, message: "Favicon (ICO) uploaded",
          path: "/api/branding/favicon.ico", size: buffer.length,
        })
      }

      // Image favicon — create minimal 16x16 ICO (single image, smallest possible)
      const png16Buffer = await sharp(buffer)
        .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ palette: true, compressionLevel: 9 })
        .toBuffer()

      const icoBuffer = createMinimalIco(png16Buffer)
      saveBrandingFile("favicon.ico", icoBuffer)
      saveBrandingFile("favicon-16x16.png", png16Buffer)

      // Also create 32x32 for modern browsers (optional, larger)
      try {
        const png32Buffer = await sharp(buffer)
          .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ palette: true, compressionLevel: 9 })
          .toBuffer()
        saveBrandingFile("favicon-32x32.png", png32Buffer)
      } catch {}

      const savedSize = icoBuffer.length
      return NextResponse.json({
        success: true,
        message: `Favicon uploaded — ${savedSize} bytes (minimal 16x16 ICO)`,
        path: "/api/branding/favicon.ico",
        size: savedSize,
      })
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  } catch (error: any) {
    console.error("[Branding Upload] Error:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
'''

encoded = base64.b64encode(new_route.encode('utf-8')).decode('ascii')
cmd = f"echo '{encoded}' | base64 -d > ~/blivoai-demo/src/app/api/upload/branding/route.ts"
out, err = ssh_exec(cmd)
print("Write result:", out, err)

# Verify
out, err = ssh_exec("wc -l ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print("Lines:", out)

out, err = ssh_exec("grep -n 'palette\|compressionLevel\|createMinimalIco\|16x16' ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print("Optimization keywords:", out)
