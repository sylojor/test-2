"use client"

import { useState, useEffect, useCallback, use, memo } from "react"
import dynamic from "next/dynamic"
import { ThemeToggle } from "@/components/theme-toggle"
import { useDashboardStore } from "@/stores/dashboard-store"
import { t, setLanguage } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import type { ICompany, IEmployee, IDepartment, IProject, DashboardTab } from "@/types"
import { DEMO_COMPANY, DEMO_DEPARTMENTS, DEMO_EMPLOYEES, DEMO_PROJECTS } from "@/lib/demo-data"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, LayoutDashboard, Users, MessagesSquare, Mic, Settings } from "lucide-react"

const Sidebar = dynamic(() => import("@/components/dashboard/sidebar").then(m => ({ default: m.Sidebar })), { ssr: false })
const MainContent = dynamic(() => import("@/components/dashboard/main-content").then(m => ({ default: m.MainContent })), { ssr: false })

interface DemoPageProps { lang: Locale }

const DEMO_MSG: Record<string, string> = {
  ar: "وضع العرض التجريبي — هذا الإجراء للعرض فقط ومحاكاة.\nفي حساب BlivoAI الحقيقي يمكنك تنفيذ هذا الإجراء فعليًا.",
  en: "Demo Mode — This action is read-only and simulated.\nIn a real BlivoAI account, this action can be executed.",
}

function DemoBanner({ lang }: { lang: Locale }) {
  const [open, setOpen] = useState(true)
  const isAr = lang === "ar"
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 relative z-50">
      <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
        <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm text-center">
          {isAr ? "وضع التجربة — أنت تستكشف نسخة محاكاة للعرض فقط. لا يتم تنفيذ أي إجراءات حقيقية." : "Demo Mode — This is a safe simulation. Actions are not executed on real systems."}
        </p>
        <button onClick={() => setOpen(!open)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-xs">{open ? "✕" : "ℹ"}</button>
      </div>
      {open && (
        <p className="text-center text-muted-foreground text-[11px] mt-1 max-w-xl mx-auto">
          {isAr ? "أنت تشاهد بيئة تجريبية آمنة. لا يتم الوصول إلى أي حسابات حقيقية أو مستودعات أو رسائل." : "Safe demo environment. No real accounts, repositories, messages, or actions are affected."}
        </p>
      )}
    </div>
  )
}

function DemoBadge() {
  return (
    <span className="fixed top-3 right-3 z-40 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Demo
    </span>
  )
}

