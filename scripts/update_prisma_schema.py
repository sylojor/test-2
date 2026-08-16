#!/usr/bin/env python3
"""Phase 1: Add Prisma schema changes for EmployeeAccessToken, EmployeeModelRouting"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()
remote_path = "/home/ubuntu/blivoai-demo/prisma/schema.prisma"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

# 1. Add EmployeeAccessToken model - after Integration model
integration_end = '''  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@map("integrations")
}'''

employee_access_token_model = '''  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@map("integrations")
}

// ============================================
// Employee Access Tokens — per-employee OAuth tokens
// Ahmad (social media manager) gets Instagram + Facebook tokens
// ============================================

model EmployeeAccessToken {
  id            String   @id @default(cuid())
  
  // مين يملك هاد التوكن — الموظف مش الشركة!
  employeeId    String
  employee      Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  // المنصة
  platform      IntegrationPlatform
  
  // التوكنات
  accessToken   String                // OAuth access token
  refreshToken  String?               // OAuth refresh token (لو المنصة بتعطي)
  tokenExpiresAt DateTime?            // تاريخ انتهاء التوكن
  scopes        String?               // JSON array — scopes الممنوحة
  
  // بيانات المنصة
  platformUserId String?              // ID المستخدم على المنصة
  platformName   String?              // اسم المستخدم على المنصة
  platformAvatar String?              // صورة المستخدم على المنصة
  
  // حالة التوكن
  isActive      Boolean  @default(true)
  lastUsedAt    DateTime?             // آخر استخدام
  
  // Preservation: لو الموظف حذف/استبدل → التوكن يضل
  inheritedFromEmployeeId String?     // من موظف سابق ورث التوكن
  inheritedAt   DateTime?             // تاريخ الوراثة
  
  // Metadata
  metadata      String?               // JSON — بيانات إضافية حسب المنصة
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([employeeId, platform])
  @@map("employee_access_tokens")
}

// ============================================
// Employee Model Routing — per-employee per-task model selection
// المصمم بدو صورة → موديل فلاني
// المحاسب بدو قرار → موديل فلاني
// ============================================

model EmployeeModelRouting {
  id          String   @id @default(cuid())
  
  employeeId  String
  employee    Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  // نوع المهمة (CHAT, GENERATION, IMAGE, ANALYSIS, CODE, DECISION...)
  taskType    String
  
  // الموديل المخصص لهاد الموظف لهاد نوع المهمة
  llmModelId  String?
  llmModel    LLMModel? @relation(fields: [llmModelId], references: [id], onDelete: SetNull)
  
  // أولوية الاختيار (أقل = مُفضّل أكثر)
  priority    Int       @default(5)
  
  isActive    Boolean   @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([employeeId, taskType])
  @@map("employee_model_routing")
}'''

content = content.replace(integration_end, employee_access_token_model)

# 2. Update Employee model — add relations and replacedBy fields
old_employee_end = '''  // مهام المشاريع المسندة له
  assignedProjectTasks ProjectTask[]
  workOrderTasks      WorkOrderTask[]  // مهام طلبات العمل
  
  // جلسات الوكيل الذكي
  agentSessions      AgentSession[]
  
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@map("employees")
}'''

new_employee_end = '''  // مهام المشاريع المسندة له
  assignedProjectTasks ProjectTask[]
  workOrderTasks      WorkOrderTask[]  // مهام طلبات العمل
  
  // جلسات الوكيل الذكي
  agentSessions      AgentSession[]
  
  // Employee Access Tokens — per-employee OAuth
  accessTokens      EmployeeAccessToken[]
  
  // Employee Model Routing — per-employee per-task model selection
  modelRoutings     EmployeeModelRouting[]
  
  // Data preservation — when replaced
  replacedByEmployeeId String?        // الموظف الجديد اللي ورث البيانات
  replacedAt    DateTime?             // تاريخ الاستبدال
  
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@map("employees")
}'''

content = content.replace(old_employee_end, new_employee_end)

# 3. Update LLMModel — add relation to EmployeeModelRouting
old_llmmodel_end = '''  // جلسات الوكيل اللي استخدمت هاد الموديل
  agentSessions AgentSession[]'''

new_llmmodel_end = '''  // جلسات الوكيل اللي استخدمت هاد الموديل
  agentSessions AgentSession[]
  
  // Employee Model Routing — per-employee per-task model selection
  employeeModelRoutings EmployeeModelRouting[]'''

content = content.replace(old_llmmodel_end, new_llmmodel_end)

# 4. Expand IntegrationPlatform enum
old_platform_enum = '''enum IntegrationPlatform {
  FACEBOOK
  INSTAGRAM
  TWITTER
  LINKEDIN
  GOOGLE
  TIKTOK
  OTHER
}'''

new_platform_enum = '''enum IntegrationPlatform {
  FACEBOOK
  INSTAGRAM
  TWITTER
  LINKEDIN
  GOOGLE
  TIKTOK
  YOUTUBE
  SNAPCHAT
  WHATSAPP_BUSINESS
  EMAIL         // IMAP/SMTP tokens
  STRIPE        // payment gateway
  SHOPIFY       // e-commerce
  CUSTOM_API    // any custom API
  OTHER
}'''

content = content.replace(old_platform_enum, new_platform_enum)

# 5. Expand RequestType enum — add IMAGE and DECISION
old_request_enum = '''enum RequestType {
  CHAT
  GENERATION
  SUMMARIZATION
  ANALYSIS
  TRANSLATION
  CODE
  OTHER
}'''

new_request_enum = '''enum RequestType {
  CHAT
  GENERATION
  SUMMARIZATION
  ANALYSIS
  TRANSLATION
  CODE
  IMAGE       // image generation (Flux, DALL-E, etc.)
  DECISION    // decision making (smart routing)
  OTHER
}'''

content = content.replace(old_request_enum, new_request_enum)

# Write back
with sftp.open(remote_path, "w") as f:
    f.write(content.encode())

print("Prisma schema updated!")

# Verify
stdin, stdout, stderr = client.exec_command("grep -c 'EmployeeAccessToken' /home/ubuntu/blivoai-demo/prisma/schema.prisma")
print(f"EmployeeAccessToken: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("grep -c 'EmployeeModelRouting' /home/ubuntu/blivoai-demo/prisma/schema.prisma")
print(f"EmployeeModelRouting: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("grep 'CUSTOM_API' /home/ubuntu/blivoai-demo/prisma/schema.prisma | wc -l")
print(f"CUSTOM_API enum: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("grep 'IMAGE' /home/ubuntu/blivoai-demo/prisma/schema.prisma | wc -l")
print(f"IMAGE enum: {stdout.read().decode().strip()}")

sftp.close()
client.close()
