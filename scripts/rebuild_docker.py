import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# Rebuild and redeploy Docker
print("🔄 Building Docker image...")
stdin, stdout, stderr = ssh.exec_command(
    'cd ~/blivoai-demo && docker compose build --no-cache app 2>&1',
    timeout=600
)
build_output = stdout.read().decode()
build_errors = stderr.read().decode()

# Check if build succeeded
if 'Successfully' in build_output or 'Successfully' in build_errors:
    print("✅ Docker build succeeded!")
else:
    print("❌ Build may have failed")
    print(f"Last 500 chars: {build_output[-500:]}")
    if build_errors:
        print(f"Errors: {build_errors[-500:]}")

# Restart the container
print("\n🔄 Restarting container...")
stdin, stdout, stderr = ssh.exec_command(
    'cd ~/blivoai-demo && docker compose up -d 2>&1',
    timeout=120
)
up_output = stdout.read().decode()
up_errors = stderr.read().decode()
print(f"Up output: {up_output}")
if up_errors:
    print(f"Up errors: {up_errors}")

# Wait for container to start
import time
time.sleep(10)

# Check container status
stdin, stdout, stderr = ssh.exec_command('docker ps | grep demo', timeout=10)
print(f"\n=== Container Status ===")
print(stdout.read().decode())

# Wait for Next.js to be ready
time.sleep(15)

# Test admin page access
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3001/ar/admin', timeout=10)
print(f"\n=== Admin HTTP Status ===")
print(stdout.read().decode())

# Test login
import json
login_json = json.dumps({"email": "admin@blivoai.com", "password": "BlivoAdmin2024!"})
sftp = ssh.open_sftp()
with sftp.open('/tmp/login_test.json', 'w') as f:
    f.write(login_json)
sftp.close()

stdin, stdout, stderr = ssh.exec_command("curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d @/tmp/login_test.json", timeout=10)
login_resp = stdout.read().decode()
if '"token"' in login_resp:
    print("✅ Login works!")
    # Extract token
    try:
        data = json.loads(login_resp)
        token = data.get('token', '')
        print(f"Token length: {len(token)}")
    except:
        print(f"Login response: {login_resp[:200]}")
else:
    print(f"❌ Login failed: {login_resp[:200]}")

# Test favicon upload with the token
if '"token"' in login_resp:
    try:
        data = json.loads(login_resp)
        token = data['token']
    except:
        token = ""

# Check if branding directory exists and is accessible
stdin, stdout, stderr = ssh.exec_command('docker exec demo-chatbot ls -la /app/data/branding/ 2>&1', timeout=10)
print(f"\n=== Branding Dir ===")
print(stdout.read().decode())

# Check Docker logs for any errors
stdin, stdout, stderr = ssh.exec_command('docker logs demo-chatbot --tail 30 2>&1 | grep -iE "error|fail|warn"', timeout=10)
print(f"\n=== Recent Error Logs ===")
print(stdout.read().decode())

ssh.close()
