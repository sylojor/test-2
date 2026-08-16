#!/usr/bin/env python3
"""Task 4 Step 2: Update dashboard-store, types, main-content, sidebar, i18n"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

# ============================================
# 1. Update dashboard-store.ts
# ============================================
with sftp.open("/home/ubuntu/blivoai-demo/src/stores/dashboard-store.ts", "r") as f:
    store_content = f.read().decode()

old_store = '''export interface DashboardState {
  selectedEmployeeId: string | null
  selectedDepartmentId: string | null
  selectedProjectId: string | null
  sidebarOpen: boolean
  activeTab: DashboardTab
  setSelectedEmployee: (id: string | null) => void
  setSelectedDepartment: (id: string | null) => void
  setSelectedProject: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setActiveTab: (tab: DashboardTab) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedEmployeeId: null,
  selectedDepartmentId: null,
  selectedProjectId: null,
  sidebarOpen: true,
  activeTab: "overview",

  setSelectedEmployee: (id) => set({ selectedEmployeeId: id }),
  setSelectedDepartment: (id) => set({ selectedDepartmentId: id }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))'''

new_store = '''export interface DashboardState {
  selectedEmployeeId: string | null
  selectedDepartmentId: string | null
  selectedProjectId: string | null
  selectedEmployeeDetailId: string | null  // معرف الموظف لعرض تفاصيله
  sidebarOpen: boolean
  activeTab: DashboardTab
  setSelectedEmployee: (id: string | null) => void
  setSelectedDepartment: (id: string | null) => void
  setSelectedProject: (id: string | null) => void
  setSelectedEmployeeDetail: (id: string | null) => void  // عرض تفاصيل الموظف
  setSidebarOpen: (open: boolean) => void
  setActiveTab: (tab: DashboardTab) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedEmployeeId: null,
  selectedDepartmentId: null,
  selectedProjectId: null,
  selectedEmployeeDetailId: null,
  sidebarOpen: true,
  activeTab: "overview",

  setSelectedEmployee: (id) => set({ selectedEmployeeId: id }),
  setSelectedDepartment: (id) => set({ selectedDepartmentId: id }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedEmployeeDetail: (id) => set({ selectedEmployeeDetailId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))'''

store_content = store_content.replace(old_store, new_store)

with sftp.open("/home/ubuntu/blivoai-demo/src/stores/dashboard-store.ts", "w") as f:
    f.write(store_content.encode())
print("✓ dashboard-store.ts updated")

# ============================================
# 2. Update types/index.ts — add "employee-detail" to DashboardTab
# ============================================
with sftp.open("/home/ubuntu/blivoai-demo/src/types/index.ts", "r") as f:
    types_content = f.read().decode()

old_tab = '''export type DashboardTab = 
  | "chatbot"
  | "overview"
  | "departments"
  | "employees"
  | "talk"
  | "chat"
  | "department-chat"
  | "meetings"
  | "hr"
  | "work-orders"
  | "monitor"
  | "projects"
  | "decisions"
  | "requests"
  | "token-budget"
  | "settings"'''

new_tab = '''export type DashboardTab = 
  | "chatbot"
  | "overview"
  | "departments"
  | "employees"
  | "employee-detail"
  | "talk"
  | "chat"
  | "department-chat"
  | "meetings"
  | "hr"
  | "work-orders"
  | "monitor"
  | "projects"
  | "decisions"
  | "requests"
  | "token-budget"
  | "settings"'''

types_content = types_content.replace(old_tab, new_tab)

# Also add IntegrationPlatform values to the type
old_int_type = '''// --- منصات التكامل ---
export type IntegrationPlatform = 
  | "FACEBOOK"
  | "INSTAGRAM"
  | "TWITTER"
  | "LINKEDIN"
  | "GOOGLE"
  | "TIKTOK"
  | "OTHER"'''

new_int_type = '''// --- منصات التكامل ---
export type IntegrationPlatform = 
  | "FACEBOOK"
  | "INSTAGRAM"
  | "TWITTER"
  | "LINKEDIN"
  | "GOOGLE"
  | "TIKTOK"
  | "YOUTUBE"
  | "SNAPCHAT"
  | "WHATSAPP_BUSINESS"
  | "EMAIL"
  | "STRIPE"
  | "SHOPIFY"
  | "CUSTOM_API"
  | "OTHER"'''

types_content = types_content.replace(old_int_type, new_int_type)

with sftp.open("/home/ubuntu/blivoai-demo/src/types/index.ts", "w") as f:
    f.write(types_content.encode())
print("✓ types/index.ts updated")

# ============================================
# 3. Update main-content.tsx — handle employee-detail tab
# ============================================
with sftp.open("/home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx", "r") as f:
    mc_content = f.read().decode()

# Add import for EmployeeDetailPanel
old_imports = '''import { ChatbotPanel } from "@/components/dashboard/chatbot-panel"
import type { ICompany, IEmployee, IDepartment, IProject } from "@/types"'''

new_imports = '''import { ChatbotPanel } from "@/components/dashboard/chatbot-panel"
import { EmployeeDetailPanel } from "@/components/dashboard/employee-detail-panel"
import type { ICompany, IEmployee, IDepartment, IProject } from "@/types"'''

mc_content = mc_content.replace(old_imports, new_imports)

# Update the destructuring of useDashboardStore to include selectedEmployeeDetailId
old_destructure = '''const { selectedEmployeeId, selectedDepartmentId, activeTab } = useDashboardStore()'''

new_destructure = '''const { selectedEmployeeId, selectedDepartmentId, activeTab, selectedEmployeeDetailId } = useDashboardStore()'''

mc_content = mc_content.replace(old_destructure, new_destructure)

# Add employee-detail case in the switch
old_employees_case = '''    case "employees":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <EmployeesPanel
            employees={employees}
            departments={departments}
            onUpdateEmployeeDepartment={onUpdateEmployeeDepartment}
          />
        </main>
      )'''

new_employees_case = '''    case "employees":
      // لو في موظف مختار للتفاصيل — عرض لوحة التفاصيل
      if (selectedEmployeeDetailId) {
        const detailEmployee = employees.find(e => e.id === selectedEmployeeDetailId)
        if (detailEmployee) {
          return (
            <main className="flex-1 overflow-y-auto w-full">
              <EmployeeDetailPanel
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
      )
    case "employee-detail":
      if (selectedEmployeeDetailId) {
        const detailEmployee = employees.find(e => e.id === selectedEmployeeDetailId)
        if (detailEmployee) {
          return (
            <main className="flex-1 overflow-y-auto w-full">
              <EmployeeDetailPanel
                employee={detailEmployee}
                departments={departments}
                company={company}
              />
            </main>
          )
        }
      }
      // fallback — لو ما في موظف مختار
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <EmployeesPanel
            employees={employees}
            departments={departments}
            onUpdateEmployeeDepartment={onUpdateEmployeeDepartment}
          />
        </main>
      )'''

mc_content = mc_content.replace(old_employees_case, new_employees_case)

with sftp.open("/home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx", "w") as f:
    f.write(mc_content.encode())
print("✓ main-content.tsx updated")

# ============================================
# 4. Update sidebar.tsx — add detail view trigger on employee click
# ============================================
with sftp.open("/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx", "r") as f:
    sidebar_content = f.read().decode()

# Change the employee button click to also set the detail view
old_employee_button = '''              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleEmployeeSelect(emp.id)}
                  className="w-full text-right p-3 rounded-lg bg-white/3 hover:bg-white/8 transition-all group min-h-[44px]"
                >'''

new_employee_button = '''              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    handleEmployeeSelect(emp.id)
                    // عرض تفاصيل الموظف — الضغط على اسم الموظف يفتح لوحة التفاصيل
                    useDashboardStore.getState().setSelectedEmployeeDetail(emp.id)
                    useDashboardStore.getState().setActiveTab("employee-detail")
                  }}
                  className="w-full text-right p-3 rounded-lg bg-white/3 hover:bg-white/8 transition-all group min-h-[44px]"
                >'''

sidebar_content = sidebar_content.replace(old_employee_button, new_employee_button)

with sftp.open("/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx", "w") as f:
    f.write(sidebar_content.encode())
print("✓ sidebar.tsx updated")

# ============================================
# 5. Update i18n.ts — add new keys for employee detail
# ============================================
with sftp.open("/home/ubuntu/blivoai-demo/src/lib/i18n.ts", "r") as f:
    i18n_content = f.read().decode()

# Arabic keys
old_employees_ar = '''    "employees.freeMode": "وضع مجاني",'''

new_employees_ar = '''    "employees.freeMode": "وضع مجاني",
    "employeeDetail.back": "رجوع للموظفين",
    "employeeDetail.accessTokens": "توكنات الوصول",
    "employeeDetail.modelRouting": "توجيه الموديلات",
    "employeeDetail.tokenBudget": "ميزانية التوكنات",
    "employeeDetail.noTokens": "لا يوجد منصات مربوطة — أضف توكن وصول لربط الموظف بمنصة",
    "employeeDetail.noRoutings": "لا يوجد توجيهات — الموظف يستخدم الموديل الافتراضي",
    "employeeDetail.defaultModel": "الموديل الافتراضي",
    "employeeDetail.used": "المستخدم",
    "employeeDetail.totalBudget": "الميزانية الكلية",
    "employeeDetail.inherited": "وراثة",
    "employeeDetail.replaced": "⚠️ هذا الموظف تم استبداله",'''

i18n_content = i18n_content.replace(old_employees_ar, new_employees_ar)

# English keys
old_employees_en = '''    "employees.freeMode": "Free mode",'''

new_employees_en = '''    "employees.freeMode": "Free mode",
    "employeeDetail.back": "Back to Employees",
    "employeeDetail.accessTokens": "Access Tokens",
    "employeeDetail.modelRouting": "Model Routing",
    "employeeDetail.tokenBudget": "Token Budget",
    "employeeDetail.noTokens": "No platforms linked — add an access token to connect the employee to a platform",
    "employeeDetail.noRoutings": "No routings — employee uses the default model",
    "employeeDetail.defaultModel": "Default model",
    "employeeDetail.used": "Used",
    "employeeDetail.totalBudget": "Total budget",
    "employeeDetail.inherited": "Inherited",
    "employeeDetail.replaced": "⚠️ This employee has been replaced",'''

i18n_content = i18n_content.replace(old_employees_en, new_employees_en)

with sftp.open("/home/ubuntu/blivoai-demo/src/lib/i18n.ts", "w") as f:
    f.write(i18n_content.encode())
print("✓ i18n.ts updated with employee detail keys")

sftp.close()
client.close()
print("\nTask 4 complete: All UI files updated")
