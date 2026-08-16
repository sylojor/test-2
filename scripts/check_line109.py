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

content = raw_bytes.decode('utf-8')
lines = content.split('\n')

# Print line 109 (index 108) with full detail
line109 = lines[108]
print(f"Line 109 length: {len(line109)}")
print(f"Line 109 repr: {repr(line109)}")

# Check specific positions
for i in range(min(30, len(line109))):
    ch = line109[i]
    print(f"  [{i}] = U+{ord(ch):04X} = '{ch}'")

sftp.close()
client.close()
