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

# Read the full upload route
print("=== Full upload/branding/route.ts ===")
out, err = ssh_exec("wc -l ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print("Lines:", out)

out, err = ssh_exec("cat ~/blivoai-demo/src/app/api/upload/branding/route.ts")
print(out[:4000])
