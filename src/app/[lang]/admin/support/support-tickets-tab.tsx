"use client"

// ============================================
// SupportTicketsTab — إدارة تذاكر الدعم من لوحة التحكم
// ============================================

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Headset, Search, RefreshCw, ChevronLeft, MessageSquare,
  Clock, AlertCircle, CheckCircle2, XCircle, Eye, Trash2,
  Send, Loader2, X, ArrowUpDown
} from "lucide-react"

// ============================================
// Types
// ============================================

type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED"
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
type TicketCategory = "GENERAL" | "TECHNICAL" | "BILLING" | "ACCOUNT" | "FEATURE_REQUEST" | "BUG_REPORT"

type TicketSummary = {
  id: string
  ticketNumber: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory
  customerName: string
  customerEmail: string
  createdAt: string
  updatedAt: string
  _count: { messages: number }
}

type TicketFull = {
  id: string
  ticketNumber: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory
  customerName: string
  customerEmail: string
  createdAt: string
  updatedAt: string
  messages: Array<{
    id: string
    senderType: string
    senderName: string
    content: string
    createdAt: string
  }>
}

type TicketStats = {
  open: number
  inProgress: number
  waiting: number
  resolved: number
  closed: number
  total: number
}

// ============================================
// Config
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  OPEN: { label: "مفتوحة", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  IN_PROGRESS: { label: "قيد المعالجة", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: <Loader2 className="w-3.5 h-3.5" /> },
  WAITING_CUSTOMER: { label: "بانتظار العميل", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: <Clock className="w-3.5 h-3.5" /> },
  RESOLVED: { label: "تم الحل", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  CLOSED: { label: "مغلقة", color: "bg-slate-500/10 text-slate-400 border-slate-500/30", icon: <XCircle className="w-3.5 h-3.5" /> },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: "منخفض", color: "text-slate-400" },
  MEDIUM: { label: "متوسط", color: "text-yellow-400" },
  HIGH: { label: "عالي", color: "text-orange-400" },
  URGENT: { label: "عاجل", color: "text-red-400" },
}

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "عام",
  TECHNICAL: "تقني",
  BILLING: "الفواتير",
  ACCOUNT: "الحساب",
  FEATURE_REQUEST: "اقتراح ميزة",
  BUG_REPORT: "الإبلاغ عن خطأ",
}

// ============================================
// Component
// ============================================

