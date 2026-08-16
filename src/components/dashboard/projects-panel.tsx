// ============================================
// لوحة المشاريع (Projects)
// إنشاء وإدارة المشاريع والمهام
// ============================================

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { IEmployee, IDepartment, IProject } from "@/types"
import { getProjectStatusDisplay, getProjectStatusColor } from "@/lib/employee-generator"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface ProjectsPanelProps {
  projects: IProject[]
  employees: IEmployee[]
  departments: IDepartment[]
  onCreateProject: (data: { name: string; description?: string; departmentId?: string }) => void
}

export function ProjectsPanel({
  projects,
  employees,
  departments,
  onCreateProject,
}: ProjectsPanelProps) {
  const language = useLocale()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [open, setOpen] = useState(false)

  const handleCreate = () => {
    if (!name.trim()) return
    onCreateProject({
      name: name.trim(),
      description: description.trim() || undefined,
      departmentId: departmentId || undefined,
    })
    setName("")
    setDescription("")
    setDepartmentId("")
    setOpen(false)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("projects.title", language)}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("projects.subtitle", language)}</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]">
              + {t("projects.create", language)}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground" dir="ltr">
            <DialogHeader>
              <DialogTitle>{t("projects.create", language)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("projects.name", language)}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("projects.namePlaceholder", language)}
                  className="bg-muted border-border text-foreground"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("projects.description", language)}</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("projects.descriptionPlaceholder", language)}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              {departments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("projects.status", language)}</Label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-muted border border-border text-muted-foreground text-sm rounded-lg px-3 py-2"
                  >
                    <option value="">{t("projects.createFirst", language)}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {t("common.create", language)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* المشاريع */}
      {projects.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-lg mb-2">📋</p>
            <p className="text-muted-foreground">{t("projects.noProjects", language)}</p>
            <p className="text-muted-foreground text-sm mt-1">{t("projects.createFirst", language)}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {projects.map((project) => {
            const dept = departments.find(d => d.id === project.departmentId)
            const tasks = (project as IProject & { tasks?: Array<{ id: string; title: string; status: string; assignee?: { name: string } }> }).tasks || []
            const completedTasks = tasks.filter(t => t.status === "COMPLETED").length
            const totalTasks = tasks.length
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

            return (
              <Card key={project.id} className="border-border">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-foreground font-semibold">{project.name}</h3>
                      {project.description && (
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className={`text-[10px] ${getProjectStatusColor(project.status)}`}>
                      {getProjectStatusDisplay(project.status)}
                    </Badge>
                  </div>

                  {/* القسم */}
                  {dept && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                      <span className="text-muted-foreground text-xs">{dept.name}</span>
                    </div>
                  )}

                  {/* شريط التقدم */}
                  {totalTasks > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t("workOrders.progress", language)}</span>
                        <span className="text-muted-foreground">{completedTasks}/{totalTasks}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* الموعد النهائي */}
                  {project.deadline && (
                    <p className="text-muted-foreground text-xs">
                      {t("projects.deadline", language)}: {new Date(project.deadline).toLocaleDateString("ar-EG")}
                    </p>
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
