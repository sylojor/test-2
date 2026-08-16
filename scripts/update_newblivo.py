#!/usr/bin/env python3
"""Fix new-blivo path and update code"""
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

# 1: Check new-blivo at correct path
print("[1] Checking /home/ubuntu/new-blivo:")
out, err = ssh_exec(f"ls {NB_DIR}/.git {NB_DIR}/package.json {NB_DIR}/docker-compose.yml 2>/dev/null")
print(out)

# 2: Check git at correct path
print("\n[2] New-blivo git status:")
out, err = ssh_exec(f"cd {NB_DIR} && git remote -v && git log --oneline -5")
print(out)

# 3: Add our remote and pull
print("\n[3] Adding one-employer-company remote and pulling latest:")
out, err = ssh_exec(f"""
cd {NB_DIR} && \
git remote add oec https://sylojor:ghp_vYzZ9wLM8bFfK4VT6SzNOGBQPm2aQR2bqxop@github.com/sylojor/one-employer-company.git 2>/dev/null || true && \
git fetch oec main && \
git reset --hard oec/main && \
git log --oneline -3 && \
echo 'SUCCESS'
""")
print(out)
if err: print(f"  err: {err[:300]}")

# 4: Create .env
print("\n[4] Creating .env file:")
out, err = ssh_exec(f"""
cd {NB_DIR} && \
printf 'DATABASE_URL=postgresql://oec_user:oec_secure_password_2024@db:5432/oec_db?schema=public\nLLM_PROVIDER=mock\nLLM_API_KEY=\nLLM_API_URL=\nNEXT_PUBLIC_SITE_URL=https://demo.blivoai.com\n' > .env && \
cat .env
""")
print(out)

# 5: Check docker-compose for port mapping
print("\n[5] Docker-compose port mapping:")
out, err = ssh_exec(f"cd {NB_DIR} && grep 'ports' docker-compose.yml -A3")
print(out)

# 6: Start rebuild in background (nohup)
print("\n[6] Starting Docker rebuild in background...")
out, err = ssh_exec(f"""
cd {NB_DIR} && \
docker-compose down 2>/dev/null || true && \
nohup docker-compose up -d --build > /tmp/rebuild_nb.log 2>&1 & \
echo $! > /tmp/rebuild_nb_pid && \
echo 'REBUILD_STARTED_PID_' && cat /tmp/rebuild_nb_pid
""")
print(out)

# 7: Also restart Caddy (it was restarting)
print("\n[7] Restarting Caddy:")
out, err = ssh_exec("cd /home/blivoai && docker-compose restart caddy 2>/dev/null || docker-compose up -d caddy", timeout=30)
print(f"  Result: {out[:200]}")

# 8: Quick check of main site
print("\n[8] Main site check:")
out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' http://localhost:3000")
print(f"  HTTP: {out}")

print("\n=== Rebuild running in background. Wait ~5-10 min then check. ===")
