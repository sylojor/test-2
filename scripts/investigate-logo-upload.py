#!/usr/bin/env python3
"""
Investigate logo upload failure on demo.blivoai.com server.
"""

import paramiko
import sys
import json

# Server credentials
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
    
    # 1. Check if the branding directory exists in the container
    print("\n=== STEP 1: Check branding directory ===")
    run_cmd(client, "docker exec " + CONTAINER + " ls -la /app/data/branding/")
    
    # 2. Check public directory branding files
    print("\n=== STEP 2: Check public branding files ===")
    run_cmd(client, "docker exec " + CONTAINER + " ls -la /app/public/logo.svg /app/public/favicon.ico 2>/dev/null || echo 'Files not found'")
    
    # 3. Check container logs for upload-related messages
    print("\n=== STEP 3: Check container logs ===")
    run_cmd(client, "docker logs " + CONTAINER + " --tail 100 2>&1 | grep -i 'branding|upload|logo|sharp|error' | tail -20")
    
    # 4. Test the branding API route - logo.svg
    print("\n=== STEP 4: Test branding API for logo.svg ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}, Size %{size_download}" http://localhost:3000/api/branding/logo.svg')
    
    # 5. Test the branding API route - logo.png  
    print("\n=== STEP 5: Test branding API for logo.png ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}, Size %{size_download}" http://localhost:3000/api/branding/logo.png')
    
    # 6. Check the content of logo.svg
    print("\n=== STEP 6: Check logo.svg content ===")
    run_cmd(client, 'curl -s http://localhost:3000/api/branding/logo.svg | head -5')
    
    # 7. Check JWT_SECRET env var
    print("\n=== STEP 7: Check JWT_SECRET ===")
    run_cmd(client, "docker exec " + CONTAINER + " env | grep JWT | head -3")
    
    # 8. Check sharp module
    print("\n=== STEP 8: Check sharp module ===")
    run_cmd(client, "docker exec " + CONTAINER + " node -e 'try { require(\"sharp\"); console.log(\"sharp: OK\") } catch(e) { console.log(\"sharp: NOT available - \" + e.message) }'")
    
    # 9. Test upload endpoint without auth (should return 401)
    print("\n=== STEP 9: Test upload without auth ===")
    run_cmd(client, 'curl -s -X POST http://localhost:3000/api/upload/branding -F "type=logo" -F "file=@/dev/null;filename=test.svg"')
    
    # 10. Login to get auth token
    print("\n=== STEP 10: Login to get auth token ===")
    login_cmd = 'curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"email":"mghazi@blivoai.com","password":"Mghazi@199641"}\' -c /tmp/cookies.txt'
    login_out, _ = run_cmd(client, login_cmd)
    
    # 11. Extract token from login response
    print("\n=== STEP 11: Extract token ===")
    token = ""
    try:
        login_data = json.loads(login_out.strip())
        if 'token' in login_data:
            token = login_data['token']
            print(f"\nGot token from response: {token[:30]}...")
    except:
        print(f"\nLogin response (raw): {login_out[:300]}")
    
    # Try getting from cookies too
    cookie_out, _ = run_cmd(client, "cat /tmp/cookies.txt")
    if not token:
        for line in cookie_out.strip().split('\n'):
            if 'oec_token' in line:
                parts = line.strip().split()
                for p in parts:
                    if p.startswith('oec_token'):
                        token_val = p.split('=')[1] if '=' in p else ''
                        if token_val:
                            token = token_val
                            break
    
    if token:
        print(f"\nUsing token: {token[:30]}...")
    else:
        print("\nNo token found! Trying with cookie file directly...")
    
    # 12. Create a test SVG file
    print("\n=== STEP 12: Create test SVG file ===")
    run_cmd(client, "cat > /tmp/test-logo.svg << 'SVGEOF'\n<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"red\"/></svg>\nSVGEOF")
    
    # 13. Test upload with auth
    print("\n=== STEP 13: Test upload with auth ===")
    if token:
        upload_cmd = 'curl -s -X POST http://localhost:3000/api/upload/branding -H "Authorization: Bearer ' + token + '" -F "type=logo" -F "file=@/tmp/test-logo.svg"'
        run_cmd(client, upload_cmd)
    else:
        upload_cmd = 'curl -s -X POST http://localhost:3000/api/upload/branding -b /tmp/cookies.txt -F "type=logo" -F "file=@/tmp/test-logo.svg"'
        run_cmd(client, upload_cmd)
    
    # 14. Check if the uploaded file is now in branding dir
    print("\n=== STEP 14: Check branding files after upload ===")
    run_cmd(client, "docker exec " + CONTAINER + " ls -la /app/data/branding/")
    
    # 15. Check the uploaded logo content
    print("\n=== STEP 15: Check uploaded logo content ===")
    run_cmd(client, "docker exec " + CONTAINER + " cat /app/data/branding/logo.svg 2>/dev/null | head -3")
    
    # 16. Test the branding API again
    print("\n=== STEP 16: Test branding API after upload ===")
    run_cmd(client, 'curl -s http://localhost:3000/api/branding/logo.svg | head -3')
    
    # 17. Check Docker volumes/mounts
    print("\n=== STEP 17: Check Docker mounts ===")
    run_cmd(client, "docker inspect " + CONTAINER + " --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'")
    
    # 18. Check recent container logs for errors
    print("\n=== STEP 18: Recent container errors ===")
    run_cmd(client, "docker logs " + CONTAINER + " --tail 20 2>&1")
    
    client.close()
    print("\n=== Investigation complete ===")

if __name__ == "__main__":
    main()
