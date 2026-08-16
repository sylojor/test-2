import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# Login first
sftp = ssh.open_sftp()
login_json = json.dumps({"email": "admin@blivoai.com", "password": "BlivoAdmin2024!"})
with sftp.open("/tmp/admin_login.json", "w") as f:
    f.write(login_json)
sftp.close()

stdin, stdout, stderr = ssh.exec_command("curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d @/tmp/admin_login.json", timeout=15)
data = json.loads(stdout.read().decode())
token = data["token"]
print("Token obtained")

# Test various admin endpoints
endpoints = [
    "/api/admin/companies",
    "/api/admin/models",
    "/api/admin/stats",
    "/api/admin/agents/stats",
    "/api/admin/platform-settings",
    "/api/admin/content",
    "/api/admin/head-tags",
    "/api/branding/logo.png",
    "/api/branding/favicon.ico",
    "/api/branding/favicon-32x32.png",
]

for ep in endpoints:
    cmd = f"curl -s -o /dev/null -w 'HTTP %http_code Size %size_download' http://localhost:3001{ep} -H 'Cookie: oec_token={token}'"
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    result = stdout.read().decode().strip()
    print(f"{ep}: {result}")

ssh.close()
