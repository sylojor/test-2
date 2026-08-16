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

# Find admin credentials from seed file
print("=== Find admin credentials ===")
out, err = ssh_exec("grep -i 'owner\|admin\|email\|password\|seed' ~/blivoai-demo/prisma/seed.ts | head -30")
print(out)

# Also check the seed script
out, err = ssh_exec("find ~/blivoai-demo/prisma -name 'seed*'")
print("Seed files:", out)

# Read seed file
out, err = ssh_exec("cat ~/blivoai-demo/prisma/seed.ts")
print(out[:3000])
