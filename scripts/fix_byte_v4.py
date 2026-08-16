"""Byte-level fix for syntax bugs on remote server.
Reads raw bytes via SFTP, replaces byte sequences, writes back.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')
sftp = ssh.open_sftp()

# ==========================================
# FIX 1: admin-content.tsx - byte-level
# ==========================================
admin_path = '/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx'

with sftp.open(admin_path, 'rb') as f:
    raw = f.read()

print(f'Admin file size: {len(raw)} bytes')

# Find and replace 'const odelsRes' -> 'const [modelsRes'
old_bytes = b'const odelsRes'
new_bytes = b'const [modelsRes'

idx = raw.find(old_bytes)
print(f'Found "const odelsRes" at byte index: {idx}')

if idx >= 0:
    # Show context
    context = raw[idx:idx+60]
    print(f'Context: {context.decode("utf-8", errors="replace")[:60]}')
    
    raw = raw.replace(old_bytes, new_bytes)
    
    # Verify in modified bytes
    idx2 = raw.find(b'const odelsRes')
    idx3 = raw.find(b'const [modelsRes')
    print(f'After replace: odelsRes at {idx2}, [modelsRes at {idx3}')
    
    # Write back
    with sftp.open(admin_path, 'wb') as f:
        f.write(raw)
    
    # Read back and verify
    with sftp.open(admin_path, 'rb') as f:
        verify = f.read()
    
    v_idx2 = verify.find(b'const odelsRes')
    v_idx3 = verify.find(b'const [modelsRes')
    print(f'After write+read: odelsRes at {v_idx2}, [modelsRes at {v_idx3}')
    
    # Check specific line
    text = verify.decode('utf-8')
    lines = text.split('\n')
    print(f'Line 694: {lines[693].strip()[:80]}')

# ==========================================
# FIX 2: landing-page.tsx - byte-level
# ==========================================
landing_path = '/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx'

with sftp.open(landing_path, 'rb') as f:
    raw = f.read()

old_bytes = b'const obileMenuOpen'
new_bytes = b'const [mobileMenuOpen'

idx = raw.find(old_bytes)
print(f'\nFound "const obileMenuOpen" at byte index: {idx}')

if idx >= 0:
    raw = raw.replace(old_bytes, new_bytes)
    
    idx2 = raw.find(b'const obileMenuOpen')
    idx3 = raw.find(b'const [mobileMenuOpen')
    print(f'After replace: obileMenu at {idx2}, [mobileMenu at {idx3}')
    
    with sftp.open(landing_path, 'wb') as f:
        f.write(raw)
    
    with sftp.open(landing_path, 'rb') as f:
        verify = f.read()
    
    v_idx2 = verify.find(b'const obileMenuOpen')
    v_idx3 = verify.find(b'const [mobileMenuOpen')
    print(f'After write+read: obileMenu at {v_idx2}, [mobileMenu at {v_idx3}')
    
    text = verify.decode('utf-8')
    lines = text.split('\n')
    print(f'Line 109: {lines[108].strip()[:80]}')

sftp.close()

# ==========================================
# Rebuild Docker
# ==========================================
print('\n=== Rebuilding Docker ===')
import time

stdin, stdout, stderr = ssh.exec_command('cd ~/blivoai-demo && docker compose build --no-cache app > /tmp/rebuild3.log 2>&1 & echo $!')
pid = stdout.read().decode().strip()
print(f'Build PID: {pid}')

# Wait
for i in range(60):
    time.sleep(10)
    stdin, stdout, stderr = ssh.exec_command(f'ps -p {pid} > /dev/null 2>&1 && echo RUNNING || echo DONE')
    status = stdout.read().decode().strip()
    if status == 'DONE':
        break

# Check build result
stdin, stdout, stderr = ssh.exec_command('tail -5 /tmp/rebuild3.log')
print(f'Build: {stdout.read().decode()}')

# Restart
stdin, stdout, stderr = ssh.exec_command('cd ~/blivoai-demo && docker compose up -d --force-recreate app')
print(f'Restart: {stdout.read().decode()}')

time.sleep(15)

# Test
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/en')
print(f'EN site: {stdout.read().decode()}')

stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ar')
print(f'AR site: {stdout.read().decode()}')

stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ar/admin')
print(f'AR admin: {stdout.read().decode()}')

# Check for errors
stdin, stdout, stderr = ssh.exec_command('docker logs demo-chatbot --tail=20 2>&1 | grep -iE "Error|Reference" | head -5')
errors = stdout.read().decode()
print(f'Errors: {errors if errors.strip() else "None"}')

ssh.close()
print('\n=== COMPLETE ===')
