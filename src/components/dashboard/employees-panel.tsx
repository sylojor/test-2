// ============================================
// لوحة الموظفين — النسخة المحدّثة + حذف + light mode
// ============================================

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { IEmployee, IDepartment } from "@/types"
import { getEmployeeStatusColor, getEmployeeStatusDisplay, getApprovalModeDisplay } from "@/lib/employee-generator"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import { toast } from "sonner"

// --- دالة آمنة لـ JSON.parse ---
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
}

export function EmployeesPanel({ employees, departments, onUpdateEmployeeDepartment, onDeleteEmployee }: EmployeesPanelProps) {
  const language = useLocale()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (employeeId: string, employeeName: string) => {
    setDeleting(employeeId)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        toast.success(language === "ar" ? `تم حذف ${employeeName}` : `${employeeName} deleted`)
        onDeleteEmployee?.(employeeId)
      } else {
        const err = await res.json()
        toast.error(err.error || t("common.error", language))
      }
    } catch {
      toast.error(t("common.error", language))
    } finally {
      setDeleting(null)
    }
  }

  if (employees.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl">
        <h1 className="text-2xl font-bold">{t("employees.title", language)}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("employees.subtitle", language)}</p>
        <Card className="mt-6">
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
        <h1 className="text-2xl font-bold">{t("employees.title", language)}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("employees.subtitle", language)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {employees.map((emp) => {
          const dept = departments.find(d => d.id === emp.departmentId)
          return (
            <Card key={emp.id} className="hover:border-emerald-500/30 transition-all">
              <CardContent className="p-5 space-y-4">
                {/* رأس البطاقة */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                      style={{ backgroundColor: emp.avatarColor || "#10b981" }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{emp.name}</h3>
                      <p className="text-muted-foreground text-sm">{emp.role}</p>
                      {emp.specialization && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {language === "ar" ? `تخصص: ${emp.specialization}` : `Specialization: ${emp.specialization}`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getEmployeeStatusColor(emp.status)}`}
                    >
                      {getEmployeeStatusDisplay(emp.status)}
                    </Badge>
                    {/* زر حذف */}
                    {onDeleteEmployee && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(emp.id, emp.name)}
                        disabled={deleting === emp.id}
                        className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs min-h-[44px]"
                      >
                        {deleting === emp.id
                          ? (language === "ar" ? "جاري..." : "Deleting...")
                          : (language === "ar" ? "حذف" : "Delete")}
                      </Button>
                    )}
                  </div>
                </div>

                {/* التفاصيل */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("setupEmployee.approvalMode", language)}</span>
                    <span className="text-foreground">{getApprovalModeDisplay(emp.approvalMode)}</span>
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
                        className="bg-background border border-border text-foreground text-xs rounded px-2 py-1 min-h-[44px]"
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
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {cap.length > 30 ? cap.substring(0, 30) + "..." : cap}
                        </Badge>
                      ))}
                      {caps.length > 3 && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          +{caps.length - 3}
                        </Badge>
                      )}
                    </div>
                  )
                })()}

                {/* القدرات المقترحة */}
                {(() => {
                  const suggs = safeJsonParse(emp.suggestedCapabilities)
                  if (suggs.length === 0) return null
                  return (
                    <div className="pt-2 border-t border-border">
                      <p className="text-yellow-600 dark:text-yellow-400 text-[10px] font-medium mb-1">{t("employees.suggested", language)}:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggs.slice(0, 2).map((cap: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-600 dark:text-yellow-400/70">
                            {cap.length > 30 ? cap.substring(0, 30) + "..." : cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
