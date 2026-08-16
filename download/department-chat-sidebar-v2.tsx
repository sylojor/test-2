"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n-config"
import { apiPost } from "@/lib/api-client"
import { 
  MessageCircle, Send, ChevronLeft, ChevronRight, 
  Maximize2, Minimize2, Loader2, Users, Radio
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
  departmentId?: string
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
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMaximized, setIsMaximized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Dialect
  const dialect = company?.dialect || "formal"

  // Auto-load ALL department conversations on mount
  const loadAllConversations = useCallback(async () => {
    if (!company?.id) return
    
    try {
      // Fetch all department chat conversations
      const res = await fetch(`/api/conversations?companyId=${company.id}&type=DEPARTMENT_CHAT`)
      if (res.ok) {
        const data = await res.json()
        if (data.conversations && data.conversations.length > 0) {
          // Load messages from all department conversations
          const allMessages: ChatMessage[] = []
          
          for (const conv of data.conversations) {
            try {
              const msgRes = await fetch(`/api/conversations/${conv.id}?companyId=${company.id}`)
              if (msgRes.ok) {
                const msgData = await msgRes.json()
                if (msgData.messages) {
                  for (const m of msgData.messages) {
                    const dept = departments.find(d => 
                      employees.some(e => e.id === m.employeeId && e.departmentId === d.id)
                    )
                    allMessages.push({
                      id: m.id,
                      content: m.content,
                      sender: m.senderType === "USER" ? "user" : m.senderName || "employee",
                      senderType: m.senderType === "USER" ? "user" as const : "employee" as const,
                      timestamp: new Date(m.createdAt),
                      employeeId: m.employeeId,
                      employeeName: m.senderName || m.employeeName,
                      employeeRole: m.employeeRole,
                      department: dept?.name || m.departmentName,
                      departmentId: dept?.id,
                      avatarColor: m.avatarColor || employees.find(e => e.id === m.employeeId)?.avatarColor,
                    })
                  }
                }
              }
            } catch (e) {
              // Skip failed conversation fetch
            }
          }
          
          // Sort by timestamp
          allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          
          if (allMessages.length > 0) {
            setMessages(allMessages)
            setIsConnected(true)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load conversations:", error)
    }
  }, [company?.id, departments, employees])

  // Initial load
  useEffect(() => {
    loadAllConversations()
  }, [loadAllConversations])

  // Auto-refresh every 3 seconds for real-time feel
  useEffect(() => {
    pollIntervalRef.current = setInterval(loadAllConversations, 3000)
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [loadAllConversations])

  // Welcome message if no conversations yet
  useEffect(() => {
    if (messages.length === 0 && company?.id) {
      const welcomeMsg = dialect === "english" 
        ? "Department Chat — See what your employees are discussing in real-time. Type a message to join any department conversation."
        : "محادثات الأقسام — شوف شو الموظفين بحكو مع بعضهم مباشرة. اكتب رسالة لتنضم لأي محادثة قسم."
      
      setMessages([
        {
          id: "welcome-system",
          content: welcomeMsg,
          sender: "system",
          senderType: "system",
          timestamp: new Date(),
        }
      ])
    }
  }, [company?.id, dialect, messages.length])

  // Send message to the selected department (or all)
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
      // Send to all active employees in all departments (grouped)
      const activeDepts = departments.filter(d => 
        employees.some(e => e.departmentId === d.id && e.status === "ACTIVE")
      )
      
      if (activeDepts.length === 0) {
        setIsLoading(false)
        return
      }
      
      // Send to the first department that has employees (or the most relevant)
      for (const dept of activeDepts.slice(0, 2)) {
        const deptEmployees = employees.filter(e => e.departmentId === dept.id && e.status === "ACTIVE").slice(0, 2)
        const deptName = dept.name
        const prefixedMsg = `[محادثة قسم ${deptName}] ${inputMessage.trim()}`
        
        for (const emp of deptEmployees) {
          try {
            const res = await apiPost("/api/conversations", {
              employeeId: emp.id,
              message: prefixedMsg,
              companyId: company?.id,
              chatHistory: messages.slice(-8).map(m => ({
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
                departmentId: dept.id,
                avatarColor: emp.avatarColor,
              }
              setMessages(prev => [...prev, empMsg])
            }
          } catch (e) {
            // Fallback for this employee
            const fallbackMsg: ChatMessage = {
              id: `fallback-${emp.id}-${Date.now()}`,
              content: generateEmployeeReply(inputMessage.trim(), emp, dialect),
              sender: "employee",
              senderType: "employee",
              timestamp: new Date(),
              employeeId: emp.id,
              employeeName: emp.name,
              employeeRole: emp.role,
              department: deptName,
              departmentId: dept.id,
              avatarColor: emp.avatarColor,
            }
            setMessages(prev => [...prev, fallbackMsg])
          }
        }
      }
    } catch (error) {
      console.error("Send message error:", error)
    }
    
    setIsLoading(false)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const generateEmployeeReply = (msg: string, emp: IEmployee, dialect: string): string => {
    const name = emp.name
    const role = emp.role || "موظف"
    const spec = emp.specialization || "عام"
    
    if (dialect === "english") return `As ${name} (${role}), I'll handle this based on my expertise in ${spec}.`
    if (dialect === "levantine") return `أنا ${name} (${role})، بتعامل مع الطلب حسب تخصصي في ${spec}.`
    if (dialect === "egyptian") return `أنا ${name} (${role})، هتعامل مع الطلب حسب تخصصي في ${spec}.`
    if (dialect === "gulf") return `أنا ${name} (${role})، بساعدك في هذا حسب تخصصي في ${spec}.`
    return `أنا ${name} (${role})، سأتعامل مع هذا حسب تخصصي في ${spec}.`
  }

  // Width classes - properly sized, not too narrow
  const widthClass = isMaximized ? "w-[320px]" : isExpanded ? "w-[280px]" : "w-[48px]"

  return (
    <div className={`${widthClass} border-l border-border bg-card transition-all duration-300 flex flex-col h-full overflow-hidden`}>
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between min-h-[48px]">
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-green-500" />
                <span className="text-sm font-semibold truncate">
                  {language === "ar" ? "محادثات الأقسام" : "Dept Chat"}
                </span>
              </div>
              {isConnected && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                  {language === "ar" ? "مباشر" : "Live"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMaximized(!isMaximized)} className="p-1 hover:bg-muted rounded" title="Resize">
                {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => setIsExpanded(false)} className="p-1 hover:bg-muted rounded" title="Collapse">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => setIsExpanded(true)} className="p-1 hover:bg-muted rounded mx-auto" title="Expand">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Messages area */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderType === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.senderType === "user" ? "" : ""}`}>
                {msg.senderType === "employee" && (
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ backgroundColor: msg.avatarColor || "#6366f1", color: "white" }}>
                      {msg.employeeName?.charAt(0) || "?"}
                    </div>
                    <span className="text-[11px] font-medium text-foreground">{msg.employeeName}</span>
                    {msg.department && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {msg.department}
                      </span>
                    )}
                  </div>
                )}
                {msg.senderType === "system" && (
                  <div className="flex items-center gap-1 mb-1">
                    <Users className="h-3 w-3 text-primary" />
                    <span className="text-[11px] text-primary font-medium">
                      {language === "ar" ? "نظام" : "System"}
                    </span>
                  </div>
                )}
                <div className={`rounded-lg px-2.5 py-1.5 text-[13px] leading-relaxed ${
                  msg.senderType === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : msg.senderType === "system"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-secondary text-secondary-foreground"
                }`}>
                  {msg.content}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {msg.timestamp.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", { 
                    hour: "2-digit", minute: "2-digit" 
                  })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[13px] text-muted-foreground">{language === "ar" ? "يكتب..." : "Typing..."}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input area */}
      {isExpanded && (
        <div className="p-2 border-t border-border">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={language === "ar" ? "اكتب رسالة للأقسام..." : "Type to departments..."}
              className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
              dir={language === "ar" ? "rtl" : "ltr"}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1.5 hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
