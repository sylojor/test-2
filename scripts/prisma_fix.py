#!/usr/bin/env python3
"""
Fix Prisma schema - add approve/reject fields to WorkOrderTask model only
"""

import paramiko

SSH_HOST = "141.95.55.5"
SSH_USER = "ubuntu"
SSH_PASSWORD = "Mghazi@199641"
PROJECT_DIR = "/home/ubuntu/blivoai-demo"

def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SSH_HOST, port=22, username=SSH_USER, password=SSH_PASSWORD)
    return client

def read_file(client, filepath):
    sftp = client.open_sftp()
    with sftp.open(filepath, 'r') as f:
        content = f.read().decode('utf-8')
    sftp.close()
    return content

def write_file(client, filepath, content):
    sftp = client.open_sftp()
    with sftp.open(filepath, 'w') as f:
        f.write(content.encode('utf-8'))
    sftp.close()
    print(f"  ✓ Written: {filepath}")

def main():
    client = ssh_connect()
    
    filepath = f"{PROJECT_DIR}/prisma/schema.prisma"
    content = read_file(client, filepath)
    
    # Replace the specific WorkOrderTask model section
    # The unique identifier is "result      String?" followed by "completedAt DateTime?" 
    # within the WorkOrderTask model
    
    old_model = '''  // نتيجة المهمة
  result      String?
  completedAt DateTime?
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@map("work_order_tasks")'''
    
    new_model = '''  // نتيجة المهمة
  result      String?
  completedAt DateTime?
  approvedAt  DateTime?
  approvedBy  String?
  rejectedAt  DateTime?
  rejectedBy  String?
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@map("work_order_tasks")'''
    
    content = content.replace(old_model, new_model)
    
    write_file(client, filepath, content)
    
    # Verify
    content = read_file(client, filepath)
    if "approvedAt" in content and "rejectedAt" in content:
        print("  ✓ Prisma schema has approve/reject fields in WorkOrderTask")
    else:
        print("  ✗ Prisma schema still missing fields!")
    
    # Now also run prisma db push to update the database
    print("\n=== Running Prisma migration ===")
    stdin, stdout, stderr = client.exec_command(f"cd {PROJECT_DIR} && npx prisma db push --accept-data-loss 2>&1 | tail -5")
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out)
    if err:
        print("STDERR:", err)
    
    client.close()

if __name__ == "__main__":
    main()
