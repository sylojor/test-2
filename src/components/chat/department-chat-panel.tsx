// ============================================
// لوحة محادثة القسم — نظام التنسيق الذكي
// 
// هون الموظفين بنفس القسم بيتحاكو مع بعض
// والمدير بيشوف المحادثة (باللهجة اللي اختارها)
// 
// نظام التنسيق الجديد:
// 1. المنسق الذكي بيدرس الرسالة وبقرر مين الأنسب يرد
// 2. إذا نادى المستخدم موظف بالاسم → هو بس يرد
// 3. إذا ما نادى حد → المنسق يختار الأنسب حسب التخصص
// 4. كل موظف بيعرف اسمه وبيرد لما ينادى بالاسم
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
  coordinationInfo?: string // معلومات التنسيق (لما المنسق يختار)
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
  const [isCoordinating, setIsCoordinating] = useState(false) // المنسق يفكر
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

  // ============================================
  // إرسال رسالة من المدير — مع نظام التنسيق الذكي
  // ============================================
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

    // الموظفين المتاحين للرد
    const employeesToRespond = chatType === "department"
      ? deptEmployees
      : chatType === "cross-department" && selectedCrossDept
        ? [...deptEmployees, ...employees.filter(e => e.departmentId === selectedCrossDept && e.status === "ACTIVE")].slice(0, 3)
        : []

    if (employeesToRespond.length === 0) return

    let respondents: IEmployee[]
    let coordinationReason: string | null = null

    if (employeesToRespond.length === 1) {
      // موظف واحد بس → هو يرد
      respondents = [employeesToRespond[0]]
      coordinationReason = null
    } else {
      // ============================================
      // المنسق الذكي — يقرر مين الأنسب
      // دايماً نستخدم المنسق لما في أكثر من موظف
      // لأنو المنسق بيفهم السياق وبيفرق بين نِداء وذِكر
      // (مثل: "مين أحسن أحمد ولا خالد؟" → أحمد يرد مش خالد)
      // ============================================
      setIsCoordinating(true)
      try {
        const coordResult = await coordinateMessage(
          messageText,
          employeesToRespond,
          company?.id || "",
          selectedDept.name,
        )
        respondents = coordResult.selectedEmployees
          .map(id => employeesToRespond.find(e => e.id === id))
          .filter((e): e is IEmployee => e !== undefined)
        coordinationReason = coordResult.reason

        // لو المنسق ما اختار حد → نختار الأول
        if (respondents.length === 0) {
          respondents = [employeesToRespond[0]]
        }
      } catch {
        // Fallback: نختار الأول
        respondents = [employeesToRespond[0]]
        coordinationReason = null
      } finally {
        setIsCoordinating(false)
      }
    }

    // ============================================
    // الخطوة 3: إرسال الرسالة للموظف المختار فقط
    // ============================================
    for (const emp of respondents) {
      setIsTyping(emp.id)
      try {
        // إرسال للـ API الحقيقي — مع سياق إضافي عن الزملاء
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: emp.id,
            message: `[محادثة قسم ${selectedDept.name}] ${messageText}`,
            companyId: company?.id,
            chatHistory: messages
              .filter(m => m.id !== "system-welcome")
              .slice(-8)
              .map(m => ({
                role: m.senderType === "USER" ? "user" : "assistant",
                content: m.content,
              })),
            // سياق إضافي: الزملاء بالمحادثة
            departmentContext: {
              departmentName: selectedDept.name,
              colleagues: employeesToRespond.filter(e => e.id !== emp.id).map(e => ({
                name: e.name,
                role: e.role,
              })),
              isDirectlyAddressed: false, // المنسق بيتولى هاد القرار
              totalParticipants: employeesToRespond.length,
              coordinationReason: coordinationReason, // سبب اختيار هذا الموظف
            },
          }),
        })

        let replyContent: string
        if (res.ok) {
          const data = await res.json()
          replyContent = data.reply || data.content || ""
        } else {
          // API فشل — لا نستخدم fallback ثابت، نعطي رسالة خطأ واضحة
          replyContent = ""
        }

        if (!replyContent) {
          // لا نضيف رد ثابت — نعرض رسالة خطأ بدل الرد المتكرر
          const errorMsg: ChatMessage = {
            id: `err-${emp.id}-${Date.now()}`,
            senderType: "SYSTEM",
            senderName: t("deptChat.system", language),
            content: language === "ar" 
              ? `⚠️ لم أتمكن من الحصول على رد من ${emp.name}. يرجى المحاولة مرة أخرى.` 
              : `⚠️ Could not get a response from ${emp.name}. Please try again.`,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, errorMsg])
          continue
        }

        const empMessage: ChatMessage = {
          id: `emp-${emp.id}-${Date.now()}`,
          senderType: "EMPLOYEE",
          senderName: emp.name,
          senderRole: emp.role,
          content: replyContent,
          timestamp: new Date(),
          departmentName: departments.find(d => d.id === emp.departmentId)?.name,
          coordinationInfo: coordinationReason || undefined,
        }
        setMessages(prev => [...prev, empMessage])
      } catch {
        // خطأ شبك — لا نستخدم ردود ثابتة متكررة
        const errorMsg: ChatMessage = {
          id: `err-${emp.id}-${Date.now()}`,
          senderType: "SYSTEM",
          senderName: t("deptChat.system", language),
          content: language === "ar" 
            ? `⚠️ خطأ في الاتصال — لم أتمكن من الحصول على رد من ${emp.name}. يرجى المحاولة مرة أخرى.`
            : `⚠️ Connection error — could not get a response from ${emp.name}. Please try again.`,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMsg])
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
    <div className="flex flex-col h-full bg-slate-950" dir={language === "ar" ? "rtl" : "ltr"}>
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

        {/* مؤشر التنسيق — المنسق يفكر */}
        {isCoordinating && (
          <div className="flex justify-center">
            <div className="bg-slate-800/50 text-slate-400 text-xs rounded-full px-4 py-2 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-slate-500 border-t-emerald-400 rounded-full animate-spin" />
              {language === "ar" ? "المنسق يختار الأنسب للرد..." : "Coordinator selecting best responder..."}
            </div>
          </div>
        )}

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
            placeholder={language === "ar" ? "اكتب رسالتك... أو نادي موظف بالاسم 🎯" : "Type your message... or call an employee by name 🎯"}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            disabled={!!isTyping || isCoordinating}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !!isTyping || isCoordinating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4"
          >
            {t("deptChat.send", language)}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// المنسق الذكي — يقرر مين الأنسب يرد
