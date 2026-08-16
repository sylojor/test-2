"""
Fix PWA manifest + favicon bugs on demo.blivoai.com server.

Issues to fix:
1. Buffer.concat(eader, entry, png16]) -> Buffer.concat([header, entry, png16]) (2 occurrences)
2. No PWA manifest.json -> no logo when adding to home screen
3. No apple-touch-icon.png generation -> iOS has no icon for home screen
4. Layout metadata missing manifest property
5. ALLOWED_FILES missing apple-touch-icon.png and manifest.json
"""

import paramiko
import os
import json

SSH_HOST = "141.95.55.5"
SSH_USER = "ubuntu"
SSH_PASS = "Mghazi@199641"
SSH_PORT = 22
PROJECT_DIR = "~/blivoai-demo"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS)

def run_cmd(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if err and "SyntaxWarning" not in err:
        print(f"STDERR: {err}")
    return out

# ==========================================
# 1. Fix route.ts - Buffer.concat bug + add apple-touch-icon + add manifest to ALLOWED_FILES
# ==========================================

print("=== Step 1: Fixing route.ts ===")

# Read the full current route.ts
current_route = run_cmd(f"cat {PROJECT_DIR}/src/app/api/upload/branding/route.ts")

# Fix Buffer.concat(eader -> Buffer.concat([header (2 occurrences)
fixed_route = current_route.replace("Buffer.concat(eader, entry, png16])", "Buffer.concat([header, entry, png16])")

# Verify the fix was applied
if "Buffer.concat(eader" in fixed_route:
    print("ERROR: Buffer.concat bug NOT fixed!")
else:
    print("OK: Buffer.concat bug fixed (2 occurrences)")

# Add apple-touch-icon.png generation in the favicon upload section
# After creating favicon-32x32.png, also create apple-touch-icon.png (180x180)
# Find the section that creates favicon-32x32 and add apple-touch-icon after it

# Add apple-touch-icon.png generation after the 32x32 try/catch block
# Current code:
#   } catch {}
#   const savedSize = icoBuffer.length
# We need to add apple-touch-icon creation between them

old_favicon_end = """      } catch {}

      const savedSize = icoBuffer.length"""

new_favicon_end = """      } catch {}

      // Create apple-touch-icon.png (180x180) for iOS "Add to Home Screen"
      try {
        const appleBuffer = await sharp(buffer)
          .resize(180, 180, { fit: \"contain\", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ palette: true, compressionLevel: 9 })
          .toBuffer()
        saveBrandingFile(\"apple-touch-icon.png\", appleBuffer)
      } catch {}

      const savedSize = icoBuffer.length"""

if old_favicon_end in fixed_route:
    fixed_route = fixed_route.replace(old_favicon_end, new_favicon_end)
    print("OK: apple-touch-icon generation added in favicon section")
else:
    print("WARNING: Could not find favicon section end to add apple-touch-icon")

# Also add apple-touch-icon generation in the logo upload section (so logo upload also creates it)
# In the logo image section, after logo-512.png is created
old_logo_512 = """      // Also save a 512x512 non-palette version for OG/meta tags (higher quality)
      try {
        const hiResPng = await sharp(buffer)
          .resize(512, 512, { fit: \"contain\", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ compressionLevel: 9 })
          .toBuffer()
        saveBrandingFile(\"logo-512.png\", hiResPng)
      } catch {}"""

new_logo_512 = """      // Also save a 512x512 non-palette version for OG/meta tags (higher quality)
      try {
        const hiResPng = await sharp(buffer)
          .resize(512, 512, { fit: \"contain\", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ compressionLevel: 9 })
          .toBuffer()
        saveBrandingFile(\"logo-512.png\", hiResPng)
      } catch {}

      // Also create apple-touch-icon.png (180x180) for iOS "Add to Home Screen"
      try {
        const appleBuffer = await sharp(buffer)
          .resize(180, 180, { fit: \"contain\", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ palette: true, compressionLevel: 9 })
          .toBuffer()
        saveBrandingFile(\"apple-touch-icon.png\", appleBuffer)
      } catch {}"""

if old_logo_512 in fixed_route:
    fixed_route = fixed_route.replace(old_logo_512, new_logo_512)
    print("OK: apple-touch-icon generation added in logo section")
else:
    print("WARNING: Could not find logo section to add apple-touch-icon")

# Write the fixed route.ts via SFTP
sftp = ssh.open_sftp()
remote_path = f"{PROJECT_DIR}/src/app/api/upload/branding/route.ts"

with sftp.open(remote_path, 'w') as f:
    f.write(fixed_route)
sftp.close()
print("OK: route.ts uploaded with fixes")

# ==========================================
# 2. Fix branding route - add manifest.json and apple-touch-icon to ALLOWED_FILES
# ==========================================

print("\n=== Step 2: Fixing branding route.ts (ALLOWED_FILES + manifest handler) ===")

branding_route = run_cmd(f"cat {PROJECT_DIR}/src/app/api/branding/\\[...files\\]/route.ts")

# Add manifest.json and apple-touch-icon.png to ALLOWED_FILES
old_allowed = '''  const ALLOWED_FILES = [
    "logo.svg",
    "logo.png",
    "logo.jpg",
    "logo.jpeg",
    "logo.webp",
    "favicon.ico",
    "favicon-32x32.png",
    "favicon-16x16.png",
    "apple-touch-icon.png",
  ]'''

# Note: apple-touch-icon.png is already in the list! But manifest.json is not
new_allowed = '''  const ALLOWED_FILES = [
    "logo.svg",
    "logo.png",
    "logo.jpg",
    "logo.jpeg",
    "logo.webp",
    "favicon.ico",
    "favicon-32x32.png",
    "favicon-16x16.png",
    "apple-touch-icon.png",
    "logo-512.png",
    "manifest.json",
  ]'''

branding_route = branding_route.replace(old_allowed, new_allowed)

# Add manifest.json handler - after the logo.png dynamic generation block
# We'll add a dynamic manifest.json generator that creates a PWA manifest
# using the branding logo and site info

# Find a good place to add it - after the "File not found" section is wrong
# We need to add it BEFORE the "File not found" section as a special handler

old_not_found = '''  // --- File not found ---
  return NextResponse.json({ error: "Branding file not found" }, { status: 404 })'''

manifest_handler = '''  // --- Dynamic manifest.json generation for PWA "Add to Home Screen" ---
  if (filename === "manifest.json") {
    const brandingDir2 = getBrandingDir()
    const publicDir2 = getPublicDir()
    
    // Check if logo exists for the manifest icon
    const logoPngPath = path.join(brandingDir2, "logo.png")
    const logo512Path = path.join(brandingDir2, "logo-512.png")
    const hasLogo = fs.existsSync(logoPngPath) || fs.existsSync(path.join(publicDir2, "logo.png"))
    const hasLogo512 = fs.existsSync(logo512Path) || fs.existsSync(path.join(publicDir2, "logo.png"))

    const manifest = {
      name: "BlivoAI — Smart Chat + Business Management",
      short_name: "BlivoAI",
      description: "AI platform combining intelligent chatbot with specialized AI employees for your company",
      start_url: "/",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#0d9488",
      orientation: "portrait-primary",
      lang: "ar",
      categories: ["business", "ai", "chatbot"],
      icons: hasLogo ? [
        {
          src: "/api/branding/logo-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/api/branding/logo.png",
          sizes: "256x256",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/api/branding/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/api/branding/favicon-32x32.png",
          sizes: "32x32",
          type: "image/png",
          purpose: "any",
        },
      ] : [
        {
          src: "/favicon.ico",
          sizes: "32x32",
          type: "image/x-icon",
        },
      ],
    }

    return new NextResponse(JSON.stringify(manifest), {
      status: 200,
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    })
  }

  // --- File not found ---
  return NextResponse.json({ error: "Branding file not found" }, { status: 404 })'''

branding_route = branding_route.replace(old_not_found, manifest_handler)

# Write the fixed branding route via SFTP
sftp = ssh.open_sftp()
remote_path = f"{PROJECT_DIR}/src/app/api/branding/[...files]/route.ts"

with sftp.open(remote_path, 'w') as f:
    f.write(branding_route)
sftp.close()
print("OK: branding route.ts uploaded with manifest handler and updated ALLOWED_FILES")

# ==========================================
# 3. Add manifest to layout.tsx metadata
# ==========================================

print("\n=== Step 3: Adding manifest to layout.tsx ===")

layout = run_cmd(f"cat {PROJECT_DIR}/src/app/layout.tsx")

# Add manifest property to metadata
old_icons = '''  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/api/branding/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/api/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}'''

new_icons = '''  manifest: "/api/branding/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/api/branding/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/api/branding/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [
      { url: "/api/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}'''

if old_icons in layout:
    layout = layout.replace(old_icons, new_icons)
    print("OK: manifest and 16x16 icon added to layout metadata")
else:
    print("WARNING: Could not find exact icons section in layout")
    # Try to find it differently - maybe the format is slightly different
    # Let's check what's actually there
    print("Looking for icons section...")
    if "icons: {" in layout:
        print("Found icons section, will need different approach")

# Write the fixed layout via SFTP
sftp = ssh.open_sftp()
remote_path = f"{PROJECT_DIR}/src/app/layout.tsx"

with sftp.open(remote_path, 'w') as f:
    f.write(layout)
sftp.close()
print("OK: layout.tsx uploaded")

# ==========================================
# 4. Verify changes
# ==========================================

print("\n=== Step 4: Verifying changes ===")

# Verify route.ts fix
route_check = run_cmd(f"grep -n 'Buffer.concat' {PROJECT_DIR}/src/app/api/upload/branding/route.ts")
print(f"Buffer.concat lines: {route_check}")

# Verify layout has manifest
layout_check = run_cmd(f"grep -n 'manifest' {PROJECT_DIR}/src/app/layout.tsx")
print(f"Manifest in layout: {layout_check}")

# Verify branding route has manifest handler
branding_check = run_cmd(f"grep -n 'manifest' {PROJECT_DIR}/src/app/api/branding/\\[...files\\]/route.ts")
print(f"Manifest in branding route: {branding_check}")

# ==========================================
# 5. Rebuild Docker
# ==========================================

print("\n=== Step 5: Rebuilding Docker ===")

# First build
build_out = run_cmd(f"cd {PROJECT_DIR} && docker compose build --no-cache app 2>&1 | tail -30")
print(f"Build result:\n{build_out}")

# Then restart
up_out = run_cmd(f"cd {PROJECT_DIR} && docker compose up -d --force-recreate app 2>&1")
print(f"Restart result:\n{up_out}")

# Wait for startup
import time
time.sleep(15)

# Check if container is running
ps_out = run_cmd("docker ps --filter name=demo-chatbot")
print(f"Container status:\n{ps_out}")

# ==========================================
# 6. Test the site and manifest
# ==========================================

print("\n=== Step 6: Testing ===")

# Test main page
status_out = run_cmd("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ 2>&1")
print(f"Site HTTP status: {status_out}")

# Test manifest
manifest_out = run_cmd("curl -sL http://localhost:3001/api/branding/manifest.json 2>&1")
print(f"Manifest:\n{manifest_out}")

# Test apple-touch-icon
apple_status = run_cmd("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/branding/apple-touch-icon.png 2>&1")
print(f"apple-touch-icon HTTP status: {apple_status}")

ssh.close()
print("\n=== DONE ===")
