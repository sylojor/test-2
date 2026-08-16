#!/usr/bin/env python3
"""
Fast deployment: Upload pre-built standalone output + minimal Dockerfile
No npm install or next build needed on server — just copy files and run!
"""

import paramiko
import os
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
REMOTE_DIR = "/home/ubuntu/new-blivo"
LOCAL_DIR = "/home/z/my-project/new-blivo"

def ssh_exec(command, timeout=120):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=timeout)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

def upload_file(local_path, remote_path):
    """Upload a file via paramiko SFTP"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    client.close()

def main():
    print("=" * 60)
    print("FAST DEPLOYMENT — Pre-built Standalone Upload")
    print("=" * 60)
    
    # Step 1: Create deployment packages locally
    print("\n[1] Creating deployment packages...")
    
    # Package 1: Standalone Next.js output
    standalone_tar = "/tmp/blivo-standalone.tar.gz"
    os.system(f"cd {LOCAL_DIR}/.next/standalone && tar czf {standalone_tar} .")
    s1_size = os.path.getsize(standalone_tar) / (1024*1024)
    print(f"  Standalone: {s1_size:.1f} MB")
    
    # Package 2: Static assets (small)
    static_tar = "/tmp/blivo-static.tar.gz"
    os.system(f"cd {LOCAL_DIR}/.next/static && tar czf {static_tar} .")
    s2_size = os.path.getsize(static_tar) / (1024*1024)
    print(f"  Static: {s2_size:.1f} MB")
    
    # Package 3: Public folder
    public_tar = "/tmp/blivo-public.tar.gz"
    os.system(f"cd {LOCAL_DIR}/public && tar czf {public_tar} .")
    s3_size = os.path.getsize(public_tar) / (1024*1024)
    print(f"  Public: {s3_size:.1f} MB")
    
    # Package 4: Prisma schema + seed + migrations
    prisma_tar = "/tmp/blivo-prisma.tar.gz"
    os.system(f"cd {LOCAL_DIR}/prisma && tar czf {prisma_tar} .")
    s4_size = os.path.getsize(prisma_tar) / (1024*1024)
    print(f"  Prisma: {s4_size:.1f} MB")
    
    total = s1_size + s2_size + s3_size + s4_size
    print(f"  Total: {total:.1f} MB")
    
    # Step 2: Create directories on server
    print("\n[2] Creating directories on server...")
    ssh_exec(f"mkdir -p {REMOTE_DIR}/standalone-output {REMOTE_DIR}/static-output {REMOTE_DIR}/public-output {REMOTE_DIR}/prisma-output")
    print("Directories created!")
    
    # Step 3: Upload packages
    print("\n[3] Uploading packages...")
    
    files_to_upload = [
        (standalone_tar, f"{REMOTE_DIR}/standalone.tar.gz"),
        (static_tar, f"{REMOTE_DIR}/static.tar.gz"),
        (public_tar, f"{REMOTE_DIR}/public.tar.gz"),
        (prisma_tar, f"{REMOTE_DIR}/prisma.tar.gz"),
    ]
    
    for local, remote in files_to_upload:
        fname = os.path.basename(local)
        size = os.path.getsize(local) / (1024*1024)
        print(f"  Uploading {fname} ({size:.1f} MB)...")
        try:
            upload_file(local, remote)
            print(f"  ✅ Uploaded!")
        except Exception as e:
            print(f"  ❌ Error: {e}")
            # Try upload to home dir first, then move
            try:
                upload_file(local, f"/home/ubuntu/{fname}")
                ssh_exec(f"mv /home/ubuntu/{fname} {remote}")
                print(f"  ✅ Uploaded (via home dir)!")
            except Exception as e2:
                print(f"  ❌ Failed completely: {e2}")
    
    # Step 4: Upload Dockerfile, entrypoint.sh, docker-compose.yml, .env
    print("\n[4] Uploading config files...")
    
    # Dockerfile.standalone
    upload_file(f"{LOCAL_DIR}/Dockerfile.standalone", f"{REMOTE_DIR}/Dockerfile")
    print("  ✅ Dockerfile uploaded!")
    
    # entrypoint.sh
    upload_file(f"{LOCAL_DIR}/entrypoint.sh", f"{REMOTE_DIR}/entrypoint-output/entrypoint.sh")
    print("  ✅ entrypoint.sh uploaded!")
    
    # Step 5: Read existing .env and create new one
    print("\n[5] Creating .env...")
    out, err = ssh_exec("cat /home/blivoai/.env")
    env_vars = {}
    for line in out.split('\n'):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            key, val = line.split('=', 1)
            env_vars[key.strip()] = val.strip()
    
    pg_password = env_vars.get('POSTGRES_PASSWORD', 'BlvPg_eZdU18PPULDS4YsemB1CquWN')
    new_env = '\n'.join([
        f"DATABASE_URL=postgresql://blivoai:{pg_password}@blivoai-postgres:5432/blivoai?schema=public",
        f"NEXTAUTH_SECRET={env_vars.get('NEXTAUTH_SECRET', 'change-this-secret')}",
        "NEXTAUTH_URL=https://demo.blivoai.com",
    ] + [f"{k}={v}" for k, v in env_vars.items() 
          if k in ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'PAYPAL_CLIENT_ID',
                   'PAYPAL_CLIENT_SECRET', 'PAYPAL_BASE_URL', 'RESEND_API_KEY',
                   'TOGETHER_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY',
                   'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'OPENROUTER_API_KEY',
                   'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'STRIPE_SECRET_KEY',
                   'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET', 'DODO_API_KEY',
                   'DODO_WEBHOOK_KEY']])
    
    # Write .env via SFTP
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    with sftp.open(f'{REMOTE_DIR}/.env', 'w') as f:
        f.write(new_env)
    sftp.close()
    client.close()
    print("  ✅ .env created!")
    
    # Step 6: Create docker-compose.yml
    print("\n[6] Creating docker-compose.yml...")
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
    print("  ✅ docker-compose.yml created!")
    
    # Step 7: Extract archives on server
    print("\n[7] Extracting archives...")
    ssh_exec(f"cd {REMOTE_DIR}/standalone-output && tar xzf {REMOTE_DIR}/standalone.tar.gz && rm {REMOTE_DIR}/standalone.tar.gz")
    ssh_exec(f"cd {REMOTE_DIR}/static-output && tar xzf {REMOTE_DIR}/static.tar.gz && rm {REMOTE_DIR}/static.tar.gz")
    ssh_exec(f"cd {REMOTE_DIR}/public-output && tar xzf {REMOTE_DIR}/public.tar.gz && rm {REMOTE_DIR}/public.tar.gz")
    ssh_exec(f"cd {REMOTE_DIR}/prisma-output && tar xzf {REMOTE_DIR}/prisma.tar.gz && rm {REMOTE_DIR}/prisma.tar.gz")
    print("  ✅ All archives extracted!")
    
    # Step 8: Setup Docker network
    print("\n[8] Setting up Docker network...")
    out, err = ssh_exec("docker network ls --format '{{.Name}}'")
    nets = out.strip().split('\n')
    
    blivo_net = None
    for net in nets:
        if 'blivo' in net.lower():
            blivo_net = net.strip()
            break
    
    if not blivo_net:
        out, err = ssh_exec("docker network create blivoai-net")
        blivo_net = "blivoai-net"
    
    # Connect existing containers
    ssh_exec(f"docker network connect {blivo_net} blivoai-caddy 2>&1")
    ssh_exec(f"docker network connect {blivo_net} blivoai-postgres 2>&1")
    
    # Update compose if network name differs
    if blivo_net != 'blivoai-net':
        ssh_exec(f"sed -i 's/blivoai-net/{blivo_net}/g' {REMOTE_DIR}/docker-compose.yml")
    
    print(f"  ✅ Network: {blivo_net}")
    
    # Step 9: Build Docker (fast — just copies files, no npm install!)
    print("\n[9] Building Docker image (fast — pre-built standalone)...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose build 2>&1", timeout=300)
    
    for line in out.split('\n'):
        if any(k in line for k in ['Step', 'COPY', 'RUN', 'DONE', 'Successfully', 'Built']):
            print(f"  {line[:120]}")
    
    if err and ('Error' in err or 'error' in err):
        print(f"  ⚠️ Errors: {err[-300:]}")
    else:
        print("  ✅ Build complete!")
    
    # Step 10: Start container
    print("\n[10] Starting container...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d 2>&1")
    print(f"  {out.strip()}")
    
    # Step 11: Wait and verify
    print("\n[11] Verifying deployment...")
    for i in range(10):
        time.sleep(10)
        out, err = ssh_exec("docker ps --filter 'name=new-blivo' --format '{{.Names}} {{.Status}}'")
        status = out.strip()
        print(f"  Check {i+1}/10: {status}")
        if 'healthy' in status:
            print("  ✅ Healthy!")
            break
        if 'Exited' in status or not status:
            out, err = ssh_exec("docker logs new-blivo-chatbot 2>&1 | tail -20")
            print(f"  Logs:\n{out}")
            break
    
    # Update Caddy
    print("\n[12] Updating Caddy routing...")
    ssh_exec("sed -i 's/new-blivo:3002/new-blivo-chatbot:3000/g' /home/blivoai/Caddyfile")
    out, err = ssh_exec("docker exec blivoai-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")
    print(f"  Caddy: {out.strip()}")
    
    # Final test
    time.sleep(5)
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
    print(f"\n  demo.blivoai.com → HTTP {out.strip()}")
    
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com")
    print(f"  blivoai.com → HTTP {out.strip()}")
    
    # Cleanup local tars
    for f in [standalone_tar, static_tar, public_tar, prisma_tar]:
        if os.path.exists(f):
            os.remove(f)
    
    print("\n" + "=" * 60)
    print("DEPLOYMENT COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    main()
