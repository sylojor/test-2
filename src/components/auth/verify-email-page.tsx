// ============================================
// صفحة التحقق من الإيميل — 6 أرقام
// ============================================

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import { Mail, RefreshCw, ArrowLeft, CheckCircle2, XCircle } from "lucide-react"

interface VerifyEmailPageProps {
  email: string
  onVerified: (data: { user: { id: string; name: string; email: string; role: string } }) => void
  onBack: () => void
  lang: "ar" | "en"
}

export function VerifyEmailPage({ email, onVerified, onBack, lang }: VerifyEmailPageProps) {
  const isRTL = lang === "ar"
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const focusInput = (index: number) => {
    if (index >= 0 && index < 6) {
      inputRefs.current[index]?.focus()
    }
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value.slice(-1) // only last digit
    setDigits(newDigits)
    setError("")

    // Auto-advance to next input
    if (value && index < 5) {
      focusInput(index + 1)
    }

    // Auto-submit when all filled
    if (newDigits.every(d => d !== "")) {
      handleSubmit(newDigits.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1)
    }
    if (e.key === "ArrowLeft" && !isRTL && index > 0) {
      focusInput(index - 1)
    }
    if (e.key === "ArrowRight" && !isRTL && index < 5) {
      focusInput(index + 1)
    }
    // RTL arrow directions
    if (e.key === "ArrowRight" && isRTL && index > 0) {
      focusInput(index - 1)
    }
    if (e.key === "ArrowLeft" && isRTL && index < 5) {
      focusInput(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 6) {
      const newDigits = pasted.split("")
      setDigits(newDigits)
      setError("")
      handleSubmit(pasted)
    }
  }

  const handleSubmit = useCallback(async (code: string) => {
    if (code.length !== 6) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/auth/verify?lang=${lang}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => onVerified(data.user), 800)
      } else {
        setError(data.error || (isRTL ? "كود غلط" : "Invalid code"))
        setDigits(["", "", "", "", "", ""])
        focusInput(0)
      }
    } catch {
      setError(isRTL ? "خطأ في الاتصال" : "Connection error")
    }
    setLoading(false)
  }, [email, lang, isRTL, onVerified])

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setResendLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/auth/resend-verify?lang=${lang}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setResendCooldown(60)
        setDigits(["", "", "", "", "", ""])
        focusInput(0)
      } else {
        const data = await res.json()
        setError(data.error || (isRTL ? "فشل إعادة الإرسال" : "Failed to resend"))
      }
    } catch {
      setError(isRTL ? "خطأ في الاتصال" : "Connection error")
    }
    setResendLoading(false)
  }

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3")

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-all duration-500 ${success ? "bg-emerald-600 scale-110" : "bg-slate-800"}`}>
            {success ? (
              <CheckCircle2 className="w-8 h-8 text-white" />
            ) : (
              <Mail className="w-8 h-8 text-emerald-500" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {isRTL ? "تحقق من إيميلك" : "Verify Your Email"}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            {isRTL
              ? `أرسلنا كود تفعيل مكون من 6 أرقام إلى`
              : `We sent a 6-digit verification code to`}
          </p>
          <p className="text-emerald-400 font-medium text-sm" dir="ltr">{maskedEmail}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/30 text-red-400 text-sm rounded-lg p-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Code Input */}
        {!success && (
          <div className="flex justify-center gap-2 sm:gap-3" dir="ltr">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={loading}
                autoFocus={i === 0}
                className={`w-11 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 transition-all duration-200 outline-none min-h-[44px]
                  ${
                    digit
                      ? "border-emerald-500 bg-emerald-950/30 text-white"
                      : error
                        ? "border-red-500/50 bg-slate-800 text-white"
                        : "border-slate-700 bg-slate-800/50 text-white focus:border-emerald-500 focus:bg-slate-800"
                  }
                  ${loading ? "opacity-50 cursor-not-allowed" : ""}
                `}
              />
            ))}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="text-center space-y-2">
            <p className="text-emerald-400 font-semibold text-lg">
              {isRTL ? "تم التحقق بنجاح!" : "Verified Successfully!"}
            </p>
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Resend */}
        {!success && (
          <div className="text-center space-y-3">
          <p className="text-slate-500 text-sm">
            {isRTL ? "ما وصلك الكود؟" : "Didn't receive the code?"}
          </p>
          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/30 min-h-[44px]"
          >
            {resendLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : resendCooldown > 0 ? (
              isRTL ? `أعد الإرسال (${resendCooldown}s)` : `Resend (${resendCooldown}s)`
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                {isRTL ? "إعادة إرسال الكود" : "Resend Code"}
              </span>
            )}
          </Button>
        </div>
        )}

        {/* Back button */}
        <div className="flex justify-center">
          <button
            onClick={onBack}
            className="text-slate-500 text-sm hover:text-slate-300 transition-colors min-h-[44px] flex items-center gap-1 px-2 cursor-pointer"
          >
            {isRTL ? "" : ""}{isRTL ? "رجوع" : "Back"}
          </button>
        </div>
      </div>
    </div>
  )
}
