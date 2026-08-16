#!/usr/bin/env python3
"""Fix build errors: duplicate imports and function definitions"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()

# Fix main-content.tsx - add import back (only once)
remote_main = "/home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx"
with sftp.open(remote_main, "r") as f:
    main_content = f.read().decode()

# Remove ALL duplicate EmployeeDetailPanel imports
lines = main_content.split('\n')
new_lines = []
seen_employee_detail = False
for line in lines:
    if 'EmployeeDetailPanel' in line and line.strip().startswith('import'):
        if not seen_employee_detail:
            new_lines.append(line)
            seen_employee_detail = True
        # skip duplicate
    else:
        new_lines.append(line)

# Also remove duplicate EmployeeDetailPanel JSX
main_content = '\n'.join(new_lines)

# Check if there are duplicate EmployeeDetailPanel components
# Find all occurrences of <EmployeeDetailPanel
component_count = main_content.count('<EmployeeDetailPanel')
if component_count > 1:
    # Keep only the last one (the one in the switch statement)
    # Actually, let me just re-read and fix properly
    # Remove any EmployeeDetailPanel that appears before the switch statement
    first_import_idx = None
    last_import_idx = None
    lines = main_content.split('\n')
    # Find the import line and make sure only one exists
    for i, line in enumerate(lines):
        if line.strip().startswith('import') and 'EmployeeDetailPanel' in line:
            if first_import_idx is None:
                first_import_idx = i
            else:
                lines[i] = ''  # remove duplicate
    
    main_content = '\n'.join(lines)

# Make sure the import exists
if 'import { EmployeeDetailPanel }' not in main_content:
    # Add it after ChatbotPanel import
    main_content = main_content.replace(
        'import { ChatbotPanel } from "@/components/dashboard/chatbot-panel"',
        'import { ChatbotPanel } from "@/components/dashboard/chatbot-panel"\nimport { EmployeeDetailPanel } from "@/components/dashboard/employee-detail-panel"'
    )

# Also check for duplicate <EmployeeDetailPanel usage in the file
# There should be exactly one usage in the switch
employee_detail_usages = main_content.split('<EmployeeDetailPanel')
# Keep only the one inside the case statement
if len(employee_detail_usages) > 2:
    # Find the case "employee-detail" block and keep it, remove others
    # Simple approach: keep only the version that's in the switch
    lines = main_content.split('\n')
    in_switch = False
    cleaned_lines = []
    skip_until_employee_detail_case = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == 'case "employee-detail":':
            in_switch = True
            cleaned_lines.append(line)
        elif in_switch and stripped == 'default:':
            in_switch = False
            cleaned_lines.append(line)
        elif 'EmployeeDetailPanel' in line and not in_switch and stripped.startswith('<EmployeeDetailPanel'):
            # Skip duplicate EmployeeDetailPanel outside switch
            continue
        else:
            cleaned_lines.append(line)
    
    main_content = '\n'.join(cleaned_lines)

with sftp.open(remote_main, "w") as f:
    f.write(main_content.encode())
print("main-content.tsx fixed!")

# Fix page.tsx - remove duplicate handleEmployeeDetail
remote_page = "/home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx"
with sftp.open(remote_page, "r") as f:
    page_content = f.read().decode()

# Count handleEmployeeDetail occurrences
count = page_content.count('const handleEmployeeDetail')
if count > 1:
    # Remove all but the first occurrence
    lines = page_content.split('\n')
    found_first = False
    new_lines = []
    i = 0
    while i < len(lines):
        if 'const handleEmployeeDetail' in lines[i]:
            if not found_first:
                found_first = True
                # Keep the first one (add all lines until closing brace)
                new_lines.append(lines[i])
                i += 1
                while i < len(lines) and '}' not in lines[i]:
                    new_lines.append(lines[i])
                    i += 1
                if i < len(lines):
                    new_lines.append(lines[i])  # closing brace
            else:
                # Skip duplicate (skip lines until closing brace)
                i += 1
                while i < len(lines) and '}' not in lines[i]:
                    i += 1
                i += 1  # skip closing brace too
        else:
            new_lines.append(lines[i])
            i += 1
    page_content = '\n'.join(new_lines)

with sftp.open(remote_page, "w") as f:
    f.write(page_content.encode())
print("page.tsx fixed!")

# Verify
stdin, stdout, stderr = client.exec_command("grep -c 'import.*EmployeeDetailPanel' /home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx")
print(f"EmployeeDetailPanel imports: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("grep -c 'const handleEmployeeDetail' /home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx")
print(f"handleEmployeeDetail defs: {stdout.read().decode().strip()}")

sftp.close()
client.close()