export function SupportTicketsTab() {
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<TicketFull | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [replying, setReplying] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Token from cookie
  const getToken = () => {
    if (typeof document === "undefined") return null
    const cookies = document.cookie.split("; ").reduce((acc, c) => {
      const [k, ...v] = c.split("=")
      acc[k] = v.join("=")
      return acc
    }, {} as Record<string, string>)
    return cookies.oec_token || null
  }

  const headers = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`,
  })

  // Load tickets list
  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== "ALL") params.set("status", filterStatus)
      if (searchQuery) params.set("search", searchQuery)
      params.set("page", String(page))
      params.set("limit", "25")

      const res = await fetch(`/api/admin/support/tickets?${params}`, { headers: headers() })
      if (res.status === 401) {
        toast.error("غير مصرح — سجّل دخولك")
        return
      }
      const data = await res.json()
      setTickets(data.tickets || [])
      setStats(data.stats || null)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch {
      toast.error("خطأ في تحميل التذاكر")
    } finally {
      setLoading(false)
    }
  }, [filterStatus, searchQuery, page])

  useEffect(() => { loadTickets() }, [loadTickets])

  // Load ticket detail
  const openTicket = async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/support/tickets/${id}`, { headers: headers() })
      if (res.ok) {
        const data = await res.json()
        setSelectedTicket(data.ticket)
      }
    } catch {
      toast.error("خطأ في تحميل التذكرة")
    } finally {
      setLoadingDetail(false)
    }
  }

  // Update ticket status
  const updateStatus = async (ticketId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast.success("تم تحديث الحالة")
        loadTickets()
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: status as TicketStatus })
        }
      }
    } catch {
      toast.error("خطأ في تحديث الحالة")
    }
  }

  // Reply to ticket
  const handleReply = async () => {
    if (!selectedTicket || !replyContent.trim()) return
    setReplying(true)
    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ content: replyContent, status: "WAITING_CUSTOMER" }),
      })
      if (res.ok) {
        setReplyContent("")
        toast.success("تم إرسال الرد")
        // Reload ticket
        const detailRes = await fetch(`/api/admin/support/tickets/${selectedTicket.id}`, { headers: headers() })
        if (detailRes.ok) {
          const data = await detailRes.json()
          setSelectedTicket(data.ticket)
        }
        loadTickets()
      }
    } catch {
      toast.error("خطأ في إرسال الرد")
    } finally {
      setReplying(false)
    }
  }

  // Delete ticket
  const deleteTicket = async (ticketId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه التذكرة؟")) return
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: "DELETE",
        headers: headers(),
      })
      if (res.ok) {
        toast.success("تم حذف التذكرة")
        if (selectedTicket?.id === ticketId) setSelectedTicket(null)
        loadTickets()
      }
    } catch {
      toast.error("خطأ في حذف التذكرة")
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  }

  // ============================================
  // Render: Detail Panel (right side)
  // ============================================

  if (selectedTicket) {
    const st = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.OPEN
    const pr = PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.MEDIUM

    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => setSelectedTicket(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          العودة لقائمة التذاكر
        </button>

        {/* Ticket Header Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm text-blue-500" dir="ltr">{selectedTicket.ticketNumber}</span>
                  <Badge variant="outline" className={st.color}>
                    {st.icon} {st.label}
                  </Badge>
                  <span className={`text-xs font-medium ${pr.color}`}>
                    {pr.label}
                  </span>
                </div>
                <CardTitle className="text-lg leading-relaxed">{selectedTicket.subject}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer info */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">العميل: </span>
                <span className="font-medium">{selectedTicket.customerName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">البريد: </span>
                <a href={`mailto:${selectedTicket.customerEmail}`} className="text-blue-500 hover:underline" dir="ltr">{selectedTicket.customerEmail}</a>
              </div>
              <div>
                <span className="text-muted-foreground">القسم: </span>
                <span>{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</span>
              </div>
              <div>
                <span className="text-muted-foreground">التاريخ: </span>
                <span>{formatDate(selectedTicket.createdAt)}</span>
              </div>
            </div>

            {/* Status controls */}
            <Separator />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">تغيير الحالة:</span>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => updateStatus(selectedTicket.id, key)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    selectedTicket.status === key
                      ? cfg.color
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Original description */}
            <Separator />
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-xs text-blue-400 font-medium">{selectedTicket.customerName[0]}</span>
                </div>
                <span className="text-sm font-medium">{selectedTicket.customerName}</span>
                <span className="text-xs text-muted-foreground">مقدم الطلب</span>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {selectedTicket.description}
              </p>
            </div>

            {/* Messages thread */}
            {selectedTicket.messages.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  المحادثة ({selectedTicket.messages.length} رسائل)
                </h3>
                {selectedTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-4 border ${
                      msg.senderType === "admin"
                        ? "bg-blue-500/5 border-blue-500/20"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          msg.senderType === "admin" ? "bg-blue-500/20" : "bg-muted"
                        }`}>
                          <span className={`text-xs font-medium ${
                            msg.senderType === "admin" ? "text-blue-400" : "text-muted-foreground"
                          }`}>{msg.senderType === "admin" ? "د" : msg.senderName[0]}</span>
                        </div>
                        <span className="text-sm font-medium">{msg.senderType === "admin" ? "فريق الدعم" : msg.senderName}</span>
                        {msg.senderType === "admin" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400">دعم</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground" dir="ltr">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply form */}
            {selectedTicket.status !== "CLOSED" && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">رد فريق الدعم</h3>
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={4}
                    placeholder="اكتب ردك هنا..."
                    className="resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={handleReply} disabled={replying || !replyContent.trim()} size="sm">
                      {replying ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Send className="w-4 h-4 ml-1" />}
                      إرسال الرد
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Delete */}
            <Separator />
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => deleteTicket(selectedTicket.id)}>
                <Trash2 className="w-4 h-4 ml-1" />
                حذف التذكرة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // Render: Tickets List
  // ============================================

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="cursor-pointer hover:border-blue-500/50 transition-colors"
            onClick={() => { setFilterStatus("ALL"); setPage(1) }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">الإجمالي</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-blue-500/50 transition-colors"
            onClick={() => { setFilterStatus("OPEN"); setPage(1) }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.open}</div>
              <div className="text-xs text-muted-foreground mt-1">مفتوحة</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-yellow-500/50 transition-colors"
            onClick={() => { setFilterStatus("IN_PROGRESS"); setPage(1) }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.inProgress}</div>
              <div className="text-xs text-muted-foreground mt-1">قيد المعالجة</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-purple-500/50 transition-colors"
            onClick={() => { setFilterStatus("WAITING_CUSTOMER"); setPage(1) }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.waiting}</div>
              <div className="text-xs text-muted-foreground mt-1">بانتظار العميل</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-green-500/50 transition-colors"
            onClick={() => { setFilterStatus("RESOLVED"); setPage(1) }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.resolved + stats.closed}</div>
              <div className="text-xs text-muted-foreground mt-1">مغلقة/محلولة</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                placeholder="بحث بالرقم أو الموضوع أو البريد..."
                className="pr-10"
                dir="rtl"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الحالات</SelectItem>
                <SelectItem value="OPEN">مفتوحة</SelectItem>
                <SelectItem value="IN_PROGRESS">قيد المعالجة</SelectItem>
                <SelectItem value="WAITING_CUSTOMER">بانتظار العميل</SelectItem>
                <SelectItem value="RESOLVED">تم الحل</SelectItem>
                <SelectItem value="CLOSED">مغلقة</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadTickets} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Headset className="w-4 h-4" />
            تذاكر الدعم
            {filterStatus !== "ALL" && (
              <Badge variant="outline" className="text-xs">
                {STATUS_CONFIG[filterStatus]?.label || filterStatus}
                <button onClick={() => setFilterStatus("ALL")} className="mr-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Headset className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد تذاكر</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => {
                const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN
                const pr = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM
                return (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group border border-transparent hover:border-border"
                    onClick={() => openTicket(ticket.id)}
                  >
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      ticket.status === "OPEN" ? "bg-blue-400" :
                      ticket.status === "IN_PROGRESS" ? "bg-yellow-400" :
                      ticket.status === "WAITING_CUSTOMER" ? "bg-purple-400" :
                      ticket.status === "RESOLVED" ? "bg-green-400" : "bg-slate-500"
                    }`} />

                    {/* Ticket info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-blue-500" dir="ltr">{ticket.ticketNumber}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${st.color}`}>{st.label}</Badge>
                        <span className={`text-[10px] font-medium ${pr.color}`}>{pr.label}</span>
                      </div>
                      <h3 className="text-sm font-medium truncate group-hover:text-blue-500 transition-colors">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                        <span>{ticket.customerName}</span>
                        <span className="truncate max-w-[200px]" dir="ltr">{ticket.customerEmail}</span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {ticket._count.messages > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {ticket._count.messages}
                        </div>
                      )}
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap" dir="ltr">
                        {formatDate(ticket.updatedAt)}
                      </span>
                      <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                السابق
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                التالي
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}