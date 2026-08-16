#!/usr/bin/env python3
"""Comprehensive test script for the deployed server"""

import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

tests = [
    # Main site
    ("Homepage", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/ar/"),
    ("Admin page", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/ar/admin"),
    # Branding API
    ("Logo SVG API", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/api/branding/logo.svg"),
    ("Logo SVG rewrite", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/logo.svg"),
    ("Favicon API", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/api/branding/favicon.ico"),
    ("Favicon rewrite", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/favicon.ico"),
    # Security system
    ("Security API (needs auth)", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/api/admin/security"),
    ("Auto-block dangerous path", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/.env"),
    ("Auto-block .git", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/.git/config"),
    ("Auto-block wp-admin", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/wp-admin"),
    # Activity API
    ("Activity API (needs auth)", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/api/admin/activity"),
    # Blog API
    ("Blog API", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/api/blog"),
    # Auth API
    ("Auth me API", "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/api/auth/me"),
]

print("=== Comprehensive Server Tests ===\n")
for name, cmd in tests:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    status = stdout.read().decode().strip()
    expected = "200" if "needs auth" not in name.lower() else "401"
    ok = "✅" if status == expected else ("⚠️" if status in ["403", "404"] else "❌")
    print(f"{ok} {name}: {status}")

# Check Docker volumes
stdin, stdout, stderr = client.exec_command("docker volume ls | grep demo", timeout=10)
print(f"\nDocker volumes:\n{stdout.read().decode()}")

# Check branding files in persistent volume
stdin, stdout, stderr = client.exec_command("docker exec demo-chatbot ls -la /app/data/branding/", timeout=10)
print(f"Branding files in /app/data/branding/:\n{stdout.read().decode()}")

# Check public directory
stdin, stdout, stderr = client.exec_command("docker exec demo-chatbot ls -la /app/public/", timeout=10)
print(f"Public directory:\n{stdout.read().decode()}")

client.close()
