#!/usr/bin/env python3
"""Check hex bytes of problematic lines"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Check hex bytes of department-chat-sidebar.tsx line 41
cmd = """python3 -c '
path = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx"
with open(path, "rb") as f:
    raw = f.read()
lines = raw.split(b"\n")
line41 = lines[40]
idx = line41.find(b"essages")
print("essages found at byte position", idx)
start = max(0, idx - 3)
end = min(len(line41), idx + 20)
for i in range(start, end):
    b = line41[i]
    ch = chr(b) if b < 128 else "?"
    print("  pos", i, ": 0x" + format(b, "02x"), "= '" + ch + "'")
print("Full line41 hex:", line41.hex())
print("Full line41 text:", line41.decode("utf-8", errors="replace"))
'"""

stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"Sidebar line 41 hex analysis:\n{out}")
if err:
    print(f"Stderr:\n{err}")

# Check hex bytes of llm-service.ts line 180
cmd2 = """python3 -c '
path = "/home/ubuntu/blivoai-demo/src/lib/llm-service.ts"
with open(path, "rb") as f:
    raw = f.read()
lines = raw.split(b"\n")
line180 = lines[179]
idx = line180.find(b"tier]")
print("tier] found at byte position", idx)
start = max(0, idx - 3)
end = min(len(line180), idx + 10)
for i in range(start, end):
    b = line180[i]
    ch = chr(b) if b < 128 else "?"
    print("  pos", i, ": 0x" + format(b, "02x"), "= '" + ch + "'")
print("Full line180 text:", line180.decode("utf-8", errors="replace"))
'"""

stdin, stdout, stderr = client.exec_command(cmd2)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"\nLLM line 180 hex analysis:\n{out}")
if err:
    print(f"Stderr:\n{err}")

client.close()
