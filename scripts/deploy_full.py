import paramiko
import sys

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Build with no cache and deploy
stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose build --no-cache app 2>&1 && docker compose up -d 2>&1",
    timeout=600
)

# Stream output but only show last 50 lines
output = stdout.read().decode()
err = stderr.read().decode()

# Show last 50 lines of output
lines = output.split('\n')
print("=== BUILD OUTPUT (last 50 lines) ===")
for line in lines[-50:]:
    print(line)

# Show last 20 lines of error
if err:
    err_lines = err.split('\n')
    print("\n=== STDERR (last 20 lines) ===")
    for line in err_lines[-20:]:
        print(line)

# Wait for containers to start
import time
time.sleep(15)

# Check status
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}} {{.Status}}'")
ps_output = stdout.read().decode()
print("\n=== CONTAINER STATUS ===")
print(ps_output)

# Check logs
stdin, stdout, stderr = client.exec_command("docker logs demo-chatbot --tail 10")
logs = stdout.read().decode()
print("\n=== APP LOGS ===")
print(logs)

# Test login
stdin, stdout, stderr = client.exec_command(
    """curl -s -w '\nHTTP:%{http_code}' -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@blivoai.com","password":"BlivoAdmin2024!"}'"""
)
login_result = stdout.read().decode()
print("\n=== LOGIN TEST ===")
print(login_result[:100])

client.close()
