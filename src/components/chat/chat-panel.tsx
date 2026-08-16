// ============================================
// واجهة المحادثة مع الموظف — النسخة الكاملة
//
// متصلة مع LLM Service + إدارة التوكنات
// الموظف بيرد بنفس شخصيته ولهجته
// + نظام ثنائي اللغة
// ============================================

"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getEmployeeStatusDisplay } from "@/lib/employee-generator"
import { useDashboardStore } from "@/stores/dashboard-store"
import { t } from "@/lib/i18n"
import { apiPost } from "@/lib/api-client"
import type { IEmployee, ICompany } from "@/types"
import { useLocale } from "@/hooks/use-locale"
import { ArrowLeft } from "lucide-react"

interface ChatPanelProps {
  employee: IEmployee
  company: ICompany | null
}

interface DisplayMessage {
  id: string
  senderType: "USER" | "EMPLOYEE" | "SYSTEM"
  senderName: string
  content: string
  timestamp: Date
  tokensUsed?: number
}

export function ChatPanel({ employee, company }: ChatPanelProps) {
  const language = useLocale()
  
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "welcome",
      senderType: "EMPLOYEE",
      senderName: employee.name,
      content: getWelcomeMessage(employee, company),
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // تمرير تلقائي لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // رسالة ترحيبية حسب لغة الموقع
  function getWelcomeMessage(emp: IEmployee, comp: ICompany | null): string {
    if (language === "en") {
      return `Hi! I'm ${emp.name}, the ${emp.role}. Ready to work — how can I help?`
    }
    const dialect = comp?.dialect ?? "levantine"
    const greetings: Record<string, string> = {
      levantine: `أهلاً! أنا ${emp.name}، ${emp.role} هون. جاهز أشتغل! شو بدك أساوي؟`,
      egyptian: `أهلاً بيك! أنا ${emp.name}، ${emp.role}. جاهز أبدأ — إيه اللي محتاجه؟`,
      gulf: `حياك الله! أنا ${emp.name}، ${emp.role}. جاهز أشتغل — وش تحتاج؟`,
      iraqi: `هلا! أنا ${emp.name}، ${emp.role}. جاهز شغلة — شلون أقدر أساعدك؟`,
      moroccan: `أهلاً! أنا ${emp.name}، ${emp.role}. باش نقدر نعاونك؟`,
      formal: `مرحبًا، أنا ${emp.name}، ${emp.role} هنا. جاهز للعمل، كيف يمكنني مساعدتك؟`,
      english: `Hi! I'm ${emp.name}, the ${emp.role}. Ready to work — how can I help?`,
    }
    return greetings[dialect] ?? greetings.levantine
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      senderType: "USER",
      senderName: t("chat.you", language),
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const messageText = input.trim()
    setInput("")
    setIsTyping(true)

    try {
      // إرسال الرسالة للـ API — مع إعادة المحاولة التلقائية
      const { data, error, status } = await apiPost<{ reply?: string; content?: string; tokensUsed?: { totalTokens?: number } }>(
        "/api/conversations",
        {
          employeeId: employee.id,
          message: messageText,
          companyId: company?.id,
          language,
          chatHistory: messages
            .filter(m => m.id !== "welcome")
            .slice(-10)
            .map(m => ({
              role: m.senderType === "USER" ? "user" : "assistant",
              content: m.content,
            })),
        },
        { retries: 2, timeout: 30000 },
      )

      const replyContent = data?.reply || data?.content || ""
      if (replyContent) {
        const employeeMessage: DisplayMessage = {
          id: `emp-${Date.now()}`,
          senderType: "EMPLOYEE",
          senderName: employee.name,
          content: replyContent,
          timestamp: new Date(),
          tokensUsed: data?.tokensUsed?.totalTokens,
        }
        setMessages(prev => [...prev, employeeMessage])
      }
    } catch {
      // خطأ شبك — لا نستخدم ردود ثابتة
      const errorMsg = language === "en"
        ? "Connection error. Please check your internet and try again."
        : "خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى."
      const employeeMessage: DisplayMessage = {
        id: `emp-${Date.now()}`,
        senderType: "EMPLOYEE",
        senderName: employee.name,
        content: errorMsg,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, employeeMessage])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-950" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* رأس المحادثة */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile: Back button */}
          <button
            onClick={() => useDashboardStore.getState().setActiveTab("talk")}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px]"
            aria-label={language === "ar" ? "رجوع" : "Back"}
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: employee.avatarColor || "#10b981" }}
          >
            {employee.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold">{employee.name}</h2>
            <p className="text-slate-400 text-xs">{employee.role}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] bg-emerald-900/30 text-emerald-400">
              {t("chat.freeMode", language)}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-xs ${
                employee.status === "ACTIVE"
                  ? "bg-green-900/30 text-green-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {getEmployeeStatusDisplay(employee.status)}
            </Badge>
          </div>
        </div>
      </div>

      {/* الرسائل */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderType === "USER" ? "justify-start" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.senderType === "USER"
                  ? "bg-emerald-600 text-white rounded-bl-md"
                  : msg.senderType === "SYSTEM"
                  ? "bg-slate-800 text-slate-400 text-center text-xs"
                  : "bg-slate-800 text-slate-200 rounded-br-md"
              }`}
            >
              {msg.senderType === "EMPLOYEE" && (
                <p className="text-emerald-400 text-xs font-medium mb-1">{msg.senderName}</p>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs opacity-50">
                  {msg.timestamp.toLocaleTimeString(language === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* مؤشر الكتابة */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-br-md px-4 py-3">
              <p className="text-emerald-400 text-xs font-medium mb-1">{employee.name}</p>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* حقل الإدخال */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`${t("chat.typeMessage", language)} ${employee.name}...`}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[44px]"
            disabled={isTyping}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 min-h-[44px] min-w-[44px]"
          >
            {t("chat.send", language)}
          </Button>
        </div>
      </div>
    </div>
  )
}

// (generateLocalReply removed — we now rely on the real LLM API response only)
// No more static/canned responses — the agent calls the real LLM
