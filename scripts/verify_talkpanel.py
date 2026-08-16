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

# Find "obileSidebarOpen" again
target = b"obileSidebarOpen"
pos = raw_bytes.find(target)
print(f"'obileSidebarOpen' at position: {pos}")

if pos >= 0:
    print("Bytes around it:")
    for i in range(max(0, pos-15), min(len(raw_bytes), pos+20)):
        b = raw_bytes[i]
        ch = chr(b) if b < 128 else f'\\x{b:02x}'
        print(f"  [{i}] 0x{b:02X} '{ch}'")

# Also find "[mobileSidebarOpen" - the CORRECT pattern
target2 = b"[mobileSidebarOpen"
pos2 = raw_bytes.find(target2)
print(f"\n'[mobileSidebarOpen' at position: {pos2}")

# And check for 'const [mobileSidebarOpen' 
target3 = b"const [mobileSidebarOpen"
pos3 = raw_bytes.find(target3)
print(f"'const [mobileSidebarOpen' at position: {pos3}")

# The line should be: "  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)"
target4 = b"const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)"
pos4 = raw_bytes.find(target4)
print(f"Full correct line at position: {pos4}")

# Check what the actual line 212 says
content = raw_bytes.decode('utf-8')
lines = content.split('\n')
print(f"\nLine 212 content: '{lines[211]}'")
print(f"Line 212 hex dump (first 30 chars):")
for i in range(min(30, len(lines[211]))):
    ch = lines[211][i]
    print(f"  [{i}] U+{ord(ch):04X} '{ch}'")

sftp.close()
client.close()
