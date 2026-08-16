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

out, err = ssh_exec("docker logs demo-chatbot --tail 5 2>&1")
print("Logs:", out)

# Login
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' -c /tmp/c.txt""")
token = json.loads(out).get('token','')
print("Token:", len(token))

# Upload favicon
out, err = ssh_exec("""python3 -c "from PIL import Image; Image.new('RGBA',(32,32),(0,128,255,255)).save('/tmp/tf.png')" && curl -s -X POST http://localhost:3001/api/upload/branding -F 'file=@/tmp/tf.png' -F 'type=favicon' -b /tmp/c.txt""")
print("Favicon:", out)

# Upload logo
out, err = ssh_exec("""python3 -c "from PIL import Image; img=Image.new('RGBA',(256,256),(0,128,255,255)); img.save('/tmp/tl.png')" && curl -s -X POST http://localhost:3001/api/upload/branding -F 'file=@/tmp/tl.png' -F 'type=logo' -b /tmp/c.txt""")
print("Logo:", out)

time.sleep(2)

# Check sizes
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print("\nFiles:", out)
