#!/usr/bin/env python3
"""
Deploy new-blivo to OVH server (demo.blivoai.com)
1. Create project directory on server
2. Copy code via rsync-like approach (SCP via paramiko)
3. Build and run Docker containers
4. Verify deployment
"""

import paramiko
import os
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
REMOTE_DIR = "/home/new-blivo"
LOCAL_DIR = "/home/z/my-project/new-blivo"

def ssh_exec(command, timeout=60):
    """Execute command on OVH server via SSH"""
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
    
    # Step 1: Create project directory on server
    print("\n[1] Creating project directory...")
    out, err = ssh_exec(f"mkdir -p {REMOTE_DIR}")
    print(f"Created: {REMOTE_DIR}")
    
    # Step 2: Use SCP to transfer key files
    # Since paramiko SFTP is slow for bulk transfers, we'll use tar + scp
    print("\n[2] Preparing local project archive...")
    
    # Create tar archive of project (excluding node_modules, .next, .git)
    exclude_dirs = ['node_modules', '.next', '.git', 'blivoai_app', 'tool-results', 'download']
    exclude_flags = ' '.join([f'--exclude={d}' for d in exclude_dirs])
    
    # Create tar locally
    tar_path = f"{LOCAL_DIR}/deploy.tar.gz"
    os.system(f"cd {LOCAL_DIR} && tar czf {tar_path} {exclude_flags} .")
    
    tar_size = os.path.getsize(tar_path) / (1024*1024)
    print(f"Archive size: {tar_size:.1f} MB")
    
    # Step 3: Upload tar to server
    print("\n[3] Uploading project to server...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    
    sftp.put(tar_path, f"{REMOTE_DIR}/deploy.tar.gz")
    print("Upload complete!")
    sftp.close()
    client.close()
    
    # Step 4: Extract on server
    print("\n[4] Extracting project...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && tar xzf deploy.tar.gz && rm deploy.tar.gz")
    print(f"Extracted: {out.strip()}")
    
    # Also remove local tar
    os.remove(tar_path)
    
    # Step 5: Copy .env from existing BlivoAI installation
    print("\n[5] Setting up environment...")
    out, err = ssh_exec(f"cat /home/blivoai/.env")
    env_content = out
    
    # Modify DATABASE_URL for new-blivo (different port/database)
    # We'll share the same PostgreSQL instance but use the existing database
    # Actually, we should use the same PostgreSQL since it's already running
    # The existing PostgreSQL is at blivoai-postgres container
    
    # Create .env for new-blivo pointing to existing PostgreSQL
    # But since new-blivo runs in its own Docker network, we need to connect
    # to the existing PostgreSQL. The simplest approach is to share the network.
    
    print("\n[6] Configuring Docker networking...")
    # Check existing Docker networks
    out, err = ssh_exec("docker network ls --format '{{.Name}}'")
    print(f"Existing networks: {out}")
    
    # Step 7: Create .env file for new-blivo
    print("\n[7] Creating .env file...")
    
    # We'll connect to the existing PostgreSQL via its container name
    # But new-blivo is in a separate compose, so we need to share the network
    # Alternative: Use host networking or connect to PostgreSQL on host
    
    # Let's use a simpler approach: new-blivo connects to existing PostgreSQL
    # via the external network. First, let's get the existing network name.
    out, err = ssh_exec("docker network ls --filter 'name=blivo' --format '{{.Name}}'")
    existing_net = out.strip()
    print(f"Existing BlivoAI network: {existing_net}")
    
    # Create .env file
    # Get NEXTAUTH_SECRET from existing .env
    nextauth_secret = ""
    for line in env_content.split('\n'):
        if line.startswith('NEXTAUTH_SECRET='):
            nextauth_secret = line.split('=', 1)[1]
            break
    
    # Also get other env vars from existing .env
    env_vars = {}
    for line in env_content.split('\n'):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            key, val = line.split('=', 1)
            env_vars[key] = val
    
    # Create new .env that connects to existing PostgreSQL
    new_env_lines = []
    # DATABASE_URL pointing to existing PostgreSQL container
    new_env_lines.append(f"DATABASE_URL=postgresql://blivoai:{env_vars.get('POSTGRES_PASSWORD', 'BlvPg_eZdU18PPULDS4YsemB1CquWN')}@blivoai-postgres:5432/blivoai?schema=public")
    
    # Copy other important env vars
    for key in ['NEXTAUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
                'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'RESEND_API_KEY',
                'TOGETHER_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 
                'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'OPENROUTER_API_KEY',
                'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']:
        if key in env_vars:
            new_env_lines.append(f"{key}={env_vars[key]}")
    
    new_env = '\n'.join(new_env_lines)
    
    # Write .env file
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    
    with sftp.open(f'{REMOTE_DIR}/.env', 'w') as f:
        f.write(new_env)
    
    sftp.close()
    client.close()
    
    print(f".env written with {len(new_env_lines)} variables")
    
    # Step 8: Modify docker-compose.yml for shared PostgreSQL
    print("\n[8] Modifying docker-compose for shared PostgreSQL...")
    
    # Read the current docker-compose.yml
    with open(f'{LOCAL_DIR}/docker-compose.yml', 'r') as f:
        compose_content = f.read()
    
    # We need to modify it to:
    # 1. Remove the postgres service (use existing one)
    # 2. Connect to the existing blivoai-net network
    # 3. Only have chatbot service on port 3002
    
    new_compose = '''services:
  chatbot:
    build: .
    container_name: new-blivo-chatbot
    restart: unless-stopped
    ports:
      - "3002:3000"
    environment:
      - DATABASE_URL=postgresql://blivoai:BlvPg_eZdU18PPULDS4YsemB1CquWN@blivoai-postgres:5432/blivoai?schema=public
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-change-this-secret-in-production}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-https://demo.blivoai.com}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
      - PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID:-}
      - PAYPAL_CLIENT_SECRET=${PAYPAL_CLIENT_SECRET:-}
      - PAYPAL_BASE_URL=${PAYPAL_BASE_URL:-https://api-m.sandbox.paypal.com}
      - RESEND_API_KEY=${RESEND_API_KEY:-}
      - TOGETHER_API_KEY=${TOGETHER_API_KEY:-}
      - GROQ_API_KEY=${GROQ_API_KEY:-}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID:-}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET:-}
    volumes:
      - new-blivo-uploads:/app/data/uploads
    networks:
      - blivoai-net  # Connect to existing BlivoAI network
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

networks:
  blivoai-net:
    external: true  # Use existing network from blivoai installation

volumes:
  new-blivo-uploads:
'''
    
    # Write modified docker-compose.yml
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    
    with sftp.open(f'{REMOTE_DIR}/docker-compose.yml', 'w') as f:
        f.write(new_compose)
    
    sftp.close()
    client.close()
    
    print("docker-compose.yml updated for shared PostgreSQL!")
    
    # Step 9: Build and deploy Docker containers
    print("\n[9] Building and deploying...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d --build 2>&1", timeout=600)
    print(f"Build output: {out[-2000:]}")
    if err:
        print(f"Build errors: {err[-1000:]}")
    
    # Step 10: Wait for health check
    print("\n[10] Waiting for health check...")
    for i in range(5):
        time.sleep(10)
        out, err = ssh_exec("docker ps --filter 'name=new-blivo' --format '{{.Names}} {{.Status}}'")
        print(f"  {i+1}/5: {out.strip()}")
    
    # Step 11: Verify deployment
    print("\n[11] Verifying deployment...")
    out, err = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    print(f"All containers:\n{out}")
    
    # Test demo.blivoai.com
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
    print(f"demo.blivoai.com → HTTP {out.strip()}")
    
    # Also test blivoai.com is still working
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com")
    print(f"blivoai.com → HTTP {out.strip()}")
    
    # Step 12: Check memory
    out, err = ssh_exec("free -h")
    print(f"\nMemory usage:\n{out}")
    
    out, err = ssh_exec("df -h /")
    print(f"\nDisk usage:\n{out}")
    
    print("\n" + "=" * 60)
    print("DEPLOYMENT COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    main()
