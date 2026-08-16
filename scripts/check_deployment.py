#!/usr/bin/env python3
"""Quick check of OVH server deployment status"""
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(command, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=timeout)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

print("Checking OVH server status...")

# Docker containers
out, err = ssh_exec("docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
print(f"\nContainers:\n{out}")

# Check if new-blivo directory exists
out, err = ssh_exec("ls /home/ubuntu/new-blivo/ | head -10")
print(f"\nnew-blivo directory:\n{out}")

# Check if build is running
out, err = ssh_exec("docker ps --filter 'name=new-blivo' --format '{{.Names}} {{.Status}}'")
print(f"\nnew-blivo containers: {out}")

# Check build logs if container exists
out, err = ssh_exec("docker logs new-blivo-chatbot 2>&1 | tail -30")
if out:
    print(f"\nnew-blivo logs (last 30):\n{out}")

# Test URLs
out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
print(f"\ndemo.blivoai.com → HTTP {out.strip()}")

out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com")
print(f"blivoai.com → HTTP {out.strip()}")

# Memory
out, err = ssh_exec("free -h")
print(f"\nMemory:\n{out}")
