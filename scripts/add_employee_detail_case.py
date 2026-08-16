#!/usr/bin/env python3
"""Add proper employee-detail case to main-content.tsx"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()
remote_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

# Replace the stray "return null" with proper employee-detail case
old_stray = '''      return null
    default:'''

new_case = '''    case "employee-detail":
      const detailEmployee = employees.find(e => e.id === selectedEmployeeDetailId)
      if (detailEmployee) {
        return (
          <main className="flex-1 overflow-y-auto w-full">
            <EmployeeDetailPanel
              employee={detailEmployee}
              departments={departments}
              onBack={() => setActiveTab("employees")}
            />
          </main>
        )
      }
      return null
    default:'''

content = content.replace(old_stray, new_case)

with sftp.open(remote_path, "w") as f:
    f.write(content.encode())
print("employee-detail case added!")

# Verify
stdin, stdout, stderr = client.exec_command("grep -c 'EmployeeDetailPanel' /home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx")
print(f"EmployeeDetailPanel count: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("grep -c 'case \"employee-detail\"' /home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx")
print(f"employee-detail cases: {stdout.read().decode().strip()}")

sftp.close()
client.close()
