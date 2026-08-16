import paramiko
import sys
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(command, timeout=120):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=10)
    
    print(f"\n=== Running: {command} ===")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    exit_code = stdout.channel.recv_exit_status()
    
    if out:
        print(out[-2000:] if len(out) > 2000 else out)
    if err:
        print(f"[stderr] {err[-1000:] if len(err) > 1000 else err}")
    print(f"Exit code: {exit_code}")
    
    client.close()
    return exit_code, out, err

# Step 1: Pull latest code
ssh_exec("cd ~/blivoai-demo && git fetch origin && git reset --hard origin/main", timeout=30)

# Step 2: Docker rebuild (this takes a while)
print("\n=== Starting Docker build (this may take several minutes) ===")
exit_code, out, err = ssh_exec(
    "cd ~/blivoai-demo && docker compose build --no-cache app",
    timeout=600
)
