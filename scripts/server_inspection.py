import paramiko
import json
import sys

# Get SSH details from previous session - try to find from git remote
ssh_key_path = "/root/.ssh/id_ed25519"  # default

# Try to find server IP from previous work
import os
# Check if we stored the IP somewhere
for f in os.listdir("/home/z/my-project/scripts/"):
    if f.endswith(".json"):
        try:
            with open(f"/home/z/my-project/scripts/{f}") as fh:
                data = json.load(fh)
                if isinstance(data, dict) and "ip" in str(data).lower():
                    print(f"Found potential IP info in {f}")
        except:
            pass

# We know from previous session that the server was accessed
# Let's try connecting with known hostname from git remote
# The git remote was: https://github.com/sylojor/new-blivo (this is GitHub, not OVH)
# OVH server IP needs to be found

# Check if there's SSH config
ssh_config = "/root/.ssh/config"
if os.path.exists(ssh_config):
    with open(ssh_config) as f:
        print("SSH Config:")
        print(f.read())
else:
    print("No SSH config found")

# Check known_hosts for OVH IP
known_hosts = "/root/.ssh/known_hosts"
if os.path.exists(known_hosts):
    with open(known_hosts) as f:
        lines = f.readlines()
        print(f"Known hosts entries: {len(lines)}")
        for line in lines[:5]:
            # Extract IP/host
            host = line.split()[0] if line.strip() else "unknown"
            print(f"  Host: {host}")

# Check bash history for SSH connections
history_file = "/root/.bash_history"
if os.path.exists(history_file):
    with open(history_file) as f:
        for line in f:
            if "ssh" in line.lower() and "@" in line:
                print(f"SSH command in history: {line.strip()}")

print("\n--- Checking environment variables ---")
for key in ["OVH_IP", "SERVER_IP", "VPS_IP", "HOST_IP"]:
    val = os.environ.get(key, "")
    if val:
        print(f"{key}={val}")

# Also check if paramiko connection details were saved anywhere
print("\n--- Checking for saved connection info ---")
