import paramiko

def ssh_exec(command, timeout=120):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# Check next.config.ts rewrites - the /favicon.ico rewrite should work
# but it seems the static file in public/ is being served directly
# because Next.js serves static files from public/ BEFORE checking rewrites

print("=== next.config.ts rewrites ===")
out, err = ssh_exec("grep -A20 'rewrites' ~/blivoai-demo/next.config.ts")
print(out)

# The issue: Next.js serves files from /public/ directly and doesn't apply rewrites to them
# Solution: Remove the static favicon.ico from /public/ so the rewrite takes effect
# Or: Use a different approach

print("\n=== Check public/favicon.ico ===")
out, err = ssh_exec("ls -la ~/blivoai-demo/public/favicon.ico")
print(out)

# Remove the static favicon.ico from public so the rewrite works
print("\n=== Remove static favicon.ico from public ===")
out, err = ssh_exec("rm ~/blivoai-demo/public/favicon.ico")
print("Removed:", out)

# Also remove other static icon files that might conflict
out, err = ssh_exec("ls ~/blivoai-demo/public/favicon* ~/blivoai-demo/public/icon* ~/blivoai-demo/public/apple-touch-icon* 2>/dev/null")
print("Other static files:", out)

# Remove apple-touch-icon.png from public too if it exists
out, err = ssh_exec("rm -f ~/blivoai-demo/public/apple-touch-icon.png ~/blivoai-demo/public/favicon-32x32.png ~/blivoai-demo/public/favicon-16x16.png 2>/dev/null")
print("Removed static icon files:", out)

# Check what's left in public
print("\n=== Public directory (icons) ===")
out, err = ssh_exec("ls ~/blivoai-demo/public/ | head -20")
print(out)
