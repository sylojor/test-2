import paramiko
import sys

def ssh_exec(command, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# ============================================
# FIX 2: Replace window.location.href with soft refresh in admin-content.tsx
# Line 1980: logo upload success → replace page redirect with state-based image refresh
# Line 2016: favicon upload success → same fix
# ============================================

# Read the full admin-content.tsx to understand how to replace
# We need to replace the window.location.href lines with something that
# refreshes just the images, not the whole page

# Strategy: Add a state variable for logoVersion/faviconVersion that gets updated
# after upload, which triggers re-rendering of <img> tags with cache-busting timestamp

# Step 1: Read the SystemTab function to understand where to add state
print("=== Reading SystemTab function start ===")
out, err = ssh_exec("sed -n '1860,1880p' ~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx")
print(out)

# Step 2: Read the branding card section (where the images are)
print("\n=== Reading branding card (logo img + favicon img) ===")
out, err = ssh_exec("sed -n '1947,1965p' ~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx")
print(out)

# Step 3: Now we need to:
# - Add useState for logoVersion and faviconVersion 
# - Update img src to include cache-busting version
# - Replace window.location.href with just updating the version state

# Use sed/python to make the changes on the server

# Change line 1980: Replace window.location.href with logoVersion update
# Change line 2016: Replace window.location.href with faviconVersion update

# Let me use a Python script on the server to make these complex edits
print("\n=== Creating edit script on server ===")

edit_script = '''
import re

filepath = "/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx"
with open(filepath, "r") as f:
    content = f.read()

# 1. Add logoVersion and faviconVersion state variables after faviconInputRef
# Find: const faviconInputRef = useRef<HTMLInputElement>(null)
old_ref = "const faviconInputRef = useRef<HTMLInputElement>(null)"
new_ref = """const faviconInputRef = useRef<HTMLInputElement>(null)
  const [logoVersion, setLogoVersion] = useState(0)
  const [faviconVersion, setFaviconVersion] = useState(0)"""
content = content.replace(old_ref, new_ref)

# 2. Update logo img src to include cache-busting version
# Find: <img src="/api/branding/logo.png" alt="BlivoAI Logo" className="w-16 h-16 rounded-xl mx-auto mb-3" />
old_logo_img = '<img src="/api/branding/logo.png" alt="BlivoAI Logo" className="w-16 h-16 rounded-xl mx-auto mb-3" />'
new_logo_img = '<img src={`/api/branding/logo.png?v=${logoVersion}`} alt="BlivoAI Logo" className="w-16 h-16 rounded-xl mx-auto mb-3" />'
content = content.replace(old_logo_img, new_logo_img)

# 3. Update favicon img src to include cache-busting version
old_favicon_img = '<img src="/api/branding/favicon.ico" alt="BlivoAI Favicon" className="w-10 h-10 rounded-md mx-auto mb-3" />'
new_favicon_img = '<img src={`/api/branding/favicon.ico?v=${faviconVersion}`} alt="BlivoAI Favicon" className="w-10 h-10 rounded-md mx-auto mb-3" />'
content = content.replace(old_favicon_img, new_favicon_img)

# 4. Replace window.location.href after logo upload with setLogoVersion
old_logo_redirect = "window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now()"
# This appears twice (line 1980 for logo, line 2016 for favicon)
# Replace the first occurrence (logo) with setLogoVersion
# We need to be careful - both lines are identical, so we need context

# Find the logo upload section specifically
logo_section_pattern = r'''toast\.success\(lang === "ar" \? "تم تحديث اللوجو!" : "Logo updated!"\)
                      // Force refresh with cache bypass to show the new logo
                      window\.location\.href = window\.location\.href\.split\('\?'\)\[0\] \+ '\?t=' \+ Date\.now\(\)'''

logo_section_replacement = '''toast.success(lang === "ar" ? "تم تحديث اللوجو!" : "Logo updated!")
                      // Update logo version to force image refresh
                      setLogoVersion(Date.now())'''

content = re.sub(logo_section_pattern, logo_section_replacement, content)

# Find the favicon upload section specifically
favicon_section_pattern = r'''toast\.success\(lang === "ar" \? "تم تحديث الفايفكون!" : "Favicon updated!"\)
                      // Force refresh with cache bypass
                      window\.location\.href = window\.location\.href\.split\('\?'\)\[0\] \+ '\?t=' \+ Date\.now\(\)'''

favicon_section_replacement = '''toast.success(lang === "ar" ? "تم تحديث الفايفكون!" : "Favicon updated!")
                      // Update favicon version to force image refresh
                      setFaviconVersion(Date.now())'''

content = re.sub(favicon_section_pattern, favicon_section_replacement, content)

# 5. Also update the header logo Image to include cache-busting
# The header logo uses <Image src="/api/branding/logo.png" ...> which is a Next.js Image component
# We need to add a key prop or change the src
old_header_img = '<Image src="/api/branding/logo.png" alt="BlivoAI" width={36} height={36} className="rounded-lg" />'
new_header_img = '<Image src={`/api/branding/logo.png?v=${logoVersion}`} alt="BlivoAI" width={36} height={36} className="rounded-lg" key={logoVersion} />'
content = content.replace(old_header_img, new_header_img)

# Also the branding card title logo
old_card_img = '<Image src="/api/branding/logo.png" alt="BlivoAI" width={20} height={20} className="rounded-md" />'
new_card_img = '<Image src={`/api/branding/logo.png?v=${logoVersion}`} alt="BlivoAI" width={20} height={20} className="rounded-md" key={`card-${logoVersion}`} />'
content = content.replace(old_card_img, new_card_img)

with open(filepath, "w") as f:
    f.write(content)

print("SUCCESS: All edits applied")
'''

# Write the edit script to the server
out, err = ssh_exec(f"cat > /tmp/fix_admin.py << 'ENDOFSCRIPT'\n{edit_script}\nENDOFSCRIPT")
print("Write script:", out, err)

# Run the edit script
out, err = ssh_exec("python3 /tmp/fix_admin.py")
print("Run script:", out, err)

# Verify changes
print("\n=== Verification ===")
out, err = ssh_exec("grep -n 'logoVersion\\|faviconVersion\\|setLogoVersion\\|setFaviconVersion' ~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx")
print("Version state vars:", out)

out, err = ssh_exec("grep -n 'window.location.href' ~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx")
print("Remaining window.location.href:", out)
