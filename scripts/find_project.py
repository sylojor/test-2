#!/usr/bin/env python3
import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641', timeout=30)

def run(cmd):
    print(f'>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(out)
    if err: print(f'STDERR: {err}')
    print()
    return out

run('sudo find / -name "docker-compose*" -not -path "*/proc/*" -not -path "*/sys/*" -not -path "*/overlayfs/*" -type f 2>/dev/null | head -20')
run('sudo docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"')
out = run('sudo docker inspect blivo-app --format="{{json .Mounts}}" 2>/dev/null')
if out:
    try:
        mounts = json.loads(out)
        for m in mounts:
            print(f"  {m.get('Source')} -> {m.get('Destination')}")
    except: pass

out2 = run('sudo docker inspect blivo-app --format="{{json .Config.WorkingDir}}" 2>/dev/null')
print(f"WorkingDir: {out2}")

# Check if there's a compose project
run('sudo docker compose ls 2>/dev/null || sudo docker-compose ls 2>/dev/null')

ssh.close()
