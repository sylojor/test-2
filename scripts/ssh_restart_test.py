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

# Restart
print("=== Restarting container ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose down && docker compose up -d 2>&1")
print(out[-500:])

time.sleep(15)

# Check container
print("\n=== Container status ===")
out, err = ssh_exec("docker ps | grep demo")
print(out)

# Test favicon routes
print("\n=== Test favicon.ico (via rewrite) ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/favicon.ico 2>&1 | head -10")
print(out)

print("\n=== Test /icon route ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/icon 2>&1 | head -10")
print(out)

# Login and test upload
print("\n=== Login ===")
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' \
  -c /tmp/cookies.txt""")
data = json.loads(out)
token = data.get('token', '')
print("Login OK, token:", len(token))

# Create test favicon PNG and upload
print("\n=== Create and upload favicon ===")
out, err = ssh_exec("""python3 -c "
from PIL import Image
img = Image.new('RGBA', (32, 32), (255, 0, 128, 255))
img.save('/tmp/test-fav.png')
print('OK')
" """)
print("Create:", out)

out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
  -F 'file=@/tmp/test-fav.png' \
  -F 'type=favicon' \
  -b /tmp/cookies.txt""")
print("Upload:", out)

# Verify files in container
print("\n=== Branding files ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)

# Check that /icon serves custom favicon now
time.sleep(3)
print("\n=== Download and compare /icon vs custom favicon ===")
out, err = ssh_exec("curl -s http://localhost:3001/icon -o /tmp/icon_result.png && wc -c /tmp/icon_result.png && curl -s http://localhost:3001/api/branding/favicon-32x32.png -o /tmp/branding_result.png && wc -c /tmp/branding_result.png")
print(out)
