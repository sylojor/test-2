import paramiko
import time

def ssh_exec(command, timeout=300):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# ============================================
# Step 1: Stop the running container
# ============================================
print("=== Step 1: Stop current container ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose down", timeout=60)
print(out, err)

# ============================================
# Step 2: Build the new Docker image
# ============================================
print("\n=== Step 2: Build Docker image ===")
# This might take a few minutes
out, err = ssh_exec("cd ~/blivoai-demo && docker compose build --no-cache 2>&1", timeout=600)
print(out[-3000:])
print("Build errors:", err[-500:])

# ============================================
# Step 3: Start the container
# ============================================
print("\n=== Step 3: Start container ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose up -d 2>&1", timeout=60)
print(out, err)

# ============================================
# Step 4: Check container is running
# ============================================
print("\n=== Step 4: Check container status ===")
out, err = ssh_exec("docker ps | grep demo")
print(out)

# ============================================
# Step 5: Check logs for startup
# ============================================
print("\n=== Step 5: Check startup logs ===")
out, err = ssh_exec("docker logs demo-chatbot --tail 20 2>&1", timeout=30)
print(out)

# ============================================
# Step 6: Wait for app to be ready and test branding route
# ============================================
print("\n=== Step 6: Wait for app and test branding route ===")
time.sleep(5)
out, err = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/branding/logo.png", timeout=30)
print("Branding route status:", out)

out, err = ssh_exec("curl -s -I http://localhost:3001/api/branding/logo.png | head -5", timeout=30)
print("Branding route headers:", out)

# ============================================
# Step 7: Test logo upload (create a test PNG and upload it)
# ============================================
print("\n=== Step 7: Test logo upload ===")
# First, login to get a token
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@blivoai.com","password":"admin123"}' -c /tmp/cookies.txt 2>&1""", timeout=30)
print("Login response:", out[:500])

# Check if we got the cookie
out, err = ssh_exec("cat /tmp/cookies.txt")
print("Cookies:", out)
