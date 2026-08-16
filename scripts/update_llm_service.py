#!/usr/bin/env python3
"""Add smart model routing to llm-service.ts"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()
remote_path = "/home/ubuntu/blivoai-demo/src/lib/llm-service.ts"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

# Add smart model routing function after the existing getLLMConfig function
old_get_config_end = '''  return { provider, apiKey, baseUrl, models }
}'''

new_get_config_end = '''  return { provider, apiKey, baseUrl, models }
}

// ============================================
// Smart Model Routing — per-employee per-task
// Priority: Employee-specific > Company default > Global tier
// ============================================

export async function getSmartModelForEmployee(
  employeeId: string,
  taskType: RequestType,
): Promise<LLMModel | null> {
  try {
    const db = await getDb()
    if (!db) return null
    
    // Check if employee has a specific routing for this task type
    const routing = await db.employeeModelRouting.findUnique({
      where: { employeeId_taskType: { employeeId, taskType } },
      include: { llmModel: true },
    })
    
    if (routing?.llmModel && routing.isActive && routing.llmModel.isActive) {
      console.log(`[SMART_ROUTING] Employee ${employeeId} → ${routing.llmModel.name} for ${taskType}`)
      return routing.llmModel
    }
    
    // Fallback: No employee-specific routing → use global tier system
    return null
  } catch (error) {
    console.warn("[SMART_ROUTING_ERROR]", error)
    return null
  }
}'''

content = content.replace(old_get_config_end, new_get_config_end)

with sftp.open(remote_path, "w") as f:
    f.write(content.encode())
print("llm-service.ts updated with smart model routing!")

# Verify
stdin, stdout, stderr = client.exec_command(f"grep -c 'getSmartModelForEmployee' {remote_path}")
print(f"getSmartModelForEmployee count: {stdout.read().decode().strip()}")

sftp.close()
client.close()
