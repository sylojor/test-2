import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx', 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8')
print(f"Original file size: {len(content)} chars")

# 1. Add logoVersion and faviconVersion state declarations to AdminContent
# Find the right insertion point: after loginLoading state declaration
insert_after = "const [loginLoading, setLoginLoading] = useState(false)"
insert_point = content.find(insert_after)
if insert_point >= 0:
    # Insert after this line
    end_of_line = content.find('\n', insert_point) + 1
    new_states = "\n  const [logoVersion, setLogoVersion] = useState(0)\n  const [faviconVersion, setFaviconVersion] = useState(0)"
    content = content[:end_of_line] + new_states + content[end_of_line:]
    print("1. Added logoVersion/faviconVersion state declarations to AdminContent")
else:
    print("1. FAIL: Could not find insertion point")

# 2. Remove logoVersion and faviconVersion from SystemTab
old_sys_states = "  const [logoVersion, setLogoVersion] = useState(0)\n  const [faviconVersion, setFaviconVersion] = useState(0)"
if old_sys_states in content:
    content = content.replace(old_sys_states, "")
    print("2. Removed logoVersion/faviconVersion from SystemTab")
else:
    # Try alternate formatting
    alt = "  const [logoVersion, setLogoVersion] = useState(0)\n  const [faviconVersion, setFaviconVersion] = useState(0)\n"
    if alt in content:
        content = content.replace(alt, "")
        print("2. Removed logoVersion/faviconVersion from SystemTab (alt format)")
    else:
        print("2. FAIL: Could not find old state declarations in SystemTab")

# 3. Update SystemTab invocation to pass props
old_invocation = "<SystemTab lang={lang} />"
new_invocation = "<SystemTab lang={lang} logoVersion={logoVersion} setLogoVersion={setLogoVersion} faviconVersion={faviconVersion} setFaviconVersion={setFaviconVersion} />"
if old_invocation in content:
    content = content.replace(old_invocation, new_invocation)
    print("3. Updated SystemTab invocation with props")
else:
    print("3. FAIL: Could not find SystemTab invocation")

# 4. Update SystemTab props definition
old_props = "function SystemTab({ lang }: { lang: \"ar\" | \"en\" })"
new_props = "function SystemTab({ lang, logoVersion, setLogoVersion, faviconVersion, setFaviconVersion }: { lang: \"ar\" | \"en\"; logoVersion: number; setLogoVersion: (v: number) => void; faviconVersion: number; setFaviconVersion: (v: number) => void })"
if old_props in content:
    content = content.replace(old_props, new_props)
    print("4. Updated SystemTab props definition")
else:
    print("4. FAIL: Could not find SystemTab props definition")

# Write back
with sftp.open('/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx', 'w') as f:
    f.write(content)

print(f"\nNew file size: {len(content)} chars")

# Verify fixes
with sftp.open('/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx', 'r') as f:
    verify = f.read().decode('utf-8')

checks = [
    ("logoVersion state in AdminContent", "const [logoVersion, setLogoVersion] = useState(0)" in verify and verify.find("const [logoVersion") < 20000),
    ("logoVersion removed from SystemTab", verify.find("const [logoVersion", 80000) < 0 or verify.find("const [logoVersion", 80000) > 90000),
    ("SystemTab invocation has props", "setLogoVersion={setLogoVersion}" in verify),
    ("SystemTab props definition updated", "setLogoVersion: (v: number)" in verify),
]

for desc, passed in checks:
    print(f"  {passed and '✅' or '❌'} {desc}")

sftp.close()
ssh.close()
