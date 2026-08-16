import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

filepath = "/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx"

with sftp.open(filepath, 'rb') as f:
    raw_bytes = f.read()

# The broken bytes are at positions 3473-3474: [m (an extra [ and m)
# Current: ...const [m[mobileMenuOpen, setMobileMenuOpen]...
# Should be: ...const [mobileMenuOpen, setMobileMenuOpen]...

# We need to remove bytes at position 3473 (0x6D = 'm') and 3474 (0x5B = '[')
# Wait, looking at the hex:
# 3472: [ (correct)
# 3473: m (duplicate) 
# 3474: [ (duplicate)
# 3475: m (correct - part of 'mobile')
# 
# So the sequence is: [ m [ m o b i l e M e n u O p e n
# Which decodes to: [m[mobileMenuOpen - this is wrong
# Should be: [mobileMenuOpen
# 
# Fix: remove the two duplicate bytes at 3473 and 3474

# Let's verify by showing the exact bytes
print("Before fix - bytes around 3470-3500:")
for i in range(3470, 3500):
    b = raw_bytes[i]
    ch = chr(b) if b < 128 else f'\\x{b:02x}'
    print(f"  [{i}] = 0x{b:02X} = '{ch}'")

# Remove bytes at positions 3473 and 3474 (the duplicate 'm' and '[')
new_bytes = raw_bytes[:3473] + raw_bytes[3475:]

# Verify the fix
print("\nAfter fix - bytes around 3470-3500:")
for i in range(3470, min(3498, len(new_bytes))):
    b = new_bytes[i]
    ch = chr(b) if b < 128 else f'\\x{b:02x}'
    print(f"  [{i}] = 0x{b:02X} = '{ch}'")

# Check the full content around 'const'
content = new_bytes.decode('utf-8')
pos = content.find('const')
# Find the line that contains mobileMenuOpen
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'mobileMenuOpen' in line and 'const' in line:
        print(f"\nFixed line {i+1}: '{line}'")

# Write back
with sftp.open(filepath, 'wb') as f:
    f.write(new_bytes)

print("\nFile saved!")

# Now also scan ALL tsx/ts files for similar double-bracket issues
stdin, stdout, stderr = client.exec_command(
    """python3 -c "
import os, re
for root, dirs, files in os.walk('/home/ubuntu/blivoai-demo/src'):
    for fname in files:
        if fname.endswith('.tsx') or fname.endswith('.ts'):
            fpath = os.path.join(root, fname)
            with open(fpath, 'rb') as f:
                data = f.read()
            # Check for [[m or [[ pattern in const destructuring
            # Pattern: const [[ -> double bracket (wrong)
            text = data.decode('utf-8', errors='replace')
            if 'const [[' in text:
                print(f'Double bracket found in: {fpath}')
                # Find the lines
                for i, line in enumerate(text.split(chr(10))):
                    if 'const [[' in line:
                        print(f'  Line {i+1}: {line[:80]}')
            # Also check for const X, setX] without [  (broken destructuring)
            broken = re.findall(r'const (\w{1,8}), set(\w{2,30})\]', text)
            for var, setter in broken:
                expected = setter[3:]
                expected_lower = setter[3].lower() + setter[4:]
                if var != expected and var != expected_lower:
                    # Find the line number
                    pattern = f'const {var}, set{setter}]'
                    for i, line in enumerate(text.split(chr(10))):
                        if pattern in line and '[' + var not in line:
                            print(f'Broken destructuring in {fpath}: Line {i+1}: {line[:80]}')
" """
)
scan_result = stdout.read().decode()
scan_err = stderr.read().decode()
print("\nFull scan results:")
print(scan_result)
if scan_err:
    print("Errors:", scan_err[-200:] if len(scan_err) > 200 else scan_err)

sftp.close()
client.close()
