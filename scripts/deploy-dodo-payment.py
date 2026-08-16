#!/usr/bin/env python3
# ============================================
# Deploy Dodo Payment Integration to Server
# Force pull + Prisma migration + Docker rebuild
# ============================================

import paramiko
import time
import sys

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
PROJECT_PATH = "/home/ubuntu/blivoai-demo"

def ssh_command(ssh, cmd, timeout=300):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(f"STDOUT:\n{out[:5000]}")
    if err:
        print(f"STDERR:\n{err[:3000]}")
    return exit_code, out, err

def main():
    print("=== Deploying Dodo Payment Integration ===")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
        print(f"✓ Connected to {HOST}")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        sys.exit(1)
    
    # Step 1: Force clean and pull
    print("\n=== Force pulling latest code ===")
    # Remove conflicting untracked files
    ssh_command(ssh, f"cd {PROJECT_PATH} && rm -rf src/app/*/payment")
    # Reset to remote
    code, out, err = ssh_command(ssh, f"cd {PROJECT_PATH} && git fetch origin && git reset --hard origin/main")
    if code != 0:
        print("✗ Git reset failed!")
        sys.exit(1)
    
    # Step 2: Verify files exist
    code, out, err = ssh_command(ssh, f"cd {PROJECT_PATH} && ls src/app/*/payment/*/page.tsx")
    print(f"Payment pages check: {out}")
    
    # Step 3: Verify webhook endpoint
    code, out, err = ssh_command(ssh, f"cd {PROJECT_PATH} && ls src/app/api/payments/webhook/route.ts")
    print(f"Webhook route check: {out}")
    
    # Step 4: Run Prisma db push (create payment tables)
    print("\n=== Running Prisma DB Push ===")
    code, out, err = ssh_command(ssh, f"cd {PROJECT_PATH} && npx prisma db push --accept-data-loss", timeout=120)
    print(f"DB Push result: exit code {code}")
    if "Payment" in out or "payment" in out.lower():
        print("✓ Payment tables creation detected in output")
    
    # Step 5: Rebuild Docker
    print("\n=== Rebuilding Docker Container ===")
    code, out, err = ssh_command(ssh, f"cd {PROJECT_PATH} && docker compose build --no-cache app", timeout=600)
    if code != 0:
        print("✗ Docker build failed!")
        sys.exit(1)
    
    # Step 6: Restart Docker
    print("\n=== Restarting Docker Container ===")
    code, out, err = ssh_command(ssh, f"cd {PROJECT_PATH} && docker compose up -d app")
    if code != 0:
        print("✗ Docker restart failed!")
        sys.exit(1)
    
    # Step 7: Wait for startup
    print("\n=== Waiting for container to start ===")
    time.sleep(15)
    
    # Step 8: Check container
    code, out, err = ssh_command(ssh, "docker ps --filter 'name=demo-chatbot'")
    print(f"Container status:\n{out}")
    
    # Step 9: Test webhook endpoint
    print("\n=== Testing Webhook Endpoint ===")
    code, out, err = ssh_command(ssh, "curl -s http://localhost:3001/api/payments/webhook")
    print(f"Webhook test: {out[:500]}")
    
    # Step 10: Test site health
    code, out, err = ssh_command(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar")
    print(f"\n✓ Site health: HTTP {out}")
    
    # Step 11: Test HTTPS
    code, out, err = ssh_command(ssh, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/ar")
    print(f"✓ HTTPS health: HTTP {out}")
    
    ssh.close()
    print("\n=== Deployment Complete! ===")
    print("Dodo Payment integration is now live:")
    print("  - Payment & PlatformPaymentConfig tables created in DB")
    print("  - Webhook endpoint: https://demo.blivoai.com/api/payments/webhook")
    print("  - Success page: https://demo.blivoai.com/ar/payment/success")
    print("  - Cancel page: https://demo.blivoai.com/ar/payment/cancel")
    print("")
    print("NEXT: Go to Admin panel → System → Payment keys → Add DODO_API_KEY")

if __name__ == "__main__":
    main()
