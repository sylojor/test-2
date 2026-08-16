#!/usr/bin/env python3
"""Fix specific lines using Python on the remote server - approach: send fix script to server"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Upload a Python fix script to the server, then run it
fix_script = r"""
import os

# Fix 1: department-chat-sidebar.tsx - Fix line with 'essages'
path1 = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx"
with open(path1, "r", encoding="utf-8") as f:
    lines = f.readlines()

fixed = False
for i, line in enumerate(lines):
    # Check for the broken pattern - might have invisible characters
    line_stripped = line.strip()
    if "essages, setMessages]" in line_stripped:
        # Replace the whole line with the correct version
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + "const [messages, setMessages] = useState<ChatMessage[]>([])\n"
        print(f"Fixed line {i+1}: replaced 'essages' pattern with '[messages'")
        fixed = True
    if line_stripped == "}, essages])":
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + "}, [messages])\n"
        print(f"Fixed line {i+1}: replaced 'essages]' with '[messages]'")
        fixed = True

if fixed:
    with open(path1, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"Saved {path1}")
else:
    print("No fixes needed for department-chat-sidebar.tsx")

# Verify
with open(path1, "r", encoding="utf-8") as f:
    verify_lines = f.readlines()
for i, line in enumerate(verify_lines):
    if "essages, setMessages]" in line.strip():
        print(f"WARNING: line {i+1} still has broken pattern: {line.strip()}")
    if line.strip() == "}, essages])":
        print(f"WARNING: line {i+1} still has broken pattern")

# Fix 2: llm-service.ts - Fix 'result.models.tier]' 
path2 = "/home/ubuntu/blivoai-demo/src/lib/llm-service.ts"
with open(path2, "r", encoding="utf-8") as f:
    lines2 = f.readlines()

fixed2 = False
for i, line in enumerate(lines2):
    line_stripped = line.strip()
    if "result.models.tier]" in line_stripped:
        # Replace: result.models.tier] -> result.models[m.tier]
        indent = line[:len(line) - len(line.lstrip())]
        new_line = line.replace("result.models.tier]", "result.models[m.tier]")
        lines2[i] = new_line
        print(f"Fixed line {i+1}: replaced 'models.tier]' with 'models[m.tier]'")
        fixed2 = True

if fixed2:
    with open(path2, "w", encoding="utf-8") as f:
        f.writelines(lines2)
    print(f"Saved {path2}")
else:
    print("No fixes needed for llm-service.ts")

# Verify
with open(path2, "r", encoding="utf-8") as f:
    verify2 = f.readlines()
for i, line in enumerate(verify2):
    if "models.tier]" in line.strip() and "result" in line.strip():
        print(f"WARNING: line {i+1} still has broken pattern: {line.strip()}")

print("All fixes complete!")
"""

# Write the fix script to the server
sftp = client.open_sftp()
with sftp.open("/tmp/fix_syntax.py", "w") as f:
    f.write(fix_script)
sftp.close()

# Run the fix script on the server
stdin, stdout, stderr = client.exec_command("python3 /tmp/fix_syntax.py")
out = stdout.read().decode()
err = stderr.read().decode()
print(f"Fix script output:\n{out}")
if err:
    print(f"Fix script stderr:\n{err}")

# Verify from server
stdin, stdout, stderr = client.exec_command("sed -n '41p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
line41 = stdout.read().decode().strip()
print(f"\nFinal sidebar line 41: {line41}")

stdin, stdout, stderr = client.exec_command("grep -c 'essages, setMessages]' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
count = stdout.read().decode().strip()
print(f"'essages, setMessages]' count: {count}")

stdin, stdout, stderr = client.exec_command("sed -n '180p' ~/blivoai-demo/src/lib/llm-service.ts")
line180 = stdout.read().decode().strip()
print(f"Final LLM line 180: {line180}")

# Clean up
stdin, stdout, stderr = client.exec_command("rm /tmp/fix_syntax.py")

client.close()
print("\nAll done!")