// ============================================
async function coordinateMessage(
  message: string,
  employees: IEmployee[],
  companyId: string,
  departmentName: string,
): Promise<{
  selectedEmployees: string[]
  reason: string
  coordinationType: string
}> {
  try {
    const res = await fetch("/api/coordinate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        employees: employees.map(e => ({
          id: e.id,
          name: e.name,
          role: e.role,
          specialization: e.specialization,
          departmentName: departmentName,
        })),
        companyId,
        departmentName,
      }),
    })

    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Fallback
  }

  // Fallback: اختيار بالكلمات المفتاحية محلياً
  return selectByKeywordsLocal(message, employees, departmentName)
}

// Fallback: اختيار محلي بالكلمات المفتاحية + فحص الأسماء
function selectByKeywordsLocal(
  message: string,
  employees: IEmployee[],
  departmentName: string,
): {
  selectedEmployees: string[]
  reason: string
  coordinationType: string
} {
  const msgLower = message.toLowerCase()

  // ============================================
  // الأولوية 1: فحص إذا المستخدم نادى موظف بالاسم
  // يشمل: الأسماء العربية ↔ الإنجليزية
  // ============================================
  const ARABIC_ENGLISH_NAMES: Record<string, string[]> = {
    "احمد": ["ahmad", "ahmed"], "أحمد": ["ahmad", "ahmed"],
    "محمد": ["mohammad", "mohammed", "mohamed", "muhammad"],
    "خالد": ["khaled", "khalid"], "سارة": ["sara", "sarah"],
    "فاطمة": ["fatima", "fatma"], "عمر": ["omar", "omer"],
    "يوسف": ["yousef", "yusuf"], "علي": ["ali"],
    "حسن": ["hassan", "hasan"], "إبراهيم": ["ibrahim", "ebrahim"],
    "ابراهيم": ["ibrahim", "ebrahim"], "نور": ["nour", "noor"],
    "ليلى": ["layla", "laila"], "حسين": ["hussein", "hussain"],
  }
  // بناء خريطة عكسية
  const ENGLISH_ARABIC_NAMES: Record<string, string[]> = {}
  for (const [arName, enNames] of Object.entries(ARABIC_ENGLISH_NAMES)) {
    for (const enName of enNames) {
      if (!ENGLISH_ARABIC_NAMES[enName]) ENGLISH_ARABIC_NAMES[enName] = []
      if (!ENGLISH_ARABIC_NAMES[enName].includes(arName)) ENGLISH_ARABIC_NAMES[enName].push(arName)
    }
  }

  for (const emp of employees) {
    const nameLower = emp.name.toLowerCase()
    const nameParts = emp.name.split(' ').filter(p => p.length > 2)

    // مطابقة مباشرة
    if (msgLower.includes(nameLower)) {
      return {
        selectedEmployees: [emp.id],
        reason: `المستخدم نادى ${emp.name} بالاسم`,
        coordinationType: "DIRECT_MENTION",
      }
    }

    // مطابقة أجزاء الاسم
    for (const part of nameParts) {
      if (msgLower.includes(part.toLowerCase())) {
        return {
          selectedEmployees: [emp.id],
          reason: `المستخدم نادى ${emp.name} بالاسم`,
          coordinationType: "DIRECT_MENTION",
        }
      }
    }

    // تحويل عربي ↔ إنجليزي
    let matched = false
    // إنجليزي → عربي
    if (ENGLISH_ARABIC_NAMES[nameLower]) {
      for (const arName of ENGLISH_ARABIC_NAMES[nameLower]) {
        if (msgLower.includes(arName.toLowerCase())) {
          return { selectedEmployees: [emp.id], reason: `المستخدم نادى ${emp.name} بالاسم (عربي)`, coordinationType: "DIRECT_MENTION" }
        }
      }
    }
    // عربي → إنجليزي
    if (ARABIC_ENGLISH_NAMES[nameLower] || ARABIC_ENGLISH_NAMES[emp.name]) {
      const eqs = ARABIC_ENGLISH_NAMES[nameLower] || ARABIC_ENGLISH_NAMES[emp.name] || []
      for (const enName of eqs) {
        if (msgLower.includes(enName.toLowerCase())) {
          return { selectedEmployees: [emp.id], reason: `المستخدم نادى ${emp.name} بالاسم (إنجليزي)`, coordinationType: "DIRECT_MENTION" }
        }
      }
    }
    // فحص أجزاء الاسم مع التحويل
    for (const part of nameParts) {
      const partLower = part.toLowerCase()
      if (ENGLISH_ARABIC_NAMES[partLower]) {
        for (const arName of ENGLISH_ARABIC_NAMES[partLower]) {
          if (msgLower.includes(arName.toLowerCase())) {
            return { selectedEmployees: [emp.id], reason: `المستخدم نادى ${emp.name} بالاسم`, coordinationType: "DIRECT_MENTION" }
          }
        }
      }
      if (ARABIC_ENGLISH_NAMES[partLower]) {
        const eqs = ARABIC_ENGLISH_NAMES[partLower] || []
        for (const enName of eqs) {
          if (msgLower.includes(enName.toLowerCase())) {
            return { selectedEmployees: [emp.id], reason: `المستخدم نادى ${emp.name} بالاسم`, coordinationType: "DIRECT_MENTION" }
          }
        }
      }
    }
    if (matched) break
  }

  // ============================================
  // الأولوية 2: كلمات مفتاحية حسب التخصص
  // ============================================

  // كلمات مفتاحية لكل تخصص
  const keywordMap: Record<string, string[]> = {
    social: ["سوشيال", "منصات", "تواصل اجتماعي", "محتوى", "بوست", "انستغرام", "فيسبوك", "تويتر", "social", "media", "content", "post"],
    hr: ["موارد بشرية", "توظيف", "موظفين", "رواتب", "إجازة", "hr", "employee", "salary"],
    marketing: ["تسويق", "حملات", "إعلان", "عميل", "market", "campaign", "ad"],
    sales: ["مبيعات", "بيع", "صفقة", "عقد", "sale", "deal"],
    tech: ["تقني", "برمج", "كود", "موقع", "تطبيق", "سيرفر", "tech", "code", "develop", "app"],
    finance: ["مالي", "محاسب", "ميزانية", "فواتير", "ضريب", "finance", "account", "budget"],
    design: ["تصميم", "جرافيك", "شعار", "design", "graphic", "logo"],
    support: ["دعم", "خدمة", "شكوى", "support", "service", "مشكلة"],
  }

  // حساب نقاط لكل موظف
  const scores = employees.map(emp => {
    let score = 0
    const roleLower = emp.role.toLowerCase()
    const specLower = (emp.specialization || "").toLowerCase()
    const combined = `${roleLower} ${specLower}`

    for (const [category, keywords] of Object.entries(keywordMap)) {
      const categoryMatches = keywords.filter(kw => msgLower.includes(kw)).length
      if (categoryMatches > 0 && (combined.includes(category) || keywords.some(kw => combined.includes(kw)))) {
        score += categoryMatches * 10
      }
    }

    return { employee: emp, score }
  })

  scores.sort((a, b) => b.score - a.score)

  if (scores[0].score > 0) {
    return {
      selectedEmployees: [scores[0].employee.id],
      reason: `تم اختيار ${scores[0].employee.name} بناءً على تخصصه`,
      coordinationType: "KEYWORD_MATCHED",
    }
  }

  return {
    selectedEmployees: [employees[0].id],
    reason: `رسالة عامة — تم اختيار ${employees[0].name}`,
    coordinationType: "GENERAL_FALLBACK",
  }
}

