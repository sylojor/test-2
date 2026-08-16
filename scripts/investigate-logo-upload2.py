#!/usr/bin/env python3
"""
Further investigation - check network, ports, and Caddy config.
Also test via the domain name instead of localhost.
"""

import paramiko
import json

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
PORT = 22
CONTAINER = "demo-chatbot"

def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    return client

def run_cmd(client, cmd, timeout=30):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out)
    if err:
        print(f"[STDERR] {err}")
    return out, err

def main():
    print("=== Connecting to server ===")
    client = ssh_connect()
    
    # 1. Check what port the app listens on
    print("\n=== STEP 1: Check app listening port ===")
    run_cmd(client, "docker exec " + CONTAINER + " netstat -tlnp 2>/dev/null || docker exec " + CONTAINER + " ss -tlnp 2>/dev/null || echo 'netstat/ss not available'")
    
    # 2. Check Docker container port mapping
    print("\n=== STEP 2: Check container port mapping ===")
    run_cmd(client, "docker port " + CONTAINER)
    
    # 3. Check docker-compose.yml for port config
    print("\n=== STEP 3: Check docker-compose.yml ===")
    run_cmd(client, "cat ~/blivoai-demo/docker-compose.yml | head -30")
    
    # 4. Check Caddy config
    print("\n=== STEP 4: Check Caddy config ===")
    run_cmd(client, "cat ~/blivoai-demo/Caddyfile 2>/dev/null || cat /etc/caddy/Caddyfile 2>/dev/null || echo 'No Caddyfile found'")
    
    # 5. Test via domain name (through Caddy reverse proxy)
    print("\n=== STEP 5: Test branding API via domain ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/api/branding/logo.svg')
    
    # 6. Test logo.png via domain
    print("\n=== STEP 6: Test logo.png via domain ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/api/branding/logo.png')
    
    # 7. Test favicon via domain
    print("\n=== STEP 7: Test favicon via domain ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/api/branding/favicon.ico')
    
    # 8. Get the full logo.svg content via domain
    print("\n=== STEP 8: Get logo.svg content via domain ===")
    run_cmd(client, 'curl -s https://demo.blivoai.com/api/branding/logo.svg')
    
    # 9. Login via domain
    print("\n=== STEP 9: Login via domain ===")
    login_cmd = 'curl -s -X POST https://demo.blivoai.com/api/auth/login -H "Content-Type: application/json" -d \'{"email":"mghazi@blivoai.com","password":"Mghazi@199641"}\' -c /tmp/cookies.txt'
    login_out, _ = run_cmd(client, login_cmd)
    
    # 10. Extract token
    print("\n=== STEP 10: Extract token ===")
    token = ""
    try:
        login_data = json.loads(login_out.strip())
        print(f"Login response keys: {list(login_data.keys())}")
        if 'token' in login_data:
            token = login_data['token']
            print(f"Got token: {token[:30]}...")
        elif 'user' in login_data and 'token' in login_data.get('user', {}):
            token = login_data['user']['token']
            print(f"Got token from user obj: {token[:30]}...")
    except:
        print(f"Login response (raw): {login_out[:300]}")
    
    # Get cookie
    cookie_out, _ = run_cmd(client, "cat /tmp/cookies.txt")
    if not token:
        for line in cookie_out.strip().split('\n'):
            if 'oec_token' in line:
                print(f"Cookie line: {line}")
    
    # 11. Upload test via domain with auth
    print("\n=== STEP 11: Upload test SVG via domain ===")
    run_cmd(client, "cat > /tmp/test-logo.svg << 'SVGEOF'\n<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"red\"/></svg>\nSVGEOF")
    
    if token:
        upload_cmd = 'curl -s -X POST https://demo.blivoai.com/api/upload/branding -H "Authorization: Bearer ' + token + '" -F "type=logo" -F "file=@/tmp/test-logo.svg"'
        upload_out, _ = run_cmd(client, upload_cmd)
        print(f"\nUpload response: {upload_out}")
    else:
        upload_cmd = 'curl -s -X POST https://demo.blivoai.com/api/upload/branding -b /tmp/cookies.txt -F "type=logo" -F "file=@/tmp/test-logo.svg"'
        upload_out, _ = run_cmd(client, upload_cmd)
        print(f"\nUpload response: {upload_out}")
    
    # 12. Check if file changed after upload
    print("\n=== STEP 12: Check branding files after upload ===")
    run_cmd(client, "docker exec " + CONTAINER + " ls -la /app/data/branding/")
    
    # 13. Check logo.svg content
    print("\n=== STEP 13: Check logo.svg content after upload ===")
    run_cmd(client, "docker exec " + CONTAINER + " cat /app/data/branding/logo.svg | head -3")
    
    # 14. Test branding API after upload
    print("\n=== STEP 14: Test branding API after upload ===")
    run_cmd(client, 'curl -s https://demo.blivoai.com/api/branding/logo.svg | head -3')
    
    # 15. Test the external logo.svg access from browser perspective
    print("\n=== STEP 15: Check if logo.svg is accessible from outside ===")
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/api/branding/logo.svg | head -10')
    
    # 16. Check the proxy matcher - will /api/branding/logo.svg be intercepted?
    # The matcher excludes .svg and .png extensions, so branding files should NOT go through proxy
    # But this means the API route itself handles the request without proxy checks
    print("\n=== STEP 16: Test if /logo.svg rewrite works ===")
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/logo.svg | head -10')
    
    # 17. Check Next.js rewrites
    print("\n=== STEP 17: Check next.config.ts ===")
    run_cmd(client, "cat ~/blivoai-demo/next.config.ts")
    
    # 18. Check proxy.ts matcher config
    print("\n=== STEP 18: Check proxy.ts matcher ===")
    run_cmd(client, "cat ~/blivoai-demo/src/proxy.ts | tail -10")
    
    client.close()
    print("\n=== Investigation complete ===")

if __name__ == "__main__":
    main()
