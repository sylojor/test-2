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
        print(out)
    if err:
        print(f"[stderr] {err}")
    print(f"Exit code: {exit_code}")
    
    client.close()
    return exit_code, out, err

# Step 1: Pull latest code and rebuild
ssh_exec("cd ~/blivoai-demo && git fetch origin && git reset --hard origin/main", timeout=30)

# Step 2: Docker rebuild
exit_code, out, err = ssh_exec(
    "cd ~/blivoai-demo && docker compose build --no-cache app 2>&1 | tail -20",
    timeout=300
)

if exit_code != 0:
    print("Build failed! Check logs.")
    sys.exit(1)

# Step 3: Recreate container
ssh_exec(
    "cd ~/blivoai-demo && docker compose up -d --force-recreate app",
    timeout=60
)

# Step 4: Wait and verify
print("\nWaiting for container to start...")
time.sleep(15)
ssh_exec(
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar",
    timeout=10
)

# Step 5: Check container logs
ssh_exec(
    "cd ~/blivoai-demo && docker compose logs app --tail=10",
    timeout=10
)
