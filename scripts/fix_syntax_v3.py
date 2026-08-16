#!/usr/bin/env python3
"""Fix syntax errors - more robust approach"""
import paramiko
import re

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Fix department-chat-sidebar.tsx
fix_sidebar_cmd = r"""python3 << 'PYEOF'
path = '/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx'
with open(path, 'rb') as f:
    raw = f.read()
content = raw.decode('utf-8')

# Show what line 41 looks like hex
lines = content.split('\n')
print(f"Line 41 raw bytes around 'essages':")
if len(lines) >= 41:
    line41 = lines[40]
    idx = line41.find('essages')
    if idx >= 0:
        print(f"  Found 'essages' at position {idx}")
        print(f"  chars around it: {repr(line41[idx-5:idx+20])}")
        print(f"  full line: {repr(line41)}")
    else:
        print(f"  'essages' not found in line 41")
        print(f"  full line: {repr(line41)}")

# Use regex to replace - handle any whitespace/corruption
content = re.sub(r'const\s+essages,\s*setMessages\]', 'const [messages, setMessages]', content)
content = re.sub(r'},\s*essages\]\)', '}, [messages])', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(path, 'r') as f:
    verify = f.read()
print(f"\nAfter fix, line 41: {verify.split(chr(10))[40]}")
PYEOF"""

stdin, stdout, stderr = client.exec_command(fix_sidebar_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"Sidebar fix:\n{out}")
if err:
    print(f"Stderr:\n{err}")

# Fix llm-service.ts
fix_llm_cmd = r"""python3 << 'PYEOF'
import re
path = '/home/ubuntu/blivoai-demo/src/lib/llm-service.ts'
with open(path, 'r') as f:
    content = f.read()

# Show line 180 before fix
lines = content.split('\n')
print(f"Line 180 before fix: {lines[179]}")

# Use regex: result.models followed by .tier] -> result.models[m.tier]
content = re.sub(r'result\.models\.tier\]', 'result.models[m.tier]', content)

with open(path, 'w') as f:
    f.write(content)

# Verify
with open(path, 'r') as f:
    verify = f.read()
print(f"Line 180 after fix: {verify.split(chr(10))[179]}")
PYEOF"""

stdin, stdout, stderr = client.exec_command(fix_llm_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"\nLLM fix:\n{out}")
if err:
    print(f"Stderr:\n{err}")

# Final verification
stdin, stdout, stderr = client.exec_command("sed -n '41p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
print(f"\nFinal verify sidebar line 41: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("sed -n '232p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
print(f"Final verify sidebar line 232: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("sed -n '180p' ~/blivoai-demo/src/lib/llm-service.ts")
print(f"Final verify LLM line 180: {stdout.read().decode().strip()}")

client.close()
