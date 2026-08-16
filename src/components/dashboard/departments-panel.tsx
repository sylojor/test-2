// ============================================
// لوحة الأقسام المحدّثة
// إضافة/مسح أقسام + موظفين بقسمهم + ألوان الأقسام
// ============================================

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { IEmployee, IDepartment } from "@/types"
import { getEmployeeStatusDisplay } from "@/lib/employee-generator"
import { toast } from "sonner"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface DepartmentsPanelProps {
  departments: IDepartment[]
  employees: IEmployee[]
  onCreateDepartment: (data: { name: string; description?: string; color?: string }) => void
  onUpdateEmployeeDepartment: (employeeId: string, departmentId: string | null) => void
  onDeleteDepartment: (id: string) => void
}

const DEPARTMENT_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
]

export function DepartmentsPanel({
  departments,
  employees,
  onCreateDepartment,
  onUpdateEmployeeDepartment,
  onDeleteDepartment,
}: DepartmentsPanelProps) {
  const language = useLocale()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedColor, setSelectedColor] = useState(DEPARTMENT_COLORS[0])
  const [open, setOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const unassignedEmployees = employees.filter(e => !e.departmentId && e.status !== "DELETED")

  const handleCreate = () => {
    if (!name.trim()) return
    onCreateDepartment({ name: name.trim(), description: description.trim() || undefined, color: selectedColor })
    setName("")
    setDescription("")
    setSelectedColor(DEPARTMENT_COLORS[0])
    setOpen(false)
  }

  const handleDelete = (deptId: string) => {
    onDeleteDepartment(deptId)
    setDeleteConfirm(null)
    toast.success(t("departments.deleted", language))
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("departments.title", language)}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("departments.subtitle", language)}</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]">
              + {t("departments.create", language)}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground" dir="ltr">
            <DialogHeader>
              <DialogTitle>{t("departments.create", language)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("departments.name", language)}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("departments.namePlaceholder", language)}
                  className="bg-muted border-border text-foreground"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("departments.description", language)}</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("departments.descriptionPlaceholder", language)}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("departments.color", language)}</Label>
                <div className="flex gap-2 flex-wrap">
                  {DEPARTMENT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 min-w-[44px] min-h-[44px] rounded-full transition-all ${
                        selectedColor === color ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {t("departments.create", language)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* موظفين بدون قسم */}
      {unassignedEmployees.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-foreground text-base font-semibold">{t("departments.unassigned", language)}</h3>
            <p className="text-muted-foreground text-sm">
              {t("departments.moveEmployees", language)}
            </p>
            {unassignedEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: emp.avatarColor || "#10b981" }}
                  >
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-foreground text-sm">{emp.name}</p>
                    <p className="text-muted-foreground text-xs">{emp.role}</p>
                  </div>
                </div>
                {departments.length > 0 && (
                  <select
                    className="bg-muted border border-border text-muted-foreground text-xs rounded-lg px-2 py-2 min-h-[44px]"
                    onChange={(e) => {
                      if (e.target.value) {
                        onUpdateEmployeeDepartment(emp.id, e.target.value)
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>{t("departments.moveTo", language)}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* الأقسام */}
      {departments.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-lg mb-2">🏢</p>
            <p className="text-muted-foreground">{t("departments.noDepartments", language)}</p>
            <p className="text-muted-foreground text-sm mt-1">{t("departments.createFirst", language)}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {departments.map((dept) => {
            const deptEmployees = employees.filter(e => e.departmentId === dept.id && e.status !== "DELETED")
            return (
              <Card key={dept.id} className="border-border overflow-hidden">
                {/* شريط لون القسم بالأعلى */}
                <div className="h-1.5" style={{ backgroundColor: dept.color }} />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: dept.color }}
                      >
                        {dept.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-foreground font-semibold">{dept.name}</h3>
                        {dept.description && <p className="text-muted-foreground text-xs mt-0.5">{dept.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                        {deptEmployees.length} {t("departments.employees", language)}
                      </Badge>
                      {deleteConfirm === dept.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="min-h-[44px] text-xs px-3"
                            onClick={() => handleDelete(dept.id)}
                          >
                            {t("common.confirm", language)}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-[44px] text-xs px-3 text-muted-foreground"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            {t("common.cancel", language)}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[44px] min-w-[44px] text-xs px-3 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setDeleteConfirm(dept.id)}
                        >
                          {t("departments.delete", language)}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* موظفين القسم — الاسم بلون القسم */}
                  {deptEmployees.length > 0 ? (
                    <div className="space-y-2">
                      {deptEmployees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                            style={{ backgroundColor: emp.avatarColor || dept.color }}
                          >
                            {emp.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: dept.color }}>
                              {emp.name}
                            </p>
                            <p className="text-muted-foreground text-[10px] truncate">{emp.role}</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                            {getEmployeeStatusDisplay(emp.status)}
                          </Badge>
                          <select
                            className="bg-muted border border-border text-muted-foreground text-xs rounded px-2 py-1 min-h-[44px]"
                            value={emp.departmentId || ""}
                            onChange={(e) => {
                              onUpdateEmployeeDepartment(emp.id, e.target.value || null)
                            }}
                          >
                            <option value="">{t("departments.unassigned", language)}</option>
                            {departments.filter(d => d.id !== dept.id).map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs text-center py-2">{t("departments.noEmployeesInDept", language)}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
