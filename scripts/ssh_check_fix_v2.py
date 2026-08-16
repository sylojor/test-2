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

# Write a Python script file directly
script_content = """
filepath = '/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts'
with open(filepath) as f:
    lines = f.readlines()

line244 = lines[243]
has_bracket = '[' in line244
has_header_word = 'header' in line244

print(f'Line 244 length: {len(line244)}')
print(f'Has bracket [: {has_bracket}')
print(f'Has header word: {has_header_word}')
print(f'Full line: {line244}')

idx = line244.find('concat')
if idx >= 0:
    sub = line244[idx:idx+60]
    print(f'Substring: {sub}')
    print(f'Hex: {sub.encode("utf-8").hex()}')
"""

# Write script to /tmp on server and run it
out, err = ssh_exec("cat > /tmp/check_fix.py << 'ENDSCRIPT'\n" + script_content + "\nENDSCRIPT")
out, err = ssh_exec("python3 /tmp/check_fix.py")
print(out)
