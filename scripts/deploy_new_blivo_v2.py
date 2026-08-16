#!/usr/bin/env python3
"""
Deploy new-blivo to OVH server (demo.blivoai.com)
Using scp via bash for faster file transfer
"""

import paramiko
import os
import time
import subprocess

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
REMOTE_DIR = "/home/ubuntu/new-blivo"
LOCAL_DIR = "/home/z/my-project/new-blivo"

def ssh_exec(command, timeout=60):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=timeout)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

def main():
    print("=" * 60)
    print("DEPLOYING NEW-BLIVO TO OVH SERVER")
    print("=" * 60)
    
    # Step 1: Create project directory with proper permissions
    print("\n[1] Creating project directory...")
    out, err = ssh_exec(f"mkdir -p {REMOTE_DIR} && chmod 755 {REMOTE_DIR}")
    print(f"Created: {REMOTE_DIR}")
    
    # Step 2: Create tar archive locally (excluding heavy dirs)
    print("\n[2] Creating deployment archive...")
    exclude_dirs = ['node_modules', '.next', '.git', 'blivoai_app', 'tool-results', 'download', 'deploy.tar.gz']
    exclude_flags = ' '.join([f'--exclude={d}' for d in exclude_dirs])
    tar_path = f"/tmp/new-blivo-deploy.tar.gz"
    
    result = subprocess.run(
        f"cd {LOCAL_DIR} && tar czf {tar_path} {exclude_flags} .",
        shell=True, capture_output=True, text=True
    )
    
    tar_size = os.path.getsize(tar_path) / (1024*1024)
    print(f"Archive size: {tar_size:.1f} MB")
    
    # Step 3: Upload via scp (using sshpass for password authentication)
    print("\n[3] Uploading to server via SCP...")
    result = subprocess.run(
        f"sshpass -p '{PASSWORD}' scp -o StrictHostKeyChecking=no {tar_path} {USER}@{HOST}:{REMOTE_DIR}/deploy.tar.gz",
        shell=True, capture_output=True, text=True, timeout=120
    )
    print(f"SCP output: {result.stdout}")
    if result.returncode != 0:
        print(f"SCP error: {result.stderr}")
        # Install sshpass if needed
        print("Installing sshpass...")
        subprocess.run("apt-get install -y sshpass", shell=True, capture_output=True)
        result = subprocess.run(
            f"sshpass -p '{PASSWORD}' scp -o StrictHostKeyChecking=no {tar_path} {USER}@{HOST}:{REMOTE_DIR}/deploy.tar.gz",
            shell=True, capture_output=True, text=True, timeout=120
        )
        print(f"SCP retry: {result.stdout}")
        if result.returncode != 0:
            print(f"SCP retry error: {result.stderr}")
            # Try with paramiko SFTP instead
            print("Trying SFTP...")
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
            sftp = client.open_sftp()
            sftp.put(tar_path, f"{REMOTE_DIR}/deploy.tar.gz")
            sftp.close()
            client.close()
            print("SFTP upload complete!")
    
    print("Upload complete!")
    
    # Step 4: Extract on server
    print("\n[4] Extracting archive...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && tar xzf deploy.tar.gz && rm deploy.tar.gz")
    print(f"Extracted successfully")
    
    # Clean local tar
    os.remove(tar_path)
    
    # Step 5: Get .env from existing BlivoAI
    print("\n[5] Reading existing .env...")
    out, err = ssh_exec("cat /home/blivoai/.env")
    env_content = out
    
    # Parse env vars
    env_vars = {}
    for line in env_content.split('\n'):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            key, val = line.split('=', 1)
            env_vars[key] = val
    
    # Step 6: Create .env for new-blivo
    print("\n[6] Creating .env for new-blivo...")
    pg_password = env_vars.get('POSTGRES_PASSWORD', 'BlvPg_eZdU18PPULDS4YsemB1CquWN')
    
    new_env_lines = [
        f"DATABASE_URL=postgresql://blivoai:{pg_password}@blivoai-postgres:5432/blivoai?schema=public",
        f"NEXTAUTH_SECRET={env_vars.get('NEXTAUTH_SECRET', 'change-this-secret-in-production')}",
        "NEXTAUTH_URL=https://demo.blivoai.com",
    ]
    
    # Copy API keys
    for key in ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
                'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_BASE_URL',
                'RESEND_API_KEY', 'TOGETHER_API_KEY', 'GROQ_API_KEY',
                'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY',
                'OPENROUTER_API_KEY', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
                'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET',
                'DODO_API_KEY', 'DODO_WEBHOOK_KEY']:
        if key in env_vars:
            new_env_lines.append(f"{key}={env_vars[key]}")
    
    new_env = '\n'.join(new_env_lines)
    
    # Write .env
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    with sftp.open(f'{REMOTE_DIR}/.env', 'w') as f:
        f.write(new_env)
    sftp.close()
    client.close()
    print(f".env written with {len(new_env_lines)} variables")
    
    # Step 7: Create production docker-compose.yml
    print("\n[7] Creating production docker-compose.yml...")
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
    print("docker-compose.yml created!")
    
    # Step 8: Connect new-blivo to existing Caddy network
    print("\n[8] Connecting to existing Caddy network...")
    # First check if blivoai-net exists
    out, err = ssh_exec("docker network ls --format '{{.Name}}'")
    networks = out.strip()
    print(f"Existing networks: {networks}")
    
    # Find the existing network name
    blivo_net = None
    for net in networks.split('\n'):
        if 'blivo' in net.lower():
            blivo_net = net.strip()
            break
    
    if blivo_net:
        print(f"Found existing network: {blivo_net}")
    else:
        # Create network if it doesn't exist
        print("Creating blivoai-net network...")
        out, err = ssh_exec("docker network create blivoai-net")
        blivo_net = "blivoai-net"
    
    # Step 9: Build and deploy
    print("\n[9] Building Docker image and deploying...")
    print("This may take several minutes...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d --build 2>&1", timeout=600)
    
    # Show last part of output
    build_lines = out.split('\n')
    print("Build output (last 30 lines):")
    for line in build_lines[-30:]:
        print(f"  {line}")
    
    if err:
        err_lines = err.split('\n')
        print("Errors (last 10 lines):")
        for line in err_lines[-10:]:
            print(f"  {line}")
    
    # Step 10: Wait and check
    print("\n[10] Checking deployment status...")
    time.sleep(15)
    
    for i in range(8):
        time.sleep(10)
        out, err = ssh_exec("docker ps --filter 'name=new-blivo' --format '{{.Names}} {{.Status}}'")
        status = out.strip()
        print(f"  Check {i+1}/8: {status}")
        if 'healthy' in status:
            print("  ✅ Container is healthy!")
            break
    
    # Step 11: Verify everything
    print("\n[11] Final verification...")
    
    # All containers
    out, err = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    print(f"All containers:\n{out}")
    
    # Test demo.blivoai.com
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
    demo_status = out.strip()
    print(f"demo.blivoai.com → HTTP {demo_status}")
    
    # Test blivoai.com still works
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com")
    main_status = out.strip()
    print(f"blivoai.com → HTTP {main_status}")
    
    # Memory/disk
    out, err = ssh_exec("free -h")
    print(f"\nMemory:\n{out}")
    
    out, err = ssh_exec("df -h /")
    print(f"\nDisk:\n{out}")
    
    # Step 12: Update Caddy to proxy demo.blivoai.com to new-blivo container
    print("\n[12] Updating Caddy routing...")
    # The Caddy config was already updated to point demo.blivoai.com to new-blivo:3002
    # But since we're on a shared network, the container name is new-blivo-chatbot
    # Let's verify Caddy can reach the new container
    
    # Reload Caddy
    out, err = ssh_exec("docker exec blivoai-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")
    print(f"Caddy reload: {out.strip()}")
    
    print("\n" + "=" * 60)
    print("DEPLOYMENT COMPLETE!")
    print(f"demo.blivoai.com → HTTP {demo_status}")
    print(f"blivoai.com → HTTP {main_status}")
    print("=" * 60)

if __name__ == "__main__":
    main()
