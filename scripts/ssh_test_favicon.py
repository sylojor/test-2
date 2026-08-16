import paramiko
import time
import json

def ssh_exec(command, timeout=120):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# Wait for app to be ready
time.sleep(15)

# Check container status
print("=== Container status ===")
out, err = ssh_exec("docker ps | grep demo")
print(out)

# Check startup logs
print("\n=== Startup logs ===")
out, err = ssh_exec("docker logs demo-chatbot --tail 10 2>&1")
print(out)

# ============================================
# Test 1: Login
# ============================================
print("\n=== Test 1: Login ===")
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' \
  -c /tmp/cookies.txt""")
data = json.loads(out)
token = data.get('token', '')
print("Login OK, token length:", len(token))

# ============================================
# Test 2: Favicon upload (PNG image → converted to ICO)
# ============================================
print("\n=== Test 2: Favicon upload (PNG → ICO conversion) ===")
# Create a proper test PNG using PIL
out, err = ssh_exec("""python3 -c "
from PIL import Image
img = Image.new('RGBA', (32, 32), (255, 100, 0, 255))  # Orange favicon
# Draw a simple pattern
for x in range(10, 22):
    for y in range(10, 22):
        img.putpixel((x, y), (0, 0, 255, 255))  # Blue center
img.save('/tmp/test-favicon.png')
print(f'Created {img.size} PNG')
" """)
print("Create test favicon:", out)

# Upload using cookie auth
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
  -F 'file=@/tmp/test-favicon.png' \
  -F 'type=favicon' \
  -b /tmp/cookies.txt""")
print("Upload response:", out)

# ============================================
# Test 3: Verify favicon files exist
# ============================================
print("\n=== Test 3: Verify favicon files ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)

# ============================================
# Test 4: Verify favicon route serves the file
# ============================================
print("\n=== Test 4: Test favicon.ico route ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/api/branding/favicon.ico")
print(out)

# ============================================
# Test 5: Test /icon route (should serve custom favicon)
# ============================================
print("\n=== Test 5: Test /icon route (Next.js convention) ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/icon")
print(out)

# ============================================
# Test 6: Test favicon-32x32.png route
# ============================================
print("\n=== Test 6: Test favicon-32x32.png route ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/api/branding/favicon-32x32.png")
print(out)
