import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# Use Python to construct the psql commands properly
cmd1 = "docker exec demo-postgres psql -U blivoai -d blivoai -c \"SELECT id, name, email, role, \\\"companyId\\\" FROM users;\""
cmd2 = "docker exec demo-postgres psql -U blivoai -d blivoai -c \"SELECT id, name, \\\"ownerId\\\" FROM companies;\""

stdin, stdout, stderr = ssh.exec_command(cmd1, timeout=10)
print('=== USERS ===')
print(stdout.read().decode())
print(stderr.read().decode())

stdin, stdout, stderr = ssh.exec_command(cmd2, timeout=10)
print('=== COMPANIES ===')
print(stdout.read().decode())
print(stderr.read().decode())

ssh.close()
