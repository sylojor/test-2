#!/usr/bin/env python3
"""Deploy step by step with longer timeouts"""
import paramiko, time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(cmd, timeout=300):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    # Don't wait for full output for long-running commands, use channel polling
    while not stdout.channel.exit_status_ready():
        time.sleep(2)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    rc = stdout.channel.recv_exit_status()
    client.close()
    return out.strip(), err.strip(), rc

# First: check what's stopped
print("[1] ALL containers (including stopped):")
out, _, _ = ssh_exec("docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'", timeout=15)
print(out)

# Second: start PostgreSQL first (it needs to be healthy before app can start)
print("\n[2] Starting PostgreSQL...")
out, err, rc = ssh_exec("cd /home/blivoai && docker-compose up -d db", timeout=120)
print(f"  Result: {out[:300]}")
if err: print(f"  Stderr: {err[:300]}")

# Wait for DB to be healthy
print("  Waiting 30s for DB...")
time.sleep(30)

# Third: start the app container
print("\n[3] Starting main BlivoAI app...")
out, err, rc = ssh_exec("cd /home/blivoai && docker-compose up -d app", timeout=120)
print(f"  Result: {out[:300]}")
if err: print(f"  Stderr: {err[:300]}")

# Fourth: start Caddy
print("\n[4] Starting Caddy...")
out, err, rc = ssh_exec("cd /home/blivoai && docker-compose up -d caddy", timeout=120)
print(f"  Result: {out[:300]}")

# Wait
time.sleep(15)

# Fifth: check all running
print("\n[5] All containers now:")
out, _, _ = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'", timeout=15)
print(out)

# Sixth: check site
print("\n[6] Checking main site (blivoai.com via localhost):")
out, _, _ = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", timeout=10)
print(f"  HTTP status: {out}")

# Seventh: check new-blivo on port 3002
print("\n[7] Checking demo site (localhost:3002):")
out, _, _ = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3002", timeout=10)
print(f"  HTTP status: {out}")

# Now: update new-blivo with our code
print("\n[8] Updating new-blivo code from one-employer-company repo...")
out, err, rc = ssh_exec("""
cd /home/new-blivo && \
git remote add oec https://sylojor:ghp_vYzZ9wLM8bFfK4VT6SzNOGBQPm2aQR2bqxop@github.com/sylojor/one-employer-company.git 2>/dev/null; \
git fetch oec && \
git checkout main && \
git reset --hard oec/main && \
echo 'DONE_PULL'
""", timeout=60)
print(f"  Result: {out[:500]}")
if err: print(f"  Stderr: {err[:300]}")

# Set env file
print("\n[9] Setting env file for new-blivo...")
ssh_exec("""cd /home/new-blivo && cat > .env << 'EOF'
DATABASE_URL=postgresql://oec_user:oec_secure_password_2024@db:5432/oec_db?schema=public
LLM_PROVIDER=mock
LLM_API_KEY=
LLM_API_URL=
NEXT_PUBLIC_SITE_URL=https://demo.blivoai.com
EOF
""", timeout=15)

# Check docker-compose for new-blivo
print("\n[10] New-blivo docker-compose ports:")
out, _, _ = ssh_exec("cd /home/new-blivo && grep -A2 'ports' docker-compose.yml", timeout=10)
print(out)

# Rebuild new-blivo
print("\n[11] Rebuilding new-blivo (this takes time)...")
out, err, rc = ssh_exec("cd /home/new-blivo && docker-compose down 2>/dev/null; docker-compose up -d --build", timeout=600)
print(f"  Result (first 500 chars): {out[:500]}")
if err: print(f"  Stderr (first 300 chars): {err[:300]}")

time.sleep(30)

# Final check
print("\n[12] FINAL - All containers:")
out, _, _ = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'", timeout=15)
print(out)

print("\n[13] FINAL - Site checks:")
out1, _, _ = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", timeout=10)
out2, _, _ = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3002", timeout=10)
print(f"  Main site (3000): {out1}")
print(f"  Demo site (3002): {out2}")

print("\nDONE!")
