#!/usr/bin/env python3
"""Fix deployment: Create separate database for new-blivo"""
import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
REMOTE_DIR = "/home/ubuntu/new-blivo"

def ssh_exec(command, timeout=60):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=timeout)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

print("=" * 60)
print("FIXING DEPLOYMENT — Creating separate database")
print("=" * 60)

# Step 1: Create separate database in existing PostgreSQL
print("\n[1] Creating new database 'new_blivo'...")
out, err = ssh_exec("""docker exec blivoai-postgres psql -U blivoai -d blivoai -c "CREATE DATABASE new_blivo;" 2>&1""")
print(f"Create database: {out}")
if 'already exists' in out:
    print("Database already exists - OK!")

# Verify
out, err = ssh_exec("""docker exec blivoai-postgres psql -U blivoai -d blivoai -c "\\l" 2>&1""")
print(f"Existing databases:\n{out}")

# Step 2: Stop the failing container
print("\n[2] Stopping failing container...")
out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose down 2>&1")
print(f"Down: {out.strip()}")

# Step 3: Update .env with separate database URL
print("\n[3] Updating .env with separate database...")
out, err = ssh_exec("cat /home/blivoai/.env")
env_vars = {}
for line in out.split('\n'):
    line = line.strip()
    if '=' in line and not line.startswith('#'):
        key, val = line.split('=', 1)
        env_vars[key.strip()] = val.strip()

pg_password = env_vars.get('POSTGRES_PASSWORD', 'BlvPg_eZdU18PPULDS4YsemB1CquWN')

# Use SEPARATE database: new_blivo (not blivoai)
env_lines = [
    f"DATABASE_URL=postgresql://blivoai:{pg_password}@blivoai-postgres:5432/new_blivo?schema=public",
    f"NEXTAUTH_SECRET={env_vars.get('NEXTAUTH_SECRET', 'change-this-secret')}",
    "NEXTAUTH_URL=https://demo.blivoai.com",
]
for k in ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'PAYPAL_CLIENT_ID',
          'PAYPAL_CLIENT_SECRET', 'PAYPAL_BASE_URL', 'RESEND_API_KEY',
          'TOGETHER_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY',
          'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'OPENROUTER_API_KEY',
          'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']:
    if k in env_vars:
        env_lines.append(f"{k}={env_vars[k]}")

new_env = '\n'.join(env_lines)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
sftp = client.open_sftp()
with sftp.open(f'{REMOTE_DIR}/.env', 'w') as f:
    f.write(new_env)
sftp.close()
client.close()
print("✅ .env updated with new_blivo database!")

# Step 4: Also update docker-compose.yml env
print("\n[4] Updating docker-compose.yml...")
prod_compose = f'''services:
  chatbot:
    build: .
    container_name: new-blivo-chatbot
    restart: unless-stopped
    ports:
      - "3002:3000"
    env_file: .env
    environment:
      - DATABASE_URL=postgresql://blivoai:{pg_password}@blivoai-postgres:5432/new_blivo?schema=public
    volumes:
      - new-blivo-uploads:/app/data/uploads
    networks:
      - blivoai-net
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

networks:
  blivoai-net:
    external: true

volumes:
  new-blivo-uploads:
'''

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
sftp = client.open_sftp()
with sftp.open(f'{REMOTE_DIR}/docker-compose.yml', 'w') as f:
    f.write(prod_compose)
sftp.close()
client.close()
print("✅ docker-compose.yml updated!")

# Step 5: Update entrypoint.sh to use --accept-data-loss
print("\n[5] Updating entrypoint.sh...")
new_entrypoint = '''#!/bin/sh
set -e

echo "🚀 BlivoAI (new-blivo) — Starting up..."

# Apply database schema (PostgreSQL - separate database)
echo "🔧 Applying database schema..."
npx prisma db push --accept-data-loss 2>&1 || npx prisma db push 2>&1
echo "✅ Schema applied!"

# Seed default data
echo "🌱 Seeding defaults..."
npx tsx prisma/seed.ts 2>/dev/null || echo "⚠️ Seed skipped"

# Create uploads directory
mkdir -p /app/data/uploads

# Start the server
echo "🌐 Starting BlivoAI on port 3000..."
exec node server.js
'''

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
sftp = client.open_sftp()
with sftp.open(f'{REMOTE_DIR}/entrypoint-output/entrypoint.sh', 'w') as f:
    f.write(new_entrypoint)
sftp.close()
client.close()
print("✅ entrypoint.sh updated!")

# Step 6: Start container
print("\n[6] Starting container...")
out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d 2>&1")
print(f"Start: {out.strip()}")

# Step 7: Wait for health check
print("\n[7] Waiting for health check...")
for i in range(15):
    time.sleep(8)
    out, err = ssh_exec("docker ps --filter 'name=new-blivo' --format '{{.Names}} {{.Status}}'")
    status = out.strip()
    print(f"  Check {i+1}/15: {status}")
    
    if 'healthy' in status:
        print("✅ HEALTHY!")
        break
    
    if 'Restarting' in status or 'Exited' in status:
        print("⚠️ Container has issues!")
        out, err = ssh_exec("docker logs new-blivo-chatbot 2>&1 | tail -30")
        print(f"Logs:\n{out}")
        break

# Step 8: Check if running
out, err = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
print(f"\nAll containers:\n{out}")

# Update Caddy routing
print("\n[8] Ensuring Caddy routes correctly...")
ssh_exec("sed -i 's/new-blivo:3002/new-blivo-chatbot:3000/g' /home/blivoai/Caddyfile")
out, err = ssh_exec("docker exec blivoai-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")
print(f"Caddy: {out.strip()}")

# Final tests
time.sleep(5)
out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
demo = out.strip()
print(f"\ndemo.blivoai.com → HTTP {demo}")

out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com")
main = out.strip()
print(f"blivoai.com → HTTP {main}")

out, err = ssh_exec("free -h | head -3")
print(f"\nMemory: {out}")

print("\n" + "=" * 60)
print(f"DEPLOYMENT STATUS:")
print(f"  demo.blivoai.com → HTTP {demo}")
print(f"  blivoai.com → HTTP {main}")
print("=" * 60)
