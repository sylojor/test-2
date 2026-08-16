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

# Check the exact content of line 244
filepath = "~/blivoai-demo/src/app/api/upload/branding/route.ts"
out, err = ssh_exec(f"sed -n '244p' {filepath}")
print("Line 244 exact:", repr(out))
print("Line 244:", out)

# Also check what characters are there
out, err = ssh_exec(f"python3 -c \"with open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts') as f: lines=f.readlines(); print(repr(lines[243]))\"")
print("Python repr:", out)
