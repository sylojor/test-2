// ============================================
// Chat Panel with Image Support
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
import { ArrowLeft, ImageIcon, X, Loader2 } from "lucide-react"

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
  imageUrl?: string
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
  const [pendingImage, setPendingImage] = useState<{ url: string; file: File } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function getWelcomeMessage(emp: IEmployee, comp: ICompany | null): string {
    if (language === "en") {
      return `Hi! I'm ${emp.name}, the ${emp.role}. I can help you with tasks, create content, generate professional images, and more. Just upload images and tell me what you need. How can I help?`
    }
    const dialect = comp?.dialect ?? "levantine"
    const greetings: Record<string, string> = {
      levantine: `أهلاً! أنا ${emp.name}، ${emp.role} هون. أقدر أساعدك بالمهام، أعمل محتوى، أولّد صور احترافية، وأكتر. ارفع صورة وقولي شو بدك أساوي فيها!`,
      egyptian: `أهلاً بيك! أنا ${emp.name}، ${emp.role}. أقدر أساعدك بالمهام، أعمل محتوى، وأولّد صور احترافية. ارفع أي صورة وقولي إيه اللي عايزه!`,
      gulf: `حياك الله! أنا ${emp.name}، ${emp.role}. أقدر أساعدك وأولّد صور احترافية. ارفع صورة وقولي وش تبي!`,
      formal: `مرحبًا، أنا ${emp.name}، ${emp.role} هنا. يمكنني مساعدتك في المهام وإنشاء المحتوى وتوليد صور احترافية.`,
      english: `Hi! I'm ${emp.name}, the ${emp.role}. I can help with tasks, content, and professional image generation. How can I help?`,
    }
    return greetings[dialect] ?? greetings.levantine
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    if (file.size > 10 * 1024 * 1024) return
    const url = URL.createObjectURL(file)
    setPendingImage({ url, file })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSend = async () => {
    if (!input.trim() && !pendingImage) return

    let uploadedImageUrl: string | undefined

    if (pendingImage) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", pendingImage.file)
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          uploadedImageUrl = uploadData.url
        }
      } catch (error) {
        console.error("[IMAGE_UPLOAD_ERROR]", error)
      }
      setIsUploading(false)
      setPendingImage(null)
    }

    const userMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      senderType: "USER",
      senderName: t("chat.you", language),
      content: input.trim() || (language === "en" ? "Uploaded an image" : "رفعت صورة"),
      timestamp: new Date(),
      imageUrl: uploadedImageUrl,
    }
    setMessages(prev => [...prev, userMessage])
    
    const messageText = input.trim()
    setInput("")
    setIsTyping(true)

    const fullMessage = uploadedImageUrl 
      ? `${messageText || (language === "en" ? "I uploaded an image" : "رفعت صورة")}\n\n[Image URL: ${uploadedImageUrl}]`
      : messageText

    try {
      const { data } = await apiPost<{ reply?: string; content?: string; tokensUsed?: { totalTokens?: number } }>(
        "/api/conversations",
        {
          employeeId: employee.id,
          message: fullMessage,
          companyId: company?.id,
          language,
          chatHistory: messages
            .filter(m => m.id !== "welcome")
            .slice(-10)
            .map(m => ({
              role: m.senderType === "USER" ? "user" : "assistant",
              content: m.imageUrl ? `${m.content}\n\n[Image: ${m.imageUrl}]` : m.content,
            })),
        },
        { retries: 2, timeout: 60000 },
      )

      const replyContent = data?.reply || data?.content || ""
      
      if (replyContent) {
        const imageMatch = replyContent.match(/Image URL:\s*(https?:\/\/[^\s\n]+)/i)
        const pngMatch = replyContent.match(/https?:\/\/[^\s\n]+\.png/gi)
        const extractedImageUrl = imageMatch?.[1] || pngMatch?.[0] || undefined
        
        const displayContent = replyContent
          .replace(/Image URL:\s*https?:\/\/[^\s\n]+\n?/gi, "")
          .replace(/\n\nYou can view and download.*$/s, "")
          .replace(/\n\nThe image has been saved.*$/s, "")
          .trim()

        const employeeMessage: DisplayMessage = {
          id: `emp-${Date.now()}`,
          senderType: "EMPLOYEE",
          senderName: employee.name,
          content: displayContent || (language === "en" ? "I've created the image for you!" : "عملتلك الصورة!"),
          timestamp: new Date(),
          tokensUsed: data?.tokensUsed?.totalTokens,
          imageUrl: extractedImageUrl,
        }
        setMessages(prev => [...prev, employeeMessage])
      }
    } catch {
      const errorMsg = language === "en"
        ? "Connection error. Please try again."
        : "خطأ في الاتصال. يرجى المحاولة مرة أخرى."
      setMessages(prev => [...prev, {
        id: `emp-${Date.now()}`,
        senderType: "EMPLOYEE",
        senderName: employee.name,
        content: errorMsg,
        timestamp: new Date(),
      }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex justify-start">
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
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
              {msg.imageUrl && (
                <div className="mb-2">
                  <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={msg.imageUrl}
                      alt="Image"
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: "300px" }}
                      loading="lazy"
                    />
                  </a>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs opacity-50 mt-1">
                {msg.timestamp.toLocaleTimeString(language === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

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

      {/* Pending image preview */}
      {pendingImage && (
        <div className="px-3 sm:px-4 pt-2">
          <div className="relative inline-block">
            <img src={pendingImage.url} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-slate-700" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isTyping || isUploading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 min-h-[44px] min-w-[44px]"
            title={language === "ar" ? "رفع صورة" : "Upload image"}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          </Button>
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
            disabled={(!input.trim() && !pendingImage) || isTyping}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 min-h-[44px] min-w-[44px]"
          >
            {t("chat.send", language)}
          </Button>
        </div>
      </div>
    </div>
  )
}
