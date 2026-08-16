#!/usr/bin/env python3
"""Verify billing panel is accessible on demo.blivoai.com"""
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(command, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

def main():
    # 1. Verify billing-panel.tsx exists
    print("[1] Checking billing-panel.tsx exists:")
    out, err = ssh_exec("ls -la /home/ubuntu/blivoai-demo/src/components/dashboard/billing-panel.tsx")
    print(out.strip())

    # 2. Verify sidebar has billing tab
    print("\n[2] Checking sidebar billing tab:")
    out, err = ssh_exec("grep 'billing' /home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx | head -5")
    print(out.strip())

    # 3. Verify main-content has billing routing
    print("\n[3] Checking main-content billing routing:")
    out, err = ssh_exec("grep 'billing' /home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx | head -5")
    print(out.strip())

    # 4. Verify i18n translations
    print("\n[4] Checking i18n billing translations:")
    out, err = ssh_exec("grep 'sidebar.billing' /home/ubuntu/blivoai-demo/src/lib/i18n.ts")
    print(out.strip())

    # 5. Verify the app responds
    print("\n[5] Testing demo.blivoai.com locally:")
    out, err = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar")
    print(f"localhost:3001/ar HTTP: {out.strip()}")

    out, err = ssh_exec("curl -sL -o /dev/null -w '%{http_code}' https://demo.blivoai.com/ar")
    print(f"demo.blivoai.com/ar HTTP: {out.strip()}")

    # 6. Check the git latest commit
    print("\n[6] Latest git commit:")
    out, err = ssh_exec("cd /home/ubuntu/blivoai-demo && git log --oneline -3")
    print(out.strip())

    # 7. Check NEXT_PUBLIC_SITE_URL
    print("\n[7] NEXT_PUBLIC_SITE_URL:")
    out, err = ssh_exec("grep NEXT_PUBLIC_SITE_URL /home/ubuntu/blivoai-demo/.env 2>/dev/null || grep NEXT_PUBLIC_SITE_URL /home/ubuntu/blivoai-demo/docker-compose.yml")
    print(out.strip())

if __name__ == "__main__":
    main()
