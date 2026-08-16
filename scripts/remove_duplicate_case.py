#!/usr/bin/env python3
"""Remove duplicate employee-detail case from main-content.tsx"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()
remote_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

# Remove the second duplicate case "employee-detail" block
# Find the second occurrence and remove it
lines = content.split('\n')

# Find both occurrences of "case \"employee-detail\""
case_indices = []
for i, line in enumerate(lines):
    if line.strip() == 'case "employee-detail":':
        case_indices.append(i)

print(f"Found {len(case_indices)} case employee-detail at lines: {case_indices}")

if len(case_indices) > 1:
    # Remove the second occurrence
    # Find the end of the second case block (until next "case" or "default")
    start = case_indices[1]
    end = start
    for i in range(start + 1, len(lines)):
        stripped = lines[i].strip()
        if stripped.startswith('case ') or stripped == 'default:':
            end = i
            break
        if stripped == '}' and i > start + 5:
            # This is the closing brace of the return block
            end = i + 1
            break
    
    # Remove lines from start to end
    lines = lines[:start] + lines[end:]
    print(f"Removed duplicate case from line {start} to {end}")

content = '\n'.join(lines)

with sftp.open(remote_path, "w") as f:
    f.write(content.encode())

print("Duplicate removed!")

# Verify
stdin, stdout, stderr = client.exec_command("grep -c 'case \"employee-detail\"' /home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx")
print(f"case employee-detail count: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("grep -c 'EmployeeDetailPanel' /home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx")
print(f"EmployeeDetailPanel usage count: {stdout.read().decode().strip()}")

sftp.close()
client.close()
