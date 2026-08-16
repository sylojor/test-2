#!/usr/bin/env python3
"""
Redesign Talk Panel:
1. Departments as cards in main area
2. Click department to see employees
3. Remove employees from selection
4. "Whole Company" button
5. Group chat where all selected employees respond
6. If employee didn't work on something, they say so
"""
import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')

BASE = "/home/ubuntu/blivoai-demo"

# New talk panel
new_talk_panel = r'''// ============================================
// لوحة التحدث للموظفين — تصميم جديد
// الأقسام كبطاقات + اختيار موظفين + محادثة جماعية
// كبس على القسم = يشوفك موظفينه
// كبسة "كامل الشركة" = كل الموظفين يردوا
// إذا موظف ما اشتغل على شي بقولك
// ============================================

"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Send,
  Building2,
  Users,
  Globe,
  X,
  ArrowLeft,
  Sparkles,
  Check,
  User,
  ChevronRight,
} from "lucide-react"
import type { IEmployee, IDepartment, ICompany } from "@/types"
import { getEmployeeStatusDisplay, getEmployeeStatusColor } from "@/lib/employee-generator"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface TalkToEmployeesPanelProps {
  employees: IEmployee[]
  departments: IDepartment[]
  company: ICompany | null
  onChatWithEmployee: (employeeId: string) => void
}

// ============================================
// Chat messages cache
// ============================================
const chatMessagesCache: Record<string, Array<{
  id: string
  senderType: "USER" | "EMPLOYEE"
  senderName: string
  senderRole?: string
  content: string
  departmentColor?: string
  timestamp: Date
}>> = {}

export function TalkToEmployeesPanel({
  employees,
  departments,
  company,
  onChatWithEmployee,
}: TalkToEmployeesPanelProps) {
  const language = useLocale()
  const [view, setView] = useState<"departments" | "employees" | "chat">("departments")
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [isWholeCompany, setIsWholeCompany] = useState(false)
  const [message, setMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [chatMessages, setChatMessages] = useState<Record<string, Array<{
    id: string
    senderType: "USER" | "EMPLOYEE"
    senderName: string
    senderRole?: string
    content: string
    departmentColor?: string
    timestamp: Date
  }>>>(chatMessagesCache)
  const [searchQuery, setSearchQuery] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeEmployees = employees.filter(e => e.status === "ACTIVE" || e.status === "PAUSED")

  // Group employees by department
  const employeesByDepartment: Record<string, IEmployee[]> = {}
  const unassigned: IEmployee[] = []
  for (const emp of activeEmployees) {
    if (emp.departmentId) {
      if (!employeesByDepartment[emp.departmentId]) employeesByDepartment[emp.departmentId] = []
      employeesByDepartment[emp.departmentId].push(emp)
    } else {
      unassigned.push(emp)
    }
  }

  const updateChatMessages = (updater: (prev: typeof chatMessages) => typeof chatMessages) => {
    setChatMessages(prev => {
      const next = updater(prev)
      Object.assign(chatMessagesCache, next)
      return next
    })
  }

  // Get chat key based on selection
  const chatKey = isWholeCompany ? "whole-company" : selectedDeptId ? `dept-${selectedDeptId}` : "individual"

  // Get selected employees for chat
  const getChatEmployees = (): IEmployee[] => {
    if (isWholeCompany) return activeEmployees
    if (selectedDeptId) {
      return (employeesByDepartment[selectedDeptId] || []).filter(e => selectedEmployeeIds.has(e.id))
    }
    return activeEmployees.filter(e => selectedEmployeeIds.has(e.id))
  }

  // Toggle employee selection
  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Select all employees in department
  const selectAllInDept = (deptId: string) => {
    const deptEmps = employeesByDepartment[deptId] || []
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev)
      for (const e of deptEmps) next.add(e.id)
      return next
    })
  }

  // Select whole company
  const selectWholeCompany = () => {
    setIsWholeCompany(true)
    setSelectedEmployeeIds(new Set(activeEmployees.map(e => e.id)))
    setView("chat")
  }

  // Start chat with selected department
  const startDeptChat = (deptId: string) => {
    setSelectedDeptId(deptId)
    setIsWholeCompany(false)
    const deptEmps = employeesByDepartment[deptId] || []
    setSelectedEmployeeIds(new Set(deptEmps.map(e => e.id)))
    setView("chat")
  }

  // Start chat with current selection
  const startChat = () => {
    if (selectedEmployeeIds.size > 0) {
      setView("chat")
    }
  }

  // Send message to all selected employees
  const handleSend = async () => {
    if (!message.trim() || isTyping) return
    const chatEmployees = getChatEmployees()
    if (chatEmployees.length === 0) return

    const msg = {
      id: `user-${Date.now()}`,
      senderType: "USER" as const,
      senderName: language === "ar" ? "أنت" : "You",
      content: message.trim(),
      timestamp: new Date(),
    }

    updateChatMessages(prev => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), msg],
    }))

    const messageText = message.trim()
    setMessage("")
    setIsTyping(true)

    // Send to each selected employee
    const responses = await Promise.allSettled(
      chatEmployees.map(async (emp) => {
        const dept = emp.departmentId ? departments.find(d => d.id === emp.departmentId) : null
        const currentHistory = (chatMessages[chatKey] || [])
          .slice(-10)
          .map(m => ({ role: m.senderType === "USER" ? "user" : "assistant", content: m.content }))

        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Locale": language },
          body: JSON.stringify({
            employeeId: emp.id,
            message: messageText,
            companyId: company?.id,
            chatHistory: currentHistory,
            language,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          return {
            employeeName: emp.name,
            employeeRole: emp.role,
            content: data.reply || "",
            departmentColor: dept?.color || "#10b981",
          }
        }
        return null
      })
    )

    // Add all employee responses
    updateChatMessages(prev => {
      const current = [...(prev[chatKey] || [])]
      for (const result of responses) {
        if (result.status === "fulfilled" && result.value) {
          const { employeeName, employeeRole, content, departmentColor } = result.value
          if (content) {
            current.push({
              id: `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              senderType: "EMPLOYEE",
              senderName: employeeName,
              senderRole: employeeRole,
              content,
              departmentColor,
              timestamp: new Date(),
            })
          }
        }
      }
      return { ...prev, [chatKey]: current }
    })

    setIsTyping(false)
  }

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, isTyping])

  const currentMessages = chatMessages[chatKey] || []
  const chatEmployees = getChatEmployees()

  // ============================================
  // VIEW: Departments as Cards
  // ============================================
  if (view === "departments") {
    return (
      <div className="h-full overflow-y-auto scrollbar-custom p-4 sm:p-6" dir="ltr">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-500" />
            {language === "ar" ? "تحدث مع الموظفين" : "Talk to Employees"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {language === "ar" ? "اختر قسم أو ابدأ محادثة مع كامل الشركة" : "Choose a department or start a company-wide conversation"}
          </p>
        </div>

        {/* Whole Company Card */}
        <Card
          className="mb-6 cursor-pointer border-2 border-emerald-500/30 hover:border-emerald-500/60 bg-gradient-to-br from-emerald-500/10 to-[#3F4A69]/10 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
          onClick={selectWholeCompany}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-[#3F4A69] flex items-center justify-center flex-shrink-0">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground">
                {language === "ar" ? "كامل الشركة" : "Whole Company"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {language === "ar"
                  ? `محادثة مع كل الموظفين (${activeEmployees.length} موظف) — كل واحد بيرد حسب تخصصو`
                  : `Chat with all employees (${activeEmployees.length} employees) — each responds based on their specialty`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Department Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const deptEmps = employeesByDepartment[dept.id] || []
            if (deptEmps.length === 0) return null

            return (
              <Card
                key={dept.id}
                className="cursor-pointer border-border hover:border-emerald-500/40 bg-card transition-all hover:shadow-md group"
                onClick={() => {
                  setSelectedDeptId(dept.id)
                  setView("employees")
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: dept.color + "20" }}
                    >
                      <Building2 className="w-5 h-5" style={{ color: dept.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate" style={{ color: dept.color }}>
                        {dept.name}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {deptEmps.length} {language === "ar" ? "موظفين" : "employees"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                  </div>

                  {/* Employee avatars */}
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    {deptEmps.slice(0, 5).map((emp) => (
                      <div
                        key={emp.id}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-card"
                        style={{ backgroundColor: emp.avatarColor || dept.color }}
                        title={emp.name}
                      >
                        {emp.name.charAt(0)}
                      </div>
                    ))}
                    {deptEmps.length > 5 && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground text-xs font-medium border-2 border-card bg-muted">
                        +{deptEmps.length - 5}
                      </div>
                    )}
                  </div>

                  {/* Quick chat button */}
                  <Button
                    size="sm"
                    className="w-full mt-3 bg-gradient-to-r from-[#3F4A69] to-emerald-600 hover:from-[#3F4A69] hover:to-emerald-500 text-white text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      startDeptChat(dept.id)
                    }}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {language === "ar" ? "محادثة القسم" : "Chat Department"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Unassigned employees */}
        {unassigned.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {language === "ar" ? "موظفين بدون قسم" : "Unassigned Employees"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassigned.map((emp) => (
                <Card
                  key={emp.id}
                  className="cursor-pointer border-border hover:border-emerald-500/40 bg-card transition-all"
                  onClick={() => {
                    setSelectedEmployeeIds(new Set([emp.id]))
                    setSelectedDeptId(null)
                    setIsWholeCompany(false)
                    setView("chat")
                  }}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: emp.avatarColor || "#64748b" }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // VIEW: Employees in a Department
  // ============================================
  if (view === "employees" && selectedDeptId) {
    const dept = departments.find(d => d.id === selectedDeptId)
    const deptEmps = employeesByDepartment[selectedDeptId] || []
    const selectedCount = deptEmps.filter(e => selectedEmployeeIds.has(e.id)).length

    return (
      <div className="h-full overflow-y-auto scrollbar-custom p-4 sm:p-6" dir="ltr">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setView("departments"); setSelectedEmployeeIds(new Set()) }}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: (dept?.color || "#10b981") + "20" }}
          >
            <Building2 className="w-5 h-5" style={{ color: dept?.color }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: dept?.color }}>{dept?.name}</h2>
            <p className="text-muted-foreground text-sm">
              {language === "ar" ? "اختر الموظفين اللي بدك تحكى معهم" : "Select employees to chat with"}
            </p>
          </div>
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between mb-4 bg-muted/30 rounded-xl p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectAllInDept(selectedDeptId)}
            className="text-sm"
          >
            <Check className="w-4 h-4 mr-1" />
            {language === "ar" ? "اختيار الكل" : "Select All"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedCount} / {deptEmps.length} {language === "ar" ? "محدد" : "selected"}
          </span>
        </div>

        {/* Employee Cards */}
        <div className="space-y-2">
          {deptEmps.map((emp) => {
            const isSelected = selectedEmployeeIds.has(emp.id)
            return (
              <Card
                key={emp.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "border-emerald-500/60 bg-emerald-500/5 shadow-sm"
                    : "border-border hover:border-emerald-500/30 bg-card"
                }`}
                onClick={() => toggleEmployee(emp.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: emp.avatarColor || dept?.color }}
                  >
                    {emp.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Start Chat Button */}
        <div className="mt-6 sticky bottom-4">
          <Button
            onClick={startChat}
            disabled={selectedEmployeeIds.size === 0}
            className="w-full bg-gradient-to-r from-[#3F4A69] to-emerald-600 hover:from-[#3F4A69] hover:to-emerald-500 text-white h-12 text-base"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            {selectedEmployeeIds.size === 0
              ? (language === "ar" ? "اختر موظفين للبدء" : "Select employees to start")
              : (language === "ar"
                ? `بدء المحادثة (${selectedEmployeeIds.size} موظفين)`
                : `Start Chat (${selectedEmployeeIds.size} employees)`)}
          </Button>
        </div>
      </div>
    )
  }

  // ============================================
  // VIEW: Chat
  // ============================================
  const chatTitle = isWholeCompany
    ? (language === "ar" ? "كامل الشركة" : "Whole Company")
    : selectedDeptId
      ? departments.find(d => d.id === selectedDeptId)?.name || ""
      : language === "ar" ? "محادثة" : "Chat"

  const chatTitleColor = isWholeCompany
    ? "#10b981"
    : selectedDeptId
      ? departments.find(d => d.id === selectedDeptId)?.color || "#10b981"
      : "#10b981"

  return (
    <div className="flex flex-col h-full" dir="ltr">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setView(isWholeCompany || !selectedDeptId ? "departments" : "employees"); setSelectedEmployeeIds(new Set()) }}
            className="text-muted-foreground hover:text-foreground h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: chatTitleColor + "20" }}
          >
            {isWholeCompany ? (
              <Globe className="w-5 h-5" style={{ color: chatTitleColor }} />
            ) : (
              <Building2 className="w-5 h-5" style={{ color: chatTitleColor }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate" style={{ color: chatTitleColor }}>
              {chatTitle}
            </h3>
            <p className="text-muted-foreground text-xs">
              {chatEmployees.length} {language === "ar" ? "موظفين بالمحادثة" : "employees in chat"}
            </p>
          </div>
          {/* Employee avatars */}
          <div className="flex -space-x-1.5 rtl:space-x-reverse">
            {chatEmployees.slice(0, 4).map((emp) => (
              <div
                key={emp.id}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium border-2 border-card"
                style={{ backgroundColor: emp.avatarColor || "#64748b" }}
                title={emp.name}
              >
                {emp.name.charAt(0)}
              </div>
            ))}
            {chatEmployees.length > 4 && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground text-[10px] font-medium border-2 border-card bg-muted">
                +{chatEmployees.length - 4}
              </div>
            )}
          </div>
        </div>
        {/* Remove employees */}
        <div className="flex flex-wrap gap-1 mt-2">
          {chatEmployees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => {
                if (chatEmployees.length > 1) {
                  setSelectedEmployeeIds(prev => {
                    const next = new Set(prev)
                    next.delete(emp.id)
                    return next
                  })
                }
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/50 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
            >
              {emp.name}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-custom">
        {currentMessages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-[#3F4A69] flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <p className="text-muted-foreground text-lg mb-2">
              {language === "ar" ? "ابدأ المحادثة" : "Start the conversation"}
            </p>
            <p className="text-muted-foreground text-sm">
              {language === "ar"
                ? `${chatEmployees.length} موظفين جاهزين يردوا عليك — كل واحد حسب تخصصو`
                : `${chatEmployees.length} employees ready to respond — each based on their specialty`}
            </p>
          </div>
        )}

        {currentMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderType === "USER" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.senderType === "USER"
                  ? "bg-gradient-to-r from-[#3F4A69] to-emerald-600 text-white shadow-lg shadow-emerald-500/10"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.senderType === "EMPLOYEE" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium"
                    style={{ backgroundColor: msg.departmentColor || "#10b981" }}
                  >
                    {msg.senderName.charAt(0)}
                  </div>
                  <span className="text-xs font-medium" style={{ color: msg.departmentColor || "#10b981" }}>
                    {msg.senderName}
                  </span>
                  {msg.senderRole && (
                    <span className="text-[10px] text-muted-foreground">
                      ({msg.senderRole})
                    </span>
                  )}
                </div>
              )}
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.senderType === "EMPLOYEE" && language === "ar" ? "text-rtl" : ""}`}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <p className="text-xs text-muted-foreground mb-2">
                {language === "ar" ? `${chatEmployees.length} موظفين بيكتتبوا...` : `${chatEmployees.length} employees typing...`}
              </p>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <div className="flex-1 bg-muted rounded-xl px-4 py-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={language === "ar"
                ? `اكتب رسالة لـ ${chatEmployees.length} موظف...`
                : `Message ${chatEmployees.length} employees...`}
              rows={1}
              className="w-full bg-transparent text-foreground text-sm resize-none outline-none placeholder:text-muted-foreground max-h-32 overflow-y-auto scrollbar-custom"
              style={{ minHeight: "24px" }}
              disabled={isTyping}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isTyping}
            className="bg-gradient-to-r from-[#3F4A69] to-emerald-600 hover:from-[#3F4A69] hover:to-emerald-500 text-white h-10 w-10 p-0 rounded-xl shadow-lg shadow-emerald-500/20"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
'''

# Write the new talk panel
encoded = base64.b64encode(new_talk_panel.encode('utf-8')).decode('ascii')
cmd = f"echo '{encoded}' | base64 -d > {BASE}/src/components/dashboard/talk-panel.tsx"
stdin, stdout, stderr = ssh.exec_command(cmd)
err = stderr.read().decode()
if err:
    print(f"ERROR: {err}")
else:
    print("Talk panel updated successfully!")

# Verify
stdin, stdout, stderr = ssh.exec_command(f"wc -l {BASE}/src/components/dashboard/talk-panel.tsx")
print(f"Lines: {stdout.read().decode().strip()}")

stdin, stdout, stderr = ssh.exec_command(f"grep -c 'departments' {BASE}/src/components/dashboard/talk-panel.tsx")
print(f"departments count: {stdout.read().decode().strip()}")

ssh.close()
