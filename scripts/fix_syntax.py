import paramiko
import sys

host = "141.95.55.5"
user = "ubuntu"
passwd = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=passwd)

def run(cmd):
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out)
    if err: print(f"ERR: {err}")
    return out

# Fix llm-service.ts - Line 196: result.models.tier] -> result.models[m.tier]
run("cd ~/blivoai-demo && sed -i 's/result\\.models\\.tier\\]/result.models[m.tier]/g' src/lib/llm-service.ts")

# Fix llm-service.ts - Lines 576, 662: config.modelsodelTier] -> config.models[modelTier]
run("cd ~/blivoai-demo && sed -i 's/config\\.modelsodelTier\\]/config.models[modelTier]/g' src/lib/llm-service.ts")

# Fix department-chat-sidebar.tsx - Line 41: const essages, setMessages] -> const [messages, setMessages]
run("cd ~/blivoai-demo && sed -i 's/const essages, setMessages\\]/const [messages, setMessages]/g' src/components/chat/department-chat-sidebar.tsx")

# Fix department-chat-sidebar.tsx - }, essages] -> }, [messages]
run("cd ~/blivoai-demo && sed -i 's/}, essages\\]/}, [messages]/g' src/components/chat/department-chat-sidebar.tsx")

# Verify fixes
print("=== Verification ===")
run("sed -n '196p' ~/blivoai-demo/src/lib/llm-service.ts")
run("sed -n '576p' ~/blivoai-demo/src/lib/llm-service.ts")
run("sed -n '662p' ~/blivoai-demo/src/lib/llm-service.ts")
run("sed -n '41p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
run("grep 'essages' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx || echo 'No more essages found - GOOD'")

ssh.close()
print("Done!")
