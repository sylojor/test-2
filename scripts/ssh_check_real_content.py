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

# The hex analysis showed the code IS correct: concat([header, entry32, ...)
# The grep display was misleading because the shell interprets '[' in grep patterns
# Let me verify using Python directly (no shell interference)

check_cmd = """python3 -c "
filepath = '/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts'
with open(filepath) as f:
    content = f.read()

# Check if the bug or the fix exists
bug_str = 'concat(eader'
fix_str = 'concat([header'

if bug_str in content:
    print('BUG EXISTS: concat(eader found')
    idx = content.find(bug_str)
    print('Context:', repr(content[idx-10:idx+60]))
elif fix_str in content:
    print('FIX EXISTS: concat([header found')
    idx = content.find(fix_str)
    print('Context:', repr(content[idx-10:idx+60]))
else:
    print('Neither found, checking...')
    # Find concat in file
    idx = content.find('Buffer.concat')
    while idx >= 0:
        snippet = content[idx:idx+80]
        print(f'  concat at {idx}: {repr(snippet[:70])}')
        idx = content.find('Buffer.concat', idx+1)
" """

out, err = ssh_exec(check_cmd)
print(out)
