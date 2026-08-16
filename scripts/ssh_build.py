import paramiko
import time

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
# Build with cache (not --no-cache) for faster build
# ============================================
print("=== Building Docker image (with cache) ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose build 2>&1 | tail -50", timeout=600)
print("Build output (last 50 lines):", out[-3000:])
print("Build errors:", err[-500:])
