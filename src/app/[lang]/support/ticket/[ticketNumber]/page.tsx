"use client"

import { useState, useEffect, useCallback } from "react"

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "مفتوحة", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  IN_PROGRESS: { label: "قيد المعالجة", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  WAITING_CUSTOMER: { label: "بانتظار ردك", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  RESOLVED: { label: "تم الحل", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  CLOSED: { label: "مغلقة", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
}

type Ticket = {
  id: string; ticketNumber: string; subject: string; description: string;
  status: string; priority: string; category: string;
  customerName: string; customerEmail: string;
  createdAt: string; updatedAt: string;
  messages: Array<{ id: string; senderType: string; senderName: string; content: string; createdAt: string }>;
}

type TicketSummary = { id: string; ticketNumber: string; subject: string; status: string; priority: string; category: string; createdAt: string; updatedAt: string }

export default function TicketDetailPage({ params }: { params: Promise<{ ticketNumber: string }> }) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [email, setEmail] = useState("")
  const [replyContent, setReplyContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [replying, setReplying] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [ticketNumber, setTicketNumber] = useState("")

  useEffect(() => { params.then((p) => setTicketNumber(p.ticketNumber)) }, [params])
  useEffect(() => { const u = new URLSearchParams(window.location.search); const e = u.get("email"); if (e) setEmail(e) }, [])

  const loadTicket = useCallback(async () => {
    if (!ticketNumber || !email) return
    setLoading(true); setError("")
    try {
      const listRes = await fetch(`/api/support/tickets?email=${encodeURIComponent(email)}`)
      const listData = await listRes.json()
      const found: TicketSummary | undefined = (listData.tickets || []).find((t: TicketSummary) => t.ticketNumber === ticketNumber)
      if (!found) { setError("التذكرة غير موجودة أو البريد لا يتطابق"); setLoading(false); return }
      const detailRes = await fetch(`/api/support/tickets/${found.id}?email=${encodeURIComponent(email)}`)
      if (detailRes.ok) { const d = await detailRes.json(); setTicket(d.ticket) }
      else { setError("لا يمكن تحميل التذكرة") }
    } catch { setError("تعذر الاتصال بالخادم") }
    finally { setLoading(false) }
  }, [ticketNumber, email])

  useEffect(() => { if (email && ticketNumber) loadTicket() }, [email, ticketNumber, loadTicket])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket || !replyContent.trim()) return
    setReplying(true); setSuccessMsg(""); setError("")
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, content: replyContent }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "حدث خطأ"); return }
      setReplyContent(""); setSuccessMsg("تم إرسال ردك بنجاح")
      loadTicket()
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch { setError("تعذر الاتصال بالخادم") }
    finally { setReplying(false) }
  }

  if (!ticket && !loading && !error && !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <span className="text-lg font-bold">BlivoAI</span><span className="text-slate-400 text-sm mr-2">مركز الدعم</span>
          </div>
        </header>
        <div className="max-w-md mx-auto text-center py-16 px-4">
          <h1 className="text-2xl font-bold mb-3">عرض التذكرة</h1>
          <p className="text-slate-400 mb-6">أدخل بريدك الإلكتروني لعرض التذكرة {ticketNumber}</p>
          <form onSubmit={(e) => {
              e.preventDefault(); const fd = new FormData(e.currentTarget); const em = fd.get("email") as string
              if (em) { setEmail(em); const url = new URL(window.location.href); url.searchParams.set("email", em); window.history.replaceState({}, "", url.toString()) }
            }} className="space-y-4">
            <input type="email" name="email" required dir="ltr"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="بريدك الإلكتروني" />
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">عرض التذكرة</button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center"><svg className="animate-spin w-8 h-8 text-blue-400 mx-auto" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg><p className="text-slate-400 mt-4">جاري التحميل...</p></div>
    </div>
  )

  if (error || !ticket) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
        <p className="text-red-400 mb-6">{error || "التذكرة غير موجودة"}</p>
        <a href="/support/track" className="text-blue-400 hover:text-blue-300">العودة لتتبع التذاكر</a>
      </div>
    </div>
  )

  const st = statusLabels[ticket.status] || statusLabels.OPEN
  const isClosed = ticket.status === "CLOSED"
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <a href="/support" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <span className="text-lg font-bold">BlivoAI</span>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <a href="/support/track" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>العودة
        </a>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm text-blue-400" dir="ltr">{ticket.ticketNumber}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
              </div>
              <h1 className="text-xl font-bold">{ticket.subject}</h1>
            </div>
            <div className="text-left text-sm text-slate-500" dir="ltr">{fmtDate(ticket.createdAt)}</div>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-4 mt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-sm text-blue-400 font-medium">{ticket.customerName[0]}</span>
              </div>
              <span className="text-sm font-medium">{ticket.customerName}</span>
              <span className="text-xs text-slate-500 mr-2">مقدم الطلب</span>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
          </div>
        </div>

        {ticket.messages.length > 0 && (
          <div className="space-y-4 mb-6">
            {ticket.messages.map((msg) => (
              <div key={msg.id} className={`rounded-xl p-4 border ${msg.senderType === "admin" ? "bg-blue-500/5 border-blue-500/20" : "bg-slate-900/50 border-slate-800"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${msg.senderType === "admin" ? "bg-blue-500/20" : "bg-slate-700/50"}`}>
                      <span className={`text-xs font-medium ${msg.senderType === "admin" ? "text-blue-400" : "text-slate-400"}`}>{msg.senderType === "admin" ? "\u062F" : msg.senderName[0]}</span>
                    </div>
                    <span className="text-sm font-medium">{msg.senderType === "admin" ? "فريق الدعم" : msg.senderName}</span>
                  </div>
                  <span className="text-xs text-slate-500" dir="ltr">{fmtDate(msg.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        {!isClosed && (
          <form onSubmit={handleReply} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-medium mb-4">أضف ردك</h3>
            {successMsg && <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm mb-4">{successMsg}</div>}
            {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">{error}</div>}
            <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} rows={4} maxLength={5000}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none mb-3"
              placeholder="اكتب ردك هنا..." />
            <button type="submit" disabled={replying || !replyContent.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors">
              {replying ? "جاري الإرسال..." : "إرسال الرد"}
            </button>
          </form>
        )}

        {isClosed && (
          <div className="text-center py-8 text-slate-500">
            <p>هذه التذكرة مغلقة.</p>
            <a href="/support" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">إنشاء تذكرة جديدة</a>
          </div>
        )}
      </main>
    </div>
  )
}