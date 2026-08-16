import paramiko
import sys

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Force rebuild - no cache
stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose build --no-cache app && docker compose up -d",
    timeout=600  # 10 minute timeout for build
)

# Stream output
for line in stdout:
    sys.stdout.write(line)
    sys.stdout.flush()

err_output = stderr.read().decode()
if err_output:
    print("STDERR:", err_output[-500:] if len(err_output) > 500 else err_output)

client.close()
