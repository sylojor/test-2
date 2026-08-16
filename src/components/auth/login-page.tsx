// ============================================
// صفحة تسجيل الدخول — Login
// Google Sign-In عبر GIS (Google Identity Services) — بدون Client Secret
// ============================================

"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface LoginPageProps {
  onLogin: (data: { email: string; password: string }) => void
  onBack: () => void
  onGoToSignUp: () => void
  loading?: boolean
}

export function LoginPage({ onLogin, onBack, onGoToSignUp, loading }: LoginPageProps) {
  const language = useLocale()
  const isRTL = language === "ar"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleInitialized = useRef(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email.trim() || !email.includes("@")) {
      setError(t("auth.signup.emailInvalid", language))
      return
    }
    if (!password) {
      setError(t("auth.signup.passwordMin", language))
      return
    }
    onLogin({ email: email.trim(), password })
  }

  const handleGoogleCredential = useCallback(async (credential: string) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        window.location.reload()
      } else {
        setError(data.error || (isRTL ? "فشل تسجيل الدخول بـ Google" : "Google sign-in failed"))
        setGoogleLoading(false)
      }
    } catch {
      setError(isRTL ? "خطأ في الاتصال" : "Connection error")
      setGoogleLoading(false)
    }
  }, [isRTL])

  const initGoogleAndPrompt = useCallback((clientId: string) => {
    const w = window as any
    if (!w.google?.accounts?.id) {
      setError(isRTL ? "فشل تحميل Google Sign-In" : "Failed to load Google Sign-In")
      setGoogleLoading(false)
      return
    }
    w.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response.credential) {
          handleGoogleCredential(response.credential)
        } else {
          setError(isRTL ? "تم إلغاء تسجيل الدخول" : "Sign-in cancelled")
          setGoogleLoading(false)
        }
      },
    })
    w.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setGoogleLoading(false)
      }
    })
  }, [handleGoogleCredential, isRTL])

  const handleGoogleClick = async () => {
    setError("")
    setGoogleLoading(true)
    try {
      const res = await fetch("/api/auth/google-client-id")
      const data = await res.json()
      const clientId = data.clientId

      if (!clientId) {
        setError(isRTL ? "تسجيل الدخول بـ Google غير متوفر حالياً" : "Google sign-in is not available yet")
        setGoogleLoading(false)
        return
      }

      const w = window as any
      if (!w.google?.accounts?.id) {
        if (googleInitialized.current) {
          setGoogleLoading(false)
          return
        }
        googleInitialized.current = true
        const script = document.createElement("script")
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.onload = () => initGoogleAndPrompt(clientId)
        script.onerror = () => {
          setError(isRTL ? "فشل تحميل Google" : "Failed to load Google")
          setGoogleLoading(false)
          googleInitialized.current = false
        }
        document.head.appendChild(script)
      } else {
        initGoogleAndPrompt(clientId)
      }
    } catch {
      setError(isRTL ? "خطأ في الاتصال" : "Connection error")
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t("auth.login.welcomeBack", language)}</h1>
          <p className="text-slate-400 text-sm sm:text-base">{t("auth.login.subtitle", language)}</p>
        </div>

        {/* Google Sign-In error (above button) */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/30 text-red-400 text-sm rounded-lg p-3 text-center">{error}</div>
        )}

        {/* زر Google — أيقونة صغيرة */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={googleLoading || loading}
            className="w-12 h-12 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-all active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title={isRTL ? "تسجيل الدخول بـ Google" : "Sign in with Google"}
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-950 px-2 text-slate-500">{isRTL ? "أو بالبريد الإلكتروني" : "or with email"}</span>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">{t("auth.login.email", language)}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmed@example.com" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11 min-h-[44px]" dir="ltr" autoFocus />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">{t("auth.login.password", language)}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.login.password", language)} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11 min-h-[44px]" dir="ltr" />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 h-11 min-h-[44px]" disabled={loading}>
                {loading ? "..." : t("auth.login.button", language)}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button onClick={onBack} className="text-slate-500 text-sm hover:text-slate-300 transition-colors min-h-[44px] flex items-center px-2 cursor-pointer">
            {isRTL ? "→ " : "← "}{t("auth.back", language)}
          </button>
          <button onClick={onGoToSignUp} className="text-emerald-500 text-sm hover:text-emerald-400 transition-colors min-h-[44px] flex items-center px-2 cursor-pointer">
            {t("auth.login.noAccount", language)} {t("auth.login.signupLink", language)}
          </button>
        </div>
      </div>
    </div>
  )
}