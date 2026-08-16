#!/usr/bin/env python3
import paramiko, time

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
DIR = "/home/ubuntu/new-blivo"
NEW_KEY = "tgp_v1_KXUEDfm7ZsHPYEpLOdtrlydb7IAKpNaBvvB8IWNaai0"

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
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    print('Connected!')

    # 1. Read current compose
    print('\n=== 1. Current compose ===')
    out, _ = run(ssh, f'cat {DIR}/docker-compose.yml')

    # 2. Fix compose file - write a clean version
    print('\n=== 2. Writing fixed compose ===')
    # The key was already added but with wrong indentation. Let me just rewrite the env section properly.
    # Check what we have
    run(ssh, f'grep -n "TOGETHER" {DIR}/docker-compose.yml')
    
    # Remove the wrongly placed line (it was inserted with wrong indent)
    run(ssh, f"sed -i '/^- TOGETHER_AI_API_KEY=/d' {DIR}/docker-compose.yml")
    run(ssh, f"sed -i '/^      - TOGETHER_AI_API_KEY=/d' {DIR}/docker-compose.yml")
    
    # Check if TOGETHER_API_KEY already exists (it does!)
    out_check, _ = run(ssh, f'grep "TOGETHER_API_KEY" {DIR}/docker-compose.yml')
    print(f'Current TOGETHER lines: {out_check.strip()}')

    # 3. Update the existing TOGETHER_API_KEY value
    run(ssh, f"sed -i 's|TOGETHER_API_KEY=.*|TOGETHER_API_KEY={NEW_KEY}|' {DIR}/docker-compose.yml")
    run(ssh, f"sed -i 's|LLM_API_KEY=.*|LLM_API_KEY={NEW_KEY}|' {DIR}/docker-compose.yml")
    
    # 4. Add TOGETHER_AI_API_KEY (the env var name the app expects) if not present
    out_check2, _ = run(ssh, f'grep "TOGETHER_AI_API_KEY" {DIR}/docker-compose.yml')
    if 'TOGETHER_AI_API_KEY' not in out_check2:
        run(ssh, f"sed -i '/TOGETHER_API_KEY/a\      - TOGETHER_AI_API_KEY={NEW_KEY}' {DIR}/docker-compose.yml")
        print('Added TOGETHER_AI_API_KEY')
    else:
        print('TOGETHER_AI_API_KEY already present')
    
    # 5. Verify
    print('\n=== 3. Verify env vars ===')
    run(ssh, f'grep -E "TOGETHER|LLM_API|LLM_PROVIDER" {DIR}/docker-compose.yml')

    # 6. Show the app environment section
    print('\n=== 4. App env section ===')
    run(ssh, f'grep -A 25 "environment:" {DIR}/docker-compose.yml | head -30')

    # 7. Retry build (DNS was transient)
    print('\n=== 5. Rebuilding (retry) ===')
    run(ssh, f'cd {DIR} && sudo docker compose build app --no-cache 2>&1 | tail -50', timeout=600)

    # 8. If build succeeded, restart
    out_build, _ = run(ssh, f'cd {DIR} && sudo docker images new-blivo-app --format "{{{{.CreatedAt}}}}" 2>/dev/null')
    
    print('\n=== 6. Restarting ===')
    run(ssh, f'cd {DIR} && sudo docker compose up -d app', timeout=120)

    time.sleep(15)
    run(ssh, f'cd {DIR} && sudo docker compose ps')
    run(ssh, f'cd {DIR} && sudo docker compose logs app --tail=15')

    # 9. Copy branding files into container (since we use named volume)
    print('\n=== 7. Copying branding to container ===')
    # Copy from public/ inside the container to /app/data/branding/
    run(ssh, 'sudo docker exec demo-chatbot mkdir -p /app/data/branding')
    run(ssh, 'sudo docker exec demo-chatbot cp -f /app/public/logo.png /app/data/branding/logo.png 2>/dev/null; echo logo-copy-done')
    run(ssh, 'sudo docker exec demo-chatbot cp -f /app/public/logo.svg /app/data/branding/logo.svg 2>/dev/null; echo svg-copy-done')
    run(ssh, 'sudo docker exec demo-chatbot cp -f /app/public/favicon.ico /app/data/branding/favicon.ico 2>/dev/null; echo favicon-copy-done')
    run(ssh, 'sudo docker exec demo-chatbot ls -la /app/data/branding/')

    # 10. Test
    print('\n=== 8. Testing ===')
    run(ssh, "curl -s -o /dev/null -w 'Logo: %{http_code}\n' http://localhost:3001/api/branding/logo.png")
    run(ssh, "curl -s -o /dev/null -w 'Manifest: %{http_code}\n' http://localhost:3001/api/branding/manifest.json")
    run(ssh, 'curl -s http://localhost:3001/api/branding/manifest.json | head -25')
    run(ssh, "curl -sk -o /dev/null -w 'Ext Logo: %{http_code}\n' https://blivoai.com/api/branding/logo.png")
    run(ssh, "curl -sk -o /dev/null -w 'Ext Manifest: %{http_code}\n' https://blivoai.com/api/branding/manifest.json")
    run(ssh, 'curl -sk https://blivoai.com/api/branding/manifest.json | head -30')

    ssh.close()
    print('\n=== DONE ===')

if __name__ == '__main__':
    main()