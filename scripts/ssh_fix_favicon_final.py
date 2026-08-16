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
# FIX 1: Add dynamic = 'force-dynamic' to icon.tsx
# This tells Next.js not to cache this route — check custom favicon on every request
# ============================================
print("=== FIX 1: Add dynamic to icon.tsx ===")

# Write updated icon.tsx with dynamic export
new_icon_tsx = '''// ============================================
// Favicon — Dynamic browser tab icon
// If admin uploaded a custom favicon, serve it.
// Otherwise, render the default BlivoAI "B" logo.
//
// IMPORTANT: force-dynamic prevents Next.js from caching this
// at build time. Custom favicons are uploaded at runtime.
// ============================================

import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

export default function Icon() {
  // --- Check for custom uploaded favicon (PNG version) ---
  const brandingDir = process.env.NODE_ENV === "production" && fs.existsSync("/app/data/branding")
    ? "/app/data/branding"
    : path.join(process.cwd(), "data", "branding")

  const customPngPath = path.join(brandingDir, "favicon-32x32.png")
  if (fs.existsSync(customPngPath)) {
    const pngBuffer = fs.readFileSync(customPngPath)
    return new Response(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    })
  }

  // --- Fallback: Default BlivoAI B lettermark ---
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          background: '#0d9488',
        }}
      >
        <svg viewBox="0 0 30 30" style={{ width: '22px', height: '22px' }}>
          <path d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z" fill="white"/>
          <polygon points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1" fill="white"/>
          <path d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z" fill="white"/>
        </svg>
      </div>
    ),
    { ...size }
  )
}
'''

encoded = base64.b64encode(new_icon_tsx.encode('utf-8')).decode('ascii')
cmd = f"echo '{encoded}' | base64 -d > ~/blivoai-demo/src/app/icon.tsx"
out, err = ssh_exec(cmd)
print("Write icon.tsx:", out, err)

# Verify
out, err = ssh_exec("head -20 ~/blivoai-demo/src/app/icon.tsx")
print("Verify icon.tsx:", out)

# ============================================
# FIX 2: Change layout.tsx icons to use /api/branding/ URLs
# Instead of /icon (cached), use /api/branding/favicon.ico (dynamic)
# ============================================
print("\n=== FIX 2: Update layout.tsx icons ===")

# Use Python to replace the icons section in layout.tsx
fix2_cmd = """python3 << 'EOF'
filepath = '/home/ubuntu/blivoai-demo/src/app/layout.tsx'
with open(filepath) as f:
    content = f.read()

# Replace the icons section
old_icons = '''  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },'''

new_icons = '''  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/api/branding/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/api/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },'''

if old_icons in content:
    content = content.replace(old_icons, new_icons)
    with open(filepath, 'w') as f:
        f.write(content)
    print('SUCCESS: icons updated')
else:
    print('ERROR: Could not find icons section')
    # Show what's there
    idx = content.find('icons:')
    if idx >= 0:
        print('Current icons:', content[idx:idx+200])
EOF
"""

out, err = ssh_exec(fix2_cmd)
print(out)

# Verify
out, err = ssh_exec("grep -n 'icons' ~/blivoai-demo/src/app/layout.tsx")
print("Verify icons:", out)

# Read the icons section
out, err = ssh_exec("sed -n '78,90p' ~/blivoai-demo/src/app/layout.tsx")
print("\nIcons section:", out)
