// ============================================
// مونيتور ريل تايم للشركة
// يشوف شو عم بصير لحظياً:
// - مين شغال على شو
// - طلبات العمل النشطة
// - آخر الأنشطة
// - إحصائيات حية
// ============================================

"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { IEmployee, IDepartment, IWorkOrder, ICompany } from "@/types"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface MonitorPanelProps {
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  onChatWithEmployee?: (employeeId: string) => void
  onViewWorkOrder?: (workOrderId: string) => void
}

export function MonitorPanel({ company, employees, departments, onChatWithEmployee, onViewWorkOrder }: MonitorPanelProps) {
  const language = useLocale()
  
  const [workOrders, setWorkOrders] = useState<IWorkOrder[]>([])
  const [activityFeed, setActivityFeed] = useState<Array<{
    id: string
    type: "work_order" | "employee" | "chat" | "task"
    message: string
    timestamp: Date
    actorName: string
    actorColor: string
  }>>([])

  // --- جلب البيانات ---
  const fetchData = useCallback(async () => {
    if (!company) return

    try {
      const res = await fetch(`/api/work-orders?companyId=${company.id}`)
      if (res.ok) {
        const data = await res.json()
        const orders: IWorkOrder[] = data.workOrders || []
        setWorkOrders(orders)

        // بناء سجل الأنشطة من الطلبات
        const activities: typeof activityFeed = []
        for (const order of orders) {
          // طلب جديد
          activities.push({
            id: `wo-${order.id}`,
            type: "work_order",
            message: `${t("monitor.activity.order", language)}: ${order.title} — ${order.progress}%`,
            timestamp: new Date(order.createdAt),
            actorName: order.createdByName,
            actorColor: "#10b981",
          })

          // تحديثات الطلب
          for (const update of (order.updates || []).slice(0, 3)) {
            activities.push({
              id: `upd-${update.id}`,
              type: update.type === "HANDOFF" ? "task" : update.type === "COMPLETION" ? "task" : "work_order",
              message: update.content,
              timestamp: new Date(update.createdAt),
              actorName: update.updatedByName,
              actorColor: "#3b82f6",
            })
          }
        }

        // ترتيب حسب الوقت
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        setActivityFeed(activities.slice(0, 30))
      }
    } catch {
      // silently fail
    }
  }, [company, language])

  useEffect(() => {
    if (company) fetchData()
  }, [company, language, fetchData])

  useEffect(() => {
    const interval = setInterval(() => fetchData(), 5000) // تحديث كل 5 ثواني
    return () => clearInterval(interval)
  }, [company, language])

  // --- حسابات ---
  const activeEmployees = employees.filter(e => e.status === "ACTIVE")
  const activeOrders = workOrders.filter(o => o.status === "IN_PROGRESS" || o.status === "SUBMITTED" || o.status === "ASSIGNING")
  const completedToday = workOrders.filter(o => {
    if (o.status !== "COMPLETED" || !o.completedAt) return false
    const today = new Date()
    return new Date(o.completedAt).toDateString() === today.toDateString()
  })

  // حساب الموظفين المشغولين
  const busyEmployees = new Set<string>()
  for (const order of activeOrders) {
    for (const task of (order.subTasks || [])) {
      if (task.assigneeId && task.status === "IN_PROGRESS") {
        busyEmployees.add(task.assigneeId)
      }
    }
  }

  // تقدم التوكن
  const tokenBudgetMonthly = company?.tokenBudgetMonthly ?? 0
  const tokenUsedMonthly = company?.tokenUsedMonthly ?? 0
  const tokenPercent = tokenBudgetMonthly > 0
    ? Math.round((tokenUsedMonthly / tokenBudgetMonthly) * 100)
    : 0

  // ============================================
  // العرض
  // ============================================
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* رأس المونيتور */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {t("monitor.title", language)}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("monitor.subtitle", language)}</p>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MonitorCard
          label={t("monitor.activeEmployees", language)}
          value={`${activeEmployees.length}`}
          sub={`${busyEmployees.size} ${t("monitor.active", language)}`}
          color="emerald"
          icon="👥"
        />
        <MonitorCard
          label={t("monitor.activeOrders", language)}
          value={`${activeOrders.length}`}
          sub={`${completedToday.length} ${t("workOrders.completed", language)}`}
          color="blue"
          icon="📋"
        />
        <MonitorCard
          label={t("monitor.avgProgress", language)}
          value={`${activeOrders.length > 0 ? Math.round(activeOrders.reduce((sum, o) => sum + o.progress, 0) / activeOrders.length) : 0}%`}
          sub={t("monitor.activeOrders", language)}
          color="yellow"
          icon="📊"
        />
        <MonitorCard
          label={t("monitor.tokenUsage", language)}
          value={`${tokenPercent}%`}
          sub={`من ${company ? (tokenBudgetMonthly / 1000).toFixed(0) + "K" : "?"}`}
          color={tokenPercent > 80 ? "red" : tokenPercent > 50 ? "yellow" : "emerald"}
          icon="💰"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الموظفين — مين شغال على شو */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">{t("monitor.employees", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] sm:h-[400px]">
              <div className="space-y-2">
                {activeEmployees.map(emp => {
                  const isBusy = busyEmployees.has(emp.id)
                  const empDept = departments.find(d => d.id === emp.departmentId)
                  
                  // إيجاد المهمة الحالية
                  let currentTask = ""
                  for (const order of activeOrders) {
                    const task = (order.subTasks || []).find(
                      t => t.assigneeId === emp.id && t.status === "IN_PROGRESS"
                    )
                    if (task) {
                      currentTask = task.title
                      break
                    }
                  }

                  return (
                    <div
                      key={emp.id}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: emp.avatarColor || "#10b981" }}
                          >
                            {emp.name.charAt(0)}
                          </div>
                          {/* مؤشر الحالة */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                            isBusy ? "bg-yellow-400" : "bg-green-400"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground text-sm font-medium">{emp.name}</span>
                            {empDept && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: empDept.color + "20", color: empDept.color }}>
                                {empDept.name}
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">{emp.role}</p>
                          {currentTask && (
                            <p className="text-yellow-600/80 dark:text-yellow-400/80 text-xs mt-1 truncate">
                              {currentTask}
                            </p>
                          )}
                          {!currentTask && !isBusy && (
                            <p className="text-green-600/60 dark:text-green-400/60 text-xs mt-1">{t("monitor.active", language)}</p>
                          )}
                        </div>
                        <button
                          onClick={() => onChatWithEmployee?.(emp.id)}
                          className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm"
                          title={t("monitor.activity.chat", language)}
                        >
                          💬
                        </button>
                      </div>
                    </div>
                  )
                })}
                {activeEmployees.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">{t("common.noData", language)}</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* سجل الأنشطة المباشر */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              {t("monitor.activityLog", language)}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] sm:h-[400px]">
              <div className="space-y-2">
                {activityFeed.map(activity => (
                  <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-all">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: activity.actorColor }}
                    >
                      {activity.actorName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-xs font-medium">{activity.actorName}</span>
                        <ActivityBadge type={activity.type} language={language} />
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{activity.message}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        {activity.timestamp.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                {activityFeed.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">{t("common.noData", language)}</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* طلبات العمل النشطة */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">{t("monitor.activeWorkOrders", language)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeOrders.map(order => {
              const dept = departments.find(d => d.id === order.assignedDepartmentId)
              const workingOn = (order.subTasks || []).filter(t => t.status === "IN_PROGRESS")
              const completedCount = (order.subTasks || []).filter(t => t.status === "COMPLETED").length
              const totalTasks = (order.subTasks || []).length

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-all"
                  onClick={() => onViewWorkOrder?.(order.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-foreground font-medium text-sm">{order.title}</h4>
                      {dept && (
                        <Badge className="text-[10px]" style={{ backgroundColor: dept.color + "30", color: dept.color }}>
                          {dept.name}
                        </Badge>
                      )}
                    </div>
                    <span className="text-foreground font-bold">{order.progress}%</span>
                  </div>
                  <Progress value={order.progress} className="h-2 mb-2" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {workingOn.map(task => {
                        const assignee = employees.find(e => e.id === task.assigneeId)
                        return assignee ? (
                          <div key={task.id} className="flex items-center gap-1">
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold"
                              style={{ backgroundColor: assignee.avatarColor || "#10b981" }}
                            >
                              {assignee.name.charAt(0)}
                            </div>
                            <span className="text-muted-foreground text-[10px]">{assignee.name}</span>
                          </div>
                        ) : null
                      })}
                    </div>
                    <span className="text-muted-foreground text-xs">{completedCount}/{totalTasks}</span>
                  </div>
                </div>
              )
            })}
            {activeOrders.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">{t("common.noData", language)}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* تقدم التوكن */}
      {company && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">{t("monitor.tokenBudget", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t("tokenBudget.used", language)}</span>
                <span className="text-foreground font-bold">{(tokenUsedMonthly / 1000).toFixed(1)}K / {(tokenBudgetMonthly / 1000).toFixed(0)}K</span>
              </div>
              <Progress value={tokenPercent} className="h-3" />
              <div className="flex items-center justify-between text-xs">
                <span className={`${tokenPercent > 80 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                  {tokenPercent > 80 ? `⚠️ ${t("tokenBudget.alert.critical", language)}!` : `✓ ${t("tokenBudget.alert.normal", language)}`}
                </span>
                <span className="text-muted-foreground">
                  {t("tokenBudget.remaining", language)} {((tokenBudgetMonthly - tokenUsedMonthly) / 1000).toFixed(1)}K {t("tokens.tokens", language)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// مكونات مساعدة
// ============================================

function MonitorCard({ label, value, sub, color, icon }: {
  label: string
  value: string
  sub: string
  color: string
  icon: string
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    red: "text-red-600 dark:text-red-400",
    green: "text-green-600 dark:text-green-400",
  }
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${colorMap[color] || "text-foreground"}`}>{value}</p>
            <p className="text-muted-foreground text-[10px] mt-1">{sub}</p>
          </div>
          <span className="text-2xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityBadge({ type, language }: { type: string; language: "ar" | "en" }) {
  const config: Record<string, { labelKey: string; className: string }> = {
    work_order: { labelKey: "monitor.activity.order", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    employee: { labelKey: "monitor.activity.employee", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    chat: { labelKey: "monitor.activity.chat", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    task: { labelKey: "monitor.activity.task", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  }
  const c = config[type] || config.task
  return <Badge className={`text-[10px] ${c.className}`}>{t(c.labelKey, language)}</Badge>
}
