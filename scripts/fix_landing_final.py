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

line109 = lines[108]
# Current: "  const [[mobileMenuOpen, setMobileMenuOpen] = useState(false)"
# Should be: "  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)"

# Replace [[m with [m in the const destructuring
old_line = "  const [[mobileMenuOpen, setMobileMenuOpen] = useState(false)"
new_line = "  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)"

if line109 == old_line:
    print(f"Found exact match! Fixing...")
    lines[108] = new_line
    new_content = '\n'.join(lines)
    
    with sftp.open(filepath, 'wb') as f:
        f.write(new_content.encode('utf-8'))
    
    print("Fixed successfully!")
elif '[[mobileMenuOpen' in line109:
    print(f"Found double bracket pattern, fixing...")
    lines[108] = line109.replace('[[mobileMenuOpen', '[mobileMenuOpen')
    new_content = '\n'.join(lines)
    
    with sftp.open(filepath, 'wb') as f:
        f.write(new_content.encode('utf-8'))
    
    print("Fixed successfully!")
else:
    print(f"Line 109 doesn't match expected pattern: {repr(line109)}")

# Verify
with sftp.open(filepath, 'rb') as f:
    verify = f.read().decode('utf-8')

verify_lines = verify.split('\n')
print(f"\nVerification - Line 109: '{verify_lines[108]}'")

# Now also scan ALL .tsx files for double brackets [[ in destructuring
stdin, stdout, stderr = client.exec_command(
    "grep -rn 'const \\[\\[' /home/ubuntu/blivoai-demo/src/ --include='*.tsx'"
)
double_bracket_lines = stdout.read().decode()
if double_bracket_lines:
    print("\nDouble bracket patterns found in other files:")
    print(double_bracket_lines)
else:
    print("\nNo double bracket patterns found!")

# Also check for broken patterns: const X, setX] (without [)
stdin, stdout, stderr = client.exec_command(
    r"""grep -Pn 'const [a-z][a-zA-Z]+, set[A-Z][a-zA-Z]+\]' /home/ubuntu/blivoai-demo/src/ --include='*.tsx' --include='*.ts'"""
)
# Filter for ones where the variable name doesn't match expected pattern
broken_lines = stdout.read().decode()
if broken_lines:
    print("\nPotential broken destructuring (missing [):")
    for line in broken_lines.split('\n'):
        if line.strip():
            print(f"  {line}")
else:
    print("\nNo broken destructuring patterns!")

sftp.close()
client.close()
