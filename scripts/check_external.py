#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641', timeout=30)

def run(cmd):
    print(f'>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f'STDERR: {err}')
    return out

# Test external endpoints with file sizes
endpoints = [
    'logo.png',
    'favicon.ico',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png',
    'logo-192.png',
    'logo-512.png',
    'manifest.json',
]

print('=== LOCAL TESTS ===')
for ep in endpoints:
    run(f'curl -s -o /dev/null -w "{ep}: http_code=%{{http_code}} size=%{{size_download}}\n" http://localhost:3001/api/branding/{ep}')

print('\n=== EXTERNAL TESTS ===')
for ep in endpoints:
    run(f'curl -sk -o /dev/null -w "{ep}: http_code=%{{http_code}} size=%{{size_download}}\n" https://blivoai.com/api/branding/{ep}')

# Check more logs to find the source of the error
print('\n=== RECENT ERROR LOGS ===')
run('sudo docker logs d69a62ac6ec4_demo-chatbot 2>&1 | grep -B2 "pipe response" | tail -20')

ssh.close()
