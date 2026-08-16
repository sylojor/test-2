#!/usr/bin/env python3
"""Fix docker-compose and .env, then redeploy"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Fix docker-compose.yml: Change LLM_PROVIDER default from mock to together
# This allows DB config to override if needed
sftp = client.open_sftp()
sftp.get("/home/ubuntu/blivoai-demo/docker-compose.yml", "/tmp/compose.yml")
sftp.close()

with open("/tmp/compose.yml", "r") as f:
    compose = f.read()

# Change LLM_PROVIDER default
compose = compose.replace("LLM_PROVIDER=${LLM_PROVIDER:-mock}", "LLM_PROVIDER=${LLM_PROVIDER:-together}")

# Also update the .env file
cmd = "cat ~/blivoai-demo/.env"
stdin, stdout, stderr = client.exec_command(cmd)
env_content = stdout.read().decode()

# Add LLM_PROVIDER=together to .env if not there
if "LLM_PROVIDER" not in env_content:
    env_content += "\nLLM_PROVIDER=together\n"
else:
    # Replace existing
    import re
    env_content = re.sub(r'LLM_PROVIDER=\S+', 'LLM_PROVIDER=together', env_content)

# Write .env
sftp = client.open_sftp()
with sftp.open("/home/ubuntu/blivoai-demo/.env", "w") as f:
    f.write(env_content)
sftp.close()
print(f"Updated .env with LLM_PROVIDER=together")

# Write docker-compose.yml
with open("/tmp/compose.yml", "w") as f:
    f.write(compose)
sftp = client.open_sftp()
sftp.put("/tmp/compose.yml", "/home/ubuntu/blivoai-demo/docker-compose.yml")
sftp.close()
print(f"Updated docker-compose.yml")

# Verify
stdin, stdout, stderr = client.exec_command("grep 'LLM_PROVIDER' ~/blivoai-demo/docker-compose.yml")
print(f"Verify compose: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("cat ~/blivoai-demo/.env")
print(f"Verify .env: {stdout.read().decode().strip()}")

# Rebuild and redeploy
print("\nRebuilding and redeploying...")
stdin, stdout, stderr = client.exec_command("cd ~/blivoai-demo && docker compose down && docker compose build app && docker compose up -d", timeout=300)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"Deploy output: {out[-200:]}")
if err and "Error" in err:
    print(f"Deploy errors: {err[-200:]}")

# Wait for containers to start
import time
time.sleep(15)

# Verify
stdin, stdout, stderr = client.exec_command("docker exec demo-chatbot printenv LLM_PROVIDER")
provider = stdout.read().decode().strip()
print(f"\nLLM_PROVIDER after deploy: {provider}")

# Check that the app is running
stdin, stdout, stderr = client.exec_command("docker ps")
print(f"Running containers: {stdout.read().decode()}")

client.close()
print("\nDone!")
