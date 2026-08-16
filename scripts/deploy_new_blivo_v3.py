#!/usr/bin/env python3
"""
Deploy new-blivo to OVH server (demo.blivoai.com)
Using paramiko SFTP for file transfer with proper directory setup
"""

import paramiko
import os
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
REMOTE_DIR = "/home/ubuntu/new-blivo"  # In ubuntu home directory for proper permissions
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
    out, err = ssh_exec(f"mkdir -p {REMOTE_DIR} && ls -la {REMOTE_DIR}")
    print(f"Directory created: {out.strip()}")
    
    # Step 2: Create tar archive locally
    print("\n[2] Creating deployment archive...")
    exclude_dirs = ['node_modules', '.next', '.git', 'blivoai_app', 'tool-results', 'download']
    exclude_flags = ' '.join([f'--exclude={d}' for d in exclude_dirs])
    tar_path = f"/home/z/my-project/new-blivo-deploy.tar.gz"
    
    result = os.system(f"cd {LOCAL_DIR} && tar czf {tar_path} {exclude_flags} .")
    
    tar_size = os.path.getsize(tar_path) / (1024*1024)
    print(f"Archive size: {tar_size:.1f} MB")
    
    # Step 3: Upload via SFTP
    print("\n[3] Uploading archive to server...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()
    
    try:
        sftp.put(tar_path, f"{REMOTE_DIR}/deploy.tar.gz")
        print("Upload complete!")
    except Exception as e:
        print(f"SFTP upload failed: {e}")
        # Try alternative: upload to home directory first
        try:
            sftp.put(tar_path, "/home/ubuntu/deploy.tar.gz")
            print("Uploaded to home directory!")
            # Then move it
            out, err = ssh_exec(f"mv /home/ubuntu/deploy.tar.gz {REMOTE_DIR}/deploy.tar.gz")
        except Exception as e2:
            print(f"Alternative upload also failed: {e2}")
            sftp.close()
            client.close()
            os.remove(tar_path)
            return
    
    sftp.close()
    client.close()
    
    # Step 4: Extract on server
    print("\n[4] Extracting archive...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && tar xzf deploy.tar.gz && rm deploy.tar.gz", timeout=60)
    print(f"Extraction done. Error (if any): {err[:200]}")
    
    # Verify files exist
    out, err = ssh_exec(f"ls -la {REMOTE_DIR}/ | head -20")
    print(f"Files in directory:\n{out}")
    
    # Clean local tar
    os.remove(tar_path)
    
    # Step 5: Read existing .env
    print("\n[5] Reading existing BlivoAI .env...")
    out, err = ssh_exec("cat /home/blivoai/.env")
    env_content = out
    
    # Parse env vars
    env_vars = {}
    for line in env_content.split('\n'):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            key, val = line.split('=', 1)
            env_vars[key.strip()] = val.strip()
    
    print(f"Found {len(env_vars)} env variables")
    
    # Step 6: Create .env for new-blivo
    print("\n[6] Creating .env for new-blivo...")
    pg_password = env_vars.get('POSTGRES_PASSWORD', 'BlvPg_eZdU18PPULDS4YsemB1CquWN')
    
    new_env_lines = [
        f"DATABASE_URL=postgresql://blivoai:{pg_password}@blivoai-postgres:5432/blivoai?schema=public",
        f"NEXTAUTH_SECRET={env_vars.get('NEXTAUTH_SECRET', 'change-this-secret-in-production')}",
        "NEXTAUTH_URL=https://demo.blivoai.com",
    ]
    
    # Copy API keys from existing env
    api_keys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
                'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_BASE_URL',
                'RESEND_API_KEY', 'TOGETHER_API_KEY', 'GROQ_API_KEY',
                'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY',
                'OPENROUTER_API_KEY', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
                'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET',
                'DODO_API_KEY', 'DODO_WEBHOOK_KEY']
    
    for key in api_keys:
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
    
    # Step 8: Check and connect network
    print("\n[8] Checking Docker network...")
    out, err = ssh_exec("docker network ls --format '{{.Name}}'")
    print(f"Existing networks: {out}")
    
    # Find or create the blivoai network
    nets = out.strip().split('\n')
    blivo_net = None
    for net in nets:
        if 'blivoai' in net.lower() or 'blivo' in net.lower():
            blivo_net = net.strip()
            break
    
    if not blivo_net:
        print("Creating blivoai-net network...")
        out, err = ssh_exec("docker network create blivoai-net")
        blivo_net = "blivoai-net"
        print(f"Created: {out}")
    else:
        print(f"Found existing network: {blivo_net}")
    
    # Connect existing Caddy and PostgreSQL to this network
    print("Connecting existing containers to shared network...")
    out1, err1 = ssh_exec(f"docker network connect {blivo_net} blivoai-caddy 2>&1")
    print(f"Caddy connect: {out1.strip() or 'Already connected'}")
    out2, err2 = ssh_exec(f"docker network connect {blivo_net} blivoai-postgres 2>&1")
    print(f"Postgres connect: {out2.strip() or 'Already connected'}")
    
    # Step 9: Build and deploy
    print("\n[9] Building and deploying Docker containers...")
    print("⏳ This will take several minutes (building Next.js + Docker image)...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d --build 2>&1", timeout=600)
    
    # Show key output lines
    lines = out.split('\n')
    print("Build output (key lines):")
    for line in lines:
        if any(keyword in line for keyword in ['Step', 'Built', 'Successfully', 'Creating', 'Starting', 'Error', 'error', 'WARNING']):
            print(f"  {line}")
    
    # Check for errors
    if 'Error' in err or 'error' in err:
        print(f"\n⚠️ Build errors:\n{err[-500:]}")
    
    # Step 10: Check deployment status
    print("\n[10] Checking deployment status...")
    time.sleep(15)
    
    for i in range(8):
        time.sleep(10)
        out, err = ssh_exec("docker ps --filter 'name=new-blivo' --format '{{.Names}} {{.Status}} {{.Ports}}'")
        status = out.strip()
        print(f"  Check {i+1}/8: {status}")
        if 'healthy' in status:
            print("  ✅ Container is healthy!")
            break
        if 'error' in status.lower() or not status:
            print("  ⚠️ Container might have issues")
            # Check logs
            out, err = ssh_exec("docker logs new-blivo-chatbot 2>&1 | tail -20")
            print(f"  Logs: {out}")
            break
    
    # Step 11: Verify everything
    print("\n[11] Final verification...")
    
    out, err = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    print(f"All containers:\n{out}")
    
    # Test demo.blivoai.com
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com 2>&1", timeout=30)
    demo_status = out.strip()
    print(f"demo.blivoai.com → HTTP {demo_status}")
    
    # Test blivoai.com still works
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com 2>&1", timeout=30)
    main_status = out.strip()
    print(f"blivoai.com → HTTP {main_status}")
    
    # Memory/disk
    out, err = ssh_exec("free -h")
    print(f"\nMemory:\n{out}")
    
    out, err = ssh_exec("df -h /")
    print(f"\nDisk:\n{out}")
    
    # Step 12: Update Caddy config to point to new-blivo container name
    print("\n[12] Ensuring Caddy routes to new-blivo...")
    # The Caddy config currently has: reverse_proxy new-blivo:3002
    # But the container name is new-blivo-chatbot and it maps 3002:3000
    # On the shared network, Caddy can access the container by its name
    # We need to update Caddyfile to use the correct internal port and container name
    
    # On the shared blivoai-net network, the container is accessible as 'new-blivo-chatbot'
    # And the app runs on port 3000 internally
    # So Caddy should proxy to new-blivo-chatbot:3000
    
    # Let me check the current Caddyfile
    out, err = ssh_exec("cat /home/blivoai/Caddyfile")
    # Find the demo.blivoai.com block
    if 'new-blivo:3002' in out:
        print("Updating Caddy proxy target...")
        # Replace new-blivo:3002 with new-blivo-chatbot:3000
        out, err = ssh_exec("sed -i 's/new-blivo:3002/new-blivo-chatbot:3000/g' /home/blivoai/Caddyfile")
        print(f"Sed output: {out}")
        
        # Also update standalone Caddyfile
        out, err = ssh_exec("sed -i 's/new-blivo:3002/new-blivo-chatbot:3000/g' /home/blivoai/.next/standalone/Caddyfile 2>/dev/null")
        
        # Reload Caddy
        out, err = ssh_exec("docker exec blivoai-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")
        print(f"Caddy reload: {out.strip()}")
    else:
        print(f"Current Caddy config doesn't have new-blivo:3002 - checking...")
    
    # Final test
    time.sleep(5)
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
    final_demo = out.strip()
    print(f"\n✅ Final: demo.blivoai.com → HTTP {final_demo}")
    
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com")
    final_main = out.strip()
    print(f"✅ Final: blivoai.com → HTTP {final_main}")
    
    print("\n" + "=" * 60)
    print("DEPLOYMENT STATUS:")
    print(f"  demo.blivoai.com → HTTP {final_demo}")
    print(f"  blivoai.com → HTTP {final_main}")
    print("=" * 60)
    
    # Save results
    with open('/home/z/my-project/scripts/deploy_results.json', 'w') as f:
        import json
        json.dump({
            'demo_status': final_demo,
            'main_status': final_main,
            'remote_dir': REMOTE_DIR,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        }, f, indent=2)

if __name__ == "__main__":
    main()
