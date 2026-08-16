import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx', 'r') as f:
    content = f.read().decode('utf-8')

# Check what component/function the logoVersion declaration is inside
# Read the area around offset 84200-84500
print("=== AREA WHERE logoVersion IS DECLARED ===")
print(content[84100:84600])

# Check the area where logoVersion is USED (offset ~17800)
print("\n=== AREA WHERE logoVersion IS USED ===")
print(content[17000:18500])

# Find the component structure - what function contains offset 17800?
# Look for function boundaries
print("\n=== COMPONENT STRUCTURE ===")
# Find the AdminContent export
export_idx = content.find("export function AdminContent")
if export_idx < 0:
    export_idx = content.find("export default function AdminContent")
if export_idx < 0:
    export_idx = content.find("AdminContent")

print(f"AdminContent at offset: {export_idx}")
print(f"logoVersion used at offset: 17812")
print(f"logoVersion declared at offset: 84305")

# Check if logoVersion is inside a different component
# Find all "function" declarations between 17000 and 84300
import re
functions = list(re.finditer(r'(function |const \w+ = |=> )', content[17000:84500]))
print(f"\nFunction-like declarations between usage and declaration: {len(functions)}")
for f in functions[:5]:
    print(f"  At offset {17000 + f.start()}: {content[17000+f.start():17000+f.start()+80]}")

# Check what's right before logoVersion declaration
print("\n=== 500 chars BEFORE logoVersion ===")
print(content[83800:84305])

# Read the entire component beginning (first 200 lines of code)
lines = content.splitlines()
for i, line in enumerate(lines[:30]):
    print(f"Line {i+1}: {line[:80]}")

sftp.close()
ssh.close()
