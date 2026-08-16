import paramiko

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
# Read full layout.tsx to understand favicon setup
# ============================================
print("=== Layout.tsx metadata ===")
out, err = ssh_exec("cat ~/blivoai-demo/src/app/layout.tsx")
print(out[:3000])

# Also read the [lang]/layout.tsx
print("\n=== [lang]/layout.tsx ===")
out, err = ssh_exec("cat ~/blivoai-demo/src/app/'[lang]'/layout.tsx")
print(out[:3000])

# Check if there's an /icon route (Next.js convention)
print("\n=== Check icon route ===")
out, err = ssh_exec("find ~/blivoai-demo/src/app -name 'icon*' -type f")
print(out)

# Check the public directory for favicon files
print("\n=== Check public dir for favicons ===")
out, err = ssh_exec("ls ~/blivoai-demo/public/icon* ~/blivoai-demo/public/favicon* 2>/dev/null")
print(out)

# Read the favicon.ico in public dir if exists
print("\n=== Check static favicon files ===")
out, err = ssh_exec("ls -la ~/blivoai-demo/public/ | grep -i 'icon\|favicon'")
print(out)
