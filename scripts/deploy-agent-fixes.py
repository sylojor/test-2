#!/usr/bin/env python3
"""Deploy agent fixes to demo.blivoai.com"""

import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641', timeout=30)

# 1. Copy updated files
files_to_copy = [
    'src/lib/agent-executor.ts',
    'src/lib/llm-service.ts',
    'src/lib/pipeline-executor.ts',
    'src/lib/employee-generator.ts',
    'src/components/dashboard/talk-panel.tsx',
]

sftp = ssh.open_sftp()
for f in files_to_copy:
    local_path = f'/home/z/my-project/{f}'
    remote_path = f'/home/ubuntu/blivoai-demo/{f}'
    print(f'Copying {f}...')
    sftp.put(local_path, remote_path)
sftp.close()
print('All files copied!')

# 2. Rebuild on server
print('Building on server (this may take a few minutes)...')
stdin, stdout, stderr = ssh.exec_command(
    'cd /home/ubuntu/blivoai-demo && npx next build 2>&1 | tail -10',
    timeout=600
)
build_output = stdout.read().decode()
build_errors = stderr.read().decode()
print('Build output:', build_output)
if build_errors:
    print('Build errors:', build_errors)

# 3. Restart
print('Restarting application...')
stdin, stdout, stderr = ssh.exec_command(
    'cd /home/ubuntu/blivoai-demo && pm2 restart blivoai 2>&1',
    timeout=30
)
print(stdout.read().decode())

ssh.close()
print('Deployment complete!')
