// @ts-nocheck
// ============================================
// المحتوى الرئيسي — بيعرض التبويب المختار
// يدعم كل التبويبات بما فيها الجديدة:
// التحدث للموظفين، الاجتماعات، HR
// + onDeleteEmployee + onReplaceEmployee
// ============================================

"use client"

import { useDashboardStore } from "@/stores/dashboard-store"
import { OverviewPanel } from "@/components/dashboard/overview-panel"
import { MonitorPanel } from "@/components/dashboard/monitor-panel"
import { WorkOrdersPanel } from "@/components/dashboard/work-orders-panel"
import { DepartmentsPanel } from "@/components/dashboard/departments-panel"
import { EmployeesPanel } from "@/components/dashboard/employees-panel"
import { TalkToEmployeesPanel } from "@/components/dashboard/talk-panel"
import { ProjectsPanel } from "@/components/dashboard/projects-panel"
import { ChatPanel } from "@/components/chat/chat-panel"
import { DepartmentChatPanel } from "@/components/chat/department-chat-panel"
import { MeetingsPanel } from "@/components/dashboard/meetings-panel"
import { HRPanel } from "@/components/dashboard/hr-panel"
import { DecisionsPanel } from "@/components/dashboard/decisions-panel"
import { RequestsPanel } from "@/components/dashboard/requests-panel"
import { TokenBudgetPanel } from "@/components/dashboard/token-budget-panel"
import { ApiKeysPanel } from "@/components/dashboard/api-keys-panel"
import { AvailableEmployeesPanel } from "@/components/dashboard/available-employees-panel"
import { AccessTokensPanel } from "@/components/dashboard/access-tokens-panel"

import { SettingsPanel } from "@/components/dashboard/settings-panel"
import { BillingPanel } from "@/components/dashboard/billing-panel"
import { InvoicesPanel } from "@/components/dashboard/invoices-panel"
import { ChatbotPanel } from "@/components/dashboard/chatbot-panel"
import { EmployeeDetailPanel } from "@/components/dashboard/employee-detail-panel"
import type { ICompany, IEmployee, IDepartment, IProject } from "@/types"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface MainContentProps {
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  projects: IProject[]
  userId: string
  userName: string
  isOwner: boolean
  onReviewDecision: (decisionId: string, approved: boolean, note?: string) => Promise<void>
  onRespondToRequest: (requestId: string, approved: boolean, response?: string) => void
  onCreateDepartment: (data: { name: string; description?: string; color?: string }) => void
  onCreateProject: (data: { name: string; description?: string; departmentId?: string }) => void
  onUpdateEmployeeDepartment: (employeeId: string, departmentId: string | null) => void
  onDeleteDepartment: (id: string) => void
  onChatWithEmployee: (employeeId: string) => void
  onDeleteEmployee?: (employeeId: string) => void
  onReplaceEmployee?: (employeeId: string) => void
}

