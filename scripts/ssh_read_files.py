import paramiko

def ssh_exec(command):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=30)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# Read lines 1860-2030 of admin-content.tsx (the branding/upload section)
print("=== ADMIN-CONTENT.TSX (lines 1860-2030) ===")
out, err = ssh_exec("sed -n '1860,2030p' ~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx")
print(out)

# Also check how login sets the cookie
print("\n=== LOGIN ROUTE (full cookie setting) ===")
out, err = ssh_exec("sed -n '120,135p' ~/blivoai-demo/src/app/api/auth/login/route.ts")
print(out)
