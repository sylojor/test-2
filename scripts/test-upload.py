#!/usr/bin/env python3
"""Test logo upload on deployed server"""

import paramiko
import json

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

def r(cmd, t=60):
    print(f">>> {cmd[:80]}")
    i,o,e = client.exec_command(cmd, timeout=t)
    try: out = o.read().decode('utf-8','replace')
    except: out = "(timeout)"
    try: err = e.read().decode('utf-8','replace')
    except: err = ""
    print(out[-1500:] if len(out)>1500 else out)
    if err: print(f"[e] {err[-300:]}")
    return out

# 1. Login to get token
print("=== Login ===")
login_out = r("curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@blivoai.com\",\"password\":\"BlivoAdmin2024!\"}'")
token = json.loads(login_out.strip())["token"]
print(f"Got token: {token[:30]}...")

# 2. Create test PNG using Python (write a script file to avoid quoting issues)
print("\n=== Create test PNG ===")
r("python3 /tmp/make_png.py || echo 'need to create script'")
# Write the script file via SSH
script = """import struct, zlib
w, h = 16, 16
raw = b'\\x00' + b'\\xff\\x00\\x00\\xff' * w * h
compressed = zlib.compress(raw)
def chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
png = b'\\x89PNG\\r\\n\\x1a\\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')
with open('/tmp/test-logo.png', 'wb') as f:
    f.write(png)
print(f'Created PNG: {len(png)} bytes')
"""
r(f"echo '{script}' > /tmp/make_png.py && python3 /tmp/make_png.py")
r("ls -la /tmp/test-logo.png")

# 3. Upload logo with Bearer token
print("\n=== Upload Logo ===")
upload_cmd = f"curl -s -X POST http://localhost:3001/api/upload/branding -H 'Authorization: Bearer {token}' -F 'type=logo' -F 'file=@/tmp/test-logo.png'"
upload_out = r(upload_cmd)
print(f"Upload result: {upload_out.strip()}")

# 4. Check files
print("\n=== Check Files ===")
r("docker exec demo-chatbot ls -la /app/data/branding/")
r("docker exec demo-chatbot ls -la /app/public/logo.png /app/public/logo.svg")

# 5. Check branding API
print("\n=== Branding API ===")
r("curl -s -o /dev/null -w 'logo.svg: %{http_code} %{size_download}b\\n' http://localhost:3001/api/branding/logo.svg")
r("curl -s -o /dev/null -w 'logo.png: %{http_code} %{size_download}b\\n' http://localhost:3001/api/branding/logo.png")

# 6. Check the uploaded logo content
print("\n=== Logo SVG Content ===")
r("curl -s http://localhost:3001/api/branding/logo.svg | head -3")

client.close()
print("\nDone!")