export function MainContent({
  company,
  employees,
  departments,
  projects,
  userId,
  userName,
  isOwner,
  onReviewDecision,
  onRespondToRequest,
  onCreateDepartment,
  onCreateProject,
  onUpdateEmployeeDepartment,
  onDeleteDepartment,
  onChatWithEmployee,
  onDeleteEmployee,
  onReplaceEmployee,
}: MainContentProps) {
  const language = useLocale()
  const { selectedEmployeeId, selectedDepartmentId, activeTab, selectedEmployeeDetailId } = (useDashboardStore() as any)

  // لو في موظف مختار وتبويب المحادثة
  if (selectedEmployeeId && activeTab === "chat") {
    const employee = employees.find(e => e.id === selectedEmployeeId)
    if (employee) {
      return (
        <main className="flex-1 overflow-hidden w-full">
          <ChatPanel employee={employee} company={company} />
        </main>
      )
    }
  }

  switch (activeTab) {
    case "chatbot":
      return (
        <main className="flex-1 overflow-hidden w-full">
          <ChatbotPanel />
        </main>
      )
    case "overview":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <OverviewPanel
            company={company}
            employees={employees}
            departments={departments}
            projects={projects}
          />
        </main>
      )
    case "departments":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <DepartmentsPanel
            departments={departments}
            employees={employees}
            onCreateDepartment={onCreateDepartment}
            onUpdateEmployeeDepartment={onUpdateEmployeeDepartment}
            onDeleteDepartment={onDeleteDepartment}
          />
        </main>
      )
    case "employees":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          {/* @ts-expect-error */}
      <EmployeesPanel
            employees={employees}
            departments={departments}
            onUpdateEmployeeDepartment={onUpdateEmployeeDepartment}
            onDeleteEmployee={onDeleteEmployee}
            onReplaceEmployee={onReplaceEmployee}
          />
        </main>
      )
    case "talk":
      return (
        <main className="flex-1 overflow-hidden w-full">
          <TalkToEmployeesPanel
            employees={employees}
            departments={departments}
            company={company}
            onChatWithEmployee={onChatWithEmployee}
          />
        </main>
      )
    case "department-chat":
      return (
        <main className="flex-1 overflow-hidden w-full">
          <DepartmentChatPanel
            company={company}
            employees={employees}
            departments={departments}
            selectedDepartmentId={selectedDepartmentId}
          />
        </main>
      )
    case "meetings":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          {company ? (
            <MeetingsPanel
              companyId={company.id}
              employees={employees}
              departments={departments}
              company={company}
              userName={userName}
              userId={userId}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">{t("main.noCompany", language)}</div>
          )}
        </main>
      )
    case "hr":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          {company ? (
            <HRPanel
              companyId={company.id}
              employees={employees}
              departments={departments}
              company={company}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">{t("main.noCompany", language)}</div>
          )}
        </main>
      )
    case "monitor":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <MonitorPanel
            company={company}
            employees={employees}
            departments={departments}
            onChatWithEmployee={onChatWithEmployee}
          />
        </main>
      )
    case "work-orders":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          {company ? (
            <WorkOrdersPanel
              companyId={company.id}
              userId={userId}
              userName={userName}
              employees={employees}
              departments={departments}
              onChatWithEmployee={onChatWithEmployee}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">{t("main.noCompany", language)}</div>
          )}
        </main>
      )
    case "projects":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <ProjectsPanel
            projects={projects}
            employees={employees}
            departments={departments}
            onCreateProject={onCreateProject}
          />
        </main>
      )
    case "decisions":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <DecisionsPanel
            employees={employees}
            companyId={company?.id}
            onReview={onReviewDecision}
          />
        </main>
      )
    case "requests":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <RequestsPanel onRespond={onRespondToRequest} />
        </main>
      )
    case "token-budget":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <TokenBudgetPanel company={company} />
        </main>
      )
    case "access-tokens":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <AccessTokensPanel />
        </main>
      )
    case "available":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <AvailableEmployeesPanel employees={employees} departments={departments} />
        </main>
      )
    case "billing":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <BillingPanel company={company} />
        </main>
      )
    case "invoices":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full">
            <InvoicesPanel />
          </div>
        </main>
      )
    case "api-keys":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <ApiKeysPanel />
        </main>
      )
    case "settings":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <SettingsPanel company={company} isOwner={isOwner} />
        </main>
      )
    case "employee-detail":
      const detailEmployee = employees.find(e => e.id === selectedEmployeeDetailId)
      if (detailEmployee) {
        return (
          <main className="flex-1 overflow-y-auto w-full">
            {/* @ts-expect-error */}
      <EmployeeDetailPanel
              employee={detailEmployee}
              departments={departments}
              onBack={() => useDashboardStore.getState().setActiveTab("employees")}
            />
          </main>
        )
      }
      return null
    default:
      return null
  }
}
