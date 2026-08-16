import paramiko
import time
import sys

def ssh_exec(client, cmd, timeout=120):
    """Execute command via SSH and return output"""
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(out[-2000:] if len(out) > 2000 else out)
    if err:
        print(f"STDERR: {err[-1000:]}" if len(err) > 1000 else f"STDERR: {err}")
    print(f"Exit code: {exit_code}")
    return out, err, exit_code

# Connect to server
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Connecting to 141.95.55.5...")
try:
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=15)
    print("Connected successfully!")
except Exception as e:
    print(f"Connection failed: {e}")
    sys.exit(1)

# Step 1: Check current state
print("\n" + "="*50)
print("STEP 1: Checking current container state")
print("="*50)

ssh_exec(client, "docker ps -a")
ssh_exec(client, "docker logs app-caddy --tail 20 2>&1 || echo 'No caddy logs'")

# Step 2: Find project directory
print("\n" + "="*50)
print("STEP 2: Finding project directory")
print("="*50)

out, _, _ = ssh_exec(client, "find / -maxdepth 3 -name 'docker-compose.yml' -path '*blivo*' 2>/dev/null || find / -maxdepth 3 -name 'docker-compose.yml' 2>/dev/null | head -5")
project_dir = None
for line in out.strip().split('\n'):
    if line.strip():
        # Get the directory containing docker-compose.yml
        project_dir = line.strip().rsplit('/', 1)[0]
        break

if not project_dir:
    # Try to find from container
    out, _, _ = ssh_exec(client, "docker inspect app-chatbot --format='{{range .Mounts}}{{.Source}}{{end}}' 2>/dev/null || echo 'no container'")
    if out.strip() and 'no container' not in out:
        project_dir = "/root/new-blivo"
        
if not project_dir:
    print("Could not find project directory. Checking common locations...")
    out, _, _ = ssh_exec(client, "ls -la /root/new-blivo /home/ubuntu/new-blivo /opt/new-blivo 2>/dev/null")
    for d in ['/root/new-blivo', '/home/ubuntu/new-blivo', '/opt/new-blivo']:
        out2, _, rc = ssh_exec(client, f"test -d {d} && echo 'exists'")
        if rc == 0:
            project_dir = d
            break

if project_dir:
    print(f"\nProject directory: {project_dir}")
else:
    print("No project directory found! Will clone from GitHub.")
    project_dir = "/root/new-blivo"

# Step 3: Pull latest code or clone
print("\n" + "="*50)
print("STEP 3: Updating code from GitHub")
print("="*50)

out, _, rc = ssh_exec(client, f"test -d {project_dir}/.git && echo 'git_repo'")
if 'git_repo' in out:
    ssh_exec(client, f"cd {project_dir} && git remote set-url origin https://sylojor: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@github.com/sylojor/new-blivo.git")
    ssh_exec(client, f"cd {project_dir} && git fetch origin && git reset --hard origin/main")
else:
    ssh_exec(client, f"mkdir -p {project_dir}")
    ssh_exec(client, f"cd {project_dir} && git clone https://sylojor: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@github.com/sylojor/new-blivo.git .")

# Step 4: Check and fix .env
print("\n" + "="*50)
print("STEP 4: Checking .env file")
print("="*50)

ssh_exec(client, f"test -f {project_dir}/.env && echo 'env_exists' || echo 'no_env'")
out, _, _ = ssh_exec(client, f"cat {project_dir}/.env | head -5 2>/dev/null || echo 'no file'")

# Step 5: Fix Caddyfile if needed
print("\n" + "="*50)
print("STEP 5: Checking Caddyfile")
print("="*50)

ssh_exec(client, f"cat {project_dir}/Caddyfile")

# Step 6: RESTART CADDY - The main fix!
print("\n" + "="*50)
print("STEP 6: Restarting Caddy container")
print("="*50)

ssh_exec(client, f"cd {project_dir} && docker compose stop caddy 2>/dev/null || docker stop app-caddy 2>/dev/null || true")
ssh_exec(client, f"cd {project_dir} && docker compose rm -f caddy 2>/dev/null || docker rm -f app-caddy 2>/dev/null || true")

# Step 7: Rebuild and start all containers
print("\n" + "="*50)
print("STEP 7: Rebuilding and starting all containers")
print("="*50)

# Start Caddy first (it's the broken one)
ssh_exec(client, f"cd {project_dir} && docker compose up -d caddy", timeout=60)

# Check if chatbot needs rebuild
ssh_exec(client, f"cd {project_dir} && docker compose up -d chatbot", timeout=60)

# Wait a moment
time.sleep(10)

# Step 8: Verify
print("\n" + "="*50)
print("STEP 8: Verifying deployment")
print("="*50)

time.sleep(15)

ssh_exec(client, "docker ps")
ssh_exec(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ && echo '' || echo 'FAIL'")
ssh_exec(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/ && echo '' || echo 'FAIL'")
ssh_exec(client, "curl -sk -o /dev/null -w '%{http_code}' https://localhost:443/ && echo '' || echo 'FAIL'")
ssh_exec(client, "curl -s -o /dev/null -w '%{http_code}' https://blivoai.com && echo '' || echo 'FAIL'")

ssh_exec(client, "docker logs app-caddy --tail 10 2>&1")
ssh_exec(client, "docker logs app-chatbot --tail 10 2>&1")

print("\n" + "="*50)
print("DEPLOYMENT FIX COMPLETE!")
print("="*50)

client.close()
print("SSH connection closed.")
