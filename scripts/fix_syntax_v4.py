#!/usr/bin/env python3
"""Fix syntax errors - using SFTP to upload and sed for simple fixes"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Step 1: Download department-chat-sidebar.tsx
sftp = client.open_sftp()
with sftp.open("/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx", "r") as f:
    sidebar_content = f.read().decode("utf-8")

# Step 2: Fix the content locally
# Fix 1: const essages, setMessages] -> const [messages, setMessages]
sidebar_content = sidebar_content.replace("const essages, setMessages]", "const [messages, setMessages]")
# Fix 2: }, essages]) -> }, [messages])
sidebar_content = sidebar_content.replace("}, essages])", "}, [messages])")

# Step 3: Upload the fixed content
with sftp.open("/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx", "w") as f:
    f.write(sidebar_content.encode("utf-8"))

print("Uploaded fixed department-chat-sidebar.tsx")

# Step 4: Download llm-service.ts
with sftp.open("/home/ubuntu/blivoai-demo/src/lib/llm-service.ts", "r") as f:
    llm_content = f.read().decode("utf-8")

# Step 5: Fix the content locally
# Fix: result.models.tier] -> result.models[m.tier]
llm_content = llm_content.replace("result.models.tier] = m.modelId", "result.models[m.tier] = m.modelId")

# Step 6: Upload the fixed content
with sftp.open("/home/ubuntu/blivoai-demo/src/lib/llm-service.ts", "w") as f:
    f.write(llm_content.encode("utf-8"))

print("Uploaded fixed llm-service.ts")

sftp.close()

# Step 7: Verify
stdin, stdout, stderr = client.exec_command("sed -n '41p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
print(f"Verify sidebar line 41: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("grep 'essages]' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
result = stdout.read().decode().strip()
print(f"Remaining 'essages]' occurrences: {result or 'NONE - ALL FIXED!'}")

stdin, stdout, stderr = client.exec_command("sed -n '180p' ~/blivoai-demo/src/lib/llm-service.ts")
print(f"Verify LLM line 180: {stdout.read().decode().strip()}")

client.close()
