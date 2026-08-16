#!/usr/bin/env python3
"""Task 1: Prisma Schema Changes - Add EmployeeAccessToken, EmployeeModelRouting, update Employee/LLMModel, expand enums"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

# Read current schema
with sftp.open("/home/ubuntu/blivoai-demo/prisma/schema.prisma", "r") as f:
    content = f.read().decode()

# === 1. Expand IntegrationPlatform enum ===
old_enum = """enum IntegrationPlatform {
  FACEBOOK
  INSTAGRAM
  TWITTER
  LINKEDIN
  GOOGLE
  TIKTOK
  OTHER
}"""

new_enum = """enum IntegrationPlatform {
  FACEBOOK
  INSTAGRAM
  TWITTER
  LINKEDIN
  GOOGLE
  TIKTOK
  YOUTUBE
  SNAPCHAT
  WHATSAPP_BUSINESS
  EMAIL
  STRIPE
  SHOPIFY
  CUSTOM_API
  OTHER
}"""

content = content.replace(old_enum, new_enum)

# === 2. Expand RequestType enum ===
old_request = """enum RequestType {
  CHAT          // محادثة عادية
  GENERATION    // توليد محتوى
  SUMMARIZATION // تلخيص
  ANALYSIS      // تحليل
  TRANSLATION   // ترجمة
  CODE          // كتابة كود
  OTHER         // نوع آخر
}"""

new_request = """enum RequestType {
  CHAT          // محادثة عادية
  GENERATION    // توليد محتوى
  IMAGE         // توليد صور
  SUMMARIZATION // تلخيص
  ANALYSIS      // تحليل
  TRANSLATION   // ترجمة
  CODE          // كتابة كود
  DECISION      // اتخاذ قرار
  OTHER         // نوع آخر
}"""

content = content.replace(old_request, new_request)

# === 3. Update Employee model - add new relations ===
# Find the Employee model closing section and add new fields
old_employee_relations = """  // جلسات الوكيل الذكي
  agentSessions      AgentSession[]
  
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@map("employees")
}"""

new_employee_relations = """  // جلسات الوكيل الذكي
  agentSessions      AgentSession[]
  
  // توكنات الوصول — كل موظف له توكنات OAuth لمنصات مختلفة
  accessTokens      EmployeeAccessToken[]
  
  // توجيه الموديلات — كل موظف ممكن يختار موديل لكل نوع مهمة
  modelRoutings     EmployeeModelRouting[]
  
  // استبدال الموظف — لو تم استبداله بموظف آخر
  replacedByEmployeeId String?
  replacedAt        DateTime?
  
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@map("employees")
}"""

content = content.replace(old_employee_relations, new_employee_relations)

# === 4. Update LLMModel model - add relation ===
old_llm_model = """  // جلسات الوكيل اللي استخدمت هاد الموديل
  agentSessions AgentSession[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("llm_models")
}"""

new_llm_model = """  // جلسات الوكيل اللي استخدمت هاد الموديل
  agentSessions AgentSession[]
  
  // توجيه الموظفين — الموظفين اللي اختاروا هاد الموديل لمهامهم
  employeeModelRoutings EmployeeModelRouting[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("llm_models")
}"""

content = content.replace(old_llm_model, new_llm_model)

# === 5. Add EmployeeAccessToken model (before AgentSession) ===
# Insert the new models right before the AgentSession section
agent_session_section = """// ============================================
// جلسات الوكيل الذكي (Agent Sessions)
// كل ما الموظف يحتاج ذكاء → تنفتح جلسة
// الوكيل يشتغل → السيرفر يراجع → يوافق/يرفض
// المشترك ما يشوف هاد — يشوف إنو الموظف يشتغل
// ============================================

model AgentSession {"""

new_models_before_agent = """// ============================================
// توكنات الوصول للموظفين (Employee Access Tokens)
// كل موظف ممكن يربط حساباته على المنصات المختلفة
// المنصة بيستخدم هاد التوكنات للتكامل مع المنصات
// ============================================

model EmployeeAccessToken {
  id            String   @id @default(cuid())
  employeeId    String
  employee      Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  platform      IntegrationPlatform
  accessToken   String
  refreshToken  String?
  tokenExpiresAt DateTime?
  scopes        String?
  platformUserId String?
  platformName   String?
  platformAvatar String?
  isActive      Boolean  @default(true)
  lastUsedAt    DateTime?
  inheritedFromEmployeeId String?   // لو التوكن ورثته من موظف استبدل
  inheritedAt   DateTime?
  metadata      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@unique([employeeId, platform])
  @@map("employee_access_tokens")
}

// ============================================
// توجيه الموديلات للموظفين (Employee Model Routing)
// كل موظف ممكن يختار موديل مختلف لكل نوع مهمة
// مثلاً: الموظف المبرمج يختار موديل قوي للكود
// و الموظف المدير يختار موديل سريع للترجمة
// ============================================

model EmployeeModelRouting {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  taskType    String    // CHAT, GENERATION, IMAGE, ANALYSIS, CODE, DECISION, TRANSLATION, SUMMARIZATION
  llmModelId  String?
  llmModel    LLMModel? @relation(fields: [llmModelId], references: [id], onDelete: SetNull)
  priority    Int       @default(5) // أقل = مُفضّل أكثر
  isActive    Boolean   @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@unique([employeeId, taskType])
  @@map("employee_model_routing")
}

""" + agent_session_section

content = content.replace(agent_session_section, new_models_before_agent)

# Write back
with sftp.open("/home/ubuntu/blivoai-demo/prisma/schema.prisma", "w") as f:
    f.write(content.encode())

print("Schema updated successfully!")

# Verify key changes
for check in [
    "EmployeeAccessToken",
    "EmployeeModelRouting",
    "YOUTUBE",
    "SNAPCHAT",
    "WHATSAPP_BUSINESS",
    "EMAIL",
    "STRIPE",
    "SHOPIFY",
    "CUSTOM_API",
    "IMAGE",
    "DECISION",
    "accessTokens      EmployeeAccessToken[]",
    "modelRoutings     EmployeeModelRouting[]",
    "replacedByEmployeeId",
    "replacedAt",
    "employeeModelRoutings EmployeeModelRouting[]",
]:
    if check in content:
        print(f"  ✓ Found: {check}")
    else:
        print(f"  ✗ MISSING: {check}")

sftp.close()
client.close()
