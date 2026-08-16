#!/usr/bin/env python3
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_cmd(ssh, cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(f">>> {cmd}")
    if out: print(f"OUT: {out[:1000]}")
    return out

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

# Test HTTPS
ssh_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/ar")
ssh_cmd(ssh, "curl -s https://demo.blivoai.com/api/payments/webhook")
ssh_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/ar/payment/success")
ssh_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/ar/payment/cancel")

# Check docker logs for payment table creation
ssh_cmd(ssh, "docker logs demo-chatbot 2>&1 | grep -i 'payment|push|schema|table' | head -10")

# Check env keys API (admin panel)
ssh_cmd(ssh, "curl -s http://localhost:3001/api/admin/env-keys -H 'Cookie: auth-token=invalid' | head -5")

ssh.close()
print("\n=== Verification Complete ===")
