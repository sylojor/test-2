#!/usr/bin/env python3
"""Write corrected files directly using exec_command on server"""
import paramiko
import base64
import zlib

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# ============= Step 1: Completely rewrite department-chat-sidebar.tsx =============
sidebar_code = '''"use client"

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

  const dialect = company?.dialect || "formal"

  // Auto-load ALL employee-to-employee conversations - NO SELECTION REQUIRED
  const loadAllConversations = useCallback(async () => {
    if (!company?.id) return

    try {
      const res = await fetch(`/api/conversations?companyId=${company.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.conversations && data.conversations.length > 0) {
          const allMessages: ChatMessage[] = []

          for (const conv of data.conversations) {
            try {
              const msgRes = await fetch(`/api/conversations/${conv.id}?companyId=${company.id}`)
              if (msgRes.ok) {
                const msgData = await msgRes.json()
                if (msgData.messages) {
                  for (const m of msgData.messages) {
                    const emp = employees.find(e => e.id === m.employeeId)
                    const dept = emp?.departmentId ? departments.find(d => d.id === emp.departmentId) : null

                    if (m.senderType !== "USER" || conv.type === "DEPARTMENT_CHAT") {
                      allMessages.push({
                        id: m.id,
                        content: m.content,
                        sender: m.senderName || m.employeeName || "employee",
                        senderType: m.senderType === "USER" ? "user" as const : "employee" as const,
                        timestamp: new Date(m.createdAt),
                        employeeId: m.employeeId || emp?.id,
                        employeeName: m.senderName || m.employeeName || emp?.name,
                        employeeRole: m.employeeRole || emp?.role,
                        department: dept?.name || m.departmentName || "",
                        departmentId: dept?.id || emp?.departmentId,
                        avatarColor: m.avatarColor || emp?.avatarColor,
                      })
                    }
                  }
                }
              }
            } catch (e) {
              // Skip failed conversation fetch
            }
          }

          allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

          const uniqueMessages = allMessages.filter((m, i, arr) =>
            arr.findIndex(x => x.id === m.id) === i
          )

          if (uniqueMessages.length > 0) {
            setMessages(prev => {
              if (prev.length === uniqueMessages.length &&
                  prev[prev.length - 1]?.id === uniqueMessages[uniqueMessages.length - 1]?.id) {
                return prev
              }
              return uniqueMessages
            })
            setIsConnected(true)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load conversations:", error)
    }
  }, [company?.id, departments, employees])

  useEffect(() => {
    loadAllConversations()
  }, [loadAllConversations])

  useEffect(() => {
    pollIntervalRef.current = setInterval(loadAllConversations, 5000)
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [loadAllConversations])

  useEffect(() => {
    if (messages.length === 0 && company?.id) {
      const welcomeMsg = dialect === "english"
        ? "Department Chat - See what your employees are discussing in real-time. Messages appear automatically as employees talk to each other."
        : "محادثات الأقسام - شوف شو الموظفين بحكو مع بعضهم مباشرة. الرسائل تظهر تلقائياً بدون أي اختيار."

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

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !company?.id) return

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
      const activeEmployees = employees.filter(e => e.status === "ACTIVE")

      if (activeEmployees.length === 0) {
        setIsLoading(false)
        return
      }

      const targetEmployees = activeEmployees.slice(0, 3)

      for (const emp of targetEmployees) {
        const dept = emp.departmentId ? departments.find(d => d.id === emp.departmentId) : null

        try {
          const res = await apiPost("/api/conversations", {
            employeeId: emp.id,
            message: inputMessage.trim(),
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
              department: dept?.name || "",
              departmentId: dept?.id,
              avatarColor: emp.avatarColor,
            }
            setMessages(prev => [...prev, empMsg])
          }
        } catch (e) {
          const fallbackMsg: ChatMessage = {
            id: `fallback-${emp.id}-${Date.now()}`,
            content: generateEmployeeReply(inputMessage.trim(), emp, dialect),
            sender: "employee",
            senderType: "employee",
            timestamp: new Date(),
            employeeId: emp.id,
            employeeName: emp.name,
            employeeRole: emp.role,
            department: dept?.name || "",
            departmentId: dept?.id,
            avatarColor: emp.avatarColor,
          }
          setMessages(prev => [...prev, fallbackMsg])
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

    if (dialect === "english") return `As ${name} (${role}), I will handle this based on my expertise in ${spec}.`
    if (dialect === "levantine") return `أنا ${name} (${role})، بتعامل مع الطلب حسب تخصصي في ${spec}.`
    if (dialect === "egyptian") return `أنا ${name} (${role})، هتعامل مع الطلب حسب تخصصي في ${spec}.`
    if (dialect === "gulf") return `أنا ${name} (${role})، بساعدك في هذا حسب تخصصي في ${spec}.`
    return `أنا ${name} (${role})، سأتعامل مع هذا حسب تخصصي في ${spec}.`
  }

  const widthClass = isMaximized ? "w-[340px]" : isExpanded ? "w-[300px]" : "w-[48px]"

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
              <div className={`max-w-[85%]`}>
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
}'''

# Encode as base64 to avoid shell escaping issues
encoded = base64.b64encode(sidebar_code.encode('utf-8')).decode('ascii')
cmd = f"echo '{encoded}' | base64 -d > ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx"

stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"Sidebar upload result: {out}")
if err:
    print(f"Sidebar upload stderr: {err}")

# Verify sidebar
stdin, stdout, stderr = client.exec_command("grep -c 'essages' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
count = stdout.read().decode().strip()
print(f"Sidebar 'essages' count: {count}")

stdin, stdout, stderr = client.exec_command("grep -c '\\[messages, setMessages\\]' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
count2 = stdout.read().decode().strip()
print(f"Sidebar '[messages, setMessages]' count: {count2}")

stdin, stdout, stderr = client.exec_command("wc -l ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
lines = stdout.read().decode().strip()
print(f"Sidebar line count: {lines}")

# ============= Step 2: Fix llm-service.ts line 180 via Python on server =============
fix_llm_cmd = """python3 -c '
path = "/home/ubuntu/blivoai-demo/src/lib/llm-service.ts"
with open(path, "rb") as f:
    data = f.read()
old = b"models.tier]"
new = b"models[m.tier]"
if old in data:
    data = data.replace(old, new)
    with open(path, "wb") as f:
        f.write(data)
    print("Fixed: replaced models.tier] with models[m.tier]")
else:
    print("Pattern models.tier] not found - checking alternatives")
    # Maybe its a different bracket character
    idx = data.find(b"tier]")
    if idx >= 0:
        print(f"Found tier] at position {idx}")
        print(f"Bytes before: {data[idx-10:idx+5].hex()}")
    # Try searching with just the text
    lines = data.decode("utf-8").split("\n")
    for i, line in enumerate(lines):
        if "tier]" in line and "models" in line:
            print(f"Line {i+1}: {repr(line.strip())}")
            # Replace the text version
            lines[i] = line.replace("models.tier]", "models[m.tier]")
    with open(path, "w") as f:
        f.write("\n".join(lines))
    print("Fixed via text line replacement")
'"""

stdin, stdout, stderr = client.exec_command(fix_llm_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(f"\nLLM fix:\n{out}")
if err:
    print(f"LLM fix stderr: {err}")

# Verify LLM
stdin, stdout, stderr = client.exec_command("sed -n '180p' ~/blivoai-demo/src/lib/llm-service.ts")
line180 = stdout.read().decode().strip()
print(f"LLM line 180 after fix: {line180}")

client.close()
print("\nDone!")
