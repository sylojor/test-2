#!/usr/bin/env python3
"""Fix IEmployee type - add replacedByEmployeeId and replacedAt"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

with sftp.open("/home/ubuntu/blivoai-demo/src/types/index.ts", "r") as f:
    types_content = f.read().decode()

# Add replacedByEmployeeId and replacedAt to IEmployee
old_ieployee = '''export interface IEmployee {
  id: string
  name: string
  role: string
  specialization?: string  // التخصص الأساسي — يحدده المستخدم حرّة (أي تخصص يريده)
  status: EmployeeStatus
  avatarColor?: string
  personality?: string
  systemPrompt?: string
  capabilities?: string   // JSON array
  constraints?: string    // JSON array
  suggestedCapabilities?: string // JSON array — مقترحة من النظام
  approvalMode: ApprovalMode
  companyId: string
  departmentId?: string
  createdAt: Date
  updatedAt: Date
}'''

new_ieployee = '''export interface IEmployee {
  id: string
  name: string
  role: string
  specialization?: string  // التخصص الأساسي — يحدده المستخدم حرّة (أي تخصص يريده)
  status: EmployeeStatus
  avatarColor?: string
  personality?: string
  systemPrompt?: string
  capabilities?: string   // JSON array
  constraints?: string    // JSON array
  suggestedCapabilities?: string // JSON array — مقترحة من النظام
  approvalMode: ApprovalMode
  companyId: string
  departmentId?: string
  replacedByEmployeeId?: string  // معرف الموظف اللي استبدالو (لو تم استبدالو)
  replacedAt?: Date              // وقت الاستبدال
  createdAt: Date
  updatedAt: Date
}'''

types_content = types_content.replace(old_ieployee, new_ieployee)

with sftp.open("/home/ubuntu/blivoai-demo/src/types/index.ts", "w") as f:
    f.write(types_content.encode())
print("✓ types/index.ts updated with replacedByEmployeeId")

sftp.close()
client.close()
