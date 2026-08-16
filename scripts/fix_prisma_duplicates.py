#!/usr/bin/env python3
"""Fix Prisma schema: Remove duplicate models and relations"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()
remote_path = "/home/ubuntu/blivoai-demo/prisma/schema.prisma"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

# Problem: EmployeeAccessToken and EmployeeModelRouting models were appended 
# after Integration, but they ALSO exist as separate definitions later in the file
# Also "employeeModelRoutings" relation on LLMModel was added twice

# Find where the duplicate definitions start
# The first occurrence is right after @@map("integrations")
# The second occurrence should be later in the file

# Let's find all occurrences and remove duplicates
lines = content.split('\n')

# Find model definition blocks
models_start = []
for i, line in enumerate(lines):
    if line.strip().startswith('model EmployeeAccessToken') or line.strip().startswith('model EmployeeModelRouting'):
        models_start.append(i)

print(f"Found {len(models_start)} model definition starts at lines: {models_start}")

# Find relation occurrences
relation_lines = []
for i, line in enumerate(lines):
    if 'employeeModelRoutings' in line and 'EmployeeModelRouting[]' in line:
        relation_lines.append(i)
    if 'accessTokens' in line and 'EmployeeAccessToken[]' in line:
        relation_lines.append(i)
    if 'modelRoutings' in line and 'EmployeeModelRouting[]' in line and 'employee' not in line.lower():
        relation_lines.append(i)

print(f"Found {len(relation_lines)} relation definition lines at: {relation_lines}")

# We need to remove the FIRST occurrence of EmployeeAccessToken and EmployeeModelRouting models
# (the ones that were appended after Integration) and keep the second (standalone) ones
# Also remove duplicate relation lines

# Strategy: Find the block from "model EmployeeAccessToken" to its closing "}"
# and remove it if it's the first occurrence

if len(models_start) >= 2:
    # Remove first occurrence of EmployeeAccessToken
    first_start = models_start[0]
    # Find closing brace
    brace_count = 0
    end_line = first_start
    for i in range(first_start, len(lines)):
        if '{' in lines[i]:
            brace_count += lines[i].count('{')
        if '}' in lines[i]:
            brace_count -= lines[i].count('}')
        if brace_count == 0:
            end_line = i
            break
    
    # Remove lines from first_start to end_line (inclusive)
    lines = lines[:first_start] + lines[end_line + 1:]
    print(f"Removed first EmployeeAccessToken model (lines {first_start}-{end_line})")

if len(models_start) >= 3:
    # After removing first, re-index
    # Find the first remaining EmployeeModelRouting
    new_start = None
    for i, line in enumerate(lines):
        if line.strip().startswith('model EmployeeModelRouting'):
            if new_start is None:
                new_start = i
            else:
                # Remove first occurrence
                brace_count = 0
                end_line = new_start
                for j in range(new_start, len(lines)):
                    if '{' in lines[j]:
                        brace_count += lines[j].count('{')
                    if '}' in lines[j]:
                        brace_count -= lines[j].count('}')
                    if brace_count == 0:
                        end_line = j
                        break
                lines = lines[:new_start] + lines[end_line + 1:]
                print(f"Removed first EmployeeModelRouting model (lines {new_start}-{end_line})")
                break

# Remove duplicate relation lines
# Keep only the first occurrence of each relation
seen_relations = set()
new_lines = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped in ['employeeModelRoutings EmployeeModelRouting[]', 'accessTokens EmployeeAccessToken[]', 'modelRoutings EmployeeModelRouting[]']:
        if stripped not in seen_relations:
            seen_relations.add(stripped)
            new_lines.append(line)
        else:
            print(f"Removed duplicate relation at line {i}: {stripped}")
    else:
        new_lines.append(line)

content = '\n'.join(new_lines)

# Also check if there's a stray "employeeModelRoutings" on LLMModel that's not a relation
# The LLMModel should only have one reference

with sftp.open(remote_path, "w") as f:
    f.write(content.encode())

print("Schema cleaned!")

# Verify
stdin, stdout, stderr = client.exec_command("cd ~/blivoai-demo && grep -c 'model EmployeeAccessToken' prisma/schema.prisma")
print(f"EmployeeAccessToken model count: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("cd ~/blivoai-demo && grep -c 'model EmployeeModelRouting' prisma/schema.prisma")
print(f"EmployeeModelRouting model count: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("cd ~/blivoai-demo && grep 'employeeModelRoutings' prisma/schema.prisma | wc -l")
print(f"employeeModelRoutings relation count: {stdout.read().decode().strip()}")

sftp.close()
client.close()
