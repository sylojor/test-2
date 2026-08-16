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

# Fix: const obileMenuOpen, setMobileMenuOpen] -> const [mobileMenuOpen, setMobileMenuOpen]
old_pattern = 'const obileMenuOpen, setMobileMenuOpen]'
new_pattern = 'const [mobileMenuOpen, setMobileMenuOpen]'

pos = content.find(old_pattern)
print(f"Found pattern at position: {pos}")

if pos >= 0:
    content = content[:pos] + new_pattern + content[pos+len(old_pattern):]

# Also check for any other similar broken destructuring patterns
# Pattern: "const Xword, setXword]" where X is missing the '['
import re
broken_patterns = re.findall(r'const (\w{1,5}[A-Z]\w+), set\w+\]', content)
if broken_patterns:
    print(f"WARNING: Found potential broken destructuring patterns: {broken_patterns}")
    # Let's also check for patterns like "const odels" etc
    for bp in broken_patterns:
        print(f"  - {bp}")

# Write back
with sftp.open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))

# Verify
with sftp.open(filepath, 'rb') as f:
    verify = f.read().decode('utf-8')

verify_pos = verify.find('const obileMenuOpen')
print(f"After fix - broken pattern position: {verify_pos}")

# Check line 109
lines = verify.split('\n')
print(f"Line 109: '{lines[108]}'")

# Also check for any remaining broken patterns in ALL files
stdin, stdout, stderr = client.exec_command(
    "grep -rn 'const [a-z]*, set[A-Z]*\\]' /home/ubuntu/blivoai-demo/src/ --include='*.tsx' | grep -v '\\['"
)
grep_out = stdout.read().decode()
if grep_out:
    print("OTHER BROKEN PATTERNS FOUND:")
    print(grep_out)
else:
    print("No other broken destructuring patterns found!")

sftp.close()
client.close()
