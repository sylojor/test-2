// @ts-nocheck
// ============================================
// لوحة التحدث للموظفين
// كل الموظفين مفروزين حسب الأقسام
// كبس على الاسم أو القسم وكتبي
// الاسم بلون القسم
// + نظام ثنائي اللغة
// + Mobile: sidebar collapsed into Sheet/drawer
// ============================================

"use client"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Menu, Users, ChevronLeft, ArrowLeft, ArrowRight } from "lucide-react"
import type { IEmployee, IDepartment, ICompany } from "@/types"
import { getEmployeeStatusDisplay, getEmployeeStatusColor } from "@/lib/employee-generator"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import type { Language } from "@/lib/i18n"

interface TalkToEmployeesPanelProps {
  employees: IEmployee[]
  departments: IDepartment[]
  company: ICompany | null
  onChatWithEmployee: (employeeId: string) => void
}

// ============================================
// Sidebar content — reused for desktop + mobile Sheet
// ============================================
function EmployeeSidebarContent({
  searchQuery,
  setSearchQuery,
  filteredDepts,
  filteredUnassigned,
  employeesByDepartment,
  selectedEmployeeId,
  setSelectedEmployeeId,
  departments,
  language,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  filteredDepts: IDepartment[]
  filteredUnassigned: IEmployee[]
  employeesByDepartment: Record<string, IEmployee[]>
  selectedEmployeeId: string | null
  setSelectedEmployeeId: (id: string) => void
  departments: IDepartment[]
  language: string
}) {
  return (
    <>
      <div className="p-4 border-b border-border">
        <h2 className="text-foreground font-semibold mb-3">{t("talk.title", language)}</h2>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("talk.search", language)}
          className="bg-muted border-border text-foreground placeholder:text-muted-foreground text-sm"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* الأقسام مع موظفين */}
          {filteredDepts.map((dept) => {
            const deptEmps = (employeesByDepartment[dept.id] || [])
              .filter(e => !searchQuery ||
                e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.role.toLowerCase().includes(searchQuery.toLowerCase()))

            if (deptEmps.length === 0 && searchQuery) return null

            return (
              <div key={dept.id}>
                {/* عنوان القسم */}
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-all"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  <span className="text-sm font-medium" style={{ color: dept.color }}>
                    {dept.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground mr-auto">
                    {deptEmps.length}
                  </Badge>
                </button>

                {/* موظفين القسم */}
                <div className="space-y-0.5 mr-5">
                  {deptEmps.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all ${
                        selectedEmployeeId === emp.id
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: emp.avatarColor || dept.color }}
                      >
                        {emp.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: dept.color }}
                        >
                          {emp.name}
                        </p>
                        <p className="text-muted-foreground text-[10px] truncate">{emp.role}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        emp.status === "ACTIVE" ? "bg-green-500" : "bg-muted-foreground"
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* موظفين بدون قسم */}
          {filteredUnassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t("talk.noDepartment", language)}</span>
                <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground mr-auto">
                  {filteredUnassigned.length}
                </Badge>
              </div>
              <div className="space-y-0.5 mr-5">
                {filteredUnassigned.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all ${
                      selectedEmployeeId === emp.id
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: emp.avatarColor || "#64748b" }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-muted-foreground text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-muted-foreground text-[10px] truncate">{emp.role}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      emp.status === "ACTIVE" ? "bg-green-500" : "bg-muted-foreground"
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  )
}

// ============================================
// Chat messages cache — persists across component re-mounts
// This prevents the conversation from disappearing when the tab changes
// ============================================
const chatMessagesCache: Record<string, Array<{
  id: string
  senderType: "USER" | "EMPLOYEE"
  senderName: string
  content: string
  timestamp: Date
}>> = {}

export function TalkToEmployeesPanel({
  employees,
  departments,
  company,
  onChatWithEmployee,
}: TalkToEmployeesPanelProps) {

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  // Use cache for persistence — initialize from cache if available
  const [chatMessages, setChatMessages] = useState<Record<string, Array<{
    id: string
    senderType: "USER" | "EMPLOYEE"
    senderName: string
    content: string
    timestamp: Date
  }>>>(chatMessagesCache)
  const language = useLocale() as Language
  const [isTyping, setIsTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Sync state changes to cache
  const updateChatMessages = (updater: (prev: typeof chatMessages) => typeof chatMessages) => {
    setChatMessages(prev => {
      const next = updater(prev)
      // Copy to cache
      Object.assign(chatMessagesCache, next)
      return next
    })
  }

  const activeEmployees = employees.filter(e => e.status === "ACTIVE" || e.status === "PAUSED")

  // مفروزين حسب الأقسام
  const employeesByDepartment: Record<string, IEmployee[]> = {}
  const unassigned: IEmployee[] = []

  for (const emp of activeEmployees) {
    if (emp.departmentId) {
      if (!employeesByDepartment[emp.departmentId]) {
        employeesByDepartment[emp.departmentId] = []
      }
      employeesByDepartment[emp.departmentId].push(emp)
    } else {
      unassigned.push(emp)
    }
  }

  // فلتر البحث
  const filteredDepts = departments.filter(dept => {
    if (!searchQuery) return true
    const deptEmps = employeesByDepartment[dept.id] || []
    return dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deptEmps.some(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  const filteredUnassigned = unassigned.filter(e =>
    !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId)
  const selectedDept = selectedEmployee?.departmentId
    ? departments.find(d => d.id === selectedEmployee.departmentId)
    : null

  // Helper: select employee + close mobile sidebar
  const handleSelectEmployee = (id: string) => {
    setSelectedEmployeeId(id)
    setMobileSidebarOpen(false)
  }

  const handleSend = async () => {
    if (!message.trim() || !selectedEmployeeId || !selectedEmployee) return

    const msg = {
      id: `user-${Date.now()}`,
      senderType: "USER" as const,
      senderName: t("chat.you", language),
      content: message.trim(),
      timestamp: new Date(),
    }

    updateChatMessages(prev => ({
      ...prev,
      [selectedEmployeeId]: [...(prev[selectedEmployeeId] || []), msg],
    }))
    const messageText = message.trim()
    setMessage("")
    setIsTyping(true)

    try {
      const currentHistory = (chatMessages[selectedEmployeeId] || [])
        .slice(-10)
        .map(m => ({
          role: m.senderType === "USER" ? "user" : "assistant",
          content: m.content,
        }))

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Locale": language },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          message: messageText,
          companyId: company?.id,
          chatHistory: currentHistory,
          language,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const replyContent = data.reply || data.content || ""
        if (replyContent) {
          const empMsg = {
            id: `emp-${Date.now()}`,
            senderType: "EMPLOYEE" as const,
            senderName: selectedEmployee.name,
            content: replyContent,
            timestamp: new Date(),
          }
          updateChatMessages(prev => ({
            ...prev,
            [selectedEmployeeId]: [...(prev[selectedEmployeeId] || []), empMsg],
          }))
        }
      } else {
        // API error — لا نستخدم ردود ثابتة، نعرض رسالة خطأ واضحة
        const errorMsg = language === "en" 
          ? "Sorry, I couldn't process your request right now. Please try again."
          : "عذراً، لم أتمكن من معالجة طلبك حالياً. يرجى المحاولة مرة أخرى."
        const empMsg = {
          id: `emp-${Date.now()}`,
          senderType: "EMPLOYEE" as const,
          senderName: selectedEmployee.name,
          content: errorMsg,
          timestamp: new Date(),
        }
        updateChatMessages(prev => ({
          ...prev,
          [selectedEmployeeId]: [...(prev[selectedEmployeeId] || []), empMsg],
        }))
      }
    } catch {
      // Network error — لا نستخدم ردود ثابتة
      const errorMsg = language === "en"
        ? "Connection error. Please check your internet and try again."
        : "خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى."
      const empMsg = {
        id: `emp-${Date.now()}`,
        senderType: "EMPLOYEE" as const,
        senderName: selectedEmployee.name,
        content: errorMsg,
        timestamp: new Date(),
      }
      updateChatMessages(prev => ({
        ...prev,
        [selectedEmployeeId]: [...(prev[selectedEmployeeId] || []), empMsg],
      }))
    } finally {
      setIsTyping(false)
    }
  }

  const currentMessages = selectedEmployeeId ? (chatMessages[selectedEmployeeId] || []) : []

  return (
    <div className="flex h-full bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Mobile sidebar — Sheet drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side={language === "ar" ? "right" : "left"}
          className="w-[85vw] max-w-[360px] sm:w-[320px] bg-card border-border p-0 overflow-hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("talk.title", language)}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full">
            <EmployeeSidebarContent
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredDepts={filteredDepts}
              filteredUnassigned={filteredUnassigned}
              employeesByDepartment={employeesByDepartment}
              selectedEmployeeId={selectedEmployeeId}
              setSelectedEmployeeId={handleSelectEmployee}
              departments={departments}
              language={language}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar — always visible on md+ */}
      <div className="hidden md:flex w-80 border-l border-border flex-col bg-card/50">
        <EmployeeSidebarContent
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredDepts={filteredDepts}
          filteredUnassigned={filteredUnassigned}
          employeesByDepartment={employeesByDepartment}
          selectedEmployeeId={selectedEmployeeId}
          setSelectedEmployeeId={setSelectedEmployeeId}
          departments={departments}
          language={language}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedEmployee ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground text-lg font-medium mb-1">{t("talk.selectEmployee", language)}</p>
              <p className="text-muted-foreground text-sm mb-6">{t("talk.sortedByDept", language)}</p>
              <Button
                onClick={() => setMobileSidebarOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-5 text-base rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Users className="w-5 h-5" />
                {language === "ar" ? "اختر موظف" : "Choose Employee"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* رأس المحادثة */}
            <div className="p-3 sm:p-4 border-b border-border bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile: button to switch employee */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="md:hidden flex-shrink-0 h-9 w-9 rounded-lg hover:bg-muted"
                  dir="ltr"
                >
                  {language === "ar" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                </Button>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selectedEmployee.avatarColor || selectedDept?.color || "#10b981" }}
                >
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate" style={{ color: selectedDept?.color || "var(--foreground)" }}>
                    {selectedEmployee.name}
                  </h2>
                  <p className="text-muted-foreground text-xs truncate">{selectedEmployee.role}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {t("chat.freeMode", language)}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getEmployeeStatusColor(selectedEmployee.status)}`}
                  >
                    {getEmployeeStatusDisplay(selectedEmployee.status)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* الرسائل */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
              {currentMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t("talk.startConversation", language)} {selectedEmployee.name}</p>
                </div>
              )}
              {currentMessages.map((msg) => (
                <div key={msg.id} className="flex">
                  <div
                    className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.senderType === "USER"
                        ? "bg-emerald-600 text-white rounded-bl-md"
                        : "bg-muted text-foreground rounded-br-md"
                    }`}
                  >
                    {msg.senderType === "EMPLOYEE" && (
                      <p className="text-xs font-medium mb-1" style={{ color: selectedDept?.color || "#10b981" }}>
                        {msg.senderName}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {msg.timestamp.toLocaleTimeString(language === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex">
                  <div className="bg-muted rounded-2xl rounded-br-md px-4 py-3">
                    <p className="text-xs font-medium mb-1" style={{ color: selectedDept?.color || "#10b981" }}>
                      {selectedEmployee.name}
                    </p>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* حقل الإدخال */}
            <div className="p-3 sm:p-4 border-t border-border bg-card/80 backdrop-blur-sm">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={`${t("talk.typeMessage", language)} ${selectedEmployee.name}...`}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || isTyping}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4"
                >
                  {t("talk.send", language)}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// (generateSmartReply removed — we now rely on the real LLM API response only)
