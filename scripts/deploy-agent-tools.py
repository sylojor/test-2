#!/usr/bin/env python3
"""
Deploy agent-tools, updated llm-service, agent-executor, and conversations route to server
"""
import paramiko
import os

SSH_HOST = "141.95.55.5"
SSH_USER = "ubuntu"
SSH_PASS = "Mghazi@199641"
PROJECT_DIR = "/home/ubuntu/blivoai-demo"

LOCAL_BASE = "/home/z/my-project/src"

# Files to deploy
FILES_TO_DEPLOY = [
    ("lib/agent-tools.ts", f"{PROJECT_DIR}/src/lib/agent-tools.ts"),
    ("lib/llm-service.ts", f"{PROJECT_DIR}/src/lib/llm-service.ts"),
    ("lib/agent-executor.ts", f"{PROJECT_DIR}/src/lib/agent-executor.ts"),
    ("app/api/conversations/route.ts", f"{PROJECT_DIR}/src/app/api/conversations/route.ts"),
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Connecting to server...")
ssh.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)
print("Connected!")

sftp = ssh.open_sftp()

for local_rel, remote_path in FILES_TO_DEPLOY:
    local_path = os.path.join(LOCAL_BASE, local_rel)
    
    print(f"\nDeploying {local_rel}...")
    
    # Create remote directory if needed
    remote_dir = os.path.dirname(remote_path)
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        # Create directory recursively
        parts = remote_dir.split("/")
        for i in range(1, len(parts) + 1):
            try:
                sftp.stat("/".join(parts[:i]))
            except FileNotFoundError:
                sftp.mkdir("/".join(parts[:i]))
    
    # Upload file
    with open(local_path, 'r') as f:
        content = f.read()
    with sftp.open(remote_path, 'w') as f:
        f.write(content)
    
    print(f"  ✅ Uploaded to {remote_path}")

sftp.close()

# Now rebuild and restart
print("\n\nRebuilding and restarting the app...")
stdin, stdout, stderr = ssh.exec_command(f"cd {PROJECT_DIR} && docker compose up -d --build")
exit_status = stdout.channel.recv_exit_status()
out = stdout.read().decode()
err = stderr.read().decode()

print(f"Build output (last 500 chars): {out[-500:]}")
print(f"Build stderr (last 500 chars): {err[-500:]}")
print(f"Exit status: {exit_status}")

# Check health
print("\nChecking app health...")
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null')
health = stdout.read().decode()
print(f"HTTP Status: {health}")

# Check logs
print("\nRecent logs:")
stdin, stdout, stderr = ssh.exec_command(f"cd {PROJECT_DIR} && docker compose logs --tail=10")
logs = stdout.read().decode()
print(logs[-500:])

ssh.close()
print("\n✅ Deployment complete!")
