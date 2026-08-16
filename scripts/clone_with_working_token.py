#!/usr/bin/env python3
"""Fix clone using the working token from blivoai remote"""
import paramiko, time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(cmd, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=10)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    client.close()
    return out, err

NB_DIR = "/home/ubuntu/new-blivo"

# The blivoai remote uses a different token that works
# Let me get that token
print("[1] Getting working git token from blivoai remote:")
out, err = ssh_exec("cd /home/blivoai && git remote get-url new-blivo")
print(f"  new-blivo remote URL: {out}")

# Extract the token from the URL
# URL format: https://sylojor:TOKEN@github.com/sylojor/new-blivo.git
if "github.com" in out:
    parts = out.split(":")
    if len(parts) >= 2:
        token_part = parts[1].split("@")[0]
        print(f"  Token found: {token_part[:10]}...")

# 2: Use that token to clone one-employer-company
# But first clean up
print("\n[2] Cleaning up and re-cloning with working token:")
# Get the full URL with token
remote_url = out
token = remote_url.split(":")[1].split("@")[0] if ":" in remote_url else ""

clone_url = f"https://sylojor:{token}@github.com/sylojor/one-employer-company.git"
print(f"  Clone URL: https://sylojor:{token[:10]}...@github.com/...")

out, err = ssh_exec(f"""
rm -rf {NB_DIR} && \
git clone {clone_url} {NB_DIR} && \
cd {NB_DIR} && git log --oneline -3 && echo 'CLONED_OK'
""", timeout=60)
print(f"  Result: {out[:500]}")
if err: print(f"  err: {err[:300]}")
