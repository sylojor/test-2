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

# Build only
print("=== Building Docker ===")
out, err = ssh_exec("cd ~/blivoai-demo && docker compose build 2>&1 | tail -10", timeout=600)
print(out)
print("Err:", err[:200])
