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

# Verify img src changes
print("=== Verify logo img src ===")
out, err = ssh_exec("grep -n 'logo.png' " + filepath)
print(out)

print("\n=== Verify favicon img src ===")
out, err = ssh_exec("grep -n 'favicon' " + filepath)
print(out[:1000])

print("\n=== Verify Image components ===")
out, err = ssh_exec("grep -n '<Image src' " + filepath)
print(out[:500])

print("\n=== Verify setLogoVersion/setFaviconVersion ===")
out, err = ssh_exec("grep -n 'setLogoVersion\|setFaviconVersion' " + filepath)
print(out)

# Check the branding route exists
print("\n=== Check branding route ===")
out, err = ssh_exec("find ~/blivoai-demo/src/app/api/branding -name '*.ts'")
print(out)
