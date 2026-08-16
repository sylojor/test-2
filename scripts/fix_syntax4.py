import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

filepath = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-panel.tsx"

with sftp.open(filepath, 'rb') as f:
    raw_bytes = f.read()

content = raw_bytes.decode('utf-8')
lines = content.split('\n')

# Check line 67 - around 'const' area (positions 0-40)
line67 = lines[66]
print("Line 67 detailed hex dump (first 40 chars):")
for i in range(min(40, len(line67))):
    ch = line67[i]
    print(f"  pos {i}: char='{ch}' U+{ord(ch):04X}")

# Check line 130 (idx 129)
line130 = lines[129]
print("\nLine 130 detailed hex dump (first 20 chars):")
for i in range(min(20, len(line130))):
    ch = line130[i]
    print(f"  pos {i}: char='{ch}' U+{ord(ch):04X}")

client.close()
