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

# Find the line starting with "  const " that contains "obileMenuOpen" or "mobileMenuOpen"
# Let's search for "obileMenuOpen" in the raw bytes first
target1 = "obileMenuOpen".encode('utf-8')
target2 = "mobileMenuOpen".encode('utf-8')

pos1 = raw_bytes.find(target1)
pos2 = raw_bytes.find(target2)

print(f"'obileMenuOpen' found at byte position: {pos1}")
print(f"'mobileMenuOpen' found at byte position: {pos2}")

# Show bytes around these positions
if pos1 >= 0:
    print(f"Bytes around 'obileMenuOpen' (pos {pos1}):")
    start = max(0, pos1 - 10)
    end = min(len(raw_bytes), pos1 + 30)
    for i in range(start, end):
        b = raw_bytes[i]
        ch = chr(b) if b < 128 else f'\\x{b:02x}'
        print(f"  byte[{i}] = 0x{b:02X} = '{ch}'")

if pos2 >= 0:
    print(f"\nBytes around 'mobileMenuOpen' (pos {pos2}):")
    start = max(0, pos2 - 10)
    end = min(len(raw_bytes), pos2 + 30)
    for i in range(start, end):
        b = raw_bytes[i]
        ch = chr(b) if b < 128 else f'\\x{b:02x}'
        print(f"  byte[{i}] = 0x{b:02X} = '{ch}'")

# Now find the actual content around "const" near these positions
const_pos = raw_bytes.find(b"const", max(0, pos1 - 20 if pos1 >= 0 else 0))
if const_pos >= 0:
    print(f"\n'const' keyword found at byte position: {const_pos}")
    # Show 80 bytes from const
    end_pos = min(len(raw_bytes), const_pos + 80)
    segment = raw_bytes[const_pos:end_pos].decode('utf-8', errors='replace')
    print(f"Content from 'const': '{segment}'")

sftp.close()
client.close()
