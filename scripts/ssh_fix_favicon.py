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

# Check favicon upload handler - read the full section
print("=== Favicon upload handler ===")
out, err = ssh_exec("sed -n '1993,2030p' ~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx")
print(out)

# Check the upload route - the favicon section specifically
print("\n=== Upload route - favicon bug ===")
out, err = ssh_exec("cat ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print(out)

# Test favicon upload directly
print("\n=== Test favicon upload ===")
# Login first
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' \
  -c /tmp/cookies.txt 2>&1""")
import json
data = json.loads(out)
token = data.get('token', '')

# Create a small PNG to use as favicon test
out, err = ssh_exec("""python3 -c "
from PIL import Image
img = Image.new('RGBA', (32, 32), (255, 0, 0, 255))
img.save('/tmp/test-favicon.png')
print('Test favicon PNG created')
" """)
if 'created' not in out:
    # Alternative: use sharp to create test favicon
    out, err = ssh_exec("""node -e "
const sharp = require('sharp');
sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } })
  .png()
  .toFile('/tmp/test-favicon.png')
  .then(() => console.log('created'))
  .catch(e => console.log('err:', e.message));
" """)
print("Create test favicon:", out)

# Upload favicon
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
  -F 'file=@/tmp/test-favicon.png' \
  -F 'type=favicon' \
  -H 'Authorization: Bearer {}' 2>&1""".format(token))
print("Favicon upload response:", out)

# Check container branding dir
print("\n=== Check branding dir after favicon upload ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)

# Test serving favicon
print("\n=== Test favicon route ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/api/branding/favicon.ico | head -10")
print(out)
