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

# Check hex encoding of line 244 to find any hidden characters
hex_cmd = """python3 -c "
filepath = '/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts'
with open(filepath) as f:
    lines = f.readlines()

line = lines[243]
# Show hex bytes of the relevant part
start = line.find('concat')
hex_bytes = line[start:].encode('utf-8').hex()
print('Hex from concat:', hex_bytes)
print()
# Show each character
for i, ch in enumerate(line[start:start+60]):
    print(f'{i}: {ch} (0x{ord(ch):04x})')
" """

out, err = ssh_exec(hex_cmd)
print(out)

# Now try a different approach - replace individual characters
print("\n=== Try character-level replacement ===")
fix_cmd2 = """python3 -c "
filepath = '/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts'
with open(filepath) as f:
    content = f.read()

# Find the exact position of the bug
idx = content.find('concat(eader')
if idx >= 0:
    print(f'Found at position {idx}')
    # The bug is: concat(eader → should be concat([header
    # Replace character by character
    # concat(eader → concat([header
    # We need to insert '[' before 'eader' and change 'e' to 'h' (making it 'header')
    # Wait, let me check: is it 'eader' meaning 'h' is missing, or is it something else?
    
    # Actually, the display shows 'eader' which could mean the 'h' was cut off
    # Let me just replace the whole substring
    bug = 'concat(eader, entry32, entry16, png32, png16])'
    fix = 'concat([header, entry32, entry16, png32, png16])'
    
    if bug in content:
        content = content.replace(bug, fix)
        print('Replaced!')
    else:
        print('Bug string not found in content, trying alternative...')
        # Maybe there are hidden chars
        print('Content around the bug:')
        idx2 = content.find('concat')
        while idx2 >= 0:
            snippet = content[idx2:idx2+80]
            if 'png16' in snippet:
                print(f'  Position {idx2}: {repr(snippet)}')
            idx2 = content.find('concat', idx2+1)
        
        # Try with repr to find exact chars
        idx3 = content.find('eader')
        if idx3 >= 0:
            print(f'  Found eader at position {idx3}')
            # Check what's before it
            before = content[idx3-5:idx3]
            print(f'  Before eader: {repr(before)}')
    
    with open(filepath, 'w') as f:
        f.write(content)
else:
    print('concat(eader not found')
    # Check what's actually there
    idx2 = content.find('concat')
    while idx2 >= 0:
        snippet = content[idx2:idx2+80]
        print(f'  concat at {idx2}: {repr(snippet[:60])}')
        idx2 = content.find('concat', idx2+1)
" """

out, err = ssh_exec(fix_cmd2)
print(out)

# Verify again
filepath = "~/blivoai-demo/src/app/api/upload/branding/route.ts"
out, err = ssh_exec(f"sed -n '244p' {filepath}")
print("Line 244:", out)
