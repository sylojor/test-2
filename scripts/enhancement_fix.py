#!/usr/bin/env python3
"""
Enhancement script for BlivoAI:
1. Fix department-chat syntax error + light mode colors
2. Enhance work-orders with approve/reject workflow
3. Enhance work-orders API with approve/reject action
4. Add i18n translations for new features
"""

import paramiko
import os

SSH_HOST = "141.95.55.5"
SSH_USER = "ubuntu"
SSH_PASSWORD = "Mghazi@199641"
PROJECT_DIR = "/home/ubuntu/blivoai-demo"

def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SSH_HOST, port=22, username=SSH_USER, password=SSH_PASSWORD)
    return client

def read_file(client, filepath):
    sftp = client.open_sftp()
    with sftp.open(filepath, 'r') as f:
        content = f.read().decode('utf-8')
    sftp.close()
    return content

def write_file(client, filepath, content):
    sftp = client.open_sftp()
    with sftp.open(filepath, 'w') as f:
        f.write(content.encode('utf-8'))
    sftp.close()
    print(f"  ✓ Written: {filepath}")

def main():
    client = ssh_connect()
    
    # ============================================
    # 1. FIX DEPARTMENT CHAT - syntax + light mode
    # ============================================
    print("\n=== Fixing department-chat ===")
    
    filepath = f"{PROJECT_DIR}/src/components/chat/department-chat-panel.tsx"
    content = read_file(client, filepath)
    
    # Fix syntax error: const essages, setMessages]
    content = content.replace("const essages, setMessages]", "const [messages, setMessages]")
    # Fix dependency array: }, essages])
    content = content.replace("}, essages])", "}, [messages])")
    
    # Fix light mode colors
    content = content.replace("bg-muted text-slate-200 rounded-br-md", "bg-muted text-foreground rounded-br-md")
    content = content.replace("bg-slate-500 rounded-full animate-bounce", "bg-muted-foreground/50 rounded-full animate-bounce")
    
    write_file(client, filepath, content)
    
    # ============================================
    # 2. ENHANCE WORK ORDERS API - approve/reject
    # ============================================
    print("\n=== Enhancing work orders API ===")
    
    filepath = f"{PROJECT_DIR}/src/app/api/work-orders/[id]/route.ts"
    content = read_file(client, filepath)
    
    # Add approve_task and reject_task cases to the switch statement
    # Find the "case "cancel"" section and add new cases before it
    
    old_cancel_section = '''      // === إلغاء طلب ===
      case "cancel": {'''
    
    new_cases_and_cancel = '''      // === الموافقة على مهمة فرعية ===
      case "approve_task": {
        const { taskId, note } = data
        const task = await db.workOrderTask.update({
          where: { id: taskId },
          data: {
            status: "COMPLETED",
            approvedAt: new Date(),
            approvedBy: data.approvedBy || "MANAGER",
            result: note || "تمت الموافقة من المدير",
          },
        })

        // حساب التقدم الجديد
        const allTasks = await db.workOrderTask.findMany({
          where: { workOrderId: id },
        })
        const completedCount = allTasks.filter(t => t.status === "COMPLETED").length
        const newProgress = Math.round((completedCount / allTasks.length) * 100)
        const newStatus = newProgress === 100 ? "COMPLETED" : newProgress > 0 ? "IN_PROGRESS" : existing.status

        await db.workOrder.update({
          where: { id },
          data: {
            progress: newProgress,
            status: newStatus,
            completedAt: newProgress === 100 ? new Date() : undefined,
          },
        })

        // إضافة تحديث
        await db.workOrderUpdate.create({
          data: {
            workOrderId: id,
            updatedByType: "USER",
            updatedByName: data.approvedByName || "المدير",
            content: note
              ? `تمت الموافقة على "${task.title}" — ${note}`
              : `تمت الموافقة على "${task.title}"`,
            type: "COMPLETION",
          },
        })

        // تفعيل المهمة التالية تلقائياً
        const nextTask = allTasks
          .filter(t => t.status === "PENDING")
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]

        if (nextTask) {
          await db.workOrderTask.update({
            where: { id: nextTask.id },
            data: { status: "IN_PROGRESS" },
          })
          await db.workOrderUpdate.create({
            data: {
              workOrderId: id,
              updatedByType: "SYSTEM",
              updatedByName: "النظام",
              content: `تم تفعيل المهمة التالية: "${nextTask.title}"`,
              type: "ASSIGNMENT",
            },
          })
        }

        return NextResponse.json({ progress: newProgress, status: newStatus, nextTaskId: nextTask?.id })
      }

      // === رفض مهمة فرعية ===
      case "reject_task": {
        const { taskId, note } = data
        const task = await db.workOrderTask.update({
          where: { id: taskId },
          data: {
            status: "FAILED",
            rejectedAt: new Date(),
            rejectedBy: data.rejectedBy || "MANAGER",
            result: note || "تم الرفض من المدير",
          },
        })

        // إضافة تحديث
        await db.workOrderUpdate.create({
          data: {
            workOrderId: id,
            updatedByType: "USER",
            updatedByName: data.rejectedByName || "المدير",
            content: note
              ? `تم رفض "${task.title}" — ${note}. المهمة رح تعاد للموظف.`
              : `تم رفض "${task.title}". المهمة رح تعاد للموظف.`,
            type: "STATUS_CHANGE",
          },
        })

        // إعادة تعيين المهمة — الموظف يحاول مرة أخرى
        await db.workOrderTask.update({
          where: { id: taskId },
          data: {
            status: "IN_PROGRESS",
            // إزالة result ليشتغل عليها من جديد
            result: null,
          },
        })

        return NextResponse.json({ success: true })
      }

      // === إلغاء طلب ===
      case "cancel": {'''
    
    content = content.replace(old_cancel_section, new_cases_and_cancel)
    
    write_file(client, filepath, content)
    
    # ============================================
    # 3. ENHANCE WORK ORDERS PANEL - approve/reject UI + workflow visualization
    # ============================================
    print("\n=== Enhancing work-orders panel ===")
    
    filepath = f"{PROJECT_DIR}/src/components/dashboard/work-orders-panel.tsx"
    content = read_file(client, filepath)
    
    # Add approve/reject handlers to the WorkOrdersPanel main component
    # Find the handleCompleteTask function and add new handlers after it
    
    old_complete_handler = '''  // --- إكمال مهمة فرعية ---
  const handleCompleteTask = async (orderId: string, taskId: string, result: string) => {
    try {
      const res = await fetch(`/api/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_task",
          data: { taskId, result },
        }),
      })

      if (res.ok) {
        toast.success(t("common.success", language))
        fetchWorkOrders()
        // تحديث الطلب المفتوح
        if (selectedOrder?.id === orderId) {
          const detailRes = await fetch(`/api/work-orders/${orderId}`)
          if (detailRes.ok) {
            const detailData = await detailRes.json()
            setSelectedOrder(detailData.workOrder)
          }
        }
      }
    } catch {
      toast.error(t("common.error", language))
    }
  }'''
    
    new_handlers = '''  // --- إكمال مهمة فرعية ---
  const handleCompleteTask = async (orderId: string, taskId: string, result: string) => {
    try {
      const res = await fetch(`/api/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_task",
          data: { taskId, result },
        }),
      })

      if (res.ok) {
        toast.success(t("common.success", language))
        fetchWorkOrders()
        // تحديث الطلب المفتوح
        if (selectedOrder?.id === orderId) {
          const detailRes = await fetch(`/api/work-orders/${orderId}`)
          if (detailRes.ok) {
            const detailData = await detailRes.json()
            setSelectedOrder(detailData.workOrder)
          }
        }
      }
    } catch {
      toast.error(t("common.error", language))
    }
  }

  // --- الموافقة على مهمة ---
  const handleApproveTask = async (orderId: string, taskId: string, note?: string) => {
    try {
      const res = await fetch(`/api/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_task",
          data: {
            taskId,
            note: note || "",
            approvedBy: "MANAGER",
            approvedByName: userName,
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(language === "ar" ? "تمت الموافقة على المهمة" : "Task approved")
        if (data.nextTaskId) {
          toast.info(language === "ar" ? "تم تفعيل المهمة التالية تلقائياً" : "Next task activated automatically")
        }
        fetchWorkOrders()
        if (selectedOrder?.id === orderId) {
          const detailRes = await fetch(`/api/work-orders/${orderId}`)
          if (detailRes.ok) {
            const detailData = await detailRes.json()
            setSelectedOrder(detailData.workOrder)
          }
        }
      }
    } catch {
      toast.error(t("common.error", language))
    }
  }

  // --- رفض مهمة ---
  const handleRejectTask = async (orderId: string, taskId: string, note?: string) => {
    try {
      const res = await fetch(`/api/work-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject_task",
          data: {
            taskId,
            note: note || "",
            rejectedBy: "MANAGER",
            rejectedByName: userName,
          },
        }),
      })

      if (res.ok) {
        toast.warning(language === "ar" ? "تم رفض المهمة — رح تعاد للموظف" : "Task rejected — will be reassigned to employee")
        fetchWorkOrders()
        if (selectedOrder?.id === orderId) {
          const detailRes = await fetch(`/api/work-orders/${orderId}`)
          if (detailRes.ok) {
            const detailData = await detailRes.json()
            setSelectedOrder(detailData.workOrder)
          }
        }
      }
    } catch {
      toast.error(t("common.error", language))
    }
  }'''
    
    content = content.replace(old_complete_handler, new_handlers)
    
    # Update WorkOrdersPanel to pass approve/reject handlers to detail view
    # Find where WorkOrderDetail is called and add new props
    content = content.replace(
        '''      <WorkOrderDetail
        workOrder={selectedOrder}
        employees={employees}
        departments={departments}
        language={language}
        onBack={() => { setSelectedOrder(null); fetchWorkOrders() }}
        onCompleteTask={handleCompleteTask}
        onCancel={handleCancel}
        onChatWithEmployee={onChatWithEmployee}
      />''',
        '''      <WorkOrderDetail
        workOrder={selectedOrder}
        employees={employees}
        departments={departments}
        language={language}
        onBack={() => { setSelectedOrder(null); fetchWorkOrders() }}
        onCompleteTask={handleCompleteTask}
        onApproveTask={handleApproveTask}
        onRejectTask={handleRejectTask}
        onCancel={handleCancel}
        onChatWithEmployee={onChatWithEmployee}
      />'''
    )
    
    # Update WorkOrderDetail component definition and add approve/reject UI
    # Find the WorkOrderDetail function signature
    content = content.replace(
        '''function WorkOrderDetail({
  workOrder,
  employees,
  departments,
  language,
  onBack,
  onCompleteTask,
  onCancel,
  onChatWithEmployee,
}: {
  workOrder: IWorkOrder
  employees: IEmployee[]
  departments: IDepartment[]
  language: "ar" | "en"
  onBack: () => void
  onCompleteTask: (orderId: string, taskId: string, result: string) => void
  onCancel: (orderId: string) => void
  onChatWithEmployee?: (employeeId: string) => void
})''',
        '''function WorkOrderDetail({
  workOrder,
  employees,
  departments,
  language,
  onBack,
  onCompleteTask,
  onApproveTask,
  onRejectTask,
  onCancel,
  onChatWithEmployee,
}: {
  workOrder: IWorkOrder
  employees: IEmployee[]
  departments: IDepartment[]
  language: "ar" | "en"
  onBack: () => void
  onCompleteTask: (orderId: string, taskId: string, result: string) => void
  onApproveTask: (orderId: string, taskId: string, note?: string) => void
  onRejectTask: (orderId: string, taskId: string, note?: string) => void
  onCancel: (orderId: string) => void
  onChatWithEmployee?: (employeeId: string) => void
})'''
    )
    
    # Add approveNote state and replace the task completion UI
    # Find the task result state and add approveNote
    content = content.replace(
        "const [taskResult, setTaskResult] = useState<Record<string, string>>({})",
        "const [taskResult, setTaskResult] = useState<Record<string, string>>({})\n  const [approveNote, setApproveNote] = useState<Record<string, string>>({})"
    )
    
    # Now enhance the task rendering to show workflow chain + approve/reject buttons
    # Replace the existing task rendering section with enhanced version that includes:
    # 1. Workflow step number indicator
    # 2. "Pending Approval" status
    # 3. Approve/Reject buttons for tasks that need approval
    
    # Find the task completion button section and add approve/reject buttons
    old_task_actions = '''                  {/* إكمال المهمة */}
                  {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="..."
                        value={taskResult[task.id] || ""}
                        onChange={(e) => setTaskResult(prev => ({ ...prev, [task.id]: e.target.value }))}
                        className="w-32 h-8 text-xs bg-muted border-border"
                      />
                      <Button
                        size="sm"
                        onClick={() => onCompleteTask(workOrder.id, task.id, taskResult[task.id] || "")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-foreground h-8 text-xs"
                      >
                        ✓
                      </Button>
                    </div>
                  )}'''
    
    new_task_actions = '''                  {/* إكمال المهمة + الموافقة/الرفض */}
                  {task.status === "IN_PROGRESS" && (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={language === "ar" ? "نتيجة..." : "Result..."}
                        value={taskResult[task.id] || ""}
                        onChange={(e) => setTaskResult(prev => ({ ...prev, [task.id]: e.target.value }))}
                        className="w-32 h-8 text-xs bg-muted border-border"
                      />
                      <Button
                        size="sm"
                        onClick={() => onCompleteTask(workOrder.id, task.id, taskResult[task.id] || "")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                      >
                        ✓ {language === "ar" ? "إكمال" : "Done"}
                      </Button>
                    </div>
                  )}
                  {/* المهمة مكتملة — عرض للموافقة/الرفض */}
                  {task.status === "COMPLETED" && !task.approvedAt && (
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder={language === "ar" ? "ملاحظة الموافقة..." : "Approval note..."}
                        value={approveNote[task.id] || ""}
                        onChange={(e) => setApproveNote(prev => ({ ...prev, [task.id]: e.target.value }))}
                        className="w-40 h-8 text-xs bg-muted border-border"
                      />
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => onApproveTask(workOrder.id, task.id, approveNote[task.id])}
                          className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                        >
                          ✓ {language === "ar" ? "موافقة" : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onRejectTask(workOrder.id, task.id, approveNote[task.id])}
                          className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs"
                        >
                          ✗ {language === "ar" ? "رفض" : "Reject"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* المهمة مرفوضة — إعادة */}
                  {task.status === "FAILED" && (
                    <div className="text-xs text-red-400">
                      {language === "ar" ? "⚠ مرفوضة — رح تعاد للموظف" : "⚠ Rejected — will be reassigned"}
                    </div>
                  )}'''
    
    content = content.replace(old_task_actions, new_task_actions)
    
    # Add workflow step number to each task
    # Find the task title rendering and add step number
    content = content.replace(
        '''                      <span className={`text-sm font-medium ${task.status === "COMPLETED" ? "text-green-400 line-through" : "text-foreground"}`}>
                        {task.title}
                      </span>''',
        '''                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground h-5 mr-1">
                        #{taskIdx + 1}
                      </Badge>
                      <span className={`text-sm font-medium ${task.status === "COMPLETED" && task.approvedAt ? "text-green-400" : task.status === "COMPLETED" ? "text-yellow-400" : task.status === "FAILED" ? "text-red-400" : "text-foreground"}`}>
                        {task.title}
                      </span>'''
    )
    
    # Add taskIdx variable - need to add it to the map function
    # Find: workOrder.subTasks?.map(task => 
    # Replace: workOrder.subTasks?.map((task, taskIdx) =>
    content = content.replace(
        "workOrder.subTasks?.map(task => {",
        "workOrder.subTasks?.map((task, taskIdx) => {"
    )
    
    # Add approvedAt display for approved tasks
    content = content.replace(
        '''                    {task.result && (
                      <p className="text-muted-foreground text-xs mt-2 bg-muted/50 p-2 rounded">
                        {task.result}
                      </p>
                    )}''',
        '''                    {task.result && (
                      <p className="text-muted-foreground text-xs mt-2 bg-muted/50 p-2 rounded">
                        {task.result}
                      </p>
                    )}
                    {task.approvedAt && (
                      <p className="text-green-500/70 text-[10px] mt-1">
                        ✓ {language === "ar" ? "تمت الموافقة" : "Approved"} — {new Date(task.approvedAt).toLocaleTimeString(language === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}'''
    )
    
    # Also update the TaskStatusBadge to include "PENDING_APPROVAL" and "REJECTED"
    # Find the TaskStatusBadge config and add new statuses
    old_task_badge_config = '''const config: Record<string, { labelKey: string; className: string }> = {
    PENDING: { labelKey: "requests.pending", className: "bg-muted text-muted-foreground" },
    IN_PROGRESS: { labelKey: "workOrders.inProgress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    COMPLETED: { labelKey: "workOrders.completed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    FAILED: { labelKey: "common.error", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    CANCELLED: { labelKey: "workOrders.cancelled", className: "bg-muted text-muted-foreground" },
  }'''
    
    new_task_badge_config = '''const config: Record<string, { labelKey: string; className: string }> = {
    PENDING: { labelKey: "requests.pending", className: "bg-muted text-muted-foreground" },
    IN_PROGRESS: { labelKey: "workOrders.inProgress", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    COMPLETED: { labelKey: "workOrders.completed", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    APPROVED: { labelKey: "workOrders.approved", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    FAILED: { labelKey: "workOrders.rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    CANCELLED: { labelKey: "workOrders.cancelled", className: "bg-muted text-muted-foreground" },
  }'''
    
    content = content.replace(old_task_badge_config, new_task_badge_config)
    
    write_file(client, filepath, content)
    
    # ============================================
    # 4. ADD i18n TRANSLATIONS FOR NEW WORKFLOW FEATURES
    # ============================================
    print("\n=== Adding i18n translations ===")
    
    filepath = f"{PROJECT_DIR}/src/lib/i18n.ts"
    content = read_file(client, filepath)
    
    # Find the Arabic translations section and add new keys
    # Find a unique marker in the Arabic section to insert after
    
    # Add Arabic translations for workflow/approve/reject
    # Find "workOrders.cancelled": in the Arabic section
    content = content.replace(
        '"workOrders.cancelled": "ملغى"',
        '"workOrders.cancelled": "ملغى",\n    "workOrders.approved": "تمت الموافقة",\n    "workOrders.rejected": "مرفوض",\n    "workOrders.pendingApproval": "بانتظار الموافقة",\n    "workOrders.approveNote": "ملاحظة الموافقة",\n    "workOrders.rejectNote": "ملاحظة الرفض",\n    "workOrders.approve": "موافقة",\n    "workOrders.rejectTask": "رفض",\n    "workOrders.autoNext": "تم تفعيل المهمة التالية تلقائياً"'
    )
    
    # Add English translations for workflow/approve/reject
    content = content.replace(
        '"workOrders.cancelled": "Cancelled"',
        '"workOrders.cancelled": "Cancelled",\n    "workOrders.approved": "Approved",\n    "workOrders.rejected": "Rejected",\n    "workOrders.pendingApproval": "Pending Approval",\n    "workOrders.approveNote": "Approval note",\n    "workOrders.rejectNote": "Rejection note",\n    "workOrders.approve": "Approve",\n    "workOrders.rejectTask": "Reject",\n    "workOrders.autoNext": "Next task activated automatically"'
    )
    
    write_file(client, filepath, content)
    
    # ============================================
    # 5. UPDATE Prisma schema for approve/reject fields
    # ============================================
    print("\n=== Updating Prisma schema ===")
    
    filepath = f"{PROJECT_DIR}/prisma/schema.prisma"
    content = read_file(client, filepath)
    
    # Add approvedAt, approvedBy, rejectedAt, rejectedBy fields to WorkOrderTask
    # after the completedAt field
    content = content.replace(
        "  completedAt     DateTime?",
        "  completedAt     DateTime?\n  approvedAt     DateTime?\n  approvedBy     String?\n  rejectedAt     DateTime?\n  rejectedBy     String?"
    )
    
    write_file(client, filepath, content)
    
    # ============================================
    # 6. VERIFY ALL CHANGES
    # ============================================
    print("\n=== Verification ===")
    
    # Check department chat syntax
    filepath = f"{PROJECT_DIR}/src/components/chat/department-chat-panel.tsx"
    content = read_file(client, filepath)
    if "const [messages, setMessages]" in content and "}, [messages])" in content:
        print("  ✓ department-chat syntax fixed")
    else:
        print("  ✗ department-chat syntax NOT fixed!")
    
    # Check work orders API has approve/reject
    filepath = f"{PROJECT_DIR}/src/app/api/work-orders/[id]/route.ts"
    content = read_file(client, filepath)
    if "approve_task" in content and "reject_task" in content:
        print("  ✓ work-orders API has approve/reject")
    else:
        print("  ✗ work-orders API missing approve/reject!")
    
    # Check work-orders panel has approve/reject handlers
    filepath = f"{PROJECT_DIR}/src/components/dashboard/work-orders-panel.tsx"
    content = read_file(client, filepath)
    if "handleApproveTask" in content and "handleRejectTask" in content:
        print("  ✓ work-orders panel has approve/reject UI")
    else:
        print("  ✗ work-orders panel missing approve/reject UI!")
    
    # Check i18n has new keys
    filepath = f"{PROJECT_DIR}/src/lib/i18n.ts"
    content = read_file(client, filepath)
    if "workOrders.approved" in content and "workOrders.rejected" in content:
        print("  ✓ i18n has new translations")
    else:
        print("  ✗ i18n missing new translations!")
    
    # Check Prisma schema has new fields
    filepath = f"{PROJECT_DIR}/prisma/schema.prisma"
    content = read_file(client, filepath)
    if "approvedAt" in content and "rejectedAt" in content:
        print("  ✓ Prisma schema has approve/reject fields")
    else:
        print("  ✗ Prisma schema missing fields!")
    
    client.close()
    print("\n=== All enhancements applied! ===")

if __name__ == "__main__":
    main()
