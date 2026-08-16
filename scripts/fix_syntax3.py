import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

filepath = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-panel.tsx"

# Read file as bytes
with sftp.open(filepath, 'rb') as f:
    raw_bytes = f.read()

content = raw_bytes.decode('utf-8')
lines = content.split('\n')

# Check the exact bytes of line 67 (index 66)
line67 = lines[66]
print("Line 67 hex dump:")
for i, ch in enumerate(line67):
    if i >= 6 and i <= 14:  # Around 'essages'
        print(f"  pos {i}: char '{ch}' = U+{ord(ch):04X} = {ch.encode('utf-8').hex()}")

print(f"\nLine 67 full: '{line67}'")
print(f"\nLine 130 (idx 129): '{lines[129]}'")

# Let's check around 'essages' specifically
for i, ch in enumerate(line67):
    if ord(ch) > 127 or (ch == ' ' and i > 4 and i < 15):
        print(f"  pos {i}: U+{ord(ch):04X}")

client.close()
