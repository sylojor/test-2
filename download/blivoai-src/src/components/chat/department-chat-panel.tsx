// ============================================
// لوحة محادثة القسم — تعاون الموظفين
// 
// هون الموظفين بنفس القسم بيتحاكو مع بعض
// والمدير بيشوف المحادثة (باللهجة اللي اختارها)
// 
// أنواع المحادثات:
// - محادثة قسم: كل موظفين القسم
// - محادثة بين قسمين: تعاون بين أقسام مختلفة
// ============================================

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ICompany, IEmployee, IDepartment, IMessage, ConversationType } from "@/types"
import { toast } from "sonner"
import { t } from "@/lib/i18n"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"
import { ArrowLeft } from "lucide-react"

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
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState<string | null>(null)
  const [chatType, setChatType] = useState<"department" | "cross-department">("department")
  const [selectedCrossDept, setSelectedCrossDept] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // القسم المختار
  const selectedDept = departments.find(d => d.id === selectedDepartmentId)
  const deptEmployees = employees.filter(
    e => e.departmentId === selectedDepartmentId && e.status === "ACTIVE"
  )

  // تمرير تلقائي
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // رسالة ترحيب لما يتغير القسم
  useEffect(() => {
    if (!selectedDept) return
    const dialect = company?.dialect ?? "levantine"
    const greetings: Record<string, string> = {
      levantine: `مرحباً! هاد قسم ${selectedDept.name} — تواصلوا مع بعض عن الشغل هنا.`,
      egyptian: `أهلاً! ده قسم ${selectedDept.name} — تواصلوا مع بعض عن الشغل هنا.`,
      gulf: `حياكم! هذا قسم ${selectedDept.name} — تواصلوا مع بعض عن الشغل هنا.`,
      formal: `مرحبًا! هذا قسم ${selectedDept.name} — تواصلوا مع بعض هنا حول العمل.`,
      english: `Welcome! This is the ${selectedDept.name} department — communicate about work here.`,
    }
    setMessages([
      {
        id: "system-welcome",
        senderType: "SYSTEM",
        senderName: t("deptChat.system", language),
        content: greetings[dialect] ?? greetings.levantine,
        timestamp: new Date(),
      },
    ])
  }, [selectedDepartmentId, selectedDept, company?.dialect, language])

  // إرسال رسالة من المدير
  const handleSend = async () => {
    if (!input.trim() || !selectedDept) return
    const messageText = input.trim()

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      senderType: "USER",
      senderName: t("deptChat.you", language),
      content: messageText,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")

    // ردود الموظفين — مرتبطة بالـ LLM الحقيقي
    const employeesToRespond = chatType === "department"
      ? deptEmployees
      : chatType === "cross-department" && selectedCrossDept
        ? [...deptEmployees, ...employees.filter(e => e.departmentId === selectedCrossDept && e.status === "ACTIVE")].slice(0, 3)
        : []

    for (const emp of employeesToRespond) {
      setIsTyping(emp.id)
      try {
        // إرسال للـ API الحقيقي
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: emp.id,
            message: `[محادثة قسم ${selectedDept.name}] ${messageText}`,
            companyId: company?.id,
            language,
            chatHistory: messages
              .filter(m => m.id !== "system-welcome")
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
          replyContent = language === 'en' ? 'I\'m having trouble connecting right now. Please try again in a moment.' : 'عندي مشكلة بالاتصال هسا. ممكن تجرب بعد شوي؟'
        }

        if (!replyContent) {
          replyContent = language === 'en' ? 'I\'m having trouble connecting right now. Please try again in a moment.' : 'عندي مشكلة بالاتصال هسا. ممكن تجرب بعد شوي؟'
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
        // Fallback: رد محلي ذكي
        const reply = language === 'en' ? 'I\'m having trouble connecting right now. Please try again in a moment.' : 'عندي مشكلة بالاتصال هسا. ممكن تجرب بعد شوي؟'
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

  if (!selectedDept) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl">
        <h1 className="text-2xl font-bold text-white mb-4">{t("deptChat.title", language)}</h1>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500 text-lg mb-2">💬</p>
            <p className="text-slate-400">{t("deptChat.selectDepartment", language)}</p>
            <p className="text-slate-500 text-sm mt-2">
              الموظفين بنفس القسم بيقدروا يتحاكوا ويتعاونوا هنا
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* رأس المحادثة */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile: Back button */}
          <button
            onClick={() => useDashboardStore.getState().setActiveTab("overview")}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px]"
            aria-label={language === "ar" ? "رجوع" : "Back"}
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: selectedDept.color }}
          >
            {selectedDept.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold">{selectedDept.name}</h2>
            <p className="text-slate-400 text-xs">
              {deptEmployees.length} موظف نشط — {chatType === "department" ? t("deptChat.department", language) : t("deptChat.crossDepartment", language)}
            </p>
          </div>
          {/* نوع المحادثة — desktop only */}
          <div className="hidden sm:flex gap-1">
            <Button
              size="sm"
              variant={chatType === "department" ? "default" : "ghost"}
              className={chatType === "department" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}
              onClick={() => setChatType("department")}
            >
              {t("deptChat.department", language)}
            </Button>
            <Button
              size="sm"
              variant={chatType === "cross-department" ? "default" : "ghost"}
              className={chatType === "cross-department" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}
              onClick={() => setChatType("cross-department")}
            >
              {t("deptChat.crossDepartment", language)}
            </Button>
          </div>
        </div>

        {/* Mobile-only chat type toggle */}
        <div className="flex sm:hidden gap-1 mt-2">
          <Button
            size="sm"
            variant={chatType === "department" ? "default" : "ghost"}
            className={`text-xs ${chatType === "department" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
            onClick={() => setChatType("department")}
          >
            {t("deptChat.department", language)}
          </Button>
          <Button
            size="sm"
            variant={chatType === "cross-department" ? "default" : "ghost"}
            className={`text-xs ${chatType === "cross-department" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            onClick={() => setChatType("cross-department")}
          >
            {t("deptChat.crossDepartment", language)}
          </Button>
        </div>

        {/* اختيار القسم الثاني (محادثة بين أقسام) */}
        {chatType === "cross-department" && (
          <div className="mt-2 sm:mt-3 flex items-center gap-2">
            <span className="text-slate-500 text-xs">التحدث مع:</span>
            <select
              value={selectedCrossDept ?? ""}
              onChange={(e) => setSelectedCrossDept(e.target.value || null)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1"
            >
              <option value="">{t("deptChat.selectDepartment", language)}</option>
              {departments
                .filter(d => d.id !== selectedDepartmentId)
                .map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
            </select>
          </div>
        )}

        {/* أعضاء القسم */}
        <div className="mt-2 sm:mt-3 flex gap-2 flex-wrap">
          {deptEmployees.map(emp => (
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
          <div key={msg.id} className={`flex ${msg.senderType === "USER" ? "justify-start" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs opacity-50 mt-1">
                {msg.timestamp.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
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
            placeholder={t("deptChat.typeMessage", language)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            disabled={!!isTyping}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !!isTyping}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4"
          >
            {t("deptChat.send", language)}
          </Button>
        </div>
      </div>
    </div>
  )
}
