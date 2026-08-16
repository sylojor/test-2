#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641', timeout=30)

def test(url, label):
 stdin, stdout, stderr = ssh.exec_command(f"curl -s -o /dev/null -w '{label}: %{{http_code}} ({{size_download}} bytes)\n' {url}", timeout=15)
 print(stdout.read().decode().strip())

def fetch(url, label):
 stdin, stdout, stderr = ssh.exec_command(f'curl -s {url}', timeout=15)
 out = stdout.read().decode()
 print(f'\n=== {label} ===')
 print(out[:500])

print('=== LOCAL TESTS (port 3001) ===')
test('http://localhost:3001/api/branding/logo.png', 'Logo PNG')
test('http://localhost:3001/api/branding/logo.svg', 'Logo SVG')
test('http://localhost:3001/api/branding/favicon.ico', 'Favicon ICO')
test('http://localhost:3001/api/branding/favicon-32x32.png', 'Favicon 32')
test('http://localhost:3001/api/branding/favicon-16x16.png', 'Favicon 16')
test('http://localhost:3001/api/branding/apple-touch-icon.png', 'Apple Touch')
test('http://localhost:3001/api/branding/logo-192.png', 'Logo 192')
test('http://localhost:3001/api/branding/logo-512.png', 'Logo 512')
test('http://localhost:3001/api/branding/manifest.json', 'Manifest')

print('\n=== EXTERNAL TESTS (HTTPS) ===')
test('https://blivoai.com/api/branding/logo.png', 'Ext Logo')
test('https://blivoai.com/api/branding/favicon.ico', 'Ext Favicon')
test('https://blivoai.com/api/branding/manifest.json', 'Ext Manifest')
test('https://blivoai.com/api/branding/logo-192.png', 'Ext Logo 192')
test('https://blivoai.com/api/branding/apple-touch-icon.png', 'Ext Apple')

# Test the upload route exists (should return 401 without auth, not 404)
print('\n=== UPLOAD ROUTE TEST ===')
test('http://localhost:3001/api/upload/branding', 'Upload (no auth)')

# Check HTML head for manifest link
print('\n=== HTML HEAD CHECK ===')
fetch('https://blivoai.com', 'Homepage head')

ssh.close()
print('\nDone!')
