"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

export default function SignUpPage() {
  const language = useLocale()
  const isRTL = language === "ar"
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!name.trim() || name.trim().length < 2) {
      setError(isRTL ? "الاسم مطلوب (حرفين على الأقل)" : "Name is required (min 2 chars)")
      return
    }
    if (!email.trim() || !email.includes("@")) {
      setError(isRTL ? "البريد الإلكتروني غير صالح" : "Invalid email")
      return
    }
    if (password.length < 6) {
      setError(isRTL ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError(isRTL ? "كلمتا المرور غير متطابقتين" : "Passwords do not match")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/${language}/login`)
      } else {
        setError(data.error || (isRTL ? "فشل التسجيل" : "Registration failed"))
      }
    } catch {
      setError(isRTL ? "خطأ في الاتصال" : "Connection error")
    }
    setLoading(false)
  }

  const handleGoogleClick = async () => {
    setError("")
    setGoogleLoading(true)
    try {
      const res = await fetch("/api/auth/google-client-id")
      const data = await res.json()
      const clientId = data.clientId
      if (!clientId) {
        setError(isRTL ? "Google غير متوفر حاليا" : "Google not available")
        setGoogleLoading(false)
        return
      }
      const w = window as any
      const doGoogleAuth = (cid: string) => {
        w.google.accounts.id.initialize({
          client_id: cid,
          callback: async (response: any) => {
            if (response.credential) {
              try {
                const r = await fetch("/api/auth/google", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token: response.credential }),
                })
                const d = await r.json()
                if (r.ok && d.user) {
                  router.push(`/${language}`)
                } else {
                  setError(d.error || (isRTL ? "فشل التسجيل" : "Registration failed"))
                  setGoogleLoading(false)
                }
              } catch {
                setError(isRTL ? "خطأ" : "Error")
                setGoogleLoading(false)
              }
            } else {
              setGoogleLoading(false)
            }
          },
        })
        w.google.accounts.id.prompt()
      }
      if (w.google?.accounts?.id) {
        doGoogleAuth(clientId)
      } else {
        const script = document.createElement("script")
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.onload = () => doGoogleAuth(clientId)
        script.onerror = () => {
          setError(isRTL ? "فشل تحميل Google" : "Failed to load Google")
          setGoogleLoading(false)
        }
        document.head.appendChild(script)
      }
    } catch {
      setError(isRTL ? "خطأ" : "Error")
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t("auth.signup.title", language)}</h1>
          <p className="text-slate-400 text-sm sm:text-base">{t("auth.signup.subtitle", language)}</p>
        </div>
        {error && (
          <div className="bg-red-900/20 border border-red-800/30 text-red-400 text-sm rounded-lg p-3 text-center">{error}</div>
        )}
        <div className="flex justify-center">
          <button type="button" onClick={handleGoogleClick} disabled={googleLoading || loading} className="w-12 h-12 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-all active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" title={isRTL ? "التسجيل بـ Google" : "Sign up with Google"}>
            {googleLoading ? (<div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            )}
          </button>
        </div>
        <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700" /></div><div className="relative flex justify-center text-xs"><span className="bg-slate-950 px-2 text-slate-500">{isRTL ? "أو بالبريد الإلكتروني" : "or with email"}</span></div></div>
        <Card className="bg-slate-900 border-slate-800"><CardContent className="p-4 sm:p-6"><form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2"><Label className="text-slate-300">{t("auth.signup.name", language)}</Label><Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={isRTL ? "أحمد" : "John"} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11" autoFocus /></div>
          <div className="space-y-2"><Label className="text-slate-300">{t("auth.signup.email", language)}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmed@example.com" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11" dir="ltr" /></div>
          <div className="space-y-2"><Label className="text-slate-300">{t("auth.signup.password", language)}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isRTL ? "6 أحرف على الأقل" : "Min 6 characters"} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11" dir="ltr" /></div>
          <div className="space-y-2"><Label className="text-slate-300">{t("auth.signup.confirmPassword", language)}</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={isRTL ? "تأكيد كلمة المرور" : "Confirm password"} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11" dir="ltr" /></div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 h-11" disabled={loading}>{loading ? "..." : t("auth.signup.button", language)}</Button>
        </form></CardContent></Card>
        <div className="text-center">
          <button onClick={() => router.push(`/${language}/login`)} className="text-emerald-500 text-sm hover:text-emerald-400 transition-colors cursor-pointer">{t("auth.signup.haveAccount", language)} {t("auth.signup.loginLink", language)}</button>
        </div>
        <div className="text-center">
          <button onClick={() => router.push(`/${language}`)} className="text-slate-500 text-sm hover:text-slate-300 transition-colors cursor-pointer">{isRTL ? "العودة للرئيسية" : "Back to home"}</button>
        </div>
      </div>
    </div>
  )
}

