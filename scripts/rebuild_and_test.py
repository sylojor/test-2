import paramiko, json, io, time
from PIL import Image

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

print("🔄 Building Docker image...")
stdin, stdout, stderr = ssh.exec_command(
    'cd ~/blivoai-demo && docker compose build --no-cache app 2>&1 | tail -5',
    timeout=600
)
build_output = stdout.read().decode()
print(f"Build output: {build_output}")

# Restart
print("\n🔄 Restarting container...")
stdin, stdout, stderr = ssh.exec_command(
    'cd ~/blivoai-demo && docker compose up -d --force-recreate app 2>&1',
    timeout=120
)
print(stdout.read().decode())

# Wait for startup
time.sleep(30)

# Check container
stdin, stdout, stderr = ssh.exec_command('docker ps | grep demo', timeout=5)
print(f"\n=== Container ===")
print(stdout.read().decode())

# Login
login_json = json.dumps({'email': 'admin@blivoai.com', 'password': 'BlivoAdmin2024!'})
sftp = ssh.open_sftp()
with sftp.open('/tmp/login_test.json', 'w') as f:
    f.write(login_json)

# Create test favicon image
img = Image.new('RGBA', (32, 32), (0, 128, 255, 255))
buf = io.BytesIO()
img.save(buf, format='PNG')
png_data = buf.getvalue()

with sftp.open('/tmp/test_favicon.png', 'wb') as f:
    f.write(png_data)

sftp.close()

# Login
stdin, stdout, stderr = ssh.exec_command('curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d @/tmp/login_test.json', timeout=15)
resp = json.loads(stdout.read().decode())
token = resp['token']
print("✅ Login works")

# Upload favicon
cmd = f'curl -s -X POST http://localhost:3001/api/upload/branding -H "Cookie: oec_token={token}" -F "type=favicon" -F "file=@/tmp/test_favicon.png"'
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
upload_resp = json.loads(stdout.read().decode())
print(f"\n=== Upload Response ===")
print(f"Size: {upload_resp.get('size')} bytes")
print(f"Message: {upload_resp.get('message')}")

# Check actual file sizes
stdin, stdout, stderr = ssh.exec_command('docker exec demo-chatbot ls -la /app/data/branding/ 2>&1', timeout=10)
print(f"\n=== Branding Files ===")
print(stdout.read().decode())

# Verify favicon.ico is valid
stdin, stdout, stderr = ssh.exec_command('docker exec demo-chatbot xxd /app/data/branding/favicon.ico 2>&1 | head -10', timeout=10)
print(f"\n=== Favicon ICO Hex ===")
print(stdout.read().decode())

ssh.close()
