#!/usr/bin/env python3
"""Upload employee-detail-panel.tsx to server and update related files"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()

# Upload employee-detail-panel.tsx
local_path = "/home/z/my-project/scripts/employee-detail-panel.tsx"
remote_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/employee-detail-panel.tsx"
with open(local_path, "r") as f:
    content = f.read()

with sftp.open(remote_path, "w") as f:
    f.write(content.encode())
print("employee-detail-panel.tsx uploaded!")

# Update dashboard-store to add employee-detail tab
remote_store = "/home/ubuntu/blivoai-demo/src/stores/dashboard-store.ts"
with sftp.open(remote_store, "r") as f:
    store_content = f.read().decode()

# Add selectedEmployeeDetailId to store
old_state = '''export interface DashboardState {
  selectedEmployeeId: string | null
  selectedDepartmentId: string | null
  selectedProjectId: string | null
  sidebarOpen: boolean
  activeTab: DashboardTab
  setSelectedEmployee: (id: string | null) => void'''

new_state = '''export interface DashboardState {
  selectedEmployeeId: string | null
  selectedDepartmentId: string | null
  selectedProjectId: string | null
  selectedEmployeeDetailId: string | null
  sidebarOpen: boolean
  activeTab: DashboardTab
  setSelectedEmployee: (id: string | null) => void
  setSelectedEmployeeDetail: (id: string | null) => void'''

store_content = store_content.replace(old_state, new_state)

# Add state field and setter
old_initial = '''  selectedEmployeeId: null,
  selectedDepartmentId: null,
  selectedProjectId: null,
  sidebarOpen: true,
  activeTab: "overview",

  setSelectedEmployee: (id) => set({ selectedEmployeeId: id }),'''

new_initial = '''  selectedEmployeeId: null,
  selectedDepartmentId: null,
  selectedProjectId: null,
  selectedEmployeeDetailId: null,
  sidebarOpen: true,
  activeTab: "overview",

  setSelectedEmployee: (id) => set({ selectedEmployeeId: id }),
  setSelectedEmployeeDetail: (id) => set({ selectedEmployeeDetailId: id }),'''

store_content = store_content.replace(old_initial, new_initial)

with sftp.open(remote_store, "w") as f:
    f.write(store_content.encode())
print("dashboard-store updated!")

# Update types/index.ts - add employee-detail to DashboardTab
remote_types = "/home/ubuntu/blivoai-demo/src/types/index.ts"
with sftp.open(remote_types, "r") as f:
    types_content = f.read().decode()

old_tab = '''export type DashboardTab = 
  | "chatbot"
  | "overview"
  | "departments"
  | "employees"
  | "talk"
  | "projects"
  | "chat"
  | "department-chat"
  | "meetings"
  | "hr"
  | "work-orders"
  | "monitor"
  | "decisions"
  | "requests"
  | "token-budget"
  | "settings"'''

new_tab = '''export type DashboardTab = 
  | "chatbot"
  | "overview"
  | "departments"
  | "employees"
  | "talk"
  | "projects"
  | "chat"
  | "department-chat"
  | "meetings"
  | "hr"
  | "work-orders"
  | "monitor"
  | "decisions"
  | "requests"
  | "token-budget"
  | "settings"
  | "employee-detail"'''

types_content = types_content.replace(old_tab, new_tab)

with sftp.open(remote_types, "w") as f:
    f.write(types_content.encode())
print("types updated!")

# Update main-content.tsx to handle employee-detail tab
remote_main = "/home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx"
with sftp.open(remote_main, "r") as f:
    main_content = f.read().decode()

# Add import for EmployeeDetailPanel
old_import = '''import { ChatbotPanel } from "@/components/dashboard/chatbot-panel"'''

new_import = '''import { ChatbotPanel } from "@/components/dashboard/chatbot-panel"
import { EmployeeDetailPanel } from "@/components/dashboard/employee-detail-panel"'''

main_content = main_content.replace(old_import, new_import)

# Add employee-detail case in the switch
old_switch_end = '''    case "settings":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <SettingsPanel company={company} />
        </main>
      )
    default:
      return null'''

new_switch_end = '''    case "settings":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <SettingsPanel company={company} />
        </main>
      )
    case "employee-detail":
      const detailEmployee = employees.find(e => e.id === selectedEmployeeId || e.id === selectedEmployeeDetailId)
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
    default:
      return null'''

main_content = main_content.replace(old_switch_end, new_switch_end)

# Add selectedEmployeeDetailId from store
old_store_use = '''  const { selectedEmployeeId, selectedDepartmentId, activeTab } = useDashboardStore()'''

new_store_use = '''  const { selectedEmployeeId, selectedDepartmentId, selectedEmployeeDetailId, activeTab } = useDashboardStore()'''

main_content = main_content.replace(old_store_use, new_store_use)

# Add setActiveTab from store
old_active_tab = '''  const { selectedEmployeeId, selectedDepartmentId, selectedEmployeeDetailId, activeTab } = useDashboardStore()'''

new_active_tab = '''  const { selectedEmployeeId, selectedDepartmentId, selectedEmployeeDetailId, activeTab, setActiveTab } = useDashboardStore()'''

main_content = main_content.replace(old_active_tab, new_active_tab)

with sftp.open(remote_main, "w") as f:
    f.write(main_content.encode())
print("main-content updated!")

# Update sidebar to navigate to employee detail when clicking employee name
remote_sidebar = "/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx"
with sftp.open(remote_sidebar, "r") as f:
    sidebar_content = f.read().decode()

# Add setSelectedEmployeeDetail import/proxy in sidebar
old_sidebar_props = '''interface SidebarProps {
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  projects: IProject[]
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onEmployeeSelect: (id: string) => void'''

new_sidebar_props = '''interface SidebarProps {
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  projects: IProject[]
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onEmployeeSelect: (id: string) => void
  onEmployeeDetail: (id: string) => void'''

sidebar_content = sidebar_content.replace(old_sidebar_props, new_sidebar_props)

# Add prop to SidebarContent
old_content_props = '''}: SidebarProps & { onMobileClose?: () => void }) {'''

new_content_props = '''}: SidebarProps & { onMobileClose?: () => void; onEmployeeDetail?: (id: string) => void }) {'''

sidebar_content = sidebar_content.replace(old_content_props, new_content_props)

# Update employee button to add a detail view option (name click goes to detail, not chat)
old_employee_button = '''                <button
                  key={emp.id}
                  onClick={() => handleEmployeeSelect(emp.id)}
                  className="w-full text-right p-3 rounded-lg bg-white/3 hover:bg-white/8 transition-all group min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: emp.avatarColor || "#10b981" }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-slate-500 text-xs truncate">{emp.role}</p>
                    </div>'''

new_employee_button = '''                <button
                  key={emp.id}
                  onClick={() => onEmployeeDetail?.(emp.id) || handleEmployeeSelect(emp.id)}
                  className="w-full text-right p-3 rounded-lg bg-white/3 hover:bg-white/8 transition-all group min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: emp.avatarColor || "#10b981" }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-slate-500 text-xs truncate">{emp.role}</p>
                    </div>'''

sidebar_content = sidebar_content.replace(old_employee_button, new_employee_button)

# Pass onEmployeeDetail in Sidebar component
old_sidebar_component_props = '''export function Sidebar({
  company,
  employees,
  departments,
  projects,
  activeTab,
  onTabChange,
  onEmployeeSelect,
  onDepartmentSelect,
  onProjectSelect,
  onCreateEmployee,
  onCreateDepartment,
  onCreateProject,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {'''

new_sidebar_component_props = '''export function Sidebar({
  company,
  employees,
  departments,
  projects,
  activeTab,
  onTabChange,
  onEmployeeSelect,
  onDepartmentSelect,
  onProjectSelect,
  onCreateEmployee,
  onCreateDepartment,
  onCreateProject,
  onEmployeeDetail,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {'''

sidebar_content = sidebar_content.replace(old_sidebar_component_props, new_sidebar_component_props)

# Add onEmployeeDetail to SidebarContent calls (both desktop and mobile)
old_desktop_content = '''        <SidebarContent
          company={company}
          employees={employees}
          departments={departments}
          projects={projects}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onEmployeeSelect={onEmployeeSelect}
          onDepartmentSelect={onDepartmentSelect}
          onProjectSelect={onProjectSelect}
          onCreateEmployee={onCreateEmployee}
          onCreateDepartment={onCreateDepartment}
          onCreateProject={onCreateProject}
        />
      </aside>'''

new_desktop_content = '''        <SidebarContent
          company={company}
          employees={employees}
          departments={departments}
          projects={projects}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onEmployeeSelect={onEmployeeSelect}
          onDepartmentSelect={onDepartmentSelect}
          onProjectSelect={onProjectSelect}
          onCreateEmployee={onCreateEmployee}
          onCreateDepartment={onCreateDepartment}
          onCreateProject={onCreateProject}
          onEmployeeDetail={onEmployeeDetail}
        />
      </aside>'''

sidebar_content = sidebar_content.replace(old_desktop_content, new_desktop_content)

# Mobile sidebar content
old_mobile_content = '''            <SidebarContent
              company={company}
              employees={employees}
              departments={departments}
              projects={projects}
              activeTab={activeTab}
              onTabChange={onTabChange}
              onEmployeeSelect={onEmployeeSelect}
              onDepartmentSelect={onDepartmentSelect}
              onProjectSelect={onProjectSelect}
              onCreateEmployee={onCreateEmployee}
              onCreateDepartment={onCreateDepartment}
              onCreateProject={onCreateProject}
              onMobileClose={handleMobileClose}'''

new_mobile_content = '''            <SidebarContent
              company={company}
              employees={employees}
              departments={departments}
              projects={projects}
              activeTab={activeTab}
              onTabChange={onTabChange}
              onEmployeeSelect={onEmployeeSelect}
              onDepartmentSelect={onDepartmentSelect}
              onProjectSelect={onProjectSelect}
              onCreateEmployee={onCreateEmployee}
              onCreateDepartment={onCreateDepartment}
              onCreateProject={onCreateProject}
              onEmployeeDetail={onEmployeeDetail}
              onMobileClose={handleMobileClose}'''

sidebar_content = sidebar_content.replace(old_mobile_content, new_mobile_content)

with sftp.open(remote_sidebar, "w") as f:
    f.write(sidebar_content.encode())
print("sidebar updated!")

# Update page.tsx to add onEmployeeDetail handler
remote_page = "/home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx"
with sftp.open(remote_page, "r") as f:
    page_content = f.read().decode()

# Add onEmployeeDetail handler
old_handle_chat = '''  // ============================================
  // محادثة مع موظف
  // ============================================
  const handleChatWithEmployee = (employeeId: string) => {
    setSelectedEmployee(employeeId)
    setActiveTab("chat" as DashboardTab)
  }'''

new_handle_chat = '''  // ============================================
  // محادثة مع موظف
  // ============================================
  const handleChatWithEmployee = (employeeId: string) => {
    setSelectedEmployee(employeeId)
    setActiveTab("chat" as DashboardTab)
  }

  // ============================================
  // عرض تفاصيل الموظف
  // ============================================
  const handleEmployeeDetail = (employeeId: string) => {
    setSelectedEmployeeDetail(employeeId)
    setActiveTab("employee-detail" as DashboardTab)
  }'''

page_content = page_content.replace(old_handle_chat, new_handle_chat)

# Add setSelectedEmployeeDetail import
old_store_import = '''  const { activeTab, setActiveTab, setSelectedEmployee, setSelectedDepartment, setSelectedProject } = useDashboardStore()'''

new_store_import = '''  const { activeTab, setActiveTab, setSelectedEmployee, setSelectedDepartment, setSelectedProject, setSelectedEmployeeDetail } = useDashboardStore()'''

page_content = page_content.replace(old_store_import, new_store_import)

# Add onEmployeeDetail to Sidebar
old_sidebar_call = '''      <Sidebar
        company={appState.company}
        employees={appState.employees}
        departments={appState.departments}
        projects={appState.projects}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as DashboardTab)
          setSelectedEmployee(null)
        }}
        onEmployeeSelect={(id) => {
          setSelectedEmployee(id)
          setActiveTab("chat" as DashboardTab)
        }}
        onDepartmentSelect={(id) => {
          setSelectedDepartment(id)
          setActiveTab("department-chat" as DashboardTab)
        }}
        onProjectSelect={(id) => {
          setSelectedProject(id)
          setActiveTab("projects" as DashboardTab)
        }}
        onCreateEmployee={() => setShowCreateEmployee(true)}
        onCreateDepartment={() => setShowCreateDepartment(true)}
        onCreateProject={() => setShowCreateProject(true)}'''

new_sidebar_call = '''      <Sidebar
        company={appState.company}
        employees={appState.employees}
        departments={appState.departments}
        projects={appState.projects}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as DashboardTab)
          setSelectedEmployee(null)
        }}
        onEmployeeSelect={(id) => {
          setSelectedEmployee(id)
          setActiveTab("chat" as DashboardTab)
        }}
        onEmployeeDetail={(id) => {
          setSelectedEmployeeDetail(id)
          setActiveTab("employee-detail" as DashboardTab)
        }}
        onDepartmentSelect={(id) => {
          setSelectedDepartment(id)
          setActiveTab("department-chat" as DashboardTab)
        }}
        onProjectSelect={(id) => {
          setSelectedProject(id)
          setActiveTab("projects" as DashboardTab)
        }}
        onCreateEmployee={() => setShowCreateEmployee(true)}
        onCreateDepartment={() => setShowCreateDepartment(true)}
        onCreateProject={() => setShowCreateProject(true)}'''

page_content = page_content.replace(old_sidebar_call, new_sidebar_call)

with sftp.open(remote_page, "w") as f:
    f.write(page_content.encode())
print("page.tsx updated!")

sftp.close()
client.close()
