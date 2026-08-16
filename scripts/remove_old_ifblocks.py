#!/usr/bin/env python3
"""Remove old if-blocks from employee-generator.ts - they're replaced by domain-based matching"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()
remote_path = "/home/ubuntu/blivoai-demo/src/lib/employee-generator.ts"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

# Find and remove ALL the old if blocks between the domain matching and the fallback
# The pattern: each block starts with "if (context.includes(" and ends with "  }"
# We need to remove everything from the first old if-block to the fallback comment

# Find the start marker (after domain matching) and the end marker (fallback comment)
start_marker = '''  }
  if (context.includes("إدار")'''
end_marker = '''  // لو ما في اقتراحات — أضيف اقتراحات عامة مرتبطة بالتخصص'''

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx > 0 and end_idx > start_idx:
    # Get the text to remove (from the closing brace of domain matching to the fallback)
    to_remove = content[start_idx:end_idx]
    # We need to keep the closing brace "  }" from domain matching
    # So we remove from after "  }\n" to before "  // لو ما في اقتراحات"
    new_content = content[:start_idx + 3] + "\n\n" + content[end_idx:]
    
    with sftp.open(remote_path, "w") as f:
        f.write(new_content.encode())
    print("Old if-blocks removed successfully!")
else:
    print("Could not find markers - manual fix needed")
    print(f"start_idx: {start_idx}, end_idx: {end_idx}")

# Verify
stdin, stdout, stderr = client.exec_command(f"grep -c 'context.includes' {remote_path}")
count = stdout.read().decode().strip()
print(f"Remaining context.includes count: {count}")

sftp.close()
client.close()
