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

# Rebuild (since we removed a file from public/)
print("=== Rebuilding ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose build 2>&1 | tail -10", timeout=600)
print(out)

# Restart
print("\n=== Restarting ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose down && docker compose up -d 2>&1", timeout=60)
print(out[-500:])

time.sleep(15)

# Check container
print("\n=== Container ===")
out, err = ssh_exec("docker ps | grep demo")
print(out)

# Test favicon.ico via rewrite (should now serve from /api/branding/)
print("\n=== Test /favicon.ico ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/favicon.ico 2>&1 | head -10")
print(out)

# Also test /api/branding/favicon.ico
print("\n=== Test /api/branding/favicon.ico ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/api/branding/favicon.ico 2>&1 | head -10")
print(out)

# Test /icon
print("\n=== Test /icon ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/icon 2>&1 | head -10")
print(out)

# Login and upload favicon again (since volume might have been reset)
print("\n=== Login and upload favicon ===")
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' \
  -c /tmp/cookies.txt""")
data = json.loads(out)
token = data.get('token', '')
print("Login OK:", len(token))

# Create and upload
out, err = ssh_exec("""python3 -c "from PIL import Image; img = Image.new('RGBA', (32, 32), (0, 200, 100, 255)); img.save('/tmp/tf.png')" """)
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
  -F 'file=@/tmp/tf.png' \
  -F 'type=favicon' \
  -b /tmp/cookies.txt""")
print("Upload:", out)

# Verify /favicon.ico now serves custom
time.sleep(2)
print("\n=== Compare /favicon.ico with /api/branding/favicon.ico ===")
out, err = ssh_exec("curl -s http://localhost:3001/favicon.ico -o /tmp/rewrite_fav.ico && curl -s http://localhost:3001/api/branding/favicon.ico -o /tmp/api_fav.ico && python3 -c \"import os; print(f'/favicon.ico: {os.path.getsize(\"/tmp/rewrite_fav.ico\")} bytes'); print(f'/api/branding/favicon.ico: {os.path.getsize(\"/tmp/api_fav.ico\")} bytes')\"")
print(out)

# Check branding files in container
print("\n=== Branding files ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)