// ============================================
// توليد رد موظف في محادثة القسم (Fallback)
// كل موظف يرد حسب تخصصه — مش نفس الشي
// ============================================

function generateEmployeeReply(
  employee: IEmployee,
  userMessage: string,
  company: ICompany | null,
  context: string,
  allEmployees?: IEmployee[],
): string {
  const dialect = company?.dialect ?? "levantine"
  const lower = userMessage.toLowerCase()
  
  // هل المستخدم نادى هذا الموظف بالاسم؟
  const isDirectlyAddressed = lower.includes(employee.name.toLowerCase()) ||
    employee.name.split(' ').some(part => part.length > 2 && lower.includes(part.toLowerCase()))

  // ردود حسب تخصص الموظف
  const role = employee.role.toLowerCase()
  
  // رد عام — حسب التخصص
  const roleSpecificReplies: Record<string, Record<string, string>> = {
    levantine: {
      social: `أنا ${employee.name}، مسؤول السوشيال ميديا. بقدر أساعدك بنشر المحتوى، إدارة الحسابات، وتحليل أداء المنصات. شو بالضبط بدك بالسوشيال ميديا؟`,
      hr: `أنا ${employee.name}، مسؤول الموارد البشرية. بقدر أساعدك بشؤون الموظفين، التوظيف، والرواتب. شو بدك بالموارد البشرية؟`,
      marketing: `أنا ${employee.name}، مسؤول التسويق. تخصصي بالحملات التسويقية والاستراتيجيات. شو بدك بالتسويق؟`,
      sales: `أنا ${employee.name}، مسؤول المبيعات. بقدر أساعدك بعقود العملاء والصفقات. شو بدك بالمبيعات؟`,
      tech: `أنا ${employee.name}، مسؤول التقنية. بقدر أساعدك بالأمور التقنية والبرمجة. شو بدك بالتقنية؟`,
      finance: `أنا ${employee.name}، مسؤول المالية. بقدر أساعدك بالميزانيات والتقارير المالية. شو بدك بالمالية؟`,
      default: `أنا ${employee.name}، ${employee.role}. بقدر أساعدك بالمجال اللي تخصصي فيه. شو بدك بالضبط؟`,
    },
    egyptian: {
      social: `أنا ${employee.name}، مسؤول السوشيال ميديا. أقدر أساعدك بنشر المحتوى وإدارة الحسابات. إيه اللي محتاجه بالسوشيال؟`,
      hr: `أنا ${employee.name}، مسؤول الموارد البشرية. أقدر أساعدك بشؤون الموظفين والتوظيف. إيه اللي محتاجه؟`,
      default: `أنا ${employee.name}، ${employee.role}. أقدر أساعدك في مجال تخصصي. إيه اللي محتاجه؟`,
    },
    gulf: {
      social: `أنا ${employee.name}، مسؤول السوشيال ميديا. أقدر أساعدك بنشر المحتوى وإدارة الحسابات. وش تحتاج بالسوشيال؟`,
      default: `أنا ${employee.name}، ${employee.role}. أقدر أساعدك بمجال تخصصي. وش تحتاج بالضبط؟`,
    },
    formal: {
      default: `أنا ${employee.name}، ${employee.role}. أستطيع مساعدتك في مجال تخصصي. ماذا تحتاج بالضبط؟`,
    },
    english: {
      default: `I'm ${employee.name}, the ${employee.role}. I can help you with matters related to my specialty. What specifically do you need?`,
    },
  }

  // اختيار الرد حسب التخصص
  const dialectReplies = roleSpecificReplies[dialect] ?? roleSpecificReplies.levantine
  
  // تحديد نوع الرد حسب الدور
  let replyType = 'default'
  if (role.includes('سوشيال') || role.includes('social') || role.includes('media')) replyType = 'social'
  else if (role.includes('موارد') || role.includes('hr') || role.includes('بشر')) replyType = 'hr'
  else if (role.includes('تسويق') || role.includes('market')) replyType = 'marketing'
  else if (role.includes('مبيع') || role.includes('sale')) replyType = 'sales'
  else if (role.includes('تقني') || role.includes('tech') || role.includes('برمج') || role.includes('dev')) replyType = 'tech'
  else if (role.includes('مال') || role.includes('financ')) replyType = 'finance'
  
  let reply = dialectReplies[replyType] ?? dialectReplies.default

  // إذا الطلب خارج التخصص وفي زملاء → اقترح الزميل المناسب
  if (allEmployees && allEmployees.length > 1 && !isDirectlyAddressed) {
    // ردود حسب السياق
    if (lower.includes("مشروع") || lower.includes("خطة") || lower.includes("مهمة")) {
      const projectReplies: Record<string, string> = {
        levantine: `فهمت! بشتغل على هاد المشروع حسب تخصصي. بلخّص المطلوب مني وبنسّق مع الباقي بالقسم عشان نكمّل بعض.`,
        egyptian: `فهمت! هشتغل على المشروع ده حسب تخصصي. هنسق مع الفريق عشان نكمل بعض.`,
        gulf: `فهمت! بشتغل على المشروع حسب تخصصي. بتنسق مع الباقين بالقسم عشان نكمّل بعض.`,
        formal: `فهمت! سأعمل على هذا المشروع حسب تخصصي وسأنسق مع باقي الفريق.`,
        english: `Got it! I'll work on this project based on my specialty and coordinate with the rest of the team.`,
      }
      reply = projectReplies[dialect] ?? projectReplies.levantine
    } else if (lower.includes("مشكلة") || lower.includes("خطأ") || lower.includes("عطل")) {
      const problemReplies: Record<string, string> = {
        levantine: `شو المشكلة بالضبط؟ عطني تفاصيل وبحاول أحلّها حسب تخصصي. لو محتاج مساعدة من زميل ثاني بطلب منهم.`,
        egyptian: `إيه المشكلة بالظبط؟ اديني تفاصيل وهحاول أحلها. لو محتاج مساعدة هطلب من الفريق.`,
        gulf: `وش المشكلة بالضبط؟ عطني تفاصيل وبحاول أحلها. لو محتاج مساعدة بطلب من الفريق.`,
        formal: `ما هي المشكلة بالضبط؟ أعطني تفاصيل وسأحاول حلها. إن احتجت مساعدة سأطلب من الفريق.`,
        english: `What's the exact problem? Give me details and I'll try to fix it. If I need help, I'll ask the team.`,
      }
      reply = problemReplies[dialect] ?? problemReplies.levantine
    } else if (lower.includes("تعاون") || lower.includes("معا") || lower.includes("فريق")) {
      const collabReplies: Record<string, string> = {
        levantine: `تمام! التنسيق بينا مهم. أنا جاهز أساعد بمجال تخصصي — ${employee.role}.`,
        egyptian: `تمام! التنسيق بينا مهم. أنا جاهز أساعد بمجال تخصصي — ${employee.role}.`,
        gulf: `تمام! التنسيق بينا مهم. أنا جاهز أساعد بمجال تخصصي — ${employee.role}.`,
        formal: `تمام! التنسيق بينا مهم. أنا جاهز لمساعدة في مجال تخصصي — ${employee.role}.`,
        english: `Great! Coordination is important. I'm ready to help in my specialty area — ${employee.role}.`,
      }
      reply = collabReplies[dialect] ?? collabReplies.levantine
    }
  }

  return reply
}
