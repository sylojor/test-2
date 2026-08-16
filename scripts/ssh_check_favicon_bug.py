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
# Check the actual createIco code on the server - there's a bug!
# ============================================
print("=== Check createIco function ===")
out, err = ssh_exec("grep -n 'createIco\|Buffer.concat\|eader\|header' ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print(out)

# Read the exact lines around createIco
print("\n=== Read createIco section ===")
out, err = ssh_exec("sed -n '140,165p' ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print(out)

# ============================================
# Check the favicon link tag in the HTML/layout
# ============================================
print("\n=== Check favicon link tags ===")
out, err = ssh_exec("grep -rn 'favicon\|icon' ~/blivoai-demo/src/app/layout.tsx")
print(out)

out, err = ssh_exec("grep -rn 'favicon\|icon' ~/blivoai-demo/src/app/'[lang]'/layout.tsx")
print(out)
