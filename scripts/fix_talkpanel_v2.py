import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

filepath = "/home/ubuntu/blivoai-demo/src/components/dashboard/talk-panel.tsx"

with sftp.open(filepath, 'rb') as f:
    raw_bytes = f.read()

content = raw_bytes.decode('utf-8')
lines = content.split('\n')

# Line 212 (index 211)
line212 = lines[211]
print(f"Line 212: {repr(line212)}")

# Check the exact bytes
# The error says: "const obileSidebarOpen, setMobileSidebarOpen]"
# This means the '[' before 'mobileSidebarOpen' is missing
# OR there's a double bracket issue

# Let's find "obileSidebarOpen" in the bytes
target = b"obileSidebarOpen"
pos = raw_bytes.find(target)
print(f"'obileSidebarOpen' byte position: {pos}")

if pos >= 0:
    print("Bytes before 'obileSidebarOpen':")
    for i in range(max(0, pos-15), pos+5):
        b = raw_bytes[i]
        ch = chr(b) if b < 128 else f'\\x{b:02x}'
        print(f"  [{i}] 0x{b:02X} '{ch}'")
    
    # Determine what the actual pattern is
    # Check if there's a [ before 'obile'
    if raw_bytes[pos-1] == 0x5B:  # '[' before 'obile'
        # It's: [obileSidebarOpen -> missing 'm' before 'obile'
        # Need to insert 'm' to make: [mobileSidebarOpen
        print("\nPattern: [obileSidebarOpen -> need to add 'm'")
        # Insert 'm' (0x6D) before 'obile'
        new_bytes = raw_bytes[:pos] + b'm' + raw_bytes[pos:]
    elif raw_bytes[pos-1] == 0x6D:  # 'm' before 'obile' -> it's already 'mobileSidebarOpen'
        # But something is wrong - maybe double bracket?
        print(f"\nByte at pos-2: {raw_bytes[pos-2]:02X} = '{chr(raw_bytes[pos-2])}'")
        print(f"Byte at pos-1: {raw_bytes[pos-1]:02X} = '{chr(raw_bytes[pos-1])}'")
        
        if raw_bytes[pos-2] == 0x5B:  # '[m' before 'obile' -> normal pattern [mobileSidebarOpen
            # But it still shows as broken... check for duplicate
            print(f"Byte at pos-3: {raw_bytes[pos-3]:02X} = '{chr(raw_bytes[pos-3])}'")
            if raw_bytes[pos-3] == 0x5B and raw_bytes[pos-2] == 0x5B:
                # [[mobileSidebarOpen -> double bracket, remove one
                print("\nPattern: [[mobileSidebarOpen -> remove extra '['")
                new_bytes = raw_bytes[:pos-2] + raw_bytes[pos-1:]  # Remove the extra '['
            elif raw_bytes[pos-3] == 0x6D and raw_bytes[pos-2] == 0x5B:
                # m[mobileSidebarOpen -> duplicate 'm[' pattern
                print("\nPattern: m[mobileSidebarOpen -> remove duplicate 'm['")
                new_bytes = raw_bytes[:pos-3] + raw_bytes[pos-1:]  # Remove 'm[' and keep 'm'
            else:
                print(f"\nUnknown pattern. Let me show wider context:")
                for i in range(max(0, pos-25), min(len(raw_bytes), pos+20)):
                    b = raw_bytes[i]
                    ch = chr(b) if b < 128 else f'\\x{b:02x}'
                    print(f"  [{i}] 0x{b:02X} '{ch}'")
                # Just replace the whole line content
                # Find the newline boundaries
                nl_before = raw_bytes.rfind(b'\n', 0, pos)
                nl_after = raw_bytes.find(b'\n', pos)
                if nl_before >= 0 and nl_after >= 0:
                    old_line = raw_bytes[nl_before+1:nl_after]
                    new_line = b"  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)"
                    new_bytes = raw_bytes[:nl_before+1] + new_line + raw_bytes[nl_after:]
                    print(f"Replacing entire line")
    else:
        print(f"\nUnknown byte before 'obile': {raw_bytes[pos-1]:02X}")
        # Replace the whole line
        nl_before = raw_bytes.rfind(b'\n', 0, pos)
        nl_after = raw_bytes.find(b'\n', pos)
        if nl_before >= 0 and nl_after >= 0:
            old_line = raw_bytes[nl_before+1:nl_after]
            new_line = b"  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)"
            new_bytes = raw_bytes[:nl_before+1] + new_line + raw_bytes[nl_after:]
            print(f"Replacing entire line from newline {nl_before} to {nl_after}")

# Verify
new_content = new_bytes.decode('utf-8')
new_lines = new_content.split('\n')
print(f"\nVerification - Line 212: '{new_lines[211]}'")

# Write
with sftp.open(filepath, 'wb') as f:
    f.write(new_bytes)
print("Saved!")

sftp.close()
client.close()
