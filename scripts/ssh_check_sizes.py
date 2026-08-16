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

# Check current branding file sizes
print("=== Current branding file sizes ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)

# The logo.png is 361KB which IS very big
# The favicon.ico is 290 bytes which is tiny
# The favicon-32x32.png is 145 bytes
# The favicon-16x16.png is 107 bytes

# Check what the user might be referring to - probably the logo.png being 361KB
# They want it under 100KB (or they might actually mean 100 bytes but that's impossible for a logo)
# Let me optimize both logo and favicon sizes

print("\n=== Logo PNG optimization ===")
# The logo is 512x512 PNG at 361KB - need to compress it more
# Using sharp with better compression settings can reduce size significantly
# palette=true for 8-bit PNG (much smaller), quality=50, compressionLevel=9

print("\n=== Read current logo upload section ===")
out, err = ssh_exec("sed -n '95,130p' ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print(out)
