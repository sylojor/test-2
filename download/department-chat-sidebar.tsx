"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n-config"
import { apiPost } from "@/lib/api-client"
import { 
  MessageCircle, Send, ChevronLeft, ChevronRight, 
  Maximize2, Minimize2, Loader2
} from "lucide-react"
import type { IEmployee, IDepartment, ICompany } from "@/types"

interface ChatMessage {
  id: string
  content: string
  sender: string
  senderType: "user" | "employee" | "system"
  timestamp: Date
  employeeId?: string
  employeeName?: string
  employeeRole?: string
  department?: string
  avatarColor?: string
}

interface DepartmentChatSidebarProps {
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  userId: string
}

export function DepartmentChatSidebar({ 
  company, employees, departments, userId 
}: DepartmentChatSidebarProps) {
  const { language } = useLocale()
  const { selectedDepartmentId } = useDashboardStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMaximized, setIsMaximized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Get selected department
  const selectedDept = departments.find(d => d.id === selectedDepartmentId)
  const deptEmployees = employees.filter(e => 
    selectedDept ? e.departmentId === selectedDept.id && e.status === "ACTIVE" : e.status === "ACTIVE"
  )

  // Dialect
  const dialect = company?.dialect || "formal"

  // Welcome message
  const getWelcomeMessage = () => {
    if (dialect === "levantine") return "أهلاً! قسمنا جاهز للعمل. شو بدك تسأل أو تطلب؟"
    if (dialect === "egyptian") return "أهلاً بيك! القسم هنا وفرت. عايز تسأل أو تطلب حاجة؟"
    if (dialect === "gulf") return "أهلاً وسهلاً! القسم جاهز لخدمتك. وش تبغي تسأل أو تطلب؟"
    if (dialect === "formal") return "مرحباً! قسمنا جاهز للعمل. ما هو استفسارك أو طلبك؟"
    if (dialect === "english") return "Welcome! Our department is ready to assist. What is your inquiry?"
    return "مرحباً! قسمنا جاهز للعمل. ما هو استفسارك؟"
  }

  // Initialize welcome message
  useEffect(() => {
    if (messages.length === 0 && selectedDept) {
      setMessages([
        {
          id: "welcome",
          content: getWelcomeMessage(),
          sender: "system",
          senderType: "system",
          timestamp: new Date(),
          department: selectedDept.name,
        }
      ])
    }
  }, [selectedDept?.id])

  // Poll for messages - 2 seconds for real-time
  const pollMessages = useCallback(async () => {
    if (!company?.id || !conversationId) return
    
    try {
      const res = await fetch(`/api/conversations/${conversationId}?companyId=${company.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.messages && data.messages.length > 0) {
          const existingIds = new Set(messages.map(m => m.id))
          const newMsgs = data.messages
            .filter(m => !existingIds.has(m.id))
            .map(m => ({
              id: m.id,
              content: m.content,
              sender: m.senderType === "USER" ? "user" : "employee",
              senderType: m.senderType === "USER" ? "user" as const : "employee" as const,
              timestamp: new Date(m.createdAt),
              employeeName: m.employeeName || m.senderName,
              employeeRole: m.employeeRole,
              department: selectedDept?.name,
              avatarColor: m.avatarColor,
            }))
          
          if (newMsgs.length > 0) {
            setMessages(prev => [...prev, ...newMsgs])
          }
        }
        setIsConnected(true)
      }
    } catch {
      setIsConnected(false)
    }
  }, [company?.id, conversationId, messages, selectedDept?.name])

  // Set up polling interval (2 seconds for real-time)
  useEffect(() => {
    if (conversationId && company?.id) {
      pollIntervalRef.current = setInterval(pollMessages, 2000)
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      }
    }
  }, [conversationId, company?.id, pollMessages])

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage.trim(),
      sender: "user",
      senderType: "user",
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, userMsg])
    setInputMessage("")
    setIsLoading(true)
    
    try {
      const activeEmployees = deptEmployees.slice(0, 3)
      const deptName = selectedDept?.name || "القسم"
      const prefixedMsg = `[محادثة قسم ${deptName}] ${inputMessage.trim()}`
      
      for (const emp of activeEmployees) {
        const res = await apiPost("/api/conversations", {
          employeeId: emp.id,
          message: prefixedMsg,
          companyId: company?.id,
          chatHistory: messages.slice(-10).map(m => ({
            role: m.senderType === "user" ? "user" : "assistant",
            content: m.content,
          })),
          type: "DEPARTMENT_CHAT",
        })
        
        if (res?.reply) {
          const empMsg: ChatMessage = {
            id: `emp-${emp.id}-${Date.now()}`,
            content: res.reply,
            sender: "employee",
            senderType: "employee",
            timestamp: new Date(),
            employeeId: emp.id,
            employeeName: emp.name,
            employeeRole: emp.role,
            department: deptName,
            avatarColor: emp.avatarColor,
          }
          setMessages(prev => [...prev, empMsg])
          
          if (res.conversationId) {
            setConversationId(res.conversationId)
          }
        }
      }
    } catch (error) {
      // Fallback: generate local replies
      const activeEmployees = deptEmployees.slice(0, 2)
      for (const emp of activeEmployees) {
        const fallbackMsg: ChatMessage = {
          id: `fallback-${emp.id}-${Date.now()}`,
          content: generateEmployeeReply(inputMessage.trim(), emp, dialect),
          sender: "employee",
          senderType: "employee",
          timestamp: new Date(),
          employeeId: emp.id,
          employeeName: emp.name,
          employeeRole: emp.role,
          department: selectedDept?.name,
          avatarColor: emp.avatarColor,
        }
        setMessages(prev => [...prev, fallbackMsg])
      }
    }
    
    setIsLoading(false)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Local reply fallback
  const generateEmployeeReply = (msg: string, emp: IEmployee, dialect: string): string => {
    const name = emp.name
    const role = emp.role || "موظف"
    const spec = emp.specialization || "عام"
    
    if (dialect === "english") {
      if (msg.toLowerCase().includes("project")) return `As ${name} (${role}), I can help with project planning in our department.`
      if (msg.toLowerCase().includes("problem") || msg.toLowerCase().includes("issue")) return `I understand the issue. As ${name}, let me analyze this and propose a solution based on my expertise in ${spec}.`
      return `Thank you for reaching out! As ${name} (${role}), I will assist you with this within my area of expertise.`
    }
    
    if (dialect === "levantine") return `شكراً! أنا ${name} (${role})، بقدر أساعدك بهالموضوع حسب تخصصي في ${spec}.`
    if (dialect === "egyptian") return `شكراً! أنا ${name} (${role})، هساعدك في الموضوع ده حسب تخصصي في ${spec}.`
    if (dialect === "gulf") return `شكراً! أنا ${name} (${role})، بساعدك في هذا الموضوع حسب تخصصي في ${spec}.`
    return `شكراً! أنا ${name} (${role})، سأساعدك في هذا الموضوع حسب تخصصي في ${spec}.`
  }

  // If no department selected, show minimal prompt
  if (!selectedDept) {
    return (
      <div className={`${isExpanded ? "w-64" : "w-12"} border-l border-border bg-card transition-all duration-300 flex flex-col`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3 hover:bg-muted flex items-center justify-center"
        >
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          {isExpanded && <span className="ml-2 text-sm text-muted-foreground">{language === "ar" ? "محادثات الأقسام" : "Dept Chat"}</span>}
        </button>
        {isExpanded && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {language === "ar" ? "اختر قسم من القائمة الجانبية لفتح المحادثة" : "Select a department from sidebar to start chat"}
          </div>
        )}
      </div>
    )
  }

  const widthClass = isMaximized ? "w-96" : isExpanded ? "w-64" : "w-12"

  return (
    <div className={`${widthClass} border-l border-border bg-card transition-all duration-300 flex flex-col h-full`}>
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded && (
            <>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: selectedDept.color || "#6366f1", color: "white" }}>
                {selectedDept.name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{selectedDept.name}</div>
                <div className="text-xs text-muted-foreground">
                  {deptEmployees.length} {language === "ar" ? "موظفين" : "members"}
                  {isConnected && <span className="ml-1 text-green-500">● {language === "ar" ? "مباشر" : "Live"}</span>}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isExpanded && (
            <button onClick={() => setIsMaximized(!isMaximized)} className="p-1 hover:bg-muted rounded">
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-muted rounded">
            {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Messages area */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderType === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%]`}>
                {msg.senderType === "employee" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: msg.avatarColor || "#6366f1", color: "white" }}>
                      {msg.employeeName?.charAt(0) || "?"}
                    </div>
                    <span className="text-xs font-medium">{msg.employeeName}</span>
                    {msg.employeeRole && <span className="text-xs text-muted-foreground">({msg.employeeRole})</span>}
                  </div>
                )}
                <div className={`rounded-lg px-3 py-2 text-sm ${
                  msg.senderType === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : msg.senderType === "system"
                    ? "bg-muted text-muted-foreground border"
                    : "bg-secondary text-secondary-foreground"
                }`}>
                  {msg.content}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {msg.timestamp.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", { 
                    hour: "2-digit", minute: "2-digit" 
                  })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">{language === "ar" ? "يكتب..." : "Typing..."}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input area */}
      {isExpanded && (
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={language === "ar" ? "اكتب رسالة..." : "Type a message..."}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              dir={language === "ar" ? "rtl" : "ltr"}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
