"use client"

// ============================================
// Track Ticket Page — تتبع التذاكر بالبريد
// support.blivoai.com/support/track
// ============================================

import { useState } from "react"

type TicketSummary = {
  id: string; ticketNumber: string; subject: string; status: string;
  priority: string; category: string; createdAt: string; updatedAt: string;
  _count: { messages: number };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "مفتوحة", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  IN_PROGRESS: { label: "قيد المعالجة", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  WAITING_CUSTOMER: { label: "بانتظار ردك", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  RESOLVED: { label: "تم الحل", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  CLOSED: { label: "مغلقة", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
}

const categoryLabels: Record<string, string> = {
  GENERAL: "عام", TECHNICAL: "مشكلة تقنية", BILLING: "الفواتير",
  ACCOUNT: "الحساب", FEATURE_REQUEST: "اقتراح ميزة", BUG_REPORT: "الإبلاغ عن خطأ",
}

export default function TrackPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError(""); setSearched(true)
    try {
      const res = await fetch(`/api/support/tickets?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || "حدث خطأ"); setTickets([]); return }
      setTickets(data.tickets || [])
    } catch { setError("تعذر الاتصال بالخادم"); setTickets([]) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/support" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-lg font-bold">BlivoAI</span>
            <span className="text-slate-400 text-sm">مركز الدعم</span>
          </a>
          <nav className="flex items-center gap-2">
            <a href="/support" className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all">تذكرة جديدة</a>
            <a href="https://blivoai.com" className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">الموقع</a>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">تتبع تذكرتك</h1>
          <p className="text-slate-400 text-lg">أدخل بريدك الإلكتروني لعرض جميع تذاكرك</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            placeholder="أدخل بريدك الإلكتروني" dir="ltr" />
          <button type="submit" disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
            {loading ? "جاري البحث..." : "بحث"}
          </button>
        </form>

        {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6">{error}</div>}

        {searched && tickets.length === 0 && !error && (
          <div className="text-center py-12 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p>لا توجد تذاكر مرتبطة بهذا البريد</p>
          </div>
        )}

        {tickets.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">تذاكرك ({tickets.length})</h2>
            {tickets.map((ticket) => {
              const st = statusLabels[ticket.status] || statusLabels.OPEN
              return (
                <a key={ticket.id} href={`/support/ticket/${ticket.ticketNumber}?email=${encodeURIComponent(email)}`}
                  className="block bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-blue-400" dir="ltr">{ticket.ticketNumber}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                      </div>
                      <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>{categoryLabels[ticket.category] || ticket.category}</span>
                        <span>{ticket._count.messages} رد</span>
                        <span dir="ltr">{new Date(ticket.updatedAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-sm text-slate-500 text-center">
          &copy; {new Date().getFullYear()} BlivoAI. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  )
}
