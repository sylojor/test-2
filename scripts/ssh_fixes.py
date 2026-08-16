import paramiko
import sys
import time

def ssh_exec(command, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# ============================================
# FIX 1: Change httpOnly: true to httpOnly: false in login route
# This allows document.cookie to read oec_token, so the upload handler can send it
# ============================================
print("=== FIX 1: Login route — change httpOnly to false ===")

# First, read the current login route to find the exact line
out, err = ssh_exec("grep -n 'httpOnly' ~/blivoai-demo/src/app/api/auth/login/route.ts")
print("Current httpOnly lines:", out)

# Replace httpOnly: true with httpOnly: false using sed
out, err = ssh_exec("sed -i 's/httpOnly: true/httpOnly: false/g' ~/blivoai-demo/src/app/api/auth/login/route.ts")
print("sed result:", out, err)

# Verify the change
out, err = ssh_exec("grep -n 'httpOnly' ~/blivoai-demo/src/app/api/auth/login/route.ts")
print("After change:", out)

# ============================================
# FIX 2: Replace window.location.href with soft image refresh in admin-content.tsx
# Instead of full page redirect, update the image src with cache-busting timestamp
# ============================================
print("\n=== FIX 2: Admin content — replace window.location.href with soft refresh ===")

# Read current logo upload section (lines around 1978)
out, err = ssh_exec("sed -n '1964,1990p' ~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx")
print("Current logo upload section:", out)

# Replace the window.location.href line after logo upload success
# The current line is: window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now()
# Replace with: just show toast success, don't redirect the page

# Use sed to replace the specific line
# First let's find the exact line number
out, err = ssh_exec("grep -n 'window.location.href' ~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx")
print("window.location.href lines:", out)

# ============================================
# FIX 3: Also check for other admin API calls that use document.cookie (they should now work)
# ============================================
print("\n=== Other document.cookie usages (should now work with httpOnly: false) ===")
out, err = ssh_exec("grep -c 'document.cookie' ~/blivoai-demo/src/app/'[lang]'/admin/admin-content.tsx")
print("Count of document.cookie usages:", out)

# ============================================
# Check branding route for caching issues
# ============================================
print("\n=== Branding route (check cache headers) ===")
out, err = ssh_exec("cat ~/blivoai-demo/src/app/api/branding/'[...files]'/route.ts")
if not out:
    out, err = ssh_exec("find ~/blivoai-demo/src/app/api/branding -name '*.ts' -o -name '*.tsx'")
    print("Found branding files:", out)
    for f in out.strip().split('\n'):
        if f.strip():
            out2, err2 = ssh_exec(f"cat '{f.strip()}'")
            print(f"\n--- {f.strip()} ---")
            print(out2[:3000])
