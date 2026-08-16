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

print(f"File size: {len(content)} chars")
print(f"Contains 'const essages': {content.find('const essages')}")
p2 = content.find("}, essages]")
print("Contains }, essages]: position " + str(p2))

# Try replacement with explicit Unicode
old1 = 'const essages, setMessages]'
new1 = 'const [messages, setMessages]'

old2 = '}, essages])'
new2 = '}, [messages])'

# Check exact positions
pos1 = content.find(old1)
pos2 = content.find(old2)
print(f"Position of old1: {pos1}")
print(f"Position of old2: {pos2}")

if pos1 >= 0:
    # Show chars around the error
    print(f"Context around pos1: '{content[pos1-5:pos1+30]}'")
    # Replace
    content = content[:pos1] + new1 + content[pos1+len(old1):]

pos2 = content.find(old2)
if pos2 >= 0:
    print(f"Context around pos2: '{content[pos2-5:pos2+30]}'")
    content = content[:pos2] + new2 + content[pos2+len(old2):]

# Write back as bytes
with sftp.open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))

# Verify
with sftp.open(filepath, 'r') as f:
    new_content = f.read().decode('utf-8')

wrong_pos = new_content.find(' essages, setMessages]')
print(f"After fix - wrong pattern position: {wrong_pos}")

# Check line 67
lines = new_content.split('\n')
if len(lines) >= 67:
    print(f"Line 67: '{lines[66]}'")
if len(lines) >= 130:
    print(f"Line 130: '{lines[129]}'")

sftp.close()
client.close()
