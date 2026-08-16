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

# ============================================
# Use sed for simpler line-based replacements on the server
# ============================================

filepath = "~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx"

# 1. Add logoVersion and faviconVersion state after faviconInputRef
print("=== Step 1: Add state variables ===")
out, err = ssh_exec(f"""sed -i '/const faviconInputRef = useRef<HTMLInputElement>(null)/a\\  const [logoVersion, setLogoVersion] = useState(0)\\n  const [faviconVersion, setFaviconVersion] = useState(0)' {filepath}""")
print("Result:", out, err)

# Verify
out, err = ssh_exec(f"grep -n 'logoVersion\\|faviconVersion' {filepath}")
print("State vars:", out)

# 2. Replace the logo img src to include version cache-busting
# The exact line is: <img src="/api/branding/logo.png" alt="BlivoAI Logo" className="w-16 h-16 rounded-xl mx-auto mb-3" />
print("\n=== Step 2: Update logo img src ===")
out, err = ssh_exec(f"""sed -i 's|src="/api/branding/logo.png" alt="BlivoAI Logo" className="w-16 h-16 rounded-xl mx-auto mb-3"|src={`/api/branding/logo.png?v=${logoVersion}`} alt="BlivoAI Logo" className="w-16 h-16 rounded-xl mx-auto mb-3"|g' {filepath}""")
print("Result:", out, err)

# 3. Replace the favicon img src to include version cache-busting
print("\n=== Step 3: Update favicon img src ===")
out, err = ssh_exec(f"""sed -i 's|src="/api/branding/favicon.ico" alt="BlivoAI Favicon" className="w-10 h-10 rounded-md mx-auto mb-3"|src={`/api/branding/favicon.ico?v=${faviconVersion}`} alt="BlivoAI Favicon" className="w-10 h-10 rounded-md mx-auto mb-3"|g' {filepath}""")
print("Result:", out, err)

# 4. Replace line 1980 (logo upload success redirect) - first window.location.href after "Logo updated!"
# Find the line that has "Force refresh" comment + window.location.href and replace both lines
print("\n=== Step 4: Replace logo upload redirect ===")
# Replace "Force refresh with cache bypass to show the new logo" comment + window.location.href line
# with "Update logo version to force image refresh" + setLogoVersion(Date.now())
out, err = ssh_exec(f"""sed -i '/\/\/ Force refresh with cache bypass to show the new logo/{N;s/\/\/ Force refresh with cache bypass to show the new logo\n.*window\.location\.href = window\.location\.href\.split.*Date\.now()/\/\/ Update logo version to force image refresh\n                      setLogoVersion(Date.now())/}' {filepath}""")
print("Result:", out, err)

# 5. Replace line 2016 (favicon upload success redirect) - second window.location.href
print("\n=== Step 5: Replace favicon upload redirect ===")
out, err = ssh_exec(f"""sed -i '/\/\/ Force refresh with cache bypass/{N;s/\/\/ Force refresh with cache bypass\n.*window\.location\.href = window\.location\.href\.split.*Date\.now()/\/\/ Update favicon version to force image refresh\n                      setFaviconVersion(Date.now())/}' {filepath}""")
print("Result:", out, err)

# 6. Update header logo Image component to include version
print("\n=== Step 6: Update header Image component ===")
# <Image src="/api/branding/logo.png" alt="BlivoAI" width={36} height={36} className="rounded-lg" />
# Change to dynamic src with version
out, err = ssh_exec(f"""sed -i 's|<Image src="/api/branding/logo.png" alt="BlivoAI" width={36} height={36} className="rounded-lg" />|<Image src={`/api/branding/logo.png?v=${logoVersion}`} alt="BlivoAI" width={36} height={36} className="rounded-lg" key={logoVersion} />|g' {filepath}""")
print("Result:", out, err)

# 7. Update card title logo Image component
print("\n=== Step 7: Update card title Image ===")
out, err = ssh_exec(f"""sed -i 's|<Image src="/api/branding/logo.png" alt="BlivoAI" width={20} height={20} className="rounded-md" />|<Image src={`/api/branding/logo.png?v=${logoVersion}`} alt="BlivoAI" width={20} height={20} className="rounded-md" key={`card-${logoVersion}`} />|g' {filepath}""")
print("Result:", out, err)

# ============================================
# Verify all changes
# ============================================
print("\n=== FINAL VERIFICATION ===")
out, err = ssh_exec(f"grep -n 'logoVersion\\|faviconVersion\\|setLogoVersion\\|setFaviconVersion' {filepath}")
print("Version refs:", out)

out, err = ssh_exec(f"grep -n 'window.location.href' {filepath}")
print("window.location.href remaining (should be 1 line for logout):", out)

# Read the logo upload section to verify
out, err = ssh_exec(f"sed -n '1964,2000p' {filepath}")
print("\nLogo upload section:", out[:2000])
