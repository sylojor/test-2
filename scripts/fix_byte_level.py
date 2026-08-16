#!/usr/bin/env python3
"""Fix using sed with explicit character codes"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Fix department-chat-sidebar.tsx line 41 using sed with python chr for bracket
# First let's see the exact bytes of line 41
cmd_check = """python3 -c '
path = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx"
with open(path, "rb") as f:
    data = f.read()
lines = data.split(b"\\n")
if len(lines) >= 41:
    l41 = lines[40]
    # Print every byte
    for i in range(len(l41)):
        b = l41[i]
        ch = chr(b) if 32 <= b < 127 else "?"
        print(str(i) + ": " + hex(b) + " (" + ch + ")")
'"""

stdin, stdout, stderr = client.exec_command(cmd_check)
out = stdout.read().decode()
print(f"Line 41 byte analysis:\n{out}")

# Now fix by using python on the server to do byte-level replacement
# The issue: 'const ' + some_char + 'essages' where some_char is NOT 0x5b (ASCII '[')
# We need to find what byte is actually there and replace it with 0x5b

fix_cmd = """python3 -c '
path = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx"
with open(path, "rb") as f:
    data = f.read()

# Search for pattern: b"essages, setMessages]"
# and find the byte just before it
search_pattern = b"essages, setMessages]"
pos = data.find(search_pattern)
if pos >= 0:
    byte_before = data[pos-1]
    print("Found pattern at position " + str(pos))
    print("Byte before pattern: " + hex(byte_before) + " = " + chr(byte_before) if 32 <= byte_before < 127 else "?")
    
    # Replace: remove the wrong byte and insert 0x5b (ASCII [) + 0x6d (ASCII m) before "essages"
    # Current: wrong_byte + "essages, setMessages]"
    # Target: 0x5b + 0x6d + "essages, setMessages]" = "[messages, setMessages]"
    # But we need to check what the current byte sequence actually is
    
    # Let's see bytes from pos-2 to pos+20
    snippet = data[pos-5:pos+25]
    print("Byte snippet: " + snippet.hex())
    print("As text: " + snippet.decode("utf-8", errors="replace"))
    
    # Now: replace the specific byte pattern
    # The current text at line 41 is: "  const " + char_before + "essages, setMessages] = useState<ChatMessage[]>([])"
    # We need to change char_before + "essages" to "[messages"
    # i.e., replace: char_before + b"essages" with b"[messages"
    
    old_bytes = data[pos-1:pos+7]  # char_before + "essages"
    print("Old bytes to replace: " + old_bytes.hex() + " = " + old_bytes.decode("utf-8", errors="replace"))
    
    new_bytes = b"[messages"
    print("New bytes: " + new_bytes.hex() + " = " + new_bytes.decode("utf-8", errors="replace"))
    
    data = data.replace(old_bytes, new_bytes, 1)  # Replace first occurrence only
    
    # Also fix "essages]" -> "[messages]" in the useEffect dependency
    search2 = b"essages])"
    pos2 = data.find(search2)
    if pos2 >= 0:
        byte_before2 = data[pos2-1]
        print("Found second pattern at position " + str(pos2))
        print("Byte before: " + hex(byte_before2))
        old_bytes2 = data[pos2-1:pos2+4]  # char_before + "essages"
        new_bytes2 = b"[messages"
        data = data.replace(old_bytes2, new_bytes2, 1)
        print("Fixed second pattern")
    
    with open(path, "wb") as f:
        f.write(data)
    print("File saved!")
else:
    print("Pattern not found!")
'"""

stdin, stdout, stderr = client.exec_command(fix_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"\nSidebar fix result:\n{out}")
if err:
    print(f"Stderr:\n{err}")

# Fix llm-service.ts similarly
fix_llm_cmd = """python3 -c '
path = "/home/ubuntu/blivoai-demo/src/lib/llm-service.ts"
with open(path, "rb") as f:
    data = f.read()

# Fix: "models.tier]" -> "models[m.tier]"
search = b"models.tier]"
pos = data.find(search)
if pos >= 0:
    print("Found pattern at position " + str(pos))
    snippet = data[pos-5:pos+15]
    print("Snippet: " + snippet.hex() + " = " + snippet.decode("utf-8", errors="replace"))
    
    # Replace models.tier] with models[m.tier]
    old = b"models.tier]"
    new = b"models[m.tier]"
    data = data.replace(old, new, 1)
    print("Replaced!")
    
    with open(path, "wb") as f:
        f.write(data)
    print("File saved!")
else:
    print("Pattern not found!")
'"""

stdin, stdout, stderr = client.exec_command(fix_llm_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"\nLLM fix result:\n{out}")
if err:
    print(f"Stderr:\n{err}")

# Final verification
stdin, stdout, stderr = client.exec_command("sed -n '41p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
line41 = stdout.read().decode().strip()
print(f"\nFinal sidebar line 41: {line41}")

stdin, stdout, stderr = client.exec_command("grep -c 'essages, setMessages]' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
count = stdout.read().decode().strip()
print(f"'essages, setMessages]' count: {count}")

stdin, stdout, stderr = client.exec_command("grep -c 'messages, setMessages]' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
count2 = stdout.read().decode().strip()
print(f"'[messages, setMessages]' count: {count2}")

stdin, stdout, stderr = client.exec_command("sed -n '180p' ~/blivoai-demo/src/lib/llm-service.ts")
line180 = stdout.read().decode().strip()
print(f"Final LLM line 180: {line180}")

client.close()
