import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()

# Check proxy.ts
try:
    with sftp.open('/home/ubuntu/blivoai-demo/src/proxy.ts', 'r') as f:
        proxy_content = f.read().decode('utf-8')
    print('=== PROXY.TS ===')
    print(proxy_content[:2000])
except Exception as e:
    print(f'proxy.ts error: {e}')

# Check middleware.ts
try:
    with sftp.open('/home/ubuntu/blivoai-demo/src/middleware.ts', 'r') as f:
        mw_content = f.read().decode('utf-8')
    print('=== MIDDLEWARE.TS ===')
    print(mw_content[:500])
except Exception as e:
    print(f'middleware.ts error: {e}')

# Docker container info
stdin, stdout, stderr = ssh.exec_command('docker inspect demo-chatbot --format="{{.State.StartedAt}} {{.Created}}"', timeout=10)
print('=== CONTAINER TIMING ===')
print(stdout.read().decode())

# Try HTTPS login via demo domain
login_json = json.dumps({"email": "admin@blivoai.com", "password": "BlivoAdmin2024!"})
with sftp.open('/tmp/login2.json', 'w') as f:
    f.write(login_json)

stdin, stdout, stderr = ssh.exec_command("curl -sk -X POST https://demo.blivoai.com/api/auth/login -H 'Content-Type: application/json' -d @/tmp/login2.json", timeout=15)
print('=== HTTPS LOGIN ===')
resp = stdout.read().decode()
print(resp[:300])

# Check if the site is accessible at blivoai.com (not demo)
stdin, stdout, stderr = ssh.exec_command("curl -sk -o /dev/null -w 'HTTP %{http_code}' https://blivoai.com 2>&1", timeout=10)
print('=== BLIVOAI.COM HTTPS ===')
print(stdout.read().decode())

sftp.close()
ssh.close()
