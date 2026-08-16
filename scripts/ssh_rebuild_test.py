import paramiko
import time
import json

def ssh_exec(command, timeout=600):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# ============================================
# Build and deploy
# ============================================
print("=== Building Docker ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose build 2>&1 | tail -20", timeout=600)
print(out[-2000:])

# Restart
print("\n=== Restarting ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose down && docker compose up -d 2>&1", timeout=60)
print(out[-500:])

# Wait for app ready
time.sleep(15)

# Check container
print("\n=== Container status ===")
out, err = ssh_exec("docker ps | grep demo")
print(out)

# Check logs
print("\n=== Startup logs ===")
out, err = ssh_exec("docker logs demo-chatbot --tail 8 2>&1")
print(out)

# ============================================
# Test: Login and favicon upload
# ============================================
print("\n=== Login ===")
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' \
  -c /tmp/cookies.txt""")
data = json.loads(out)
token = data.get('token', '')
print("Login OK, token length:", len(token))

# ============================================
# Test: Upload favicon PNG
# ============================================
print("\n=== Upload favicon ===")
# Create test PNG
out, err = ssh_exec("""python3 -c "
from PIL import Image
img = Image.new('RGBA', (32, 32), (0, 128, 255, 255))
img.save('/tmp/test-fav.png')
" """)

out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
  -F 'file=@/tmp/test-fav.png' \
  -F 'type=favicon' \
  -b /tmp/cookies.txt""")
print("Upload:", out)

# ============================================
# Test: Verify favicon.ico and /icon routes serve custom favicon
# ============================================
print("\n=== Test favicon.ico (external URL via rewrite) ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/favicon.ico | head -5")
print(out)

print("\n=== Test /icon route ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/icon | head -5")
print(out)

print("\n=== Test /api/branding/favicon.ico ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/api/branding/favicon.ico | head -5")
print(out)

# ============================================
# Check that /icon now serves the custom favicon (not cached default)
# ============================================
print("\n=== Compare /icon vs /api/branding/favicon-32x32.png content ===")
out, err = ssh_exec("curl -s http://localhost:3001/icon -o /tmp/icon_test.png && curl -s http://localhost:3001/api/branding/favicon-32x32.png -o /tmp/branding_test.png && python3 -c \"import os; print(f'/icon size: {os.path.getsize(chr(47)+chr(116)+chr(109)+chr(112)+chr(47)+chr(105)+chr(99)+chr(111)+chr(110)+chr(95)+chr(116)+chr(101)+chr(115)+chr(116)+chr(46)+chr(112)+chr(110)+chr(103))} bytes'); print(f'/api/branding size: {os.path.getsize(chr(47)+chr(116)+chr(109)+chr(112)+chr(47)+chr(98)+chr(114)+chr(97)+chr(110)+chr(100)+chr(105)+chr(110)+chr(103)+chr(95)+chr(116)+chr(101)+chr(115)+chr(116)+chr(46)+chr(112)+chr(110)+chr(103))} bytes')\"")
print(out)

# Also check branding files in container
print("\n=== Branding files in container ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)
