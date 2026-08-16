export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">تواصل معنا</h1>
          <p className="text-slate-400">نسعد بتواصلك معنا. أرسل لنا رسالتك وسنرد في أقرب وقت.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-right">
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-1">الاسم</label>
              <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500" placeholder="اسمك الكامل" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">البريد الإلكتروني</label>
              <input type="email" dir="ltr" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500" placeholder="ahmed@example.com" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">الموضوع</label>
              <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500" placeholder="موضوع الرسالة" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">الرسالة</label>
              <textarea rows={5} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 resize-none" placeholder="اكتب رسالتك هنا..." />
            </div>
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors cursor-pointer">
              إرسال الرسالة
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-400 text-sm">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="font-medium text-white mb-1">البريد الإلكتروني</div>
            <div dir="ltr">support@blivoai.com</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="font-medium text-white mb-1">موقع الدعم</div>
            <div dir="ltr">support.blivoai.com</div>
          </div>
        </div>
      </div>
    </div>
  )
}

