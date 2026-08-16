import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# Test different pages and check for Application error
pages = [
    ("https://demo.blivoai.com/", "HOME"),
    ("https://demo.blivoai.com/ar", "HOME_AR"),
    ("https://demo.blivoai.com/ar/admin", "ADMIN_AR"),
    ("https://demo.blivoai.com/en", "HOME_EN"),
]

for url, label in pages:
    cmd = f'curl -sk "{url}" 2>&1 | head -5'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    result = stdout.read().decode()[:500]
    has_error = "Application error" in result or "client-side exception" in result
    print(f'{label}: {has_error and "ERROR!" or "OK"} | {result[:200]}')

# Get more details about the error page
cmd = 'curl -sk "https://demo.blivoai.com/" 2>&1 | grep -i "error|exception" | head -5'
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
print('=== ERROR DETAILS ===')
print(stdout.read().decode())

# Check the full home page
cmd = 'curl -sk "https://demo.blivoai.com/" 2>&1'
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
full_page = stdout.read().decode()
if "Application error" in full_page:
    print("HOME PAGE HAS ERROR!")
    # Find the error text
    error_idx = full_page.find("Application error")
    print(full_page[error_idx:error_idx+200])
else:
    print("HOME PAGE OK")
    print(full_page[:300])

# Check admin page specifically
cmd = 'curl -sk "https://demo.blivoai.com/ar/admin" 2>&1'
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
admin_page = stdout.read().decode()
if "Application error" in admin_page:
    print("ADMIN PAGE HAS ERROR!")
    error_idx = admin_page.find("Application error")
    print(admin_page[error_idx:error_idx+200])
else:
    print("ADMIN PAGE OK")

ssh.close()
