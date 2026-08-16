import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(command, timeout=300):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=10)
    
    print(f"\n=== Running: {command[:80]}... ===")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    exit_code = stdout.channel.recv_exit_status()
    
    if out:
        print(out[-2000:] if len(out) > 2000 else out)
    if err and exit_code != 0:
        print(f"[stderr] {err[-1000:] if len(err) > 1000 else err}")
    print(f"Exit code: {exit_code}")
    
    client.close()
    return exit_code, out, err

# Step 1: Pull code
ssh_exec("cd ~/blivoai-demo && git fetch origin && git reset --hard origin/main", timeout=30)

# Step 2: Build
print("\n=== Building Docker image ===")
exit_code, _, _ = ssh_exec("cd ~/blivoai-demo && docker compose build --no-cache app", timeout=600)

if exit_code != 0:
    print("❌ Build FAILED!")
    import sys; sys.exit(1)

print("\n✅ Build succeeded!")

# Step 3: Recreate container
ssh_exec("cd ~/blivoai-demo && docker compose up -d --force-recreate app", timeout=60)

# Step 4: Wait
print("\nWaiting 20 seconds...")
time.sleep(20)

# Step 5: Verify
ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar", timeout=10)

# Step 6: Quick check for errors in logs
ssh_exec("cd ~/blivoai-demo && docker compose logs app --tail=5", timeout=10)
