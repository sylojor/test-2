import paramiko
import base64

def ssh_exec(command, timeout=120):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# Write a Python script on the server to fix the createIco bug
fix_script = r"""
filepath = "/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts"
with open(filepath, "r") as f:
    lines = f.readlines()

# Find the line with the bug and fix it
for i, line in enumerate(lines):
    if "Buffer.concat(eader" in line:
        # Fix: change 'eader' to '[header' (add missing bracket and 'h')
        old_line = line
        new_line = line.replace("Buffer.concat(eader, entry32, entry16, png32, png16])", 
                                "Buffer.concat([header, entry32, entry16, png32, png16])")
        lines[i] = new_line
        print(f"Fixed line {i+1}:")
        print(f"  OLD: {old_line.strip()}")
        print(f"  NEW: {new_line.strip()}")

with open(filepath, "w") as f:
    f.writelines(lines)

print("Done!")
"""

encoded = base64.b64encode(fix_script.encode('utf-8')).decode('ascii')
cmd = f"echo '{encoded}' | base64 -d > /tmp/fix_ico2.py && python3 /tmp/fix_ico2.py"
out, err = ssh_exec(cmd)
print(out)

# Verify the fix
filepath = "~/blivoai-demo/src/app/api/upload/branding/route.ts"
out, err = ssh_exec(f"grep 'Buffer.concat' {filepath}")
print("\nVerify:", out)
