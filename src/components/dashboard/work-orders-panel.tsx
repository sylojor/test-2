// ============================================
// واجهة طلبات العمل (Work Orders) — نظام الشركات الطبيعي
// المشترك يكتب طلبو → كل قسم يشوف دورو بعملو تلقائي
// → يسلمو للقسم المعني اللي بعدو → لحتى يكمل الطلب
// المشترك يرى: التقدم + اسم القسم + النتيجة + كبسة التسليم
// لا تفاصيل تقنية — لا موديلات — لا تعيين يدوي
// ============================================

"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { IWorkOrder, IWorkOrderTask, IWorkOrderUpdate, IEmployee, IDepartment, WorkOrderStatus } from "@/types"
import { toast } from "sonner"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface WorkOrdersPanelProps {
  companyId: string
  userId: string
  userName: string
  employees: IEmployee[]
  departments: IDepartment[]
  onChatWithEmployee?: (employeeId: string) => void
}

// --- ألوان الحالة — متوافق مع light + dark ---
const STATUS_DISPLAY: Record<string, { label: string; labelEn: string; color: string; bgColor: string; icon: string }> = {
  SUBMITTED: { label: "تم استلام طلبك", labelEn: "Request received", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: "📥" },
  ASSIGNING: { label: "النظام يعمل تلقائياً", labelEn: "System working", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: "⚙️" },
  IN_PROGRESS: { label: "الأقسام تشتغل على طلبك", labelEn: "Departments working", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", icon: "🔧" },
  PARTIALLY_DONE: { label: "جزء من طلبك مكتمل", labelEn: "Partially done", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", icon: "⏳" },
  COMPLETED: { label: "طلبك مكتمل", labelEn: "Completed", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", icon: "✅" },
  CANCELLED: { label: "طلبك ملغى", labelEn: "Cancelled", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", icon: "❌" },
}

// --- ألوان حالة المهمة الفرعية ---
const TASK_STATUS_DISPLAY: Record<string, { label: string; labelEn: string; dotColor: string }> = {
  PENDING: { label: "بانتظار", labelEn: "Waiting", dotColor: "bg-muted-foreground" },
  IN_PROGRESS: { label: "عم يشتغل", labelEn: "Working", dotColor: "bg-blue-500 animate-pulse" },
  COMPLETED: { label: "خلص", labelEn: "Done", dotColor: "bg-green-500" },
  FAILED: { label: "فشل", labelEn: "Failed", dotColor: "bg-red-500" },
  CANCELLED: { label: "ملغى", labelEn: "Cancelled", dotColor: "bg-muted-foreground" },
}

export function WorkOrdersPanel({ companyId, userId, userName, employees, departments, onChatWithEmployee }: WorkOrdersPanelProps) {
  const language = useLocale()
  const [workOrders, setWorkOrders] = useState<IWorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<IWorkOrder | null>(null)
  const [filter, setFilter] = useState<"all" | WorkOrderStatus>("all")

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-orders?companyId=${companyId}`)
      if (res.ok) {
        const data = await res.json()
        setWorkOrders(data.workOrders || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchWorkOrders()
    const interval = setInterval(fetchWorkOrders, 5000)
    return () => clearInterval(interval)
  }, [fetchWorkOrders])

  const handleCreate = async (title: string, description: string, priority: number) => {
    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          createdById: userId,
          createdByName: userName,
          title,
          description,
          priority,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setWorkOrders(prev => [data.workOrder, ...prev])
        setShowCreate(false)
        toast.success(language === "ar" ? "تم استلام طلبك — النظام يعمل تلقائياً" : "Request received — system working automatically")
        setTimeout(fetchWorkOrders, 3000)
      } else {
        const err = await res.json()
        toast.error(err.error || t("common.error", language))
      }
    } catch {
      toast.error(t("common.error", language))
    }
  }

  const handleCancel = async (orderId: string) => {
    try {
      const res = await fetch(`/api/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", data: { updatedByName: userName } }),
      })
      if (res.ok) {
        toast.success(language === "ar" ? "تم إلغاء الطلب" : "Request cancelled")
        fetchWorkOrders()
        setSelectedOrder(null)
      }
    } catch {
      toast.error(t("common.error", language))
    }
  }

  const filteredOrders = filter === "all"
    ? workOrders
    : workOrders.filter(o => o.status === filter)

  const activeOrders = workOrders.filter(o => o.status !== "COMPLETED" && o.status !== "CANCELLED" && o.status !== "PARTIALLY_DONE")
  const completedOrders = workOrders.filter(o => o.status === "COMPLETED" || o.status === "PARTIALLY_DONE")

  if (selectedOrder) {
    return (
      <PipelineDetail
        workOrder={selectedOrder}
        departments={departments}
        language={language}
        onBack={() => { setSelectedOrder(null); fetchWorkOrders() }}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {language === "ar" ? "طلبات العمل" : "Work Orders"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {language === "ar" ? "اكتب طلبك — كل قسم يعمل دوره تلقائياً ويسلم للقسم التالي" : "Submit your request — each department works automatically and passes to the next"}
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]">
              + {language === "ar" ? "طلب جديد" : "New Request"}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border text-foreground" dir={language === "ar" ? "rtl" : "ltr"}>
            <CreateWorkOrderForm onSubmit={handleCreate} language={language} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <QuickStat label={language === "ar" ? "طلبات نشطة" : "Active"} value={activeOrders.length} color="emerald" />
        <QuickStat label={language === "ar" ? "مكتملة" : "Completed"} value={completedOrders.length} color="green" />
        <QuickStat label={language === "ar" ? "متوسط التقدم" : "Avg Progress"} value={`${activeOrders.length > 0 ? Math.round(activeOrders.reduce((sum, o) => sum + o.progress, 0) / activeOrders.length) : 0}%`} color="blue" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: "all" as const, label: language === "ar" ? "كل الطلبات" : "All" },
          { id: "IN_PROGRESS" as const, label: language === "ar" ? "عم يشتغل" : "Working" },
          { id: "COMPLETED" as const, label: language === "ar" ? "مكتمل" : "Done" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === f.id
                ? "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t("common.loading", language)}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-muted-foreground text-lg">
            {language === "ar" ? "لا توجد طلبات — اكتب طلبك والنظام يشتغل تلقائياً" : "No requests yet — submit one and the system works automatically"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => (
            <PipelineCard key={order.id} workOrder={order} departments={departments} language={language} onClick={() => setSelectedOrder(order)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// بطاقة طلب — المشترك يرى: العنوان + التقدم + القسم النشط
// ============================================
function PipelineCard({ workOrder, departments, language, onClick }: {
  workOrder: IWorkOrder; departments: IDepartment[]; language: "ar" | "en"; onClick: () => void
}) {
  const statusDisplay = STATUS_DISPLAY[workOrder.status] || STATUS_DISPLAY.SUBMITTED
  const dept = departments.find(d => d.id === workOrder.assignedDepartmentId)
  const activeSubTasks = workOrder.subTasks?.filter(t => t.status === "IN_PROGRESS") || []
  const currentDept = activeSubTasks.length > 0
    ? departments.find(d => d.id === activeSubTasks[0].departmentId)
    : dept
  const warnings = Array.isArray(workOrder.warnings) ? workOrder.warnings as Array<{ departmentName: string; message: string; affectedPart: string }> : []
  const isReady = workOrder.status === "COMPLETED" || workOrder.status === "PARTIALLY_DONE"

  return (
    <Card className={`hover:border-emerald-500/30 cursor-pointer transition-all ${warnings.length > 0 ? "border-yellow-500/40" : ""}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{statusDisplay.icon}</span>
              <h3 className="font-semibold truncate">{workOrder.title}</h3>
              <Badge className={`${statusDisplay.bgColor} ${statusDisplay.color} text-xs`}>
                {language === "ar" ? statusDisplay.label : statusDisplay.labelEn}
              </Badge>
            </div>

            {/* تنبيهات: قسم مش موجود */}
            {warnings.length > 0 && (
              <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800/30">
                <span className="text-yellow-600 dark:text-yellow-400 text-sm">⚠️</span>
                <span className="text-yellow-700 dark:text-yellow-300 text-xs font-medium">
                  {language === "ar"
                    ? `لا يوجد قسم ${warnings.map(w => w.departmentName).join("، ")} — جزء من الطلب ما رح يكمل`
                    : `Missing ${warnings.map(w => w.departmentName).join(", ")} department — part won't be completed`
                  }
                </span>
              </div>
            )}

            {/* كبسة جاهزة — لو الطلب مكتمل */}
            {isReady && (
              <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-800/30">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm">📦</span>
                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  {language === "ar" ? "الكبسة جاهزة للتسليم!" : "Delivery package ready!"}
                </span>
              </div>
            )}

            {/* القسم النشط */}
            {currentDept && workOrder.status === "IN_PROGRESS" && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  {language === "ar" ? `قسم ${currentDept.name} عم يشتغل` : `${currentDept.name} department is working`}
                </span>
              </div>
            )}

            <div className="text-muted-foreground text-xs mt-1">
              {workOrder.subTasks?.filter(t => t.status === "COMPLETED").length || 0}/{workOrder.subTasks?.length || 0} {language === "ar" ? "مكتمل" : "done"}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 min-w-[100px]">
            <span className="font-bold text-lg">{workOrder.progress}%</span>
            <Progress value={workOrder.progress} className="w-24 h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// تفاصيل الطلب — pipeline + كبسة التسليم
// ============================================
function PipelineDetail({ workOrder, departments, language, onBack, onCancel }: {
  workOrder: IWorkOrder; departments: IDepartment[]; language: "ar" | "en"; onBack: () => void; onCancel: (orderId: string) => void
}) {
  const statusDisplay = STATUS_DISPLAY[workOrder.status] || STATUS_DISPLAY.SUBMITTED
  const warnings = Array.isArray(workOrder.warnings) ? workOrder.warnings as Array<{ departmentName: string; message: string; affectedPart: string }> : []
  const isReady = workOrder.status === "COMPLETED" || workOrder.status === "PARTIALLY_DONE"
  const completedTasks = workOrder.subTasks?.filter(t => t.status === "COMPLETED") || []

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* رأس */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          {language === "ar" ? "← رجوع" : "← Back"}
        </Button>
      </div>

      {/* بطاقة الحالة */}
      <Card className={warnings.length > 0 ? "border-yellow-500/40" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{statusDisplay.icon}</span>
            <div>
              <h2 className="font-bold text-xl">{workOrder.title}</h2>
              <Badge className={`${statusDisplay.bgColor} ${statusDisplay.color}`}>
                {language === "ar" ? statusDisplay.label : statusDisplay.labelEn}
              </Badge>
            </div>
          </div>

          <p className="text-foreground mb-4">{workOrder.description}</p>

          {/* تنبيهات */}
          {warnings.length > 0 && (
            <div className="mb-4 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
                <h3 className="text-yellow-700 dark:text-yellow-300 font-semibold">
                  {language === "ar" ? "تنبيه: أقسام مش موجودة" : "Warning: Missing departments"}
                </h3>
              </div>
              <div className="space-y-2">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-700 dark:text-yellow-200 text-sm font-medium">
                        {language === "ar" ? `قسم ${w.departmentName} مش موجود` : `${w.departmentName} department not available`}
                      </p>
                      <p className="text-yellow-600/70 dark:text-yellow-100/70 text-xs">
                        {language === "ar" ? `جزء "${w.affectedPart}" ما رح يكمل` : `"${w.affectedPart}" part won't be completed`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-yellow-600/80 dark:text-yellow-300/80 text-xs mt-3">
                {language === "ar" ? "الأقسام المتوفرة رح تعمل اللي يقدروا عليه — بس هاد الجزء ما رح يكمل." : "Available departments will do what they can — but this part won't be completed."}
              </p>
            </div>
          )}

          {/* شريط التقدم */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{language === "ar" ? "التقدم" : "Progress"}</span>
              <span className="font-bold text-xl">{workOrder.progress}%</span>
            </div>
            <Progress value={workOrder.progress} className="h-4" />
          </div>

          {workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELLED" && workOrder.status !== "PARTIALLY_DONE" && (
            <div className="mt-4">
              <Button variant="outline" onClick={() => onCancel(workOrder.id)} className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20">
                {language === "ar" ? "إلغاء الطلب" : "Cancel Request"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Pipeline Timeline ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{language === "ar" ? "خط سير العمل" : "Workflow Pipeline"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {workOrder.subTasks?.map((task, index) => {
            const taskDept = departments.find(d => d.id === task.departmentId)
            const taskStatus = TASK_STATUS_DISPLAY[task.status] || TASK_STATUS_DISPLAY.PENDING
            const isLast = index === (workOrder.subTasks?.length || 0) - 1

            return (
              <div key={task.id} className="relative">
                {!isLast && <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />}
                <div className={`flex items-start gap-4 p-4 rounded-lg transition-all ${
                  task.status === "IN_PROGRESS"
                    ? "bg-emerald-100/50 dark:bg-emerald-900/10 border border-emerald-300 dark:border-emerald-800/30"
                    : task.status === "COMPLETED"
                    ? "bg-muted/30"
                    : ""
                }`}>
                  <div className={`w-3 h-3 rounded-full mt-2 ${taskStatus.dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {taskDept && (
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: taskDept.color + "30", color: taskDept.color }}>
                          {taskDept.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {language === "ar" ? taskStatus.label : taskStatus.labelEn}
                      </span>
                    </div>

                    <h4 className={`text-sm font-medium ${
                      task.status === "COMPLETED" ? "text-green-600 dark:text-green-400" : ""
                    }`}>
                      {task.title}
                    </h4>

                    {/* نتيجة القسم — كل قسم بعرض شو عمل */}
                    {task.status === "COMPLETED" && task.result && (
                      <div className="mt-2 p-3 rounded-lg bg-green-100/50 dark:bg-green-900/10 border border-green-300 dark:border-green-800/20">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                          {language === "ar" ? "شو عمل القسم:" : "What the department did:"}
                        </p>
                        <p className="text-foreground text-sm leading-relaxed">{task.result}</p>
                      </div>
                    )}

                    {task.status === "IN_PROGRESS" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs animate-pulse">
                          {language === "ar" ? "القسم عم يشتغل..." : "Department is working..."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* ===== كبسة جاهزة للتسليم ===== */}
      {isReady && completedTasks.length > 0 && (
        <Card className="border-emerald-500/40">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <CardTitle className="text-lg">
                {language === "ar" ? "الكبسة جاهزة للتسليم" : "Delivery Package Ready"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {language === "ar"
                ? "كل الأقسام أنهت شغلها — هاد الكبسة الجاهزة. اختار شو بدك تعمل:"
                : "All departments finished their work — here's the delivery package. Choose what to do:"
              }
            </p>

            {/* نتائج كل قسم مجمّعة */}
            <div className="space-y-3">
              {completedTasks.map((task) => {
                const taskDept = departments.find(d => d.id === task.departmentId)
                return (
                  <div key={task.id} className="p-4 rounded-lg bg-emerald-100/30 dark:bg-emerald-900/10 border border-emerald-300 dark:border-emerald-800/20">
                    <div className="flex items-center gap-2 mb-2">
                      {taskDept && (
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: taskDept.color + "30", color: taskDept.color }}>
                          {taskDept.name}
                        </span>
                      )}
                      <span className="text-green-600 dark:text-green-400 text-sm font-medium">{task.title}</span>
                    </div>
                    {task.result && (
                      <p className="text-foreground text-sm leading-relaxed">{task.result}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* التنبيهات بالكبسة */}
            {warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/10 border border-yellow-300 dark:border-yellow-800/20">
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  {language === "ar"
                    ? `⚠️ تنبيه: ${warnings.length} قسم مش موجود — ${warnings.map(w => `"${w.affectedPart}"`).join("، ")} ما رح يكمل`
                    : `⚠️ Note: ${warnings.length} departments missing — ${warnings.map(w => `"${w.affectedPart}"`).join(", ")} won't be completed`
                  }
                </p>
              </div>
            )}

            {/* أفعال المشترك */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]" onClick={onBack}>
                {language === "ar" ? "✅ أخذت الكبسة — خلص" : "✅ I received it — Done"}
              </Button>
              <Button variant="outline" className="border-border min-h-[44px]" onClick={onBack}>
                {language === "ar" ? "📝 بدي أشوف التفاصيل أكثر" : "📝 View more details"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* سجل التحديثات */}
      {workOrder.updates && workOrder.updates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{language === "ar" ? "التحديثات" : "Updates"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {workOrder.updates.map(update => (
                  <div key={update.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      update.type === "WARNING" ? "bg-yellow-500" :
                      update.type === "COMPLETION" ? "bg-green-500" :
                      update.type === "HANDOFF" ? "bg-yellow-500" :
                      update.type === "ASSIGNMENT" ? "bg-blue-500" :
                      "bg-muted-foreground"
                    }`} />
                    <div className={`flex-1 min-w-0 ${
                      update.type === "WARNING" ? "bg-yellow-100/50 dark:bg-yellow-900/10 p-2 rounded-lg" : ""
                    }`}>
                      <p className={`${update.type === "WARNING" ? "text-yellow-700 dark:text-yellow-300" : "text-foreground"} text-sm`}>{update.content}</p>
                      <span className="text-muted-foreground text-xs">
                        {new Date(update.createdAt).toLocaleTimeString(language === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// نموذج إنشاء طلب — المشترك يكتب طلبو فقط
// ============================================
function CreateWorkOrderForm({ onSubmit, language }: { onSubmit: (title: string, description: string, priority: number) => void; language: "ar" | "en" }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState(5)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    onSubmit(title.trim(), description.trim(), priority)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{language === "ar" ? "طلب جديد" : "New Request"}</DialogTitle>
      </DialogHeader>
      <p className="text-muted-foreground text-sm mt-2">
        {language === "ar"
          ? "اكتب طلبك — النظام يحدد الأقسام المناسبة ويشغلها تلقائياً. كل قسم يعمل دوره ويسلم للقسم التالي لحتى يكمل طلبك. بالنهاية تلقي كبسة جاهزة للتسليم."
          : "Write your request — the system identifies relevant departments and runs them automatically. Each department does its part and passes to the next. At the end you get a ready delivery package."}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <label className="text-foreground text-sm">{language === "ar" ? "عنوان الطلب" : "Request title"}</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={language === "ar" ? "مثلاً: أريد تقرير مالي شامل" : "E.g.: Comprehensive financial report"} className="bg-background border-border text-foreground" />
        </div>
        <div className="space-y-2">
          <label className="text-foreground text-sm">{language === "ar" ? "وصف الطلب" : "Request description"}</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={language === "ar" ? "اشرح شو بدك بالتفصيل..." : "Explain what you need..."} className="bg-background border-border text-foreground min-h-[120px]" />
        </div>
        <div className="space-y-2">
          <label className="text-foreground text-sm">{language === "ar" ? `الأولوية: ${priority}` : `Priority: ${priority}`}</label>
          <Input type="range" min={1} max={10} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full" />
        </div>
        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
          {language === "ar" ? "إرسال الطلب — النظام يشتغل تلقائياً" : "Submit — system works automatically"}
        </Button>
      </form>
    </>
  )
}

// ============================================
// مكونات مساعدة
// ============================================

function QuickStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
  }
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold ${colorMap[color] || ""}`}>{value}</p>
        <p className="text-muted-foreground text-xs mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}
