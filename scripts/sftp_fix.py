import paramiko
import os

host = "141.95.55.5"
user = "ubuntu"
passwd = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=passwd)
sftp = ssh.open_sftp()

# Download files
local_dir = "/home/z/my-project/server-files"
os.makedirs(local_dir, exist_ok=True)

files = [
    ("~/blivoai-demo/src/lib/llm-service.ts", f"{local_dir}/llm-service.ts"),
    ("~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx", f"{local_dir}/department-chat-sidebar.tsx"),
    ("~/blivoai-demo/src/components/dashboard/settings-panel.tsx", f"{local_dir}/settings-panel.tsx"),
    ("~/blivoai-demo/prisma/schema.prisma", f"{local_dir}/schema.prisma"),
    ("~/blivoai-demo/src/lib/db.ts", f"{local_dir}/db.ts"),
    ("~/blivoai-demo/.env", f"{local_dir}/.env"),
]

for remote, local in files:
    try:
        remote_path = remote.replace("~", "/home/ubuntu")
        sftp.get(remote_path, local)
        print(f"Downloaded {remote_path}")
    except Exception as e:
        print(f"Failed to download {remote}: {e}")

# Also download the API route for LLM settings if it exists
try:
    sftp.get("/home/ubuntu/blivoai-demo/src/app/api/llm/route.ts", f"{local_dir}/llm-api-route.ts")
    print("Downloaded llm API route")
except:
    print("No existing llm API route")

sftp.close()
ssh.close()
print("All downloads complete!")
