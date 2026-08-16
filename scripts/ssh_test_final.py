import paramiko
import time
import json

def ssh_exec(command, timeout=60):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# Restart
out, err = ssh_exec("cd ~/blivoai-demo && docker compose down && docker compose up -d 2>&1")
print("Restart:", out[-300:])

time.sleep(15)

# Check
out, err = ssh_exec("docker ps | grep demo")
print("Status:", out)

out, err = ssh_exec("docker logs demo-chatbot --tail 5 2>&1")
print("Logs:", out)

# Test favicon.ico via rewrite
print("\nTest /favicon.ico:")
out, err = ssh_exec("curl -s -I http://localhost:3001/favicon.ico 2>&1 | head -8")
print(out)

# Login
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' -c /tmp/c.txt""")
token = json.loads(out).get('token','')
print("Token:", len(token))

# Upload favicon
out, err = ssh_exec("""python3 -c "from PIL import Image; Image.new('RGBA',(32,32),(0,200,100,255)).save('/tmp/tf.png')" """)
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding -F 'file=@/tmp/tf.png' -F 'type=favicon' -b /tmp/c.txt""")
print("Upload:", out)

time.sleep(2)

# Compare
out, err = ssh_exec("curl -s http://localhost:3001/favicon.ico -o /tmp/r.ico && curl -s http://localhost:3001/api/branding/favicon.ico -o /tmp/a.ico && python3 -c \"import os; print(f'rewrite: {os.path.getsize(\"/tmp/r.ico\")}'); print(f'api: {os.path.getsize(\"/tmp/a.ico\")}')\"")
print("Compare:", out)

out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print("Files:", out)
