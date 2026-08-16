import paramiko
import time
import sys

def ssh_exec(client, cmd, timeout=300):
    print(f"\n>>> {cmd}")
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()
        if out:
            print(out[-3000:] if len(out) > 3000 else out)
        if err and len(err.strip()) > 0:
            print(f"STDERR: {err[-1500:]}" if len(err) > 1500 else f"STDERR: {err}")
        print(f"Exit code: {exit_code}")
        return out, err, exit_code
    except Exception as e:
        print(f"Command error: {e}")
        return "", str(e), -1

def ssh_exec_background(client, cmd, timeout=600):
    """Execute long-running commands"""
    print(f"\n>>> {cmd} (background, timeout={timeout}s)")
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        # Read output as it comes
        while True:
            if stdout.channel.exit_status_ready():
                break
            if stdout.channel.recv_ready():
                data = stdout.channel.recv(4096).decode('utf-8', errors='replace')
                print(data, end='')
            if stderr.channel.recv_stderr_ready():
                data = stderr.channel.recv_stderr(4096).decode('utf-8', errors='replace')
                print(data, end='')
            time.sleep(0.5)
        
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()
        print(f"\nExit code: {exit_code}")
        return out, err, exit_code
    except Exception as e:
        print(f"Background command error: {e}")
        return "", str(e), -1

# Connect with retry
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

for attempt in range(5):
    try:
        print(f"Connecting (attempt {attempt+1})...")
        client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=20, banner_timeout=30)
        print("Connected!")
        break
    except Exception as e:
        print(f"Attempt {attempt+1} failed: {e}")
        if attempt == 4:
            sys.exit(1)
        time.sleep(3)

PROJECT_DIR = "/home/blivoai"

# ============================================================
# STEP 1: Pull latest code
# ============================================================
print("\n" + "="*60)
print("STEP 1: Pulling latest code from GitHub")
print("="*60)

ssh_exec(client, f"cd {PROJECT_DIR} && git remote set-url origin https://sylojor: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@github.com/sylojor/new-blivo.git")
ssh_exec(client, f"cd {PROJECT_DIR} && git fetch origin && git reset --hard origin/main")

# ============================================================
# STEP 2: Fix .env - DATABASE_URL must point to postgres container
# ============================================================
print("\n" + "="*60)
print("STEP 2: Fixing .env file")
print("="*60)

# The .env has DATABASE_URL pointing to localhost:5432
# Inside docker, the chatbot container needs to connect to "postgres" service (container name: blivoai-postgres)
# In the new docker-compose, the postgres service is named "postgres" 
# So DATABASE_URL should be: postgresql://blivoai:password@postgres:5432/blivoai

# First read current .env
out, _, _ = ssh_exec(client, f"cat {PROJECT_DIR}/.env")

# Get the postgres password from .env
pg_password = "BlvPg_eZdU18PPULDS4YsemB1CquWN"
pg_user = "blivoai"
pg_db = "blivoai"

# The key fix: use "postgres" as hostname (docker service name) instead of localhost
new_db_url = f"postgresql://{pg_user}:{pg_password}@postgres:5432/{pg_db}?schema=public"

# Update DATABASE_URL in .env
ssh_exec(client, f"cd {PROJECT_DIR} && sed -i 's|DATABASE_URL=.*|DATABASE_URL={new_db_url}|' .env")

# Also ensure NEXTAUTH_URL is correct
ssh_exec(client, f"cd {PROJECT_DIR} && sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://blivoai.com|' .env")

# Verify .env
ssh_exec(client, f"cd {PROJECT_DIR} && head -5 .env")

# ============================================================
# STEP 3: Stop ALL containers and clean up
# ============================================================
print("\n" + "="*60)
print("STEP 3: Stopping all containers")
print("="*60)

# Stop everything
ssh_exec(client, f"cd {PROJECT_DIR} && docker compose down --remove-orphans 2>/dev/null || true")
# Also remove the orphan postgres container
ssh_exec(client, "docker stop blivoai-postgres 2>/dev/null || true")
ssh_exec(client, "docker rm blivoai-postgres 2>/dev/null || true")
# Remove old containers
ssh_exec(client, "docker stop app-chatbot app-caddy 2>/dev/null || true")
ssh_exec(client, "docker rm app-chatbot app-caddy 2>/dev/null || true")

# Clean old networks
ssh_exec(client, "docker network prune -f 2>/dev/null || true")

# ============================================================
# STEP 4: Rebuild and start containers
# ============================================================
print("\n" + "="*60)
print("STEP 4: Rebuilding chatbot container (this takes a few minutes)")
print("="*60)

# Build the chatbot image with the PostgreSQL schema
ssh_exec_background(client, f"cd {PROJECT_DIR} && docker compose build --no-cache chatbot", timeout=600)

# ============================================================
# STEP 5: Start all containers
# ============================================================
print("\n" + "="*60)
print("STEP 5: Starting all containers")
print("="*60)

ssh_exec(client, f"cd {PROJECT_DIR} && docker compose up -d")

# Wait for containers to become healthy
print("\nWaiting 30 seconds for containers to initialize...")
time.sleep(30)

# ============================================================
# STEP 6: Verify deployment
# ============================================================
print("\n" + "="*60)
print("STEP 6: Verifying deployment")
print("="*60)

ssh_exec(client, "docker ps")

# Check chatbot logs
print("\n--- Chatbot logs ---")
ssh_exec(client, "docker logs app-chatbot --tail 30 2>&1")

# Check postgres logs
print("\n--- PostgreSQL logs ---")
ssh_exec(client, "docker logs blivoai-postgres --tail 10 2>&1")

# Check caddy logs
print("\n--- Caddy logs ---")
ssh_exec(client, "docker logs app-caddy --tail 10 2>&1")

# Test direct app access
print("\n--- Testing ports ---")
ssh_exec(client, "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000/ 2>&1 || echo 'FAIL'")
ssh_exec(client, "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:80/ 2>&1 || echo 'FAIL'")
ssh_exec(client, "curl -sk -o /dev/null -w 'HTTP %{http_code}' https://localhost:443/ 2>&1 || echo 'FAIL'")

# Wait more if needed
time.sleep(15)

# Test from outside perspective
print("\n--- Final external test ---")
ssh_exec(client, "curl -s -o /dev/null -w 'HTTP %{http_code}' https://blivoai.com 2>&1 || echo 'FAIL'")
ssh_exec(client, "curl -s -o /dev/null -w 'HTTP %{http_code}' http://blivoai.com 2>&1 || echo 'FAIL'")

print("\n" + "="*60)
print("DEPLOYMENT COMPLETE!")
print("="*60)

client.close()
