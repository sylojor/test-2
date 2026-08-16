import paramiko
import time
import json

def ssh_exec(command, timeout=600):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# ============================================
# Build and deploy
# ============================================
print("=== Building Docker image ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose build 2>&1 | tail -20", timeout=600)
print(out[-2000:])
print("Build errors:", err[-200:])

# Restart
print("\n=== Restarting container ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose down && docker compose up -d 2>&1", timeout=60)
print(out[-500:])
