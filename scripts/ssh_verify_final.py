import paramiko

def ssh_exec(command, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# Get file sizes for comparison
print("=== File sizes ===")
out, err = ssh_exec("ls -la /tmp/r.ico /tmp/a.ico 2>/dev/null")
print(out)

# Check that /favicon.ico via rewrite serves from /api/branding/
# The response headers showed: cache-control: public, max-age=60, must-revalidate
# This means it's served by the branding API route, not the static file
print("\n=== Confirm favicon.ico served by branding API ===")
out, err = ssh_exec("curl -s -I http://localhost:3001/favicon.ico 2>&1")
print(out)
