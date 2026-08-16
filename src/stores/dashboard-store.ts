// ============================================
// Zustand Store — حالة الـ Dashboard
// إدارة مركزية لحالة الواجهة — النسخة المحدّثة
// اللغة تأتي من URL (/ar/ أو /en/) — مش من هنا
//
// تحديث: مزامنة التبويب النشط مع URL hash
// عند كل تغيير تبويب → يتم تحديث URL hash
// عند التحميل → يتم قراءة التبويب من URL hash أولاً
// ============================================

import { create } from "zustand"
import type { DashboardTab } from "@/types"

export interface DashboardState {
  selectedEmployeeId: string | null
  selectedDepartmentId: string | null
  selectedProjectId: string | null
  sidebarOpen: boolean
  activeTab: DashboardTab
  hydrated: boolean  // هل تم استعادة الحالة من localStorage
  setSelectedEmployee: (id: string | null) => void
  setSelectedDepartment: (id: string | null) => void
  setSelectedProject: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setActiveTab: (tab: DashboardTab, skipUrlUpdate?: boolean) => void
  hydrate: () => void  // استعادة الحالة من localStorage + URL
}

// تبويبات صالحة — للتأكد من القيمة المقروءة من URL
const VALID_TABS: DashboardTab[] = [
  "chatbot", "overview", "departments", "employees", "talk",
  "projects", "chat", "department-chat", "meetings", "hr",
  "work-orders", "monitor", "decisions", "requests",
  "token-budget", "billing", "settings", "employee-detail",
  "access-tokens", "available",
]

function isValidTab(value: string | null): value is DashboardTab {
  return !!value && VALID_TABS.includes(value as DashboardTab)
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  selectedEmployeeId: null,
  selectedDepartmentId: null,
  selectedProjectId: null,
  sidebarOpen: true,
  activeTab: "overview",
  hydrated: false,

  setSelectedEmployee: (id) => set({ selectedEmployeeId: id }),
  setSelectedDepartment: (id) => set({ selectedDepartmentId: id }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab, skipUrlUpdate?: boolean) => {
    set({ activeTab: tab })
    // حفظ التبويب النشط في localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("blivoai_active_tab", tab)
      } catch {}
      // تحديث URL hash — بدون إعادة تحميل الصفحة
      if (!skipUrlUpdate) {
        try {
          const newHash = `#tab=${tab}`
          // استخدام replaceState عشان ما نضيف سجل جديد للمتصفح
          const newUrl = window.location.pathname + window.location.search + newHash
          window.history.replaceState(null, "", newUrl)
        } catch {}
      }
    }
  },
  hydrate: () => {
    // استعادة التبويب النشط — فقط على الكلاينت
    if (typeof window !== "undefined" && !get().hydrated) {
      try {
        // الأولوية 1: قراءة من URL hash
        let tabFromUrl: DashboardTab | null = null
        const hash = window.location.hash
        if (hash.startsWith("#tab=")) {
          const tabValue = hash.slice(5)
          if (isValidTab(tabValue)) {
            tabFromUrl = tabValue
          }
        }

        // الأولوية 2: قراءة من localStorage
        const savedTab = localStorage.getItem("blivoai_active_tab")
        const savedSidebar = localStorage.getItem("blivoai_sidebar_open")

        const activeTab = tabFromUrl || (isValidTab(savedTab) ? savedTab : "overview")

        set({
          activeTab,
          sidebarOpen: savedSidebar !== null ? savedSidebar === "true" : true,
          hydrated: true,
        })

        // تحديث URL hash لو ما كان موجود
        if (!tabFromUrl && activeTab !== "overview") {
          try {
            const newHash = `#tab=${activeTab}`
            const newUrl = window.location.pathname + window.location.search + newHash
            window.history.replaceState(null, "", newUrl)
          } catch {}
        }
      } catch {
        set({ hydrated: true })
      }
    }
  },
}))
