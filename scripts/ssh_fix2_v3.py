import paramiko

def ssh_exec(command, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

filepath = "~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx"

# ============================================
# Step 1: Add state variables after faviconInputRef
# ============================================
print("=== Step 1: Add state variables ===")
cmd1 = "sed -i '/const faviconInputRef = useRef<HTMLInputElement>(null)/a\\  const [logoVersion, setLogoVersion] = useState(0)\\n  const [faviconVersion, setFaviconVersion] = useState(0)' " + filepath
out, err = ssh_exec(cmd1)
print("Result:", out, err)

out, err = ssh_exec("grep -n 'logoVersion|faviconVersion' " + filepath)
print("State vars:", out)

# ============================================
# Step 2: Replace logo img src - using a Python script on the server to avoid shell escaping issues
# ============================================
print("\n=== Step 2-7: Using Python script on server for complex replacements ===")

# Write a Python fix script to the server
fix_script = r"""
import re

filepath = "/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx"
with open(filepath, "r") as f:
    content = f.read()

# 1. Replace logo img: src="/api/branding/logo.png" -> src={`/api/branding/logo.png?v=${logoVersion}`}
content = content.replace(
    'src="/api/branding/logo.png" alt="BlivoAI Logo" className="w-16 h-16 rounded-xl mx-auto mb-3"',
    'src={`/api/branding/logo.png?v=${logoVersion}`} alt="BlivoAI Logo" className="w-16 h-16 rounded-xl mx-auto mb-3"'
)

# 2. Replace favicon img
content = content.replace(
    'src="/api/branding/favicon.ico" alt="BlivoAI Favicon" className="w-10 h-10 rounded-md mx-auto mb-3"',
    'src={`/api/branding/favicon.ico?v=${faviconVersion}`} alt="BlivoAI Favicon" className="w-10 h-10 rounded-md mx-auto mb-3"'
)

# 3. Replace header Image: <Image src="/api/branding/logo.png" alt="BlivoAI" width={36} height={36} className="rounded-lg" />
content = content.replace(
    '<Image src="/api/branding/logo.png" alt="BlivoAI" width={36} height={36} className="rounded-lg" />',
    '<Image src={`/api/branding/logo.png?v=${logoVersion}`} alt="BlivoAI" width={36} height={36} className="rounded-lg" key={logoVersion} />'
)

# 4. Replace card Image: <Image src="/api/branding/logo.png" alt="BlivoAI" width={20} height={20} className="rounded-md" />
content = content.replace(
    '<Image src="/api/branding/logo.png" alt="BlivoAI" width={20} height={20} className="rounded-md" />',
    '<Image src={`/api/branding/logo.png?v=${logoVersion}`} alt="BlivoAI" width={20} height={20} className="rounded-md" key={`card-${logoVersion}`} />'
)

# 5. Replace logo upload redirect
# Find: "Logo updated!") followed by comment + window.location.href
# Replace with setLogoVersion(Date.now())
logo_redirect_pattern = r'"Logo updated!"\)\s*\n\s*// Force refresh with cache bypass to show the new logo\s*\n\s*window\.location\.href = window\.location\.href\.split\(\x27\?\x27\)\[0\] \+ \x27\?t=\x27 \+ Date\.now\(\)'
logo_redirect_replace = '"Logo updated!")\n                      // Update logo version to force image refresh\n                      setLogoVersion(Date.now())'
content = re.sub(logo_redirect_pattern, logo_redirect_replace, content)

# 6. Replace favicon upload redirect
favicon_redirect_pattern = r'"Favicon updated!"\)\s*\n\s*// Force refresh with cache bypass\s*\n\s*window\.location\.href = window\.location\.href\.split\(\x27\?\x27\)\[0\] \+ \x27\?t=\x27 \+ Date\.now\(\)'
favicon_redirect_replace = '"Favicon updated!")\n                      // Update favicon version to force image refresh\n                      setFaviconVersion(Date.now())'
content = re.sub(favicon_redirect_pattern, favicon_redirect_replace, content)

with open(filepath, "w") as f:
    f.write(content)

print("SUCCESS: All edits applied")
"""

# Write the fix script to the server using a temporary file
# Use base64 to avoid shell escaping issues
import base64
encoded = base64.b64encode(fix_script.encode('utf-8')).decode('ascii')
cmd = "echo '{}' | base64 -d > /tmp/fix_admin.py && python3 /tmp/fix_admin.py".format(encoded)
out, err = ssh_exec(cmd)
print("Fix script result:", out, err)

# Verify all changes
print("\n=== FINAL VERIFICATION ===")
out, err = ssh_exec("grep -n 'logoVersion|faviconVersion|setLogoVersion|setFaviconVersion' " + filepath)
print("Version refs:", out)

out, err = ssh_exec("grep -n 'window.location.href' " + filepath)
print("window.location.href remaining:", out)

# Read the logo upload section
out, err = ssh_exec("sed -n '1964,2005p' " + filepath)
print("\nLogo upload section:\n", out[:2500])

# Also check the state vars were added
out, err = ssh_exec("sed -n '1870,1875p' " + filepath)
print("\nState vars area:\n", out)
