"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { ThemeToggle } from "@/components/theme-toggle"
import { useDashboardStore } from "@/stores/dashboard-store"
import { t, setLanguage } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import type { ICompany, IEmployee, IDepartment, IProject, DashboardTab } from "@/types"
import { DEMO_COMPANY, DEMO_DEPARTMENTS, DEMO_EMPLOYEES, DEMO_PROJECTS } from "@/lib/demo-data"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, LayoutDashboard, Users, MessagesSquare, Mic, Settings, Briefcase, ClipboardList, BarChart3, Bell, Key } from "lucide-react"
import { installDemoFetchInterceptor, uninstallDemoFetchInterceptor, setDemoLang } from "@/lib/demo-fetch-interceptor"

const Sidebar = dynamic(() => import("@/components/dashboard/sidebar").then(m => ({ default: m.Sidebar })), { ssr: false })
const MainContent = dynamic(() => import("@/components/dashboard/main-content").then(m => ({ default: m.MainContent })), { ssr: false })

interface DemoPageProps { lang: Locale }

// User's exact required messages
const DEMO_READONLY_MSG: Record<string, string> = {
  ar: "\u0648\u0636\u0639 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062a\u062c\u0631\u064a\u0628\u064a \u2014 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0645\u062a\u0627\u062d \u0641\u064a \u0627\u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u0631\u0633\u0645\u064a \u0641\u0642\u0637\u060c \u0648\u0644\u0646 \u064a\u062a\u0645 \u062a\u0646\u0641\u064a\u0630 \u0623\u064a \u062a\u063a\u064a\u064a\u0631 \u0641\u0639\u0644\u064a \u0647\u0646\u0627.",
  en: "Demo Mode \u2014 This action is available in the official account and will not be executed in this demo.",
}

