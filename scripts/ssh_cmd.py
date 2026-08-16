import paramiko
import sys

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

command = sys.argv[1] if len(sys.argv) > 1 else "echo 'connected'"
stdin, stdout, stderr = client.exec_command(command)
out = stdout.read().decode()
err = stderr.read().decode()
if out:
    print(out)
if err:
    print("STDERR:", err)
client.close()
