// ============================================
// Chatbot Panel — BlivoAI Smart Chat
// ChatGPT-style interface with streaming
// Conversation history sidebar
// Dark mode, modern design
// ============================================

"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Sparkles,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
} from "lucide-react"
import { useDashboardStore } from "@/stores/dashboard-store"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

// ============================================
// Sidebar content — reused for desktop + mobile Sheet
// ============================================
function ChatHistorySidebar({
  conversations,
  activeConversation,
  setActiveConversation,
  createNewConversation,
  deleteConversation,
  language,
}: {
  conversations: Conversation[]
  activeConversation: string | null
  setActiveConversation: (id: string) => void
  createNewConversation: () => void
  deleteConversation: (id: string) => void
  language: string
}) {
  return (
    <>
      {/* New Chat Button */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={createNewConversation}
          className="w-full bg-gradient-to-r from-[#3F4A69] to-emerald-600 hover:from-[#3F4A69] hover:to-emerald-500 text-white text-sm"
        >
          <Plus className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {t("chatbot.newChat", language)}
        </Button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto scrollbar-custom p-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">{t("chatbot.noHistory", language)}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all group ${
                  activeConversation === conv.id
                    ? "bg-[#3F4A69]/15 text-foreground glow-brand"
                    : "bg-muted/30 hover:bg-muted/60 text-muted-foreground"
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-xs truncate">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function ChatbotPanel() {
  const language = useLocale()
  const isRTL = language === "ar"
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const { setActiveTab } = useDashboardStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Get current conversation messages
  const currentMessages = conversations.find(c => c.id === activeConversation)?.messages || []

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentMessages, streamingContent])

  // Create new conversation — يرجع الـ ID عشان نستخدمه مباشرة
  const createNewConversation = (): string => {
    const newId = `conv-${Date.now()}`
    const newConv: Conversation = {
      id: newId,
      title: language === "ar" ? "محادثة جديدة" : "New Chat",
      messages: [],
      createdAt: new Date(),
    }
    setConversations(prev => [newConv, ...prev])
    setActiveConversation(newId)
    setInputValue("")
    inputRef.current?.focus()
    return newId
  }

  // Delete conversation
  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConversation === id) {
      const remaining = conversations.filter(c => c.id !== id)
      setActiveConversation(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return

    // استخدام الـ ID مباشرة بدون الاعتماد على حالة React
    // هاد يحل مشكلة اختفاء المحادثة بعد الإرسال
    let convId = activeConversation
    if (!convId) {
      convId = createNewConversation()
    }
    
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    // Update conversation with user message
    setConversations(prev => {
      const existing = prev.find(c => c.id === convId)
      if (existing) {
        const updated = {
          ...existing,
          messages: [...existing.messages, userMessage],
          title: existing.messages.length === 0 
            ? (language === "ar" ? `محادثة: ${inputValue.trim().slice(0, 30)}` : `Chat: ${inputValue.trim().slice(0, 30)}`)
            : existing.title,
        }
        return prev.map(c => c.id === convId ? updated : c)
      } else {
        return [{
          id: convId,
          title: language === "ar" ? `محادثة: ${inputValue.trim().slice(0, 30)}` : `Chat: ${inputValue.trim().slice(0, 30)}`,
          messages: [userMessage],
          createdAt: new Date(),
        }, ...prev]
      }
    })

    setInputValue("")
    setIsStreaming(true)
    setStreamingContent("")

    try {
      // Get auth token from localStorage for authenticated request
      const session = JSON.parse(localStorage.getItem("oec_session") || "{}")
      const authToken = session.token || ""

      // Call the /api/chat endpoint for streaming
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": language,
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          messages: [...(conversations.find(c => c.id === convId)?.messages || []), userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          language,
          conversationId: convId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      // Read the streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullContent += chunk
          setStreamingContent(fullContent)
        }
      } else {
        // Non-streaming fallback
        const data = await response.json()
        fullContent = data.reply || data.content || data.message || ""
        setStreamingContent(fullContent)
      }

      // Add assistant message to conversation
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-resp`,
        role: "assistant",
        content: fullContent,
        timestamp: new Date(),
      }

      setConversations(prev => prev.map(c => 
        c.id === convId 
          ? { ...c, messages: [...c.messages, assistantMessage] }
          : c
      ))
    } catch {
      // Error handling - add error message
      const errorMessage: Message = {
        id: `msg-${Date.now()}-err`,
        role: "assistant",
        content: t("chatbot.error", language),
        timestamp: new Date(),
      }

      setConversations(prev => prev.map(c => 
        c.id === convId 
          ? { ...c, messages: [...c.messages, errorMessage] }
          : c
      ))
    } finally {
      setIsStreaming(false)
      setStreamingContent("")
    }
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* === Mobile: Back button + sidebar toggle === */}
      {/* Back to overview — mobile only */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setActiveTab("overview")}
        className="md:hidden fixed top-2 z-50 bg-muted text-foreground hover:bg-muted/80 min-h-[44px] min-w-[44px] rounded-xl"
        style={{ [isRTL ? 'right' : 'left']: '12px' } as React.CSSProperties}
        aria-label={language === "ar" ? "رجوع" : "Back"}
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden fixed top-2 z-40 bg-muted/80 text-foreground hover:bg-muted/60 min-h-[44px] min-w-[44px]"
        style={{ [isRTL ? 'left' : 'right']: '12px' } as React.CSSProperties}
        dir="ltr"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile sidebar — Sheet drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side={isRTL ? "right" : "left"}
          className="w-[280px] sm:w-[320px] bg-card border-border p-0 overflow-hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("chatbot.title", language)}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full">
            <ChatHistorySidebar
              conversations={conversations}
              activeConversation={activeConversation}
              setActiveConversation={(id) => { setActiveConversation(id); setMobileSidebarOpen(false); }}
              createNewConversation={createNewConversation}
              deleteConversation={deleteConversation}
              language={language}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar — collapsible */}
      {desktopSidebarOpen && (
        <div className="hidden md:flex w-56 bg-card border-r border-border flex-col">
          {/* Close sidebar button */}
          <div className="p-2 border-b border-border flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDesktopSidebarOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>
          <ChatHistorySidebar
            conversations={conversations}
            activeConversation={activeConversation}
            setActiveConversation={setActiveConversation}
            createNewConversation={createNewConversation}
            deleteConversation={deleteConversation}
            language={language}
          />
        </div>
      )}

      {/* === Main Chat Area === */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="px-3 sm:px-4 py-3 border-b border-border bg-card flex items-center gap-3">
          {/* Desktop: toggle sidebar open button (when sidebar is closed) */}
          {!desktopSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDesktopSidebarOpen(true)}
              className="hidden md:flex text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          )}
          {/* Mobile: padding for back/menu buttons */}
          <div className="md:hidden" style={{ width: isRTL ? '100px' : '100px' }} />
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-[#3F4A69] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-foreground font-medium text-sm">{t("chatbot.title", language)}</h3>
            <p className="text-muted-foreground text-xs">{t("chatbot.subtitle", language)}</p>
          </div>
          {isStreaming && (
            <div className="typing-indicator ml-auto rtl:ml-0 rtl:mr-auto">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-3 sm:px-4 py-4 scrollbar-custom">
          {currentMessages.length === 0 && !streamingContent ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3F4A69] to-emerald-500 flex items-center justify-center mx-auto mb-4 glow-brand">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <p className="text-muted-foreground text-lg mb-2">{t("chatbot.welcome", language)}</p>
              <p className="text-muted-foreground text-sm">{t("chatbot.subtitle", language)}</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {currentMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3F4A69] to-emerald-500 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-[#3F4A69] to-emerald-600 text-white shadow-lg shadow-emerald-500/10"
                      : "bg-muted text-foreground"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {/* Streaming content */}
              {streamingContent && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3F4A69] to-emerald-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="max-w-[80%] bg-muted rounded-2xl px-4 py-3 text-foreground">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingContent}</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-3 sm:p-4 border-t border-border bg-card">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <div className="flex-1 bg-muted rounded-xl px-4 py-3">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chatbot.placeholder", language)}
                rows={1}
                className="w-full bg-transparent text-foreground text-sm resize-none outline-none placeholder:text-muted-foreground max-h-32 overflow-y-auto scrollbar-custom"
                style={{ minHeight: "24px" }}
                disabled={isStreaming}
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isStreaming}
              className="bg-gradient-to-r from-[#3F4A69] to-emerald-600 hover:from-[#3F4A69] hover:to-emerald-500 text-white h-10 w-10 p-0 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
