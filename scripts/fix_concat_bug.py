import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# Read raw bytes
sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'rb') as f:
    raw = f.read()

print(f"Original file size: {len(raw)} bytes")

# Find the bug pattern in raw bytes
bug_pattern = b'Buffer.concat(eader, entry, png16])'
fix_pattern = b'Buffer.concat([header, entry, png16])'

count_bug = raw.count(bug_pattern)
print(f"Bug pattern occurrences: {count_bug}")

# Fix the bug
raw_fixed = raw.replace(bug_pattern, fix_pattern)

# Verify the fix
count_bug_after = raw_fixed.count(bug_pattern)
count_fix_after = raw_fixed.count(fix_pattern)
print(f"After fix - bug occurrences: {count_bug_after}, fix occurrences: {count_fix_after}")

# Write back the fixed file
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'wb') as f:
    f.write(raw_fixed)

print(f"Fixed file size: {len(raw_fixed)} bytes")

# Verify by reading back
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'rb') as f:
    verify = f.read()

# Check concat lines
concat_bytes = b'Buffer.concat'
pos = 0
positions = []
while True:
    pos = verify.find(concat_bytes, pos)
    if pos < 0:
        break
    positions.append(pos)
    pos += len(concat_bytes)

for p in positions:
    chunk = verify[p:p+50]
    print(f"  Position {p}: {chunk}")

sftp.close()
ssh.close()
print("\n✅ Bug fix completed!")
