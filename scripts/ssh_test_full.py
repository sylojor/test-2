import paramiko
import time

def ssh_exec(command, timeout=120):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# ============================================
# Test with a proper PNG file (using the existing logo.png as test data)
# This will verify the full upload flow works end-to-end
# ============================================

# First login to get auth
print("=== Login ===")
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' \
  -c /tmp/test-cookies.txt 2>&1""")
token = None
try:
    import json
    data = json.loads(out)
    token = data.get('token', '')
    print("Login OK, token length:", len(token))
except:
    print("Login response:", out[:200])

# Use the existing logo.png from the container as test data (it's a valid PNG)
print("\n=== Copy existing logo.png for test ===")
out, err = ssh_exec("docker cp demo-chatbot:/app/data/branding/logo.png /tmp/test-valid-logo.png")
print(out, err)

out, err = ssh_exec("ls -la /tmp/test-valid-logo.png")
print(out)

# ============================================
# Test 1: Upload with cookie (simulating browser behavior)
# ============================================
print("\n=== Test 1: Upload with cookie ===")
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
  -F 'file=@/tmp/test-valid-logo.png' \
  -F 'type=logo' \
  -b /tmp/test-cookies.txt 2>&1""")
print("Upload with cookie:", out[:500])

# ============================================
# Test 2: Upload with Authorization header (simulating what the fixed code will do)
# ============================================
print("\n=== Test 2: Upload with Authorization header ===")
if token:
    out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
      -F 'file=@/tmp/test-valid-logo.png' \
      -F 'type=logo' \
      -H 'Authorization: Bearer {}' 2>&1""".format(token))
    print("Upload with auth header:", out[:500])

# ============================================
# Check uploaded file
# ============================================
print("\n=== Check branding files after upload ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)

# ============================================
# Check the httpOnly flag on the cookie from login
# ============================================
print("\n=== Verify httpOnly is now false ===")
out, err = ssh_exec("grep 'httpOnly' ~/blivoai-demo/src/app/api/auth/login/route.ts")
print(out)

# Check the actual cookie in the response
print("\n=== Check cookie flags ===")
out, err = ssh_exec("""curl -s -v -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' 2>&1 | grep -i 'set-cookie'""")
print(out)