function DemoBanner({ lang }: { lang: Locale }) {
  const isAr = lang === "ar"
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 relative z-50">
      <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
        <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-medium">
          {isAr ? "\u0648\u0636\u0639 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062a\u062c\u0631\u064a\u0628\u064a" : "Demo Mode"}
          <span className="mx-2 text-amber-500/50">|</span>
          <span className="font-normal text-amber-600 dark:text-amber-400">
            {isAr
              ? "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u062a\u062c\u0631\u064a\u0628\u064a\u0629 \u0648\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u063a\u064a\u0631 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062a\u0646\u0641\u064a\u0630"
              : "Sample data \u2014 actions are not executed"}
          </span>
        </p>
      </div>
    </div>
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

  // Install fetch interceptor and set language
  useEffect(() => {
    setLanguage(lang)
    setDemoLang(lang)
    hydrate()
    installDemoFetchInterceptor()
    // Set store values needed by some panels (API keys, billing)
    ;(useDashboardStore.setState as any)({ activeCompanyId: company.id, subscription: company.subscription })
    return () => { uninstallDemoFetchInterceptor() }
  }, [lang, hydrate, company.id, company.subscription])

  // Hash-based navigation
  useEffect(() => {
    const handler = () => {
      const h = window.location.hash
      if (h.startsWith("#tab=")) {
        const v = h.slice(5)
        const validTabs = ["chatbot","overview","departments","employees","talk","projects","chat","department-chat","meetings","hr","work-orders","monitor","decisions","requests","token-budget","billing","invoices","settings","employee-detail","access-tokens","available"]
        if (validTabs.includes(v)) {
          setActiveTab(v, true); setSelectedEmployee(null)
        }
      }
    }
    window.addEventListener("popstate", handler)
    // Check initial hash
    handler()
    return () => window.removeEventListener("popstate", handler)
  }, [setActiveTab, setSelectedEmployee])

  const demoAction = useCallback(() => {
    toast.info(DEMO_READONLY_MSG[lang], { duration: 5000 })
  }, [lang])

  const handleLangChange = () => {
    const n = lang === "ar" ? "en" : "ar"
    const h = typeof window !== "undefined" ? window.location.hash : ""
    window.location.href = `/${n}${h}`
  }

  const navItems: { id: DashboardTab; Icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { id: "overview", Icon: LayoutDashboard, label: t("sidebar.overview", lang) },
    { id: "employees", Icon: Users, label: t("sidebar.employees", lang) },
    { id: "projects", Icon: Briefcase, label: t("sidebar.projects", lang) },
    { id: "work-orders", Icon: ClipboardList, label: t("sidebar.workOrders", lang) },
    { id: "department-chat", Icon: MessagesSquare, label: t("sidebar.departmentChat", lang) },
    { id: "talk", Icon: Mic, label: t("sidebar.talk", lang) },
    { id: "settings", Icon: Settings, label: t("sidebar.settings", lang) },
  ]

  return (
    <div className={`h-screen flex flex-col bg-background text-foreground overflow-hidden`} dir={isAr ? "rtl" : "ltr"}>
      <DemoBanner lang={lang} />
      <div className="flex-1 flex flex-row overflow-hidden">
        <Sidebar
          company={company} employees={employees} departments={departments} projects={projects}
          activeTab={activeTab}
          onTabChange={(tab: string) => { setActiveTab(tab as DashboardTab); setSelectedEmployee(null) }}
          onEmployeeSelect={(id: string) => { setSelectedEmployee(id); setActiveTab("chat" as DashboardTab) }}
          onEmployeeDetail={(id: string) => { setSelectedEmployeeDetail(id); setActiveTab("employee-detail" as DashboardTab) }}
          onDepartmentSelect={(id: string) => { setSelectedDepartment(id); setActiveTab("department-chat" as DashboardTab) }}
          onProjectSelect={(id: string) => { setSelectedProject(id); setActiveTab("projects" as DashboardTab) }}
          onCreateEmployee={() => demoAction()}
          onCreateDepartment={() => demoAction()}
          onCreateProject={() => demoAction()}
          onLogout={() => { window.location.href = isAr ? "/ar" : "/en" }}
          mobileOpen={sidebarMobileOpen}
          onMobileOpenChange={setSidebarMobileOpen}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          {/* Desktop header */}
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
              <button onClick={handleLangChange} className="text-muted-foreground hover:text-foreground text-xs px-1.5 py-1 rounded-lg hover:bg-muted transition-all min-h-[44px] min-w-[44px] flex items-center justify-center font-medium">{isAr ? "EN" : "\u0639"}</button>
              <a href={isAr ? "/ar?signup=true" : "/en?signup=true"} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-medium hover:from-emerald-500 hover:to-emerald-400 transition-all min-h-[44px]">{isAr ? "\u0623\u0646\u0634\u0626 \u0645\u0633\u0627\u062d\u062a\u0643" : "Create Workspace"}</a>
            </div>
          </div>
          {/* Mobile header */}
          <div className="md:hidden fixed top-8 left-0 right-0 z-40 flex items-center justify-between px-2 py-2 bg-card/95 border-b border-border backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <button onClick={() => setSidebarMobileOpen(true)} className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"><Menu className="w-5 h-5 text-foreground" /></button>
              <img src="/logo-v2.png" alt="BlivoAI" className="w-7 h-7 rounded-md" />
              <span className="text-foreground text-sm font-medium truncate max-w-[120px]">{company.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button onClick={handleLangChange} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded-lg hover:bg-muted transition-all min-h-[40px] min-w-[40px] flex items-center justify-center font-medium">{isAr ? "EN" : "\u0639"}</button>
            </div>
          </div>
          <div className="md:hidden h-14" />
          <MainContent
            company={company} employees={employees} departments={departments} projects={projects}
            userId="demo-user" userName="Demo User" isOwner={true}
            onReviewDecision={async () => { demoAction(); return Promise.resolve() }}
            onRespondToRequest={() => demoAction()}
            onCreateDepartment={() => demoAction()}
            onCreateProject={() => demoAction()}
            onUpdateEmployeeDepartment={() => demoAction()}
            onDeleteDepartment={() => demoAction()}
            onChatWithEmployee={(id: string) => { setSelectedEmployee(id); setActiveTab("chat" as DashboardTab) }}
            onDeleteEmployee={() => demoAction()}
            onReplaceEmployee={() => demoAction()}
          />
        </div>
      </div>
    </div>
  )
}