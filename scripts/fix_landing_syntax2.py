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

# Fix line 109 (index 108)
line109 = lines[108]
print(f"Line 109 before: '{line109}'")
print(f"Line 109 chars around 'obile':")
for i in range(len(line109)):
    ch = line109[i]
    if i >= 5 and i <= 25:
        print(f"  pos {i}: char='{ch}' U+{ord(ch):04X}")

# Check if there's a hidden character before 'obile'
# The line should be: "  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)"
# But it shows: "  const obileMenuOpen, setMobileMenuOpen] = useState(false)"

# Try direct byte manipulation
# Find "obileMenuOpen" in the bytes
target = "obileMenuOpen, setMobileMenuOpen]"
byte_target = target.encode('utf-8')
pos_in_bytes = raw_bytes.find(byte_target)
print(f"\nTarget bytes found at position: {pos_in_bytes}")

if pos_in_bytes >= 0:
    # Check what byte is before the target
    print(f"Byte before target: {raw_bytes[pos_in_bytes-1]:02X} = '{chr(raw_bytes[pos_in_bytes-1])}'")
    
    # We need to replace: "obileMenuOpen, setMobileMenuOpen]" with "[mobileMenuOpen, setMobileMenuOpen]"
    replacement = "[mobileMenuOpen, setMobileMenuOpen]"
    byte_replacement = replacement.encode('utf-8')
    
    new_bytes = raw_bytes[:pos_in_bytes] + byte_replacement + raw_bytes[pos_in_bytes+len(byte_target):]
    
    # Verify
    new_content = new_bytes.decode('utf-8')
    new_lines = new_content.split('\n')
    print(f"\nLine 109 after: '{new_lines[108]}'")
    
    # Write back
    with sftp.open(filepath, 'wb') as f:
        f.write(new_bytes)
    
    print("File written successfully!")

sftp.close()

# Also check talk-panel and other known broken files
stdin, stdout, stderr = client.exec_command(
    "grep -rn 'const [a-z]*, set[A-Z]*\\]' /home/ubuntu/blivoai-demo/src/ --include='*.tsx' --include='*.ts'"
)
all_lines = stdout.read().decode()
# Filter for lines that don't have '[' before the variable name
broken = []
for line in all_lines.split('\n'):
    # Check if it's a proper destructuring (has '[') or broken (missing '[')
    # Pattern: const word, setWord] — missing '[' before word
    import re
    match = re.search(r'const (\w+), set(\w+)\]', line)
    if match:
        var_name = match.group(1)
        setter_name = match.group(2)
        # Proper destructuring has variable starting with lowercase that matches setter pattern
        # e.g. const [messages, setMessages] — 'messages' matches 'setMessages' without 'set'
        expected_var = setter_name[3:]  # Remove 'set' prefix
        expected_var_lower = setter_name[3].lower() + setter_name[4:]
        if var_name != expected_var and var_name != expected_var_lower:
            broken.append(line)

if broken:
    print("\nSTILL BROKEN PATTERNS:")
    for b in broken:
        print(f"  {b}")
else:
    print("\nNo broken destructuring patterns found across all files!")

client.close()
