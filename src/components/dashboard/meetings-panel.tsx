// ============================================
// لوحة الاجتماعات
// مجدولة + طارئة + الموظفين يقدروا يعملوا اجتماعات
// بطاقات: عنوان + أسماء المشاركين + لون القسم
// ============================================

"use client"

import { useState, useEffect } from "react"
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
} from "@/components/ui/dialog"
import type { IEmployee, IDepartment, ICompany, IMeeting, MeetingType, MeetingStatus } from "@/types"
import { toast } from "sonner"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface MeetingsPanelProps {
  companyId: string
  employees: IEmployee[]
  departments: IDepartment[]
  company: ICompany | null
  userName: string
  userId: string
}

const MEETING_TYPE_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EMERGENCY: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  STANDUP: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REVIEW: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  BRAINSTORM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
}

export function MeetingsPanel({
  companyId,
  employees,
  departments,
  company,
  userName,
  userId,
}: MeetingsPanelProps) {
  const language = useLocale()

  const [meetings, setMeetings] = useState<IMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all")

  // نموذج إنشاء اجتماع
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<MeetingType>("SCHEDULED")
  const [scheduledAt, setScheduledAt] = useState("")
  const [duration, setDuration] = useState(30)
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([])
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])

  // ترجمة حالات الاجتماع
  const MEETING_STATUS_LABELS: Record<string, string> = {
    SCHEDULED: t("meetings.status.scheduled", language),
    IN_PROGRESS: t("meetings.status.inProgress", language),
    COMPLETED: t("meetings.status.completed", language),
    CANCELLED: t("meetings.status.cancelled", language),
  }

  // ترجمة أنواع الاجتماع
  const MEETING_TYPE_LABELS: Record<string, string> = {
    SCHEDULED: t("meetings.type.scheduled", language),
    EMERGENCY: t("meetings.type.emergency", language),
    STANDUP: t("meetings.type.standup", language),
    REVIEW: t("meetings.type.review", language),
    BRAINSTORM: t("meetings.type.brainstorm", language),
  }

  useEffect(() => {
    fetchMeetings()
  }, [companyId])

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`/api/meetings?companyId=${companyId}`)
      if (res.ok) {
        const data = await res.json()
        setMeetings(data.meetings || [])
      }
    } catch {
      // تجاهل
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!title.trim() || !scheduledAt) {
      toast.error(t("meetings.titleAndTimeRequired", language))
      return
    }

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          createdById: userId,
          createdByType: "USER",
          createdByName: userName,
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          scheduledAt,
          duration,
          departmentIds: selectedDeptIds.length > 0 ? selectedDeptIds : undefined,
          participantIds: selectedEmpIds.length > 0 ? selectedEmpIds : undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMeetings(prev => [data.meeting, ...prev])
        setShowCreate(false)
        resetForm()
        toast.success(t("meetings.created", language))
      }
    } catch {
      toast.error(t("meetings.createFailed", language))
    }
  }

  const handleCancel = async (meetingId: string) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      })
      if (res.ok) {
        setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: "CANCELLED" as MeetingStatus } : m))
        toast.success(t("meetings.cancelled.toast", language))
      }
    } catch {
      toast.error(t("meetings.cancelFailed", language))
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setType("SCHEDULED")
    setScheduledAt("")
    setDuration(30)
    setSelectedDeptIds([])
    setSelectedEmpIds([])
  }

  // فلترة الاجتماعات
  const now = new Date()
  const filtered = meetings.filter(m => {
    if (filter === "upcoming") return m.status === "SCHEDULED" && new Date(m.scheduledAt) > now
    if (filter === "completed") return m.status === "COMPLETED"
    return true
  })

  // جلب أسماء المشاركين
  const getParticipantNames = (meeting: IMeeting): Array<{ name: string; color: string }> => {
    const participants: Array<{ name: string; color: string }> = []
    
    // من الأقسام
    if (meeting.departmentIds) {
      try {
        const deptIds: string[] = JSON.parse(meeting.departmentIds)
        for (const deptId of deptIds) {
          const dept = departments.find(d => d.id === deptId)
          if (dept) {
            const deptEmps = employees.filter(e => e.departmentId === deptId && e.status === "ACTIVE")
            for (const emp of deptEmps) {
              participants.push({ name: emp.name, color: dept.color })
            }
          }
        }
      } catch { /* ignore */ }
    }

    // من الموظفين المحددين
    if (meeting.participantIds) {
      try {
        const empIds: string[] = JSON.parse(meeting.participantIds)
        for (const empId of empIds) {
          const emp = employees.find(e => e.id === empId)
          if (emp && !participants.find(p => p.name === emp.name)) {
            const dept = departments.find(d => d.id === emp.departmentId)
            participants.push({ name: emp.name, color: dept?.color || "#64748b" })
          }
        }
      } catch { /* ignore */ }
    }

    return participants
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("meetings.title", language)}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("meetings.subtitle", language)}</p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
          onClick={() => setShowCreate(true)}
        >
          + {t("meetings.create", language)}
        </Button>
      </div>

      {/* فلاتر */}
      <div className="flex gap-2">
        {(["all", "upcoming", "completed"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "ghost"}
            className={filter === f ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? t("meetings.filter.all", language) : f === "upcoming" ? t("meetings.filter.upcoming", language) : t("meetings.filter.completed", language)}
          </Button>
        ))}
      </div>

      {/* بطاقات الاجتماعات */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t("common.loading", language)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-lg mb-2">📅</p>
            <p className="text-muted-foreground">
              {filter === "upcoming" ? t("meetings.noMeetings", language) : t("meetings.noMeetings", language)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {filtered.map((meeting) => {
            const participants = getParticipantNames(meeting)
            const isUpcoming = new Date(meeting.scheduledAt) > now && meeting.status === "SCHEDULED"
            
            return (
              <Card
                key={meeting.id}
                className={`border-border overflow-hidden transition-all hover:border-muted-foreground/30 ${
                  meeting.type === "EMERGENCY" ? "border-red-300 dark:border-red-900/50" : ""
                }`}
              >
                {/* شريط لوني حسب النوع */}
                <div className={`h-1 ${
                  meeting.type === "EMERGENCY" ? "bg-red-500" :
                  meeting.type === "STANDUP" ? "bg-green-500" :
                  meeting.type === "REVIEW" ? "bg-purple-500" :
                  meeting.type === "BRAINSTORM" ? "bg-yellow-500" :
                  "bg-blue-500"
                }`} />
                <CardContent className="p-5 space-y-3">
                  {/* العنوان والحالة */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-foreground font-semibold text-base">{meeting.title}</h3>
                      {meeting.description && (
                        <p className="text-muted-foreground text-xs mt-1">{meeting.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={`text-[10px] ${MEETING_TYPE_COLORS[meeting.type] || "bg-muted text-muted-foreground"}`}>
                        {MEETING_TYPE_LABELS[meeting.type] || meeting.type}
                      </Badge>
                      <Badge variant="secondary" className={`text-[10px] ${
                        meeting.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        meeting.status === "CANCELLED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        meeting.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {MEETING_STATUS_LABELS[meeting.status] || meeting.status}
                      </Badge>
                    </div>
                  </div>

                  {/* الوقت */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">🕐</span>
                    <span className="text-foreground">
                      {new Date(meeting.scheduledAt).toLocaleDateString("ar-EG", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(meeting.scheduledAt).toLocaleTimeString("ar", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-muted-foreground text-xs">({meeting.duration} {t("meetings.minutes", language)})</span>
                  </div>

                  {/* المشاركين — أسماء بألوان أقسامهم */}
                  {participants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {participants.map((p, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs border-border"
                          style={{ color: p.color, borderColor: p.color + "40" }}
                        >
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* أنشأه */}
                  <p className="text-muted-foreground text-[10px]">
                    {t("meetings.createdBy", language)} {meeting.createdByName}
                  </p>

                  {/* أزرار */}
                  {isUpcoming && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs h-7"
                        onClick={() => handleCancel(meeting.id)}
                      >
                        {t("common.cancel", language)}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* نافذة إنشاء اجتماع */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border text-foreground" dir="ltr">
          <DialogHeader>
            <DialogTitle>{t("meetings.create", language)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t("meetings.title.label", language)}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("meetings.titlePlaceholder", language)}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{t("meetings.description", language)}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("meetings.agendaPlaceholder", language)}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{t("meetings.type.label", language)}</Label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(MEETING_TYPE_LABELS) as [string, string][]).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={type === key ? "default" : "ghost"}
                    className={type === key ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}
                    onClick={() => setType(key as MeetingType)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("meetings.time", language)}</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("meetings.duration", language)}</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="bg-muted border-border text-foreground"
                  min={5}
                  max={480}
                />
              </div>
            </div>

            {/* اختيار الأقسام */}
            {departments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("meetings.departments", language)}</Label>
                <div className="flex gap-2 flex-wrap">
                  {departments.map((dept) => (
                    <Button
                      key={dept.id}
                      size="sm"
                      variant={selectedDeptIds.includes(dept.id) ? "default" : "ghost"}
                      className={selectedDeptIds.includes(dept.id) ? "text-white" : "text-muted-foreground hover:text-foreground"}
                      style={selectedDeptIds.includes(dept.id) ? { backgroundColor: dept.color } : {}}
                      onClick={() => {
                        setSelectedDeptIds(prev =>
                          prev.includes(dept.id)
                            ? prev.filter(id => id !== dept.id)
                            : [...prev, dept.id]
                        )
                      }}
                    >
                      <div className="w-2 h-2 rounded-full ml-1" style={{ backgroundColor: dept.color }} />
                      {dept.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* اختيار موظفين */}
            {employees.filter(e => e.status === "ACTIVE").length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("meetings.specificEmployees", language)}</Label>
                <div className="flex gap-1.5 flex-wrap max-h-32 overflow-y-auto">
                  {employees
                    .filter(e => e.status === "ACTIVE")
                    .map((emp) => {
                      const dept = departments.find(d => d.id === emp.departmentId)
                      return (
                        <Button
                          key={emp.id}
                          size="sm"
                          variant={selectedEmpIds.includes(emp.id) ? "default" : "ghost"}
                          className={`text-xs h-7 ${
                            selectedEmpIds.includes(emp.id)
                              ? "text-white"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          style={selectedEmpIds.includes(emp.id) ? { backgroundColor: dept?.color || "#10b981" } : {}}
                          onClick={() => {
                            setSelectedEmpIds(prev =>
                              prev.includes(emp.id)
                                ? prev.filter(id => id !== emp.id)
                                : [...prev, emp.id]
                            )
                          }}
                        >
                          {emp.name}
                        </Button>
                      )
                    })}
                </div>
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={!title.trim() || !scheduledAt}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {type === "EMERGENCY" ? `${t("meetings.emergency", language)}!` : t("meetings.create", language)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
