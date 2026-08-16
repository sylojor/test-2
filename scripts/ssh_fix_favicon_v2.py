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
# FIX 1: Fix createIco bug in upload/branding/route.ts
# Change: Buffer.concat(eader, entry32, entry16, png32, png16])
# To:     Buffer.concat([header, entry32, entry16, png32, png16])
# ============================================
print("=== FIX 1: createIco bug ===")

# Use a Python script on the server for precise replacement
fix1_script = """
filepath = "/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts"
with open(filepath, "r") as f:
    content = f.read()

# Fix the Buffer.concat line - missing [ bracket and 'h' from 'header'
old = "return Buffer.concat(eader, entry32, entry16, png32, png16])"
new = "return Buffer.concat([header, entry32, entry16, png32, png16])"

if old in content:
    content = content.replace(old, new)
    with open(filepath, "w") as f:
        f.write(content)
    print("SUCCESS: createIco bug fixed")
else:
    print("ERROR: Could not find the bug line")
    # Show the line for debugging
    lines = content.split('\\n')
    for i, line in enumerate(lines, 1):
        if 'Buffer.concat' in line:
            print(f"Line {i}: {line}")
"""

encoded = base64.b64encode(fix1_script.encode('utf-8')).decode('ascii')
cmd = f"echo '{encoded}' | base64 -d > /tmp/fix_ico.py && python3 /tmp/fix_ico.py"
out, err = ssh_exec(cmd)
print(out)

# Verify the fix
out, err = ssh_exec("grep 'Buffer.concat' ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print("Verify:", out)

# ============================================
# FIX 2: Modify icon.tsx to serve custom favicon if available
# Instead of always rendering the hardcoded SVG B logo,
# check if /app/data/branding/favicon.ico or favicon-32x32.png exists
# and serve that instead
# ============================================
print("\n=== FIX 2: Modify icon.tsx to use custom favicon ===")

# Write the new icon.tsx content
new_icon_tsx = '''// ============================================
// Favicon — Dynamic browser tab icon
// If admin uploaded a custom favicon, serve it.
// Otherwise, render the default BlivoAI "B" logo.
// ============================================

import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

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

# Write to server
encoded_icon = base64.b64encode(new_icon_tsx.encode('utf-8')).decode('ascii')
cmd = f"echo '{encoded_icon}' | base64 -d > ~/blivoai-demo/src/app/icon.tsx"
out, err = ssh_exec(cmd)
print("Write icon.tsx:", out, err)

# Verify
out, err = ssh_exec("head -15 ~/blivoai-demo/src/app/icon.tsx")
print("Verify icon.tsx:", out)
