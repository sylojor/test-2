#!/usr/bin/env python3
"""
Write the completely redesigned department-chat-panel.tsx
Features:
- Departments shown as cards
- Click department card to select all employees
- Deselect individual employees
- "Select Entire Company" button
- Start conversation with selected employees
- Employees who didn't work on the topic say "I didn't work on this part"
"""

import paramiko

NEW_PANEL = r'''// ============================================
// لوحة محادثة القسم — النسخة الجديدة بالبطاقات
// 
// الأقسام كبطاقات → اختيار الموظفين → بدء المحادثة
// الموظف اللي ما اشتغل على الموضوع بيقول: "أنا ما اشتغلت على هاي الجزئية"
// ============================================

"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ICompany, IEmployee, IDepartment } from "@/types"
import { t } from "@/lib/i18n"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"
import { ArrowLeft, Users, Building2, MessageSquare, X, Check, ChevronRight } from "lucide-react"

interface DepartmentChatPanelProps {
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  selectedDepartmentId: string | null
}

interface ChatMessage {
  id: string
  senderType: "USER" | "EMPLOYEE" | "SYSTEM"
  senderName: string
  senderRole?: string
  content: string
  timestamp: Date
  departmentName?: string
}

// --- ألوان الموظفين ---
const EMPLOYEE_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
]

export function DepartmentChatPanel({
  company,
  employees,
  departments,
  selectedDepartmentId,
}: DepartmentChatPanelProps) {
  const language = useLocale()
  const isArabic = language === "ar"

  // --- حالة الاختيار ---
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [chatStarted, setChatStarted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState<string | null>(null)
  const [expandedDept, setExpandedDept] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // الموظفين النشطين
  const activeEmployees = employees.filter(e => e.status === "ACTIVE")

  // --- وظائف الاختيار ---
  const toggleDepartment = (deptId: string) => {
    const deptEmps = activeEmployees.filter(e => e.departmentId === deptId)
    const deptEmpIds = deptEmps.map(e => e.id)
    
    setSelectedEmployeeIds(prev => {
      const newSet = new Set(prev)
      // إذا كل موظفين القسم محددين → شيلهم
      const allSelected = deptEmpIds.every(id => newSet.has(id))
      if (allSelected) {
        deptEmpIds.forEach(id => newSet.delete(id))
      } else {
        // أضف كل موظفين القسم
        deptEmpIds.forEach(id => newSet.add(id))
      }
      return newSet
    })
  }

  const selectEntireCompany = () => {
    if (selectedEmployeeIds.size === activeEmployees.length) {
      // إذا كلهم محددين → شيل الكل
      setSelectedEmployeeIds(new Set())
    } else {
      // حدد الكل
      setSelectedEmployeeIds(new Set(activeEmployees.map(e => e.id)))
    }
  }

  const toggleEmployee = (empId: string) => {
    setSelectedEmployeeIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(empId)) {
        newSet.delete(empId)
      } else {
        newSet.add(empId)
      }
      return newSet
    })
  }

  const isDepartmentFullySelected = (deptId: string) => {
    const deptEmps = activeEmployees.filter(e => e.departmentId === deptId)
    return deptEmps.length > 0 && deptEmps.every(e => selectedEmployeeIds.has(e.id))
  }

  const isDepartmentPartiallySelected = (deptId: string) => {
    const deptEmps = activeEmployees.filter(e => e.departmentId === deptId)
    return deptEmps.some(e => selectedEmployeeIds.has(e.id)) && !deptEmps.every(e => selectedEmployeeIds.has(e.id))
  }

  const startChat = () => {
    if (selectedEmployeeIds.size === 0) return
    setChatStarted(true)
    const selectedCount = selectedEmployeeIds.size
    const systemMsg = isArabic
      ? `تم بدء المحادثة مع ${selectedCount} موظف. اسأل سؤال وكلهم رح يردوا عليك!`
      : `Chat started with ${selectedCount} employee(s). Ask a question and they will all respond!`
    setMessages([{
      id: "system-start",
      senderType: "SYSTEM",
      senderName: isArabic ? "النظام" : "System",
      content: systemMsg,
      timestamp: new Date(),
    }])
  }

  const backToSelection = () => {
    setChatStarted(false)
    setMessages([])
    setInput("")
  }

  // تمرير تلقائي
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // --- إرسال رسالة ---
  const handleSend = async () => {
    if (!input.trim() || selectedEmployeeIds.size === 0) return
    const messageText = input.trim()

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      senderType: "USER",
      senderName: isArabic ? "أنت" : "You",
      content: messageText,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")

    // الموظفين المختارين
    const selectedEmps = activeEmployees.filter(e => selectedEmployeeIds.has(e.id))

    for (const emp of selectedEmps) {
      setIsTyping(emp.id)
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: emp.id,
            message: `[محادثة جماعية — ${selectedEmps.length} موظف] ${messageText}`,
            companyId: company?.id,
            language,
            chatHistory: messages
              .filter(m => m.id !== "system-start")
              .slice(-8)
              .map(m => ({
                role: m.senderType === "USER" ? "user" : "assistant",
                content: m.content,
              })),
          }),
        })

        let replyContent: string
        if (res.ok) {
          const data = await res.json()
          replyContent = data.reply || data.content || ""
        } else {
          replyContent = isArabic ? 'عندي مشكلة بالاتصال هسا. ممكن تجرب بعد شوي؟' : 'I\'m having trouble connecting right now. Please try again in a moment.'
        }

        if (!replyContent) {
          replyContent = isArabic ? 'عندي مشكلة بالاتصال هسا. ممكن تجرب بعد شوي؟' : 'I\'m having trouble connecting right now. Please try again in a moment.'
        }

        const empMessage: ChatMessage = {
          id: `emp-${emp.id}-${Date.now()}`,
          senderType: "EMPLOYEE",
          senderName: emp.name,
          senderRole: emp.role,
          content: replyContent,
          timestamp: new Date(),
          departmentName: departments.find(d => d.id === emp.departmentId)?.name,
        }
        setMessages(prev => [...prev, empMessage])
      } catch {
        const reply = isArabic ? 'عندي مشكلة بالاتصال هسا. ممكن تجرب بعد شوي؟' : 'I\'m having trouble connecting right now. Please try again in a moment.'
        const empMessage: ChatMessage = {
          id: `emp-${emp.id}-${Date.now()}`,
          senderType: "EMPLOYEE",
          senderName: emp.name,
          senderRole: emp.role,
          content: reply,
          timestamp: new Date(),
          departmentName: departments.find(d => d.id === emp.departmentId)?.name,
        }
        setMessages(prev => [...prev, empMessage])
      } finally {
        setIsTyping(null)
      }
    }
  }

  // الموظفين المختارين كقائمة
  const selectedEmpsList = activeEmployees.filter(e => selectedEmployeeIds.has(e.id))

  // ===========================
  // شاشة الاختيار (قبل بدء المحادثة)
  // ===========================
  if (!chatStarted) {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-950" dir="ltr">
        {/* رأس الصفحة */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => useDashboardStore.getState().setActiveTab("overview")}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px]"
              aria-label={isArabic ? "رجوع" : "Back"}
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">
                {isArabic ? "محادثة الأقسام" : "Department Chat"}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                {isArabic ? "اختر الأقسام أو الموظفين لبدء المحادثة" : "Select departments or employees to start chatting"}
              </p>
            </div>
            {/* زر تحديد كامل الشركة */}
            <Button
              onClick={selectEntireCompany}
              variant="outline"
              className={`border-slate-700 min-h-[44px] ${
                selectedEmployeeIds.size === activeEmployees.length
                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Building2 className="w-4 h-4 mr-2" />
              {isArabic ? "كامل الشركة" : "Entire Company"}
            </Button>
          </div>
        </div>

        {/* بطاقات الأقسام */}
        <div className="flex-1 overflow-y-auto p-4">
          {departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">🏢</div>
              <p className="text-slate-400 text-lg">
                {isArabic ? "لا توجد أقسام بعد" : "No departments yet"}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {isArabic ? "أنشئ أقسام من صفحة الأقسام أولاً" : "Create departments from the Departments page first"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map(dept => {
                const deptEmps = activeEmployees.filter(e => e.departmentId === dept.id)
                const fullySelected = isDepartmentFullySelected(dept.id)
                const partiallySelected = isDepartmentPartiallySelected(dept.id)
                const isExpanded = expandedDept === dept.id

                return (
                  <Card
                    key={dept.id}
                    className={`cursor-pointer transition-all duration-200 border-2 ${
                      fullySelected
                        ? "border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/10"
                        : partiallySelected
                        ? "border-emerald-500/50 bg-slate-900/80"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80"
                    }`}
                  >
                    <CardContent className="p-4">
                      {/* رأس البطاقة */}
                      <div
                        className="flex items-center gap-3 mb-3"
                        onClick={() => toggleDepartment(dept.id)}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                          style={{ backgroundColor: dept.color }}
                        >
                          {dept.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-base truncate">
                            {dept.name}
                          </h3>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {deptEmps.length} {isArabic ? "موظف" : "employees"}
                          </p>
                        </div>
                        {/* علامة الاختيار */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          fullySelected
                            ? "bg-emerald-500 text-white"
                            : partiallySelected
                            ? "bg-emerald-500/30 text-emerald-400"
                            : "bg-slate-800 text-slate-500"
                        }`}>
                          {fullySelected ? <Check className="w-4 h-4" /> : 
                           partiallySelected ? <div className="w-2.5 h-2.5 bg-emerald-400 rounded-sm" /> : 
                           <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* قائمة الموظفين */}
                      <div className="space-y-1.5">
                        {deptEmps.map(emp => {
                          const isSelected = selectedEmployeeIds.has(emp.id)
                          return (
                            <div
                              key={emp.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleEmployee(emp.id)
                              }}
                              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all ${
                                isSelected
                                  ? "bg-emerald-500/20 border border-emerald-500/40"
                                  : "bg-slate-800/50 border border-transparent hover:bg-slate-800"
                              }`}
                            >
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                                style={{ backgroundColor: emp.avatarColor || EMPLOYEE_COLORS[Math.abs(emp.name.charCodeAt(0)) % EMPLOYEE_COLORS.length] }}
                              >
                                {emp.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${isSelected ? "text-white" : "text-slate-300"}`}>
                                  {emp.name}
                                </p>
                                <p className="text-slate-500 text-[10px] truncate">{emp.role}</p>
                              </div>
                              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all ${
                                isSelected
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-700 text-slate-500"
                              }`}>
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                          )
                        })}

                        {deptEmps.length === 0 && (
                          <p className="text-slate-600 text-xs text-center py-2">
                            {isArabic ? "لا يوجد موظفين في هذا القسم" : "No employees in this department"}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* شريط الموظفين المختارين + زر بدء المحادثة */}
        <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-sm">
          {/* الموظفين المختارين */}
          {selectedEmployeeIds.size > 0 && (
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-xs">
                  {isArabic 
                    ? `${selectedEmployeeIds.size} موظف محدد`
                    : `${selectedEmployeeIds.size} employee(s) selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedEmpsList.map(emp => (
                  <Badge
                    key={emp.id}
                    variant="secondary"
                    className="bg-slate-800 text-slate-300 hover:bg-slate-700 gap-1 pr-1.5 pl-2 py-1 text-xs"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium"
                      style={{ backgroundColor: emp.avatarColor || EMPLOYEE_COLORS[Math.abs(emp.name.charCodeAt(0)) % EMPLOYEE_COLORS.length] }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    {emp.name}
                    <button
                      onClick={() => toggleEmployee(emp.id)}
                      className="ml-0.5 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* زر بدء المحادثة */}
          <div className="p-4">
            <Button
              onClick={startChat}
              disabled={selectedEmployeeIds.size === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] text-base font-semibold disabled:opacity-40"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              {selectedEmployeeIds.size === 0
                ? (isArabic ? "اختر موظفين لبدء المحادثة" : "Select employees to start chatting")
                : (isArabic ? `بدء المحادثة مع ${selectedEmployeeIds.size} موظف` : `Start Chat with ${selectedEmployeeIds.size} employee(s)`)}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ===========================
  // شاشة المحادثة (بعد بدء المحادثة)
  // ===========================
  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950" dir="ltr">
      {/* رأس المحادثة */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={backToSelection}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px]"
            aria-label={isArabic ? "رجوع للاختيار" : "Back to selection"}
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <h2 className="text-white font-semibold">
              {isArabic ? "محادثة جماعية" : "Group Chat"}
            </h2>
            <p className="text-slate-400 text-xs">
              {selectedEmpsList.length} {isArabic ? "موظف" : "employees"}
            </p>
          </div>
        </div>

        {/* أسماء الموظفين المشاركين */}
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {selectedEmpsList.map(emp => (
            <div key={emp.id} className="flex items-center gap-1.5 bg-slate-800/50 rounded-full px-2.5 py-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium"
                style={{ backgroundColor: emp.avatarColor || EMPLOYEE_COLORS[Math.abs(emp.name.charCodeAt(0)) % EMPLOYEE_COLORS.length] }}
              >
                {emp.name.charAt(0)}
              </div>
              <span className="text-slate-300 text-xs">{emp.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* الرسائل */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex justify-start">
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.senderType === "USER"
                  ? "bg-emerald-600 text-white rounded-bl-md"
                  : msg.senderType === "SYSTEM"
                  ? "bg-slate-800/50 text-slate-400 text-center text-xs mx-auto"
                  : "bg-slate-800 text-slate-200 rounded-br-md"
              }`}
            >
              {msg.senderType === "EMPLOYEE" && (
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-emerald-400 text-xs font-medium">{msg.senderName}</p>
                  {msg.senderRole && (
                    <span className="text-slate-500 text-[10px]">• {msg.senderRole}</span>
                  )}
                  {msg.departmentName && (
                    <span className="text-slate-600 text-[10px]">• {msg.departmentName}</span>
                  )}
                </div>
              )}
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isArabic ? "text-rtl" : ""}`}>{msg.content}</p>
              <p className="text-xs opacity-50 mt-1">
                {msg.timestamp.toLocaleTimeString(isArabic ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {/* مؤشر كتابة */}
        {isTyping && (() => {
          const typingEmp = employees.find(e => e.id === isTyping)
          return typingEmp ? (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-emerald-400 text-xs font-medium mb-1">{typingEmp.name}</p>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          ) : null
        })()}

        <div ref={messagesEndRef} />
      </div>

      {/* حقل الإدخال */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={isArabic ? "اكتب رسالتك هنا..." : "Type your message here..."}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            disabled={!!isTyping}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !!isTyping}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4"
          >
            {isArabic ? "إرسال" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  )
}
'''

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/components/chat/department-chat-panel.tsx', 'w') as f:
    f.write(NEW_PANEL)
sftp.close()

print("✅ Written new department-chat-panel.tsx with:")
print("  - Department cards with click-to-select-all")
print("  - Individual employee toggle")
print("  - Select Entire Company button")
print("  - Start Chat button")
print("  - Group chat with all selected employees")
print("  - Back to selection button")

ssh.close()
