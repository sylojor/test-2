import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# Write proper JSON file on remote server
login_json = json.dumps({"email": "admin@blivoai.com", "password": "BlivoAdmin2024!"})
sftp = ssh.open_sftp()
with sftp.open('/tmp/login.json', 'w') as f:
    f.write(login_json)
sftp.close()

# Verify the file
stdin, stdout, stderr = ssh.exec_command("cat /tmp/login.json", timeout=10)
print("JSON FILE:", stdout.read().decode())

# Curl with the file
stdin, stdout, stderr = ssh.exec_command("curl -s -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d @/tmp/login.json", timeout=10)
print("LOGIN RESPONSE:", stdout.read().decode()[:500])

# Check docker logs
stdin, stdout, stderr = ssh.exec_command("docker logs demo-chatbot --tail 15 2>&1", timeout=10)
logs = stdout.read().decode()
if "Login error" in logs:
    for line in logs.splitlines():
        if "Login error" in line or "error" in line.lower():
            print("LOG:", line)

ssh.close()
