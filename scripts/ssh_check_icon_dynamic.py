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

# Check what /icon actually returns - is it the default or custom?
print("=== Check /icon content ===")
# Download the icon and compare sizes
out, err = ssh_exec("curl -s http://localhost:3001/icon -o /tmp/icon_output.png && ls -la /tmp/icon_output.png")
print(out)

# Compare with the custom favicon-32x32.png
out, err = ssh_exec("curl -s http://localhost:3001/api/branding/favicon-32x32.png -o /tmp/custom_favicon.png && ls -la /tmp/custom_favicon.png")
print(out)

# Compare sizes
out, err = ssh_exec("python3 -c \"from PIL import Image; img1 = Image.open('/tmp/icon_output.png'); img2 = Image.open('/tmp/custom_favicon.png'); print(f'/icon: {img1.size}'); print(f'/api/branding: {img2.size}')\"")
print(out)

# ============================================
# The issue is that icon.tsx uses static caching (x-nextjs-cache: HIT)
# We need to make it dynamic so it checks for custom favicon on each request
# ============================================
# Solution: Change icon.tsx to use dynamic rendering
# In Next.js 16, we can export `dynamic = 'force-dynamic'` to skip static caching

print("\n=== Current icon.tsx ===")
out, err = ssh_exec("cat ~/blivoai-demo/src/app/icon.tsx")
print(out)
