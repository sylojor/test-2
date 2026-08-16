#!/usr/bin/env python3
"""Fix docker-compose and rebuild."""
import paramiko

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
NEW_KEY = "tgp_v1_KXUEDfm7ZsHPYEpLOdtrlydb7IAKpNaBvvB8IWNaai0"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=30)
print("Connected!")

def run(cmd, timeout=60):
    print(f"\n>> {cmd[:150]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    combined = (out + err).strip()
    if combined:
        for line in combined.split(chr(10))[-20:]:
            print(f"   {line}")
    return combined

# 1. See FULL docker-compose
print("\n=== Full docker-compose.yml ===")
run("cat /home/ubuntu/new-blivo/docker-compose.yml")

# 2. Add env vars directly to the app service
# The code reads LLM_API_KEY, but docker-compose has TOGETHER_API_KEY
# We need to add LLM_API_KEY and LLM_PROVIDER
print("\n=== Adding LLM_API_KEY ===")
run(f'''sed -i "/TOGETHER_API_KEY=/a\\      - LLM_API_KEY={NEW_KEY}" /home/ubuntu/new-blivo/docker-compose.yml''')
run(f'''sed -i "/TOGETHER_API_KEY=/a\\      - LLM_PROVIDER=together" /home/ubuntu/new-blivo/docker-compose.yml''')
run(f"""sed -i 's|TOGETHER_API_KEY=\${{TOGETHER_API_KEY:-}}|TOGETHER_API_KEY={NEW_KEY}|' /home/ubuntu/new-blivo/docker-compose.yml""")

# 3. Verify
print("\n=== Verify ===")
run("grep -E 'LLM_API_KEY|LLM_PROVIDER|TOGETHER_API_KEY' /home/ubuntu/new-blivo/docker-compose.yml")

# 4. Also add LLM_API_KEY to the environment via .env file
print("\n=== Also create .env file ===")
run(f'echo "LLM_API_KEY={NEW_KEY}" > /home/ubuntu/new-blivo/.env')
run(f'echo "LLM_PROVIDER=together" >> /home/ubuntu/new-blivo/.env')
run('cat /home/ubuntu/new-blivo/.env')

ssh.close()
print("\n=== Env vars set. Now need to rebuild. ===")
