import paramiko

def ssh_exec(command, timeout=120):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# Use Python directly on the server to fix line 244
fix_cmd = """python3 -c "
filepath = '/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts'
with open(filepath) as f:
    lines = f.readlines()

# Line 244 (index 243) has the bug
bug_line = lines[243]
print('Bug line:', repr(bug_line))

# Replace 'eader' with '[header' and fix the closing bracket
# Original: return Buffer.concat(eader, entry32, entry16, png32, png16])
# Fixed:    return Buffer.concat([header, entry32, entry16, png32, png16])
fixed = bug_line.replace('Buffer.concat(eader, entry32, entry16, png32, png16])', 'Buffer.concat([header, entry32, entry16, png32, png16])')
lines[243] = fixed
print('Fixed line:', repr(fixed))

with open(filepath, 'w') as f:
    f.writelines(lines)

print('SUCCESS!')
" """

out, err = ssh_exec(fix_cmd)
print(out)

# Verify
filepath = "~/blivoai-demo/src/app/api/upload/branding/route.ts"
out, err = ssh_exec(f"sed -n '244p' {filepath}")
print("Line 244 after fix:", out)
