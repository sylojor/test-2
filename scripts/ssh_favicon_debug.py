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
# 1. Check the favicon upload code section
# ============================================
filepath = "~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx"
print("=== Favicon upload section ===")
out, err = ssh_exec("sed -n '1993,2030p' " + filepath)
print(out)

# ============================================
# 2. Check the upload/branding route for favicon handling
# ============================================
print("\n=== Upload route — favicon section ===")
out, err = ssh_exec("cat ~/blivoai-demo/src/app/api/upload/branding/route.ts")
# Find the favicon section
lines = out.split('\n')
for i, line in enumerate(lines):
    if 'favicon' in line.lower() or 'ico' in line.lower():
        start = max(0, i-2)
        end = min(len(lines), i+3)
        print(f"Line {i}: {line}")
        for j in range(start, end):
            print(f"  {j}: {lines[j]}")

# ============================================
# 3. Check the favicon ICO bug in the upload route
# ============================================
print("\n=== Check for ICO creation bug ===")
out, err = ssh_exec("grep -n 'Buffer.concat' ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print(out)

# ============================================
# 4. Check the branding route for favicon serving
# ============================================
print("\n=== Branding route — favicon handling ===")
out, err = ssh_exec("cat ~/blivoai-demo/src/app/api/branding/'[...files]'/route.ts")
# Find favicon-related lines
for i, line in enumerate(out.split('\n')):
    if 'favicon' in line.lower() or 'ico' in line.lower() or 'ALLOWED_FILES' in line:
        print(f"Line {i}: {line}")

# ============================================
# 5. Test favicon upload directly
# ============================================
print("\n=== Test favicon upload ===")
# Login first
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' \
  -c /tmp/test-cookies.txt 2>&1""")
import json
try:
    data = json.loads(out)
    token = data.get('token', '')
    print("Login OK")
except:
    print("Login failed:", out[:200])

# Try to upload the existing favicon.ico as a test
out, err = ssh_exec("docker cp demo-chatbot:/app/data/branding/favicon.ico /tmp/test-favicon.ico")
print(out, err)

out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
  -F 'file=@/tmp/test-favicon.ico' \
  -F 'type=favicon' \
  -b /tmp/test-cookies.txt 2>&1""")
print("Favicon upload response:", out[:500])

# ============================================
# 6. Try with a PNG file as favicon (the user might be uploading PNG)
# ============================================
print("\n=== Test favicon upload with PNG ===")
out, err = ssh_exec("docker cp demo-chatbot:/app/data/branding/logo.png /tmp/test-favicon-png.png")
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
  -F 'file=@/tmp/test-favicon-png.png' \
  -F 'type=favicon' \
  -b /tmp/test-cookies.txt 2>&1""")
print("Favicon PNG upload response:", out[:500])

# ============================================
# 7. Check current favicon files in container
# ============================================
print("\n=== Check branding files ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)
