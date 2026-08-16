#!/usr/bin/env python3
"""Fix main-content.tsx JSX and add EmployeeDetailPanel properly"""
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

# Fix 1: Remove the broken employee-detail code inside "employees" case
# The employees case should just show EmployeesPanel, not EmployeeDetailPanel
broken_employees_block = '''    case "employees":
      // لو في موظف مختار للتفاصيل — عرض لوحة التفاصيل
      if (selectedEmployeeDetailId) {
        const detailEmployee = employees.find(e => e.id === selectedEmployeeDetailId)
        if (detailEmployee) {
          return (
            <main className="flex-1 overflow-y-auto w-full">
                employee={detailEmployee}
                departments={departments}
                company={company}
              />
            </main>
          )
        }
      }
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <EmployeesPanel
            employees={employees}
            departments={departments}
            onUpdateEmployeeDepartment={onUpdateEmployeeDepartment}
          />
        </main>
      )'''

clean_employees_block = '''    case "employees":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <EmployeesPanel
            employees={employees}
            departments={departments}
            onUpdateEmployeeDepartment={onUpdateEmployeeDepartment}
          />
        </main>
      )'''

content = content.replace(broken_employees_block, clean_employees_block)

# Fix 2: Make sure employee-detail case has proper EmployeeDetailPanel JSX
broken_detail_case = '''    case "employee-detail":
      if (selectedEmployeeDetailId) {
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
      }
      // fallback — لو ما في موظف مختار
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <EmployeesPanel'''

# This might not exist anymore since we removed one. Let me check what the current employee-detail case looks like
# Search for the current version
import re
pattern = r'case "employee-detail":.*?(?=case|default)'
match = re.search(pattern, content, re.DOTALL)
if match:
    print(f"Found employee-detail case block: {match.group()[:200]}")

# Let me just replace any remaining broken detail case with a proper one
# First, let's find all "case employee-detail" occurrences
lines = content.split('\n')
case_indices = [i for i, line in enumerate(lines) if line.strip() == 'case "employee-detail":']
print(f"employee-detail cases found at lines: {case_indices}")

if len(case_indices) > 0:
    # Keep only one proper case
    proper_case = '''    case "employee-detail":
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
      return null'''

    # Remove ALL employee-detail cases and add one proper one before default
    # Find the "default:" line and add before it
    new_lines = []
    skip_until_next_case = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == 'case "employee-detail":':
            skip_until_next_case = True
            continue
        if skip_until_next_case:
            if stripped.startswith('case ') or stripped == 'default:':
                skip_until_next_case = False
                # Add the proper case before this line
                if stripped == 'default:':
                    new_lines.append(proper_case)
                new_lines.append(line)
            continue
        new_lines.append(line)
    
    content = '\n'.join(new_lines)

with sftp.open(remote_path, "w") as f:
    f.write(content.encode())
print("main-content.tsx fully fixed!")

# Fix 3: Check token-inheritance.ts - remove nonexistent export
remote_inheritance = "/home/ubuntu/blivoai-demo/src/lib/token-inheritance.ts"
with sftp.open(remote_inheritance, "r") as f:
    inh_content = f.read().decode()

# The replace route imports replaceEmployeeWithInheritance and softDeleteEmployee
# but our file only has inheritTokensToReplacement and replaceEmployee
# Let me add those exports
old_exports = '''export async function replaceEmployee(
  oldEmployeeId: string,
  newEmployeeId: string
): Promise<void> {'''

new_exports = '''// Alias for API route compatibility
export async function replaceEmployeeWithInheritance(
  oldEmployeeId: string,
  newEmployeeId: string
): Promise<void> {
  return replaceEmployee(oldEmployeeId, newEmployeeId)
}

export async function softDeleteEmployee(employeeId: string): Promise<void> {
  await db.employee.update({
    where: { id: employeeId },
    data: { status: "DELETED" },
  })
  // Deactivate all tokens
  await db.employeeAccessToken.updateMany({
    where: { employeeId, isActive: true },
    data: { isActive: false },
  })
}

export async function replaceEmployee(
  oldEmployeeId: string,
  newEmployeeId: string
): Promise<void> {'''

inh_content = inh_content.replace(old_exports, new_exports)

with sftp.open(remote_inheritance, "w") as f:
    f.write(inh_content.encode())
print("token-inheritance.ts exports added!")

# Verify
stdin, stdout, stderr = client.exec_command("grep -c 'EmployeeDetailPanel' /home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx")
print(f"EmployeeDetailPanel count: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("grep -c 'case \"employee-detail\"' /home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx")
print(f"employee-detail cases: {stdout.read().decode().strip()}")

sftp.close()
client.close()
