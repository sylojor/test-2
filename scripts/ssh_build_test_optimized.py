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

# Build
print("=== Building ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose build 2>&1 | tail -10", timeout=600)
print(out)

# Restart
print("\n=== Restarting ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose down && docker compose up -d 2>&1", timeout=60)
print(out[-500:])

time.sleep(15)

# Check
print("\n=== Container ===")
out, err = ssh_exec("docker ps | grep demo")
print(out)

# Test login
print("\n=== Login ===")
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' -c /tmp/c.txt""")
data = json.loads(out)
token = data.get('token','')
print("Token:", len(token))

# Create and upload test favicon (simple image)
print("\n=== Upload favicon (test) ===")
out, err = ssh_exec("""python3 -c "from PIL import Image; img = Image.new('RGBA',(32,32),(0,128,255,255)); img.save('/tmp/tf.png'); print('OK')" """)
print(out)

out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding -F 'file=@/tmp/tf.png' -F 'type=favicon' -b /tmp/c.txt""")
print("Favicon upload:", out)

# Upload test logo
print("\n=== Upload logo (test) ===")
out, err = ssh_exec("""python3 -c "from PIL import Image; img = Image.new('RGBA',(256,256),(0,128,255,255)); for x in range(80,180): for y in range(80,180): img.putpixel((x,y),(255,255,0,255)); img.save('/tmp/tl.png'); print('OK')" """)
print(out)

out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding -F 'file=@/tmp/tl.png' -F 'type=logo' -b /tmp/c.txt""")
print("Logo upload:", out)

# Check file sizes
time.sleep(2)
print("\n=== Branding file sizes ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)
