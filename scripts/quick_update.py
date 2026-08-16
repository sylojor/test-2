#!/usr/bin/env python3
"""Update server: add API key to docker-compose.yml and rebuild."""
import paramiko

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
NEW_KEY = "tgp_v1_KXUEDfm7ZsHPYEpLOdtrlydb7IAKpNaBvvB8IWNaai0"
GITHUB_TOKEN = "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"
REPO = "sylojor/new-blivo"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=30)
print("Connected!")

def run(cmd, timeout=60):
    print(f"\n>> {cmd[:150]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    combined = (out + err).strip()
    if combined:
        for line in combined.split(chr(10))[-20:]:
            print(f"   {line}")
    return combined

# 1. Read current docker-compose.yml
print("\n=== Current docker-compose.yml ===")
run("cat /home/ubuntu/new-blivo/docker-compose.yml")

# 2. Write updated version using sed
print("\n=== Update API key ===")

# Create the update script on server using simple shell commands
update_script = r"""#!/bin/bash
DC=/home/ubuntu/new-blivo/docker-compose.yml

# Remove old keys if they exist
sed -i '/LLM_API_KEY=/d' $DC
sed -i '/LLM_PROVIDER=/d' $DC
sed -i '/TOGETHER_AI_API_KEY=/d' $DC

# Add new keys after 'environment:'
sed -i '/^      environment:/a\      - LLM_PROVIDER=together\n      - LLM_API_KEY=tgp_v1_KXUEDfm7ZsHPYEpLOdtrlydb7IAKpNaBvvB8IWNaai0' $DC

echo "KEYS_UPDATED"
"""

# Upload using SFTP
sftp = ssh.open_sftp()
with sftp.open('/tmp/update_dc.sh', 'w') as f:
    f.write(update_script)
sftp.close()

run("bash /tmp/update_dc.sh")

# 3. Verify
print("\n=== Verify ===")
run("cat /home/ubuntu/new-blivo/docker-compose.yml")

# 4. Trigger rebuild
print("\n=== Trigger rebuild ===")
run("""cd /home/ubuntu/new-blivo && nohup bash -c '
  docker compose build --no-cache app > /tmp/build.log 2>&1 &&
  docker compose up -d app >> /tmp/build.log 2>&1 &&
  echo BUILD_COMPLETE >> /tmp/build.log
' > /dev/null 2>&1 & echo BUILD_STARTED""", timeout=30)

ssh.close()
print("\n=== Build triggered in background ===")
