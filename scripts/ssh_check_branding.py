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

# Check branding route for caching issues
print("=== Branding route ===")
out, err = ssh_exec("cat ~/blivoai-demo/src/app/api/branding/'[...files]'/route.ts")
print(out)

# Also check the next.config.ts rewrites for branding
print("\n=== next.config.ts rewrites ===")
out, err = ssh_exec("grep -A5 -B2 'branding' ~/blivoai-demo/next.config.ts")
print(out)

# Check the docker-compose.yml for data volume
print("\n=== Docker volume config ===")
out, err = ssh_exec("grep -A5 'volumes' ~/blivoai-demo/docker-compose.yml")
print(out)

# Check if /app/data/branding directory exists in the running container
print("\n=== Check container branding dir ===")
out, err = ssh_exec("docker exec demo-chatbot ls -la /app/data/branding/")
print(out)
