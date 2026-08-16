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

# Check if the fix is actually there using a Python script that writes the result to a file
# This avoids any shell/SSH display issues
check_cmd = """python3 << 'EOF'
filepath = '/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts'
with open(filepath) as f:
    lines = f.readlines()

# Check line 244 specifically
line244 = lines[243]
has_bracket = '[' in line244
has_header_word = 'header' in line244

with open('/tmp/check_result.txt', 'w') as f:
    f.write(f'Line 244 length: {len(line244)}\n')
    f.write(f'Has bracket [: {has_bracket}\n')
    f.write(f'Has header word: {has_header_word}\n')
    f.write(f'Full line: {line244}\n')
    
    # Show exact bytes of the concat part
    idx = line244.find('concat')
    if idx >= 0:
        sub = line244[idx:idx+60]
        f.write(f'Substring: {sub}\n')
        f.write(f'Hex: {sub.encode("utf-8").hex()}\n')
EOF
"""

out, err = ssh_exec(check_cmd)
print("Script output:", out)

# Read the result file
out, err = ssh_exec("cat /tmp/check_result.txt")
print("Result:\n", out)
