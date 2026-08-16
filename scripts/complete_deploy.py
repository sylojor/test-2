#!/usr/bin/env python3
"""Complete the deployment - fix entrypoint, extract, build, start"""
import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
REMOTE_DIR = "/home/ubuntu/new-blivo"
LOCAL_DIR = "/home/z/my-project/new-blivo"

def ssh_exec(command, timeout=300):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=timeout)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

def upload_file(local_path, remote_path):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    client.close()

print("=" * 60)
print("COMPLETING DEPLOYMENT")
print("=" * 60)

# Fix: Create entrypoint-output dir and upload entrypoint
print("\n[1] Fixing entrypoint.sh...")
ssh_exec(f"mkdir -p {REMOTE_DIR}/entrypoint-output")
upload_file(f"{LOCAL_DIR}/entrypoint.sh", f"{REMOTE_DIR}/entrypoint-output/entrypoint.sh")
print("✅ entrypoint.sh uploaded!")

# Create .env
print("\n[2] Creating .env...")
out, err = ssh_exec("cat /home/blivoai/.env")
env_vars = {}
for line in out.split('\n'):
    line = line.strip()
    if '=' in line and not line.startswith('#'):
        key, val = line.split('=', 1)
        env_vars[key.strip()] = val.strip()

pg_password = env_vars.get('POSTGRES_PASSWORD', 'BlvPg_eZdU18PPULDS4YsemB1CquWN')
env_lines = [
    f"DATABASE_URL=postgresql://blivoai:{pg_password}@blivoai-postgres:5432/blivoai?schema=public",
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
print("✅ .env created!")

# Create docker-compose.yml
print("\n[3] Creating docker-compose.yml...")
prod_compose = '''services:
  chatbot:
    build: .
    container_name: new-blivo-chatbot
    restart: unless-stopped
    ports:
      - "3002:3000"
    env_file: .env
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
print("✅ docker-compose.yml created!")

# Extract archives
print("\n[4] Extracting archives...")
ssh_exec(f"cd {REMOTE_DIR}/standalone-output && tar xzf {REMOTE_DIR}/standalone.tar.gz")
ssh_exec(f"cd {REMOTE_DIR}/static-output && tar xzf {REMOTE_DIR}/static.tar.gz")
ssh_exec(f"cd {REMOTE_DIR}/public-output && tar xzf {REMOTE_DIR}/public.tar.gz")
ssh_exec(f"cd {REMOTE_DIR}/prisma-output && tar xzf {REMOTE_DIR}/prisma.tar.gz")
# Remove tar files
ssh_exec(f"rm -f {REMOTE_DIR}/standalone.tar.gz {REMOTE_DIR}/static.tar.gz {REMOTE_DIR}/public.tar.gz {REMOTE_DIR}/prisma.tar.gz")
print("✅ All archives extracted!")

# Verify files exist
out, err = ssh_exec(f"ls {REMOTE_DIR}/standalone-output/ | head -5")
print(f"Standalone files: {out}")

# Setup network
print("\n[5] Setting up network...")
out, err = ssh_exec("docker network ls --format '{{.Name}}'")
nets = out.strip().split('\n')
blivo_net = None
for net in nets:
    if 'blivo' in net.lower():
        blivo_net = net.strip()
        break

if not blivo_net:
    ssh_exec("docker network create blivoai-net")
    blivo_net = "blivoai-net"

ssh_exec(f"docker network connect {blivo_net} blivoai-caddy 2>&1")
ssh_exec(f"docker network connect {blivo_net} blivoai-postgres 2>&1")
print(f"✅ Network: {blivo_net}")

# Build Docker (fast - just copies pre-built files!)
print("\n[6] Building Docker image...")
print("⏳ Building... (should be fast since we use pre-built output)")
out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose build --progress=plain 2>&1", timeout=300)

# Show key output
build_success = False
for line in out.split('\n'):
    if 'Successfully built' in line or 'Successfully tagged' in line or 'DONE' in line:
        print(f"  ✅ {line}")
        build_success = True
    if 'Error' in line or 'CACHED' in line or 'COPY' in line or 'RUN' in line:
        print(f"  {line[:100]}")

if err and 'Error' in err:
    print(f"  ❌ Build error: {err[-500:]}")
elif not build_success:
    print(f"  Build output (last 20 lines):")
    for line in out.split('\n')[-20:]:
        print(f"    {line[:150]}")

# Start container
if build_success or True:  # Always try to start
    print("\n[7] Starting container...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d 2>&1")
    print(f"  {out.strip()}")

    # Wait for health
    print("\n[8] Waiting for health check...")
    for i in range(15):
        time.sleep(8)
        out, err = ssh_exec("docker ps --filter 'name=new-blivo' --format '{{.Names}} {{.Status}}'")
        status = out.strip()
        print(f"  Check {i+1}/15: {status}")
        if 'healthy' in status:
            print("  ✅ HEALTHY!")
            break
        if 'Exited' in status:
            print("  ❌ Container exited!")
            out, err = ssh_exec("docker logs new-blivo-chatbot 2>&1 | tail -30")
            print(f"  Logs:\n{out}")
            break

# Update Caddy
print("\n[9] Updating Caddy routing...")
ssh_exec("sed -i 's/new-blivo:3002/new-blivo-chatbot:3000/g' /home/blivoai/Caddyfile")
out, err = ssh_exec("docker exec blivoai-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")
print(f"  Caddy reload: {out.strip()}")

# Final test
time.sleep(5)
out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
demo_code = out.strip()
print(f"\n  🔗 demo.blivoai.com → HTTP {demo_code}")

out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com")
main_code = out.strip()
print(f"  🔗 blivoai.com → HTTP {main_code}")

# All containers
out, err = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
print(f"\nAll containers:\n{out}")

print("\n" + "=" * 60)
print("FINAL STATUS")
print(f"  demo.blivoai.com → HTTP {demo_code}")
print(f"  blivoai.com → HTTP {main_code}")
print("=" * 60)
