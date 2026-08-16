#!/usr/bin/env python3
"""Build new-blivo Docker container on OVH server"""
import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
REMOTE_DIR = "/home/ubuntu/new-blivo"

def ssh_exec(command, timeout=600):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=timeout)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

print("=" * 60)
print("BUILDING NEW-BLIVO ON OVH SERVER")
print("=" * 60)

# Step 1: Check network setup
print("\n[1] Checking Docker network...")
out, err = ssh_exec("docker network ls --format '{{.Name}}'")
print(f"Networks: {out}")

# Connect containers to shared network
nets = out.strip().split('\n')
blivo_net = None
for net in nets:
    if 'blivo' in net.lower():
        blivo_net = net.strip()
        break

if not blivo_net:
    print("Creating blivoai-net...")
    out, err = ssh_exec("docker network create blivoai-net")
    blivo_net = "blivoai-net"

# Connect existing containers
print(f"Using network: {blivo_net}")
ssh_exec(f"docker network connect {blivo_net} blivoai-caddy 2>&1")
ssh_exec(f"docker network connect {blivo_net} blivoai-postgres 2>&1")
print("Existing containers connected to shared network")

# Step 2: Check docker-compose.yml has correct network name
print("\n[2] Checking docker-compose.yml...")
out, err = ssh_exec(f"cat {REMOTE_DIR}/docker-compose.yml")
print(f"Compose file:\n{out[:300]}")

# Make sure the network name matches
if blivo_net and blivo_net != 'blivoai-net':
    print(f"Updating compose network name to {blivo_net}...")
    ssh_exec(f"sed -i 's/blivoai-net/{blivo_net}/g' {REMOTE_DIR}/docker-compose.yml")

# Step 3: Build Docker image
print("\n[3] Building Docker image (this takes time)...")
print("⏳ Building...")

# Run build with very long timeout
out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d --build 2>&1", timeout=600)

# Show key output
for line in out.split('\n'):
    if any(k in line for k in ['Step', 'Successfully', 'Creating', 'Starting', 'Error', 'error', 'DONE', 'Built']):
        print(f"  {line[:150]}")

if 'Error' in err or 'error' in err.lower():
    print(f"\n⚠️ Errors: {err[-300:]}")

# Step 4: Check status
print("\n[4] Checking container status...")
time.sleep(15)

out, err = ssh_exec("docker ps --filter 'name=new-blivo' --format '{{.Names}} {{.Status}} {{.Ports}}'")
print(f"new-blivo status: {out.strip()}")

if not out.strip():
    print("Container not running! Checking logs...")
    # Check build logs
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose logs 2>&1 | tail -30")
    print(f"Logs:\n{out}")
    
    # Maybe the build failed - try again with more verbose output
    print("\nRetrying build...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose build 2>&1 | tail -50", timeout=600)
    print(f"Build output:\n{out[-1500:]}")
    
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d 2>&1")
    print(f"Up output: {out}")

# Step 5: Wait for health check
print("\n[5] Waiting for health check...")
for i in range(12):
    time.sleep(10)
    out, err = ssh_exec("docker ps --filter 'name=new-blivo' --format '{{.Names}} {{.Status}}'")
    status = out.strip()
    print(f"  {i+1}/12: {status}")
    if 'healthy' in status:
        print("✅ Healthy!")
        break
    if 'Exited' in status or not status:
        print("⚠️ Container issue detected")
        out, err = ssh_exec("docker logs new-blivo-chatbot 2>&1 | tail -30")
        print(f"Container logs:\n{out}")
        break

# Step 6: Update Caddy to route to correct container name
print("\n[6] Updating Caddy config...")
# Caddy needs to proxy to the container by name on the shared network
# The container is named new-blivo-chatbot and runs on port 3000 internally
out, err = ssh_exec("cat /home/blivoai/Caddyfile | grep 'new-blivo'")
print(f"Current Caddy new-blivo routing: {out}")

# Update Caddyfile to use correct container name and port
ssh_exec("sed -i 's/new-blivo:3002/new-blivo-chatbot:3000/g' /home/blivoai/Caddyfile")
ssh_exec("docker exec blivoai-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")
print("Caddy updated and reloaded!")

# Step 7: Final verification
print("\n[7] Final verification...")
time.sleep(5)

out, err = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
print(f"All containers:\n{out}")

out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
print(f"demo.blivoai.com → HTTP {out.strip()}")

out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com")
print(f"blivoai.com → HTTP {out.strip()}")

out, err = ssh_exec("free -h | head -3")
print(f"Memory: {out}")

print("\n" + "=" * 60)
print("BUILD COMPLETE!")
print("=" * 60)
