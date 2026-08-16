// ============================================
// لوحة الموظفين — النسخة المحدّثة
// يدعم: عرض، حذف، استبدال، نقل قسم
// Theme-aware — respects light/dark mode
// ============================================

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { IEmployee, IDepartment } from "@/types"
import { getEmployeeStatusColor, getEmployeeStatusDisplay, getApprovalModeDisplay } from "@/lib/employee-generator"
import { useDashboardStore } from "@/stores/dashboard-store"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import { Trash2, RefreshCw, UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"

function safeJsonParse(str: string | null | undefined): string[] {
  if (!str) return []
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

interface EmployeesPanelProps {
  employees: IEmployee[]
  departments: IDepartment[]
  onUpdateEmployeeDepartment: (employeeId: string, departmentId: string | null) => void
  onDeleteEmployee?: (employeeId: string) => void
  onReplaceEmployee?: (employeeId: string) => void
}

export function EmployeesPanel({ employees, departments, onUpdateEmployeeDepartment, onDeleteEmployee, onReplaceEmployee }: EmployeesPanelProps) {
  const language = useLocale()
  const isArabic = language === "ar"
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (employeeId: string, employeeName: string) => {
    setDeletingId(employeeId)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success(isArabic ? `تم حذف ${employeeName} — بياناته محفوظة` : `${employeeName} deleted — data preserved`)
        if (onDeleteEmployee) onDeleteEmployee(employeeId)
      } else {
        toast.error(isArabic ? "فشل حذف الموظف" : "Failed to delete employee")
      }
    } catch {
      toast.error(isArabic ? "خطأ في الاتصال" : "Connection error")
    }
    setDeletingId(null)
  }

  const handleReplace = (employeeId: string) => {
    if (onReplaceEmployee) {
      onReplaceEmployee(employeeId)
    } else {
      // Navigate to create employee flow — after deleting the old one
      const store = useDashboardStore.getState()
      store.setActiveTab("overview" as any)
      toast.info(isArabic ? "احذف الموظف القديم أول، ثم أنشئ الموظف الجديد" : "Delete the old employee first, then create the new one")
    }
  }

  if (employees.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl">
        <h1 className="text-2xl font-bold text-foreground">{t("employees.title", language)}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("employees.subtitle", language)}</p>
        <Card className="bg-card border-border mt-6">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t("employees.noEmployees", language)}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("employees.title", language)}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("employees.subtitle", language)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {employees.map((emp) => {
          const dept = departments.find(d => d.id === emp.departmentId)
          const isDeleting = deletingId === emp.id
          
          return (
            <Card key={emp.id} className="bg-card border-border hover:border-border transition-all">
              <CardContent className="p-5 space-y-4">
                {/* رأس البطاقة */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-foreground text-lg font-bold"
                      style={{ backgroundColor: emp.avatarColor || "#10b981" }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">{emp.name}</h3>
                      <p className="text-muted-foreground text-sm">{emp.role}</p>
                      {emp.specialization && (
                        <Badge variant="outline" className="text-[10px] border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {isArabic ? `تخصص: ${emp.specialization}` : `Specialization: ${emp.specialization}`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getEmployeeStatusColor(emp.status)}`}
                  >
                    {getEmployeeStatusDisplay(emp.status, language)}
                  </Badge>
                </div>

                {/* التفاصيل */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("setupEmployee.approvalMode", language)}</span>
                    <span className="text-foreground">{getApprovalModeDisplay(emp.approvalMode, language)}</span>
                  </div>
                  
                  {/* القسم */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("employees.department", language)}</span>
                    {departments.length > 0 ? (
                      <select
                        value={emp.departmentId || ""}
                        onChange={(e) => {
                          onUpdateEmployeeDepartment(emp.id, e.target.value || null)
                        }}
                        className="bg-muted border border-border text-foreground text-xs rounded px-2 py-1 min-h-[44px]"
                      >
                        <option value="">{t("employees.noDepartment", language)}</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-muted-foreground text-xs">{t("employees.noDepartment", language)}</span>
                    )}
                  </div>
                </div>

                {/* القدرات */}
                {(() => {
                  const caps = safeJsonParse(emp.capabilities)
                  if (caps.length === 0) return null
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {caps.slice(0, 3).map((cap: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-border text-muted-foreground">
                          {cap.length > 30 ? cap.substring(0, 30) + "..." : cap}
                        </Badge>
                      ))}
                      {caps.length > 3 && (
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                          +{caps.length - 3}
                        </Badge>
                      )}
                    </div>
                  )
                })()}

                {/* أزرار إدارة الموظف */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center gap-1.5 border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 min-h-[36px]"
                    onClick={() => handleDelete(emp.id, emp.name)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    {isArabic ? "حذف" : "Delete"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center gap-1.5 border-border text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-700/30 min-h-[36px]"
                    onClick={() => handleReplace(emp.id)}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {isArabic ? "استبدال" : "Replace"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center gap-1.5 border-border text-muted-foreground hover:text-primary hover:bg-primary/10 min-h-[36px]"
                    onClick={() => {
                      const store = useDashboardStore.getState()
                      store.setSelectedEmployeeDetail(emp.id)
                      store.setActiveTab("employee-detail" as any)
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {isArabic ? "تفاصيل" : "Details"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
