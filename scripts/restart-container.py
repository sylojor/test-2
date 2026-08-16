#!/usr/bin/env python3
import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
PROJECT_PATH = "/home/ubuntu/blivoai-demo"

def ssh_cmd(ssh, cmd, timeout=60):
    print(f">>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out[:1000])
    return stdout.channel.recv_exit_status(), out

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

# Stop old container first (in case of conflict)
ssh_cmd(ssh, f"cd {PROJECT_PATH} && docker compose down app")
ssh_cmd(ssh, f"cd {PROJECT_PATH} && docker compose up -d app")

print("Waiting 20s for startup...")
time.sleep(20)

# Check status
ssh_cmd(ssh, "docker ps --filter 'name=demo-chatbot' --format '{{.Names}} {{.Status}}'")
ssh_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar")
ssh_cmd(ssh, "curl -s https://demo.blivoai.com/api/payments/webhook")

ssh.close()
print("\n=== Deployment Complete! ===")
