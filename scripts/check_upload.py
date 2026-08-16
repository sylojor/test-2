#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641', timeout=30)

def run(cmd):
    print(f'>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f'STDERR: {err}')
    return out

# Container name
run('sudo docker ps --format "{{.Names}}" | head -1')

# List branding files in container
run('sudo docker exec d69a62ac6ec4_demo-chatbot ls -la /app/data/branding/')

# Test all branding endpoints
for ep in ['logo.png', 'favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'manifest.json']:
    cmd = 'curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/branding/' + ep + '"'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    print(f'{ep}: {stdout.read().decode().strip()}')

# Check container logs for any upload-related entries
run('sudo docker logs d69a62ac6ec4_demo-chatbot 2>&1 | tail -30')

# Test the upload endpoint with a dummy file
print('\n=== Testing upload route ===')
run('echo "test" > /tmp/test.png && curl -s -w "%{http_code}" -X POST -F "file=@/tmp/test.png" -F "type=favicon" http://localhost:3001/api/upload/branding')

ssh.close()
