#!/usr/bin/env python3
import paramiko, time

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
PROJECT_DIR = "/home/ubuntu/new-blivo"
NEW_API_KEY = "tgp_v1_KXUEDfm7ZsHPYEpLOdtrlydb7IAKpNaBvvB8IWNaai0"

def run(ssh, cmd, timeout=120):
    print(f'>>> {cmd[:200]}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip(): print(out.strip()[-4000:])
    if err.strip(): print(f'STDERR: {err.strip()[-1000:]}')
    return out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    print('Connected!')

    # 1. Find actual compose files
    print('\n=== Finding compose files ===')
    run(ssh, f'ls -la {PROJECT_DIR}/docker-compose*.yml')
    
    # 2. Read the compose file
    print('\n=== Reading compose file ===')
    out, _ = run(ssh, f'cat {PROJECT_DIR}/docker-compose.yml')
    
    # 3. Update Together AI key
    print('\n=== Updating Together AI key ===')
    if 'TOGETHER_AI_API_KEY' in out:
        run(ssh, f"sed -i 's|TOGETHER_AI_API_KEY=.*|TOGETHER_AI_API_KEY={NEW_API_KEY}|' {PROJECT_DIR}/docker-compose.yml")
        print('Updated existing key')
    else:
        run(ssh, f"sed -i '/DATABASE_URL/a\\      - TOGETHER_AI_API_KEY={NEW_API_KEY}' {PROJECT_DIR}/docker-compose.yml")
        print('Added new key')
    
    out2, _ = run(ssh, f'grep TOGETHER_AI_API_KEY {PROJECT_DIR}/docker-compose.yml')
    print(f'Key verified: {NEW_API_KEY[:20]}...' if NEW_API_KEY in out2 else 'KEY NOT FOUND!')
    
    # 4. Check/add branding volume
    out_vol, _ = run(ssh, f'grep "data/branding" {PROJECT_DIR}/docker-compose.yml')
    if 'data/branding' not in out_vol:
        print('Adding branding volume...')
        # Insert before the - ./:/app line
        run(ssh, f"sed -i 's|- \.\/:/app|- {PROJECT_DIR}/data/branding:/app/data/branding\\n      - ./:/app|' {PROJECT_DIR}/docker-compose.yml")
    else:
        print('Branding volume already exists')
    
    # 5. Verify compose file
    print('\n=== Compose file volumes section ===')
    run(ssh, f'grep -A5 volumes {PROJECT_DIR}/docker-compose.yml | head -20')
    
    # 6. Pull code (already done but just in case)
    print('\n=== Pull latest ===')
    run(ssh, f'cd {PROJECT_DIR} && git pull origin main 2>&1 | tail -5', timeout=60)
    
    # 7. Build
    print('\n=== Building app (3-5 min) ===')
    run(ssh, f'cd {PROJECT_DIR} && sudo docker compose build app --no-cache 2>&1 | tail -40', timeout=600)
    
    # 8. Up
    print('\n=== Starting ===')
    run(ssh, f'cd {PROJECT_DIR} && sudo docker compose up -d app', timeout=120)
    
    # 9. Wait
    time.sleep(15)
    run(ssh, f'cd {PROJECT_DIR} && sudo docker compose ps')
    run(ssh, f'cd {PROJECT_DIR} && sudo docker compose logs app --tail=20')
    
    # 10. Test
    print('\n=== Testing ===')
    run(ssh, "curl -s -o /dev/null -w 'Logo: %{http_code}\n' http://localhost:3000/api/branding/logo.png")
    run(ssh, "curl -s -o /dev/null -w 'Favicon: %{http_code}\n' http://localhost:3000/api/branding/favicon.ico")
    run(ssh, "curl -s -o /dev/null -w 'Manifest: %{http_code}\n' http://localhost:3000/api/branding/manifest.json")
    run(ssh, 'curl -s http://localhost:3000/api/branding/manifest.json | head -25')
    run(ssh, "curl -sk -o /dev/null -w 'Ext Logo: %{http_code}\n' https://blivoai.com/api/branding/logo.png")
    run(ssh, "curl -sk -o /dev/null -w 'Ext Manifest: %{http_code}\n' https://blivoai.com/api/branding/manifest.json")
    run(ssh, 'curl -sk https://blivoai.com/api/branding/manifest.json | head -25')

    ssh.close()
    print('\n=== DONE ===')

if __name__ == '__main__':
    main()