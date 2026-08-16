#!/usr/bin/env python3
"""Clone fresh repo and set up new-blivo properly"""
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

# 1: Stop the rebuild that was started (it might fail since no git)
print("[1] Checking rebuild status:")
out, err = ssh_exec("cat /tmp/rebuild_nb.log 2>/dev/null | tail -5")
print(out)

# 2: Remove old new-blivo directory and clone fresh
print("\n[2] Removing old and cloning fresh...")
out, err = ssh_exec(f"""
cd /home/ubuntu && \
docker stop new-blivo-chatbot 2>/dev/null || true && \
docker rm new-blivo-chatbot 2>/dev/null || true && \
rm -rf {NB_DIR} && \
git clone https://sylojor:ghp_vYzZ9wLM8bFfK4VT6SzNOGBQPm2aQR2bqxop@github.com/sylojor/one-employer-company.git {NB_DIR} && \
cd {NB_DIR} && git log --oneline -3 && echo 'CLONED_OK'
""", timeout=60)
print(out[:500])
if err: print(f"  err: {err[:200]}")

# 3: Create .env file
print("\n[3] Creating .env file:")
out, err = ssh_exec(f"""
cd {NB_DIR} && \
printf 'DATABASE_URL=postgresql://oec_user:oec_secure_password_2024@db:5432/oec_db?schema=public\nLLM_PROVIDER=mock\nLLM_API_KEY=\nLLM_API_URL=\nNEXT_PUBLIC_SITE_URL=https://demo.blivoai.com\n' > .env && \
cat .env
""")
print(out)

# 4: Update docker-compose.yml to use port 3002 (not 3000) so it doesn't conflict
print("\n[4] Updating docker-compose.yml port mapping to 3002:")
out, err = ssh_exec(f"""
cd {NB_DIR} && \
sed -i 's/"3000:3000"/"3002:3000"/g' docker-compose.yml && \
sed -i 's/container_name: oec-app/container_name: new-blivo-chatbot/g' docker-compose.yml && \
sed -i 's/container_name: oec-db/container_name: new-blivo-postgres/g' docker-compose.yml && \
sed -i 's/container_name: oec-caddy/container_name: new-blivo-caddy/g' docker-compose.yml && \
grep '3002' docker-compose.yml && echo 'PORT_UPDATED'
""")
print(out)

# 5: Also need to make sure the Caddyfile points to demo.blivoai.com
# For now, we'll use the existing Caddy on the main blivoai to route to 3002
# Check the existing Caddyfile
print("\n[5] Current Caddy config:")
out, err = ssh_exec("cat /home/blivoai/Caddyfile 2>/dev/null | head -20")
print(out[:300])

# 6: Build in background
print("\n[6] Building new-blivo in background...")
out, err = ssh_exec(f"""
cd {NB_DIR} && \
nohup bash -c 'docker-compose up -d --build' > /tmp/rebuild_nb2.log 2>&1 & \
echo 'REBUILD_STARTED' && sleep 1
""")
print(out)

# 7: Check main site still works
print("\n[7] Main site check:")
out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' http://localhost:3000")
print(f"  HTTP: {out}")

print("\n=== Clone done, rebuild in background. Wait ~5-10 min then check demo on 3002 ===")
