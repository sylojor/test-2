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
# Test login with correct credentials: admin@blivoai.com / BlivoAdmin2024!
# ============================================
print("=== Test login with correct credentials ===")
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}' \
  -c /tmp/test-cookies.txt 2>&1""")
print("Login response:", out[:500])

# Check cookies
print("\n=== Check cookies ===")
out, err = ssh_exec("cat /tmp/test-cookies.txt")
print(out)

# ============================================
# Test logo upload with the cookie
# ============================================
print("\n=== Test logo upload ===")
# Create a small test PNG
out, err = ssh_exec("""python3 -c "
import struct, zlib

# Create a minimal 1x1 red PNG
def create_png():
    width, height = 1, 1
    raw = b'\\x00\\x00\\xff\\x00'  # R=0, G=0, B=255, A=0 (red pixel)
    
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw)
    
    return b'\\x89PNG\\r\\n\\x1a\\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

png = create_png()
with open('/tmp/test-logo.png', 'wb') as f:
    f.write(png)
print(f'Test PNG created: {len(png)} bytes')
" """)
print(out)

# Upload using the cookie from login
out, err = ssh_exec("""curl -s -X POST http://localhost:3001/api/upload/branding \
  -F 'file=@/tmp/test-logo.png' \
  -F 'type=logo' \
  -b /tmp/test-cookies.txt 2>&1""")
print("Upload response:", out)

# ============================================
# Check if file was saved in container
# ============================================
print("\n=== Check uploaded file in container ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)

# ============================================
# Check branding route serves the new file
# ============================================
print("\n=== Check branding route ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/api/branding/logo.png | head -5")
print(out)

# Also test from the browser side (external URL)
print("\n=== Test external branding route ===")
out, err = ssh_exec("curl -s -I http://141.95.55.5:3001/api/branding/logo.png | head -5")
print(out)
