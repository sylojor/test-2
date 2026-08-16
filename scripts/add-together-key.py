#!/usr/bin/env python3
"""
Add Together AI API key to server .env and set LLM_PROVIDER=together
"""
import paramiko

SSH_HOST = "141.95.55.5"
SSH_USER = "ubuntu"
SSH_PASS = "Mghazi@199641"
REMOTE_ENV_PATH = "/home/ubuntu/blivoai-demo/.env"

TOGETHER_API_KEY = "tgp_v1_O8uzu-t82qirST4V73VvTOYMD0aT51LzE_oU5LUshWk"

# New env vars to add
NEW_VARS = {
    "LLM_PROVIDER": "together",
    "LLM_API_KEY": TOGETHER_API_KEY,
    "LLM_MODEL_LIGHT": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "LLM_MODEL_MEDIUM": "Qwen/Qwen3-235B-A22B-Instruct-Turbo",
    "LLM_MODEL_HEAVY": "deepseek-ai/DeepSeek-V3",
    "NEXT_PUBLIC_BASE_URL": "https://demo.blivoai.com",
}

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Connecting to server...")
ssh.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)
print("Connected!")

# Read current .env
stdin, stdout, stderr = ssh.exec_command(f"cat {REMOTE_ENV_PATH}")
current_env = stdout.read().decode()
print(f"Current .env:\n{current_env}")

# Parse current env
env_lines = current_env.strip().split("\n")
env_dict = {}
for line in env_lines:
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    parts = line.split("=", 1)
    if len(parts) == 2:
        env_dict[parts[0].strip()] = parts[1].strip()

# Add/update new vars
for key, value in NEW_VARS.items():
    env_dict[key] = value

# Build new .env content
new_env_lines = []
# Preserve existing lines in order
for line in env_lines:
    line_stripped = line.strip()
    if not line_stripped or line_stripped.startswith("#"):
        new_env_lines.append(line)
        continue
    key = line_stripped.split("=", 1)[0].strip()
    if key in env_dict:
        new_env_lines.append(f"{key}={env_dict[key]}")
    else:
        new_env_lines.append(line)

# Add any new keys not in original file
for key, value in NEW_VARS.items():
    if key not in [l.strip().split("=", 1)[0].strip() for l in env_lines if l.strip() and not l.strip().startswith("#")]:
        new_env_lines.append(f"{key}={value}")

new_env_content = "\n".join(new_env_lines) + "\n"
print(f"\nNew .env:\n{new_env_content}")

# Write to server
sftp = ssh.open_sftp()
with sftp.open(REMOTE_ENV_PATH, 'w') as f:
    f.write(new_env_content)
sftp.close()
print("✅ .env file updated on server!")

# Verify
stdin, stdout, stderr = ssh.exec_command(f"cat {REMOTE_ENV_PATH}")
verify = stdout.read().decode()
print(f"\nVerification:\n{verify}")

# Restart the app
print("\nRestarting the app...")
stdin, stdout, stderr = ssh.exec_command("cd /home/ubuntu/blivoai-demo && docker compose restart")
exit_status = stdout.channel.recv_exit_status()
out = stdout.read().decode()
err = stderr.read().decode()
print(f"Restart output: {out}")
print(f"Restart stderr: {err}")
print(f"Exit status: {exit_status}")

ssh.close()
print("\n✅ Done! Together AI key added and models configured.")
