#!/usr/bin/env python3
"""Fix syntax errors in BlivoAI source files on the remote server via SSH - using on-server Python"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Fix department-chat-sidebar.tsx using Python on the remote server
fix_sidebar_cmd = '''python3 -c "
import os
path = '/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx'
with open(path, 'r') as f:
    lines = f.readlines()

# Fix line 41: const essages, setMessages] -> const [messages, setMessages]
for i, line in enumerate(lines):
    if 'const essages, setMessages]' in line:
        lines[i] = line.replace('const essages, setMessages]', 'const [messages, setMessages]')
        print(f'Fixed line {i+1}: {lines[i].rstrip()}')
    if '}, essages])' in line:
        lines[i] = line.replace('}, essages])', '}, [messages])')
        print(f'Fixed line {i+1}: {lines[i].rstrip()}')

with open(path, 'w') as f:
    f.writelines(lines)
print('department-chat-sidebar.tsx fixed successfully')
"'''

stdin, stdout, stderr = client.exec_command(fix_sidebar_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"Sidebar fix output:\n{out}")
if err:
    print(f"Sidebar fix stderr:\n{err}")

# Fix llm-service.ts using Python on the remote server
fix_llm_cmd = '''python3 -c "
import os
path = '/home/ubuntu/blivoai-demo/src/lib/llm-service.ts'
with open(path, 'r') as f:
    lines = f.readlines()

# Fix line ~180: result.models.tier] -> result.models[m.tier]
for i, line in enumerate(lines):
    if 'result.models.tier]' in line:
        lines[i] = line.replace('result.models.tier]', 'result.models[m.tier]')
        print(f'Fixed line {i+1}: {lines[i].rstrip()}')

with open(path, 'w') as f:
    f.writelines(lines)
print('llm-service.ts fixed successfully')
"'''

stdin, stdout, stderr = client.exec_command(fix_llm_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"\nLLM fix output:\n{out}")
if err:
    print(f"LLM fix stderr:\n{err}")

# Verify
stdin, stdout, stderr = client.exec_command("head -42 ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx | tail -2")
print(f"\nVerify sidebar line 41:\n{stdout.read().decode()}")

stdin, stdout, stderr = client.exec_command("grep 'essages' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
remaining = stdout.read().decode()
print(f"Remaining 'essages' occurrences: {remaining.strip() or 'NONE'}")

stdin, stdout, stderr = client.exec_command("sed -n '180p' ~/blivoai-demo/src/lib/llm-service.ts")
print(f"\nVerify LLM line 180:\n{stdout.read().decode()}")

client.close()
