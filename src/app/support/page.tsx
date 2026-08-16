"use client"

// ============================================
// Support Portal — صفحة إنشاء تذكرة جديدة
// تعمل على support.blivoai.com فقط
// ============================================

import { useState } from "react"

const categories = [
  { value: "GENERAL", label: "عام" },
  { value: "TECHNICAL", label: "مشكلة تقنية" },
  { value: "BILLING", label: "الفواتير والاشتراكات" },
  { value: "ACCOUNT", label: "الحساب" },
  { value: "FEATURE_REQUEST", label: "اقتراح ميزة" },
  { value: "BUG_REPORT", label: "الإبلاغ عن خطأ" },
]

const priorities = [
  { value: "LOW", label: "منخفض" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HIGH", label: "عالي" },
  { value: "URGENT", label: "عاجل" },
]

export default function SupportPage() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    subject: "",
    description: "",
    category: "GENERAL",
    priority: "MEDIUM",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ ticketNumber: string } | null>(null)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(null)

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "حدث خطأ")
        return
      }

      setSuccess({ ticketNumber: data.ticket.ticketNumber })
      setFormData({
        customerName: "", customerEmail: "", subject: "",
        description: "", category: "GENERAL", priority: "MEDIUM",
      })
    } catch {
      setError("تعذر الاتصال بالخادم")
    } finally {
      setLoading(false)
    }
  }

  // ========== نجاح إنشاء التذكرة ==========
  if (success) {
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
              <div>
                <span className="text-lg font-bold">BlivoAI</span>
                <span className="text-slate-400 text-sm mr-2">مركز الدعم</span>
              </div>
            </a>
            <nav className="flex items-center gap-2">
              <a href="/support/track" className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                تتبع التذكرة
              </a>
              <a href="https://blivoai.com" className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                العودة للموقع
              </a>
            </nav>
          </div>
        </header>

        <div className="max-w-lg mx-auto text-center py-20 px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">تم إنشاء التذكرة بنجاح!</h1>
          <p className="text-slate-400 mb-2">رقم التذكرة:</p>
          <div className="inline-block px-6 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-6">
            <span className="text-xl font-mono font-bold text-blue-400">{success.ticketNumber}</span>
          </div>
          <p className="text-slate-400 text-sm mb-8">احفظ هذا الرقم لتتبع تذكرتك</p>
          <div className="flex items-center justify-center gap-3">
            <a
              href={`/support/ticket/${success.ticketNumber}`}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              مشاهدة التذكرة
            </a>
            <button
              onClick={() => setSuccess(null)}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
            >
              تذكرة جديدة
            </button>
          </div>
        </div>

        <footer className="border-t border-slate-800 mt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between text-sm text-slate-500">
            <span>&copy; {new Date().getFullYear()} BlivoAI. جميع الحقوق محفوظة.</span>
            <span>support@blivoai.com</span>
          </div>
        </footer>
      </div>
    )
  }

  // ========== نموذج إنشاء التذكرة ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/support" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold">BlivoAI</span>
              <span className="text-slate-400 text-sm mr-2">مركز الدعم</span>
            </div>
          </a>
          <nav className="flex items-center gap-2">
            <a href="/support/track" className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              تتبع التذكرة
            </a>
            <a href="https://blivoai.com" className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              العودة للموقع
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-3">مركز الدعم الفني</h1>
          <p className="text-slate-400 text-lg">واجهتك مشكلة أو عندك سؤال؟ أنشئ تذكرة دعم وسنرد عليك في أقرب وقت</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">الاسم الكامل *</label>
              <input type="text" required value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="أحمد محمد" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">البريد الإلكتروني *</label>
              <input type="email" required value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="example@email.com" dir="ltr" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">القسم</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all">
                {categories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">الأولوية</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all">
                {priorities.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">الموضوع *</label>
            <input type="text" required maxLength={200} value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="وصف مختصر للمشكلة" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">التفاصيل *</label>
            <textarea required rows={6} maxLength={5000} value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
              placeholder="اشرح مشكلتك بالتفصيل..." />
            <div className="text-xs text-slate-500 mt-1 text-left" dir="ltr">{formData.description.length}/5000</div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                جاري الإنشاء...
              </span>
            ) : "إنشاء تذكرة الدعم"}
          </button>
        </form>
      </main>

      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between text-sm text-slate-500">
          <span>&copy; {new Date().getFullYear()} BlivoAI. جميع الحقوق محفوظة.</span>
          <span>support@blivoai.com</span>
        </div>
      </footer>
    </div>
  )
}
