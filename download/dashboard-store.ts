import { create } from "zustand"

export type DashboardTab = 
  | "chatbot" 
  | "overview" 
  | "departments" 
  | "employees" 
  | "employee-detail"
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
  | "access-tokens" 
  | "available" 
  | "payments" 
  | "settings"

export interface DashboardState {
  selectedEmployeeId: string | null
  selectedDepartmentId: string | null
  selectedProjectId: string | null
  selectedEmployeeDetailId: string | null
  sidebarOpen: boolean
  activeTab: DashboardTab
  talkTargetType: "employee" | "department" | "all" | "role" | null
  talkTargetRole: string | null
  departmentChatExpanded: boolean
  departmentChatMaximized: boolean
  
  setSelectedEmployee: (id: string | null) => void
  setSelectedDepartment: (id: string | null) => void
  setSelectedProject: (id: string | null) => void
  setSelectedEmployeeDetail: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setActiveTab: (tab: DashboardTab) => void
  setTalkTarget: (type: "employee" | "department" | "all" | "role" | null, role?: string | null) => void
  setDepartmentChatExpanded: (expanded: boolean) => void
  setDepartmentChatMaximized: (maximized: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedEmployeeId: null,
  selectedDepartmentId: null,
  selectedProjectId: null,
  selectedEmployeeDetailId: null,
  sidebarOpen: true,
  activeTab: "overview",
  talkTargetType: null,
  talkTargetRole: null,
  departmentChatExpanded: true,
  departmentChatMaximized: false,

  setSelectedEmployee: (id) => set({ selectedEmployeeId: id }),
  setSelectedDepartment: (id) => set({ selectedDepartmentId: id }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedEmployeeDetail: (id) => set({ selectedEmployeeDetailId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTalkTarget: (type, role) => set({ talkTargetType: type, talkTargetRole: role || null }),
  setDepartmentChatExpanded: (expanded) => set({ departmentChatExpanded: expanded }),
  setDepartmentChatMaximized: (maximized) => set({ departmentChatMaximized: maximized }),
}))