export function DemoPage({ lang }: DemoPageProps) {
  const { activeTab, setActiveTab, setSelectedEmployee, setSelectedDepartment, setSelectedProject, setSelectedEmployeeDetail, hydrate } = useDashboardStore() as any
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const isAr = lang === "ar"
  const company: ICompany = DEMO_COMPANY
  const employees: IEmployee[] = DEMO_EMPLOYEES
  const departments: IDepartment[] = DEMO_DEPARTMENTS
  const projects: IProject[] = DEMO_PROJECTS

  useEffect(() => { setLanguage(lang); hydrate() }, [lang, hydrate])

  useEffect(() => {
    const handler = () => {
      const h = window.location.hash
      if (h.startsWith("#tab=")) {
        const v = h.slice(5)
        if (["chatbot","overview","departments","employees","talk","projects","chat","department-chat","meetings","hr","work-orders","monitor","decisions","requests","token-budget","billing","invoices","settings","employee-detail","access-tokens","available"].includes(v)) {
          setActiveTab(v, true); setSelectedEmployee(null)
        }
      }
    }
    window.addEventListener("popstate", handler)
    return () => window.removeEventListener("popstate", handler)
  }, [setActiveTab, setSelectedEmployee])

  const demoAction = useCallback((nameAr: string, nameEn: string) => {
    toast.info(DEMO_MSG[lang], { duration: 4000 })
  }, [lang])

  const handleLangChange = () => {
    const n = lang === "ar" ? "en" : "ar"
    const h = typeof window !== "undefined" ? window.location.hash : ""
    window.location.href = `/${n}${h}`
  }

  const navItems: { id: DashboardTab; Icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { id: "overview", Icon: LayoutDashboard, label: t("sidebar.overview", lang) },
    { id: "employees", Icon: Users, label: t("sidebar.employees", lang) },
    { id: "department-chat", Icon: MessagesSquare, label: t("sidebar.departmentChat", lang) },
    { id: "talk", Icon: Mic, label: t("sidebar.talk", lang) },
    { id: "settings", Icon: Settings, label: t("sidebar.settings", lang) },
  ]

  return (
    <div className={`h-screen flex flex-col bg-background text-foreground overflow-hidden`} dir={isAr ? "rtl" : "ltr"}>
      <DemoBanner lang={lang} />
      <DemoBadge />
      <div className="flex-1 flex flex-row overflow-hidden">
        <Sidebar
          company={company} employees={employees} departments={departments} projects={projects}
          activeTab={activeTab}
          onTabChange={(tab: string) => { setActiveTab(tab as DashboardTab); setSelectedEmployee(null) }}
          onEmployeeSelect={(id: string) => { setSelectedEmployee(id); setActiveTab("chat" as DashboardTab) }}
          onEmployeeDetail={(id: string) => { setSelectedEmployeeDetail(id); setActiveTab("employee-detail" as DashboardTab) }}
          onDepartmentSelect={(id: string) => { setSelectedDepartment(id); setActiveTab("department-chat" as DashboardTab) }}
          onProjectSelect={(id: string) => { setSelectedProject(id); setActiveTab("projects" as DashboardTab) }}
          onCreateEmployee={() => demoAction("إنشاء موظف", "Create Employee")}
          onCreateDepartment={() => demoAction("إنشاء قسم", "Create Department")}
          onCreateProject={() => demoAction("إنشاء مشروع", "Create Project")}
          onLogout={() => { window.location.href = isAr ? "/ar" : "/en" }}
          mobileOpen={sidebarMobileOpen}
          onMobileOpenChange={setSidebarMobileOpen}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          <div className="hidden md:flex h-12 bg-card/80 border-b border-border items-center justify-between px-3 sm:px-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/logo-v2.png" alt="BlivoAI" className="w-7 h-7 rounded-md hidden sm:block" />
              <span className="text-muted-foreground text-sm truncate">{company.name}</span>
              <span className="text-muted-foreground/60 text-xs hidden sm:inline">({employees.filter((e: any) => e.status === "ACTIVE").length} {t("sidebar.activeEmployees", lang)})</span>
            </div>
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setSelectedEmployee(null) }}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${activeTab === item.id ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  title={item.label} aria-label={item.label}><item.Icon className="w-4 h-4" /></button>
              ))}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-muted-foreground text-xs hidden sm:inline">Demo User</span>
              <ThemeToggle />
              <button onClick={handleLangChange} className="text-muted-foreground hover:text-foreground text-xs px-1.5 py-1 rounded-lg hover:bg-muted transition-all min-h-[44px] min-w-[44px] flex items-center justify-center font-medium">{isAr ? "EN" : "ع"}</button>
              <a href={isAr ? "/ar?signup=true" : "/en?signup=true"} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-medium hover:from-emerald-500 hover:to-emerald-400 transition-all min-h-[44px]">{isAr ? "أنشئ مساحتك" : "Create Workspace"}</a>
            </div>
          </div>
          <div className="md:hidden fixed top-8 left-0 right-0 z-40 flex items-center justify-between px-2 py-2 bg-card/95 border-b border-border backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <button onClick={() => setSidebarMobileOpen(true)} className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"><Menu className="w-5 h-5 text-foreground" /></button>
              <img src="/logo-v2.png" alt="BlivoAI" className="w-7 h-7 rounded-md" />
              <span className="text-foreground text-sm font-medium truncate max-w-[120px]">{company.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button onClick={handleLangChange} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded-lg hover:bg-muted transition-all min-h-[40px] min-w-[40px] flex items-center justify-center font-medium">{isAr ? "EN" : "ع"}</button>
            </div>
          </div>
          <div className="md:hidden h-14" />
          <MainContent
            company={company} employees={employees} departments={departments} projects={projects}
            userId="demo-user" userName="Demo User" isOwner={true}
            onReviewDecision={async () => demoAction("مراجعة قرار", "Review Decision")}
            onRespondToRequest={() => demoAction("الرد على طلب", "Respond to Request")}
            onCreateDepartment={() => demoAction("إنشاء قسم", "Create Department")}
            onCreateProject={() => demoAction("إنشاء مشروع", "Create Project")}
            onUpdateEmployeeDepartment={() => demoAction("نقل موظف", "Move Employee")}
            onDeleteDepartment={() => demoAction("حذف قسم", "Delete Department")}
            onChatWithEmployee={(id: string) => { setSelectedEmployee(id); setActiveTab("chat" as DashboardTab) }}
            onDeleteEmployee={() => demoAction("حذف موظف", "Delete Employee")}
            onReplaceEmployee={() => demoAction("استبدال موظف", "Replace Employee")}
          />
        </div>
      </div>
    </div>
  )
}
