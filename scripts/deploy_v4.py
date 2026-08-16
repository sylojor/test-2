#!/usr/bin/env python3
import paramiko, time

DIR = '/home/ubuntu/new-blivo'

def run(ssh, cmd, timeout=120):
    print(f'>>> {cmd[:200]}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip(): print(out.strip()[-4000:])
    if err.strip(): print(f'STDERR: {err.strip()[-1500:]}')
    return out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641', timeout=30)
    print('Connected!')

    # Pull
    print('\n=== Pull ===')
    run(ssh, f'cd {DIR} && git pull origin main', timeout=60)

    # Build
    print('\n=== Build ===')
    run(ssh, f'cd {DIR} && sudo docker compose build app --no-cache 2>&1 | tail -20', timeout=600)

    # Restart
    print('\n=== Restart ===')
    run(ssh, f'cd {DIR} && sudo docker compose up -d app', timeout=120)

    time.sleep(15)
    run(ssh, f'cd {DIR} && sudo docker compose logs app --tail=10')

    # Copy branding
    print('\n=== Copy branding ===')
    run(ssh, 'sudo docker exec demo-chatbot mkdir -p /app/data/branding')
    run(ssh, 'sudo docker exec demo-chatbot cp -f /app/public/logo.png /app/data/branding/ 2>/dev/null')
    run(ssh, 'sudo docker exec demo-chatbot cp -f /app/public/logo.svg /app/data/branding/ 2>/dev/null')
    run(ssh, 'sudo docker exec demo-chatbot cp -f /app/public/favicon.ico /app/data/branding/ 2>/dev/null')

    # Test
    print('\n=== Test ===')
    for ep in ['logo.png', 'favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'logo-192.png', 'logo-512.png', 'manifest.json']:
        run(ssh, f"curl -s -o /dev/null -w '{ep}: %{{http_code}}\n' http://localhost:3001/api/branding/{ep}")

    # External
    print('\n=== External ===')
    for ep in ['logo.png', 'favicon.ico', 'apple-touch-icon.png', 'manifest.json']:
        run(ssh, f"curl -sk -o /dev/null -w 'Ext {ep}: %{{http_code}}\n' https://blivoai.com/api/branding/{ep}")

    # Test upload route
    print('\n=== Upload route ===')
    run(ssh, "curl -s -o /dev/null -w 'Upload POST: %{http_code}\n' -X POST http://localhost:3001/api/upload/branding")

    ssh.close()
    print('\n=== DONE ===')

if __name__ == '__main__':
    main()