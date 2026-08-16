import paramiko, time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# Build Docker
print("Building Docker...")
stdin, stdout, stderr = ssh.exec_command('cd ~/blivoai-demo && docker compose build --no-cache app 2>&1 | tail -3', timeout=600)
build_output = stdout.read().decode()
print(f"Build output: {build_output}")

# Wait a bit then check if build is done
for i in range(20):
    stdin, stdout, stderr = ssh.exec_command('ps aux | grep "docker compose build" | grep -v grep', timeout=5)
    build_proc = stdout.read().decode().strip()
    if not build_proc:
        print(f"Build completed after ~{i*30}s")
        break
    if i % 3 == 0:
        print(f"Waiting for build... ({i*30}s)")
    time.sleep(30)

# Restart
print("Restarting container...")
stdin, stdout, stderr = ssh.exec_command('cd ~/blivoai-demo && docker compose up -d --force-recreate app 2>&1', timeout=60)
print(stdout.read().decode())

time.sleep(25)

# Check status
stdin, stdout, stderr = ssh.exec_command('docker ps | grep demo', timeout=5)
print("=== Container Status ===")
print(stdout.read().decode())

# Quick test - admin page
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3001/ar/admin', timeout=10)
print("=== Admin HTTP ===")
print(stdout.read().decode())

ssh.close()
