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

# Read the icon.tsx file
print("=== icon.tsx (Next.js file-based favicon route) ===")
out, err = ssh_exec("cat ~/blivoai-demo/src/app/icon.tsx")
print(out)

# Read the full createIco section from the upload route
print("\n=== createIco function (line 217-244) ===")
out, err = ssh_exec("sed -n '217,250p' ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print(out)
