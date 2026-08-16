import paramiko
import time
import sys

def ssh_exec(client, cmd, timeout=120):
    print(f"\n>>> {cmd}")
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()
        if out:
            print(out[-3000:] if len(out) > 3000 else out)
        if err:
            print(f"STDERR: {err[-1000:]}" if len(err) > 1000 else f"STDERR: {err}")
        print(f"Exit code: {exit_code}")
        return out, err, exit_code
    except Exception as e:
        print(f"Command error: {e}")
        return "", str(e), -1

# Connect with retry
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

for attempt in range(3):
    try:
        print(f"Connecting (attempt {attempt+1})...")
        client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=20, banner_timeout=30)
        print("Connected!")
        break
    except Exception as e:
        print(f"Attempt {attempt+1} failed: {e}")
        if attempt == 2:
            sys.exit(1)
        time.sleep(5)

# Check the actual docker-compose.yml on server
print("\n=== Checking docker-compose.yml ===")
out, _, _ = ssh_exec(client, "cat /home/blivoai/docker-compose.yml")

# Check .env for database URL
print("\n=== Checking DATABASE_URL in .env ===")
out, _, _ = ssh_exec(client, "grep DATABASE_URL /home/blivoai/.env")

# Check Prisma schema
print("\n=== Checking Prisma schema ===")
out, _, _ = ssh_exec(client, "head -15 /home/blivoai/prisma/schema.prisma")

# Check postgres container
print("\n=== Checking PostgreSQL container ===")
ssh_exec(client, "docker ps -a")
ssh_exec(client, "docker inspect blivoai-postgres --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo 'not found'")

# Check git history for original compose file
print("\n=== Git log ===")
ssh_exec(client, "cd /home/blivoai && git log --oneline -5")
ssh_exec(client, "cd /home/blivoai && git show 52a770c:docker-compose.yml 2>/dev/null | head -30")

client.close()
print("Done investigating.")
