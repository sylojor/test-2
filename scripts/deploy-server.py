#!/usr/bin/env python3
"""Deploy BlivoAI to demo server"""
import paramiko, time, sys

HOST = '141.95.55.5'
USER = 'ubuntu'
PASS = 'Mghazi@199641'
PROJECT_DIR = '/home/ubuntu/blivoai-demo'

def ssh_exec(client, cmd, timeout=60, print_output=True):
    """Execute command and return output"""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    stdout.channel.settimeout(timeout)
    try:
        out = stdout.read().decode()
    except:
        out = ""
    try:
        err = stderr.read().decode()
    except:
        err = ""
    if print_output and out:
        print(out[-2000:] if len(out) > 2000 else out)
    if print_output and err and 'error' in err.lower():
        print(f"STDERR: {err[-500:]}")
    return out, err

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("✅ Connected!")

# 1. Git pull
print("\n>>> 1. git pull origin main")
ssh_exec(client, f'cd {PROJECT_DIR} && git pull origin main 2>&1', timeout=60)

# 2. Docker compose down
print("\n>>> 2. docker compose down")
ssh_exec(client, f'cd {PROJECT_DIR} && docker compose down 2>&1', timeout=120)

# 3. Start build in background
print("\n>>> 3. docker compose build --no-cache (background)")
ssh_exec(client, f'cd {PROJECT_DIR} && docker compose build --no-cache > /tmp/blivo-build.log 2>&1 &', timeout=10, print_output=False)

# 4. Wait for build to finish
print("Waiting for build to finish...")
max_wait = 600  # 10 min max
start_time = time.time()
while time.time() - start_time < max_wait:
    out, err = ssh_exec(client, 'ps aux | grep "docker compose build" | grep -v grep | wc -l', timeout=10, print_output=False)
    if '0' in out.strip():
        # Build finished
        print("Build finished!")
        break
    elapsed = int(time.time() - start_time)
    print(f"  Still building... ({elapsed}s)")
    time.sleep(30)

# Check build result
print("\n>>> Build result:")
out, err = ssh_exec(client, 'tail -30 /tmp/blivo-build.log', timeout=15)

# 5. Docker compose up
print("\n>>> 5. docker compose up -d")
ssh_exec(client, f'cd {PROJECT_DIR} && docker compose up -d 2>&1', timeout=120)

# 6. Wait and check
time.sleep(15)
print("\n>>> 6. Checking status...")
ssh_exec(client, 'docker ps', timeout=15)

# 7. Test website
time.sleep(10)
print("\n>>> 7. Testing demo.blivoai.com...")
ssh_exec(client, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>&1', timeout=15)

client.close()
print("\n✅ Deployment complete!")
