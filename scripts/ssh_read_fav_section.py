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

# Read the full favicon upload section (lines 200-268)
print("=== Favicon upload section (full) ===")
out, err = ssh_exec("sed -n '200,268p' ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print(out)
