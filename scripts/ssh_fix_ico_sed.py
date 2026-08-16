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
# Fix createIco bug using sed — replace 'eader' with '[header'
# ============================================
filepath = "~/blivoai-demo/src/app/api/upload/branding/route.ts"

print("=== Fix createIco bug with sed ===")
out, err = ssh_exec(f"sed -i 's/return Buffer.concat(eader, entry32, entry16, png32, png16])/return Buffer.concat([header, entry32, entry16, png32, png16])/' {filepath}")
print("sed result:", out, err)

# Verify the fix
out, err = ssh_exec(f"grep 'Buffer.concat' {filepath}")
print("Verify:", out)

# Also verify the entire createIco function is correct now
out, err = ssh_exec(f"sed -n '217,248p' {filepath}")
print("\ncreateIco function:", out)
