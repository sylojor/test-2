"""
Add dynamic apple-touch-icon.png generation in branding route.
When apple-touch-icon.png doesn't exist, generate it from logo.png or logo.svg
using sharp resize to 180x180.
"""

import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()
branding_path = '/home/ubuntu/blivoai-demo/src/app/api/branding/[...files]/route.ts'

with sftp.open(branding_path, 'r') as f:
    content = f.read().decode()

# Add dynamic apple-touch-icon.png generation - similar to logo.png dynamic generation
# Find the section after "Try branding directory first" and before "Dynamic PNG generation: logo.png"
# We'll add it after the branding directory check but before the logo.png dynamic generation

# Find: the section where we fall through after branding dir check fails
# We need to add: if filename === "apple-touch-icon.png" → try to generate from logo

old_section = '''  // --- Dynamic PNG generation: If logo.png doesn\'t exist, try converting logo.svg ---
  if (filename === "logo.png") {'''

new_section = '''  // --- Dynamic apple-touch-icon.png: If not uploaded, generate from logo ---
  if (filename === "apple-touch-icon.png") {
    const logoSources = [
      path.join(brandingDir, "logo-512.png"),
      path.join(brandingDir, "logo.png"),
      path.join(brandingDir, "logo.svg"),
      path.join(publicDir, "logo.png"),
      path.join(publicDir, "logo.svg"),
    ]

    for (const srcPath of logoSources) {
      if (fs.existsSync(srcPath)) {
        try {
          const sharp = require("sharp")
          const srcBuffer = fs.readFileSync(srcPath)
          const appleBuffer = await sharp(srcBuffer)
            .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer()

          // Save for future requests
          try {
            fs.writeFileSync(path.join(brandingDir, "apple-touch-icon.png"), appleBuffer)
          } catch {}

          return new NextResponse(appleBuffer, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=60, must-revalidate",
              "X-Content-Type-Options": "nosniff",
            },
          })
        } catch {
          // Sharp failed — try next source
          continue
        }
      }
    }

    // No logo source available — fall through to 404
    return NextResponse.json({ error: "apple-touch-icon not available (no logo uploaded)" }, { status: 404 })
  }

  // --- Dynamic PNG generation: If logo.png doesn\'t exist, try converting logo.svg ---
  if (filename === "logo.png") {'''

content = content.replace(old_section, new_section)

with sftp.open(branding_path, 'w') as f:
    f.write(content)
print('OK: branding route updated with apple-touch-icon dynamic generation')

sftp.close()
ssh.close()
