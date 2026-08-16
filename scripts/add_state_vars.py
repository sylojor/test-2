import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx', 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8')

# Check if logoVersion useState is anywhere in the file
search = 'const [logoVersion, setLogoVersion] = useState(0)'
if search in content:
    print(f"logoVersion state IS in file at offset: {content.find(search)}")
else:
    print(f"logoVersion state NOT in file - need to add it!")

# Add the state declarations to AdminContent after loginLoading
target = 'const [loginLoading, setLoginLoading] = useState(false)\n\n  useEffect'
replacement = 'const [loginLoading, setLoginLoading] = useState(false)\n  const [logoVersion, setLogoVersion] = useState(0)\n  const [faviconVersion, setFaviconVersion] = useState(0)\n\n  useEffect'

if target in content:
    content = content.replace(target, replacement)
    print("Added logoVersion/faviconVersion after loginLoading state")
else:
    # Try without the double newline
    target2 = 'const [loginLoading, setLoginLoading] = useState(false)\n\n  useEffect'
    if target2 in content:
        content = content.replace(target2, replacement)
        print("Added logoVersion/faviconVersion (alt format)")
    else:
        # Try even simpler - find loginLoading line and insert after
        ll_idx = content.find('const [loginLoading, setLoginLoading] = useState(false)')
        if ll_idx >= 0:
            end_idx = content.find('\n', ll_idx) + 1
            insert_text = '  const [logoVersion, setLogoVersion] = useState(0)\n  const [faviconVersion, setFaviconVersion] = useState(0)\n'
            content = content[:end_idx] + insert_text + content[end_idx:]
            print("Inserted logoVersion/faviconVersion after loginLoading line by index")
        else:
            print("FAIL: Could not find loginLoading!")

# Verify
if 'const [logoVersion, setLogoVersion] = useState(0)' in content:
    pos = content.find('const [logoVersion, setLogoVersion] = useState(0)')
    print(f"VERIFIED: logoVersion state at offset {pos} (should be < 12000 for AdminContent)")
else:
    print("FAIL: logoVersion state still not in file!")

# Write back using binary mode to avoid encoding issues
encoded = content.encode('utf-8')
with sftp.open('/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx', 'wb') as f:
    f.write(encoded)

print(f"File written: {len(encoded)} bytes")

# Verify by reading back
with sftp.open('/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx', 'rb') as f:
    verify_raw = f.read()
verify = verify_raw.decode('utf-8')

# Count logoVersion useState
count = verify.count('const [logoVersion, setLogoVersion] = useState(0)')
print(f"Final verification: logoVersion useState appears {count} times")

# Find where it is
pos = verify.find('const [logoVersion, setLogoVersion] = useState(0)')
if pos >= 0:
    print(f"Position: {pos}")
    print(f"Context: {verify[pos:pos+120]}")

sftp.close()
ssh.close()
