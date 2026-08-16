#!/usr/bin/env python3
"""Fix remaining build errors"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()

# Fix 1: llm-service.ts - remove duplicate getSmartModelForEmployee
remote_llm = "/home/ubuntu/blivoai-demo/src/lib/llm-service.ts"
with sftp.open(remote_llm, "r") as f:
    llm_content = f.read().decode()

# Find both occurrences
lines = llm_content.split('\n')
func_starts = []
for i, line in enumerate(lines):
    if 'async function getSmartModelForEmployee' in line or 'export async function getSmartModelForEmployee' in line:
        func_starts.append(i)

print(f"getSmartModelForEmployee at lines: {func_starts}")

if len(func_starts) > 1:
    # Remove the second occurrence (find its full block)
    start = func_starts[1]
    brace_count = 0
    end = start
    found_first_brace = False
    for i in range(start, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                brace_count += 1
                found_first_brace = True
            if ch == '}':
                brace_count -= 1
        if found_first_brace and brace_count == 0:
            end = i
            break
    
    lines = lines[:start] + lines[end + 1:]
    print(f"Removed duplicate function from line {start} to {end}")

llm_content = '\n'.join(lines)

with sftp.open(remote_llm, "w") as f:
    f.write(llm_content.encode())
print("llm-service.ts fixed!")

# Fix 2: page.tsx - the handleEmployeeDetail function is probably inside the component incorrectly
# causing "Return statement is not allowed here" error
remote_page = "/home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx"
with sftp.open(remote_page, "r") as f:
    page_content = f.read().decode()

# Find handleEmployeeDetail and check if it's properly placed inside the component function
lines = page_content.split('\n')

# Find the handleEmployeeDetail definition
detail_idx = None
for i, line in enumerate(lines):
    if 'const handleEmployeeDetail' in line:
        detail_idx = i
        break

if detail_idx:
    # Print context around it
    context_start = max(0, detail_idx - 5)
    context_end = min(len(lines), detail_idx + 10)
    for i in range(context_start, context_end):
        print(f"  {i+1}: {lines[i]}")

with sftp.open(remote_page, "w") as f:
    f.write(page_content.encode())

# Let me check the page.tsx structure more carefully
stdin, stdout, stderr = client.exec_command("grep -n 'const handleEmployeeDetail' /home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx")
detail_line = stdout.read().decode().strip()
print(f"handleEmployeeDetail at: {detail_line}")

stdin, stdout, stderr = client.exec_command("grep -n 'return (' /home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx | head -10")
return_lines = stdout.read().decode().strip()
print(f"return statements at: {return_lines}")

# Check if there's an extra closing brace before the return statements
stdin, stdout, stderr = client.exec_command("sed -n '510,530p' /home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx")
context = stdout.read().decode()
print(f"Context around line 516:\n{context}")

sftp.close()
client.close()
