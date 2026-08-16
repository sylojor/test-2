import paramiko
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

# Step 1: Recreate container
ssh_exec(
    "cd ~/blivoai-demo && docker compose up -d --force-recreate app",
    timeout=60
)

# Step 2: Wait for startup
print("\nWaiting 20 seconds for app to start...")
time.sleep(20)

# Step 3: Verify
exit_code, out, err = ssh_exec(
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar",
    timeout=10
)

# Step 4: Check logs
ssh_exec(
    "cd ~/blivoai-demo && docker compose logs app --tail=20",
    timeout=10
)
