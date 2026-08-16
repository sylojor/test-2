import os, json, glob

# Search all JSON files for server IP references
scripts_dir = "/home/z/my-project/scripts/"
for f in glob.glob(os.path.join(scripts_dir, "*.json")):
    try:
        with open(f) as fh:
            content = fh.read()
            # Look for IP patterns
            import re
            ips = re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', content)
            if ips:
                print(f"{os.path.basename(f)}: IPs found = {ips[:5]}")
    except:
        pass

# Check bash history
history_file = "/root/.bash_history"
if os.path.exists(history_file):
    with open(history_file) as f:
        for line in f:
            if "ssh" in line.lower():
                print(f"History: {line.strip()}")

# Check SSH config
for cfg in ["/root/.ssh/config", "/home/z/.ssh/config"]:
    if os.path.exists(cfg):
        with open(cfg) as f:
            print(f"SSH Config ({cfg}):\n{f.read()[:500]}")

# Check known hosts
for kh in ["/root/.ssh/known_hosts", "/home/z/.ssh/known_hosts"]:
    if os.path.exists(kh):
        with open(kh) as f:
            hosts = [l.split()[0] for l in f.readlines() if l.strip()]
            print(f"Known hosts ({kh}): {hosts[:10]}")

# Check if there's a .env or config file in new-blivo
env_path = "/home/z/my-project/new-blivo/.env"
if os.path.exists(env_path):
    with open(env_path) as f:
        content = f.read()
        ips = re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', content)
        print(f".env IPs: {ips}")
