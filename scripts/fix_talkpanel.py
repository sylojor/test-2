import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

# Fix talk-panel.tsx - line 212 has double bracket + duplicate char issue
filepath = "/home/ubuntu/blivoai-demo/src/components/dashboard/talk-panel.tsx"

with sftp.open(filepath, 'rb') as f:
    raw_bytes = f.read()

# Search for the broken pattern: "[m[mobileSidebarOpen" (double bracket + duplicate m)
target = b"obileSidebarOpen"
pos = raw_bytes.find(target)
print(f"'obileSidebarOpen' found at position: {pos}")

if pos >= 0:
    # Check bytes before this position
    print("Bytes around the pattern:")
    start = max(0, pos - 10)
    for i in range(start, min(len(raw_bytes), pos + 20)):
        b = raw_bytes[i]
        ch = chr(b) if b < 128 else f'\\x{b:02x}'
        print(f"  [{i}] 0x{b:02X} '{ch}'")
    
    # Find the double bracket pattern
    # We expect: const [[mmobileSidebarOpen -> should be: const [mobileSidebarOpen
    double_target = b"[m[mobileSidebarOpen"
    dpos = raw_bytes.find(double_target)
    print(f"\nDouble bracket pattern found at: {dpos}")
    
    if dpos >= 0:
        # Remove the extra 'm' and '['  (bytes at dpos+1 and dpos+2)
        # Actually we want to remove dpos+1 (0x6D 'm') and dpos+2 (0x5B '[')
        print(f"Byte at dpos: {raw_bytes[dpos]:02X} = '{chr(raw_bytes[dpos])}'")
        print(f"Byte at dpos+1: {raw_bytes[dpos+1]:02X} = '{chr(raw_bytes[dpos+1])}'")
        print(f"Byte at dpos+2: {raw_bytes[dpos+2]:02X} = '{chr(raw_bytes[dpos+2])}'")
        
        # Replace: [m[mobileSidebarOpen -> [mobileSidebarOpen
        # We keep byte at dpos ([) and remove bytes at dpos+1 (m) and dpos+2 ([)
        new_bytes = raw_bytes[:dpos+1] + raw_bytes[dpos+3:]
        
        # Verify
        new_content = new_bytes.decode('utf-8')
        lines = new_content.split('\n')
        for i, line in enumerate(lines):
            if 'mobileSidebarOpen' in line and 'const' in line:
                print(f"\nFixed line {i+1}: '{line}'")
        
        # Write back
        with sftp.open(filepath, 'wb') as f:
            f.write(new_bytes)
        print("talk-panel.tsx saved!")
    else:
        # Maybe it's just missing the [ (like "obileSidebarOpen" without leading [m)
        # Let's check if it's: const obileSidebarOpen
        simple_target = b"obileSidebarOpen, setMobileSidebarOpen]"
        spos = raw_bytes.find(simple_target)
        if spos >= 0:
            # Insert [ before 'obile' -> '[mobileSidebarOpen'
            # But check what byte is before 'obile'
            print(f"Byte before 'obile': {raw_bytes[spos-1]:02X} = '{chr(raw_bytes[spos-1])}'")
            # If byte before is NOT '[', we need to add '[' and fix 'obile' to 'mobile'
            if raw_bytes[spos-1] != 0x5B:  # not '['
                # Replace: obileSidebarOpen, setMobileSidebarOpen] -> [mobileSidebarOpen, setMobileSidebarOpen]
                replacement = b"[mobileSidebarOpen, setMobileSidebarOpen]"
                new_bytes = raw_bytes[:spos] + replacement + raw_bytes[spos+len(simple_target):]
                
                new_content = new_bytes.decode('utf-8')
                lines = new_content.split('\n')
                for i, line in enumerate(lines):
                    if 'mobileSidebarOpen' in line and 'const' in line:
                        print(f"\nFixed line {i+1}: '{line}'")
                
                with sftp.open(filepath, 'wb') as f:
                    f.write(new_bytes)
                print("talk-panel.tsx saved!")

# Now also scan ALL tsx files for remaining issues
print("\n=== Scanning ALL tsx/ts files ===")
stdin, stdout, stderr = client.exec_command(
    """python3 -c "
import os
for root, dirs, files in os.walk('/home/ubuntu/blivoai-demo/src'):
    for fname in files:
        if fname.endswith(('.tsx', '.ts')):
            fpath = os.path.join(root, fname)
            with open(fpath, 'rb') as f:
                data = f.read()
            text = data.decode('utf-8', errors='replace')
            lines = text.split(chr(10))
            for i, line in enumerate(lines):
                # Check for double brackets: const [[
                if 'const [[' in line:
                    print(f'Double bracket: {fpath}:{i+1}: {line.strip()[:60]}')
                # Check for broken destructuring without [
                import re
                matches = re.finditer(r'const (\w{1,8}), set(\w{2,30})\\]', line)
                for m in matches:
                    var = m.group(1)
                    setter = m.group(2)
                    expected = setter[3:]
                    if var != expected and var != setter[3].lower() + setter[4:] and '[' + var not in line[:m.start()+5]:
                        print(f'Broken: {fpath}:{i+1}: {line.strip()[:60]}')
" """
)
scan = stdout.read().decode()
scan_err = stderr.read().decode()
if scan:
    print(scan)
else:
    print("No issues found!")
if scan_err and len(scan_err) > 10:
    print(f"Scan errors (last 200 chars): {scan_err[-200:]}")

sftp.close()
client.close()
