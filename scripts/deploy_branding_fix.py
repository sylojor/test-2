#!/usr/bin/env python3
"""Deploy branding fixes + update Together AI key + rebuild"""

import paramiko, json, time

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
PROJECT_DIR = "/home/ubuntu/new-blivo"
NEW_API_KEY = "tgp_v1_KXUEDfm7ZsHPYEpLOdtrlydb7IAKpNaBvvB8IWNaai0"
CONTAINER_NAME = "demo-chatbot"

def run(ssh, cmd, timeout=120):
    print(f'>>> {cmd[:150]}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip(): print(out.strip()[-3000:])
    if err.strip(): print(f'STDERR: {err.strip()[-1000:]}')
    return out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}...')
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    print('Connected!')

    # 1. Read current docker-compose.prod.yml
    print('\n=== 1. Reading docker-compose ===')
    out, _ = run(ssh, f'cat {PROJECT_DIR}/docker-compose.prod.yml')

    # 2. Update Together AI API key
    print('\n=== 2. Updating Together AI key ===')
    if 'TOGETHER_AI_API_KEY' in out:
        run(ssh, f"sed -i 's|TOGETHER_AI_API_KEY=.*|TOGETHER_AI_API_KEY={NEW_API_KEY}|' {PROJECT_DIR}/docker-compose.prod.yml")
        print('Updated existing key')
    else:
        # Add after DATABASE_URL
        run(ssh, f"sed -i '/DATABASE_URL/a\\      - TOGETHER_AI_API_KEY={NEW_API_KEY}' {PROJECT_DIR}/docker-compose.prod.yml")
        print('Added new key')
    
    out2, _ = run(ssh, f'grep TOGETHER_AI_API_KEY {PROJECT_DIR}/docker-compose.prod.yml')
    print(f'Key line: {out2.strip()}')

    # 3. Check volume mounts and add branding if needed
    print('\n=== 3. Checking volumes ===')
    out3, _ = run(ssh, f'grep -n "volumes" {PROJECT_DIR}/docker-compose.prod.yml')
    print(f'Volumes section: {out3.strip()}')
    
    out_vol, _ = run(ssh, f'grep "data/branding" {PROJECT_DIR}/docker-compose.prod.yml')
    if 'data/branding' not in out_vol:
        print('Adding branding volume mount...')
        # Use a simpler approach - insert after first "- ./:/app" line
        run(ssh, f"sed -i '/- .\/:\/app/a\      - {PROJECT_DIR}/data/branding:/app/data/branding' {PROJECT_DIR}/docker-compose.prod.yml")
    else:
        print('Branding volume already exists')

    # 4. Ensure branding directory
    print('\n=== 4. Branding directory ===')
    run(ssh, f'mkdir -p {PROJECT_DIR}/data/branding')

    # 5. Copy existing branding from container
    print('\n=== 5. Copying existing branding from container ===')
    run(ssh, f'sudo docker cp {CONTAINER_NAME}:/app/data/branding/. {PROJECT_DIR}/data/branding/ 2>/dev/null; echo done')
    run(ssh, f'ls -la {PROJECT_DIR}/data/branding/')

    # 6. Pull latest code
    print('\n=== 6. Pulling latest code ===')
    run(ssh, f'cd {PROJECT_DIR} && git pull origin main', timeout=60)

    # 7. Verify the new files exist
    print('\n=== 7. Verifying new files ===')
    run(ssh, f'ls -la {PROJECT_DIR}/src/app/api/upload/branding/route.ts')
    run(ssh, f'grep manifest.json {PROJECT_DIR}/src/app/api/branding/*/route.ts')

    # 8. Rebuild app
    print('\n=== 8. Rebuilding app (3-5 min) ===')
    run(ssh, f'cd {PROJECT_DIR} && sudo docker compose -f docker-compose.prod.yml build app --no-cache 2>&1 | tail -40', timeout=600)

    # 9. Restart
    print('\n=== 9. Restarting ===')
    run(ssh, f'cd {PROJECT_DIR} && sudo docker compose -f docker-compose.prod.yml up -d app', timeout=120)

    # 10. Wait
    print('\n=== 10. Waiting for startup ===')
    time.sleep(15)
    run(ssh, f'cd {PROJECT_DIR} && sudo docker compose -f docker-compose.prod.yml ps')
    run(ssh, f'cd {PROJECT_DIR} && sudo docker compose -f docker-compose.prod.yml logs app --tail=20')

    # 11. Test
    print('\n=== 11. Testing ===')
    run(ssh, 'curl -s -o /dev/null -w "Logo: %%{http_code}\n" http://localhost:3000/api/branding/logo.png')
    run(ssh, 'curl -s -o /dev/null -w "Favicon: %%{http_code}\n" http://localhost:3000/api/branding/favicon.ico')
    run(ssh, 'curl -s -o /dev/null -w "Manifest: %%{http_code}\n" http://localhost:3000/api/branding/manifest.json')
    run(ssh, 'curl -s http://localhost:3000/api/branding/manifest.json 2>&1 | head -25')

    # 12. External
    print('\n=== 12. External tests ===')
    run(ssh, 'curl -sk -o /dev/null -w "Ext Logo: %%{http_code}\n" https://blivoai.com/api/branding/logo.png')
    run(ssh, 'curl -sk -o /dev/null -w "Ext Favicon: %%{http_code}\n" https://blivoai.com/api/branding/favicon.ico')
    run(ssh, 'curl -sk -o /dev/null -w "Ext Manifest: %%{http_code}\n" https://blivoai.com/api/branding/manifest.json')
    run(ssh, 'curl -sk https://blivoai.com/api/branding/manifest.json | head -25')

    ssh.close()
    print('\n=== ALL DONE ===')

if __name__ == '__main__':
    main()