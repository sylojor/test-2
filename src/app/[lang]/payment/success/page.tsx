"use client"

export const dynamic = "force-dynamic"

// ============================================
// Payment Success Page - BlivoAI
// VERIFIES payment with Dodo before showing success
// Shows failure if payment was rejected
// ============================================

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Crown, Loader2, Sparkles, AlertTriangle, RefreshCw } from "lucide-react"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import type { SubscriptionPlan } from "@/types"

function getSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  return params.get(key)
}

export default function PaymentSuccessPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "ar"
  const isArabic = lang === "ar"

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isTest, setIsTest] = useState(false)
  const [planName, setPlanName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<"verifying" | "paid" | "failed" | "unknown">("verifying")
  const [retryCount, setRetryCount] = useState(0)

  // Read URL params on mount (client-side only)
  useEffect(() => {
    setSessionId(getSearchParam("sessionId"))
    const p = getSearchParam("plan") as SubscriptionPlan | null
    setPlan(p)
    setCompanyId(getSearchParam("companyId"))
    setIsTest(getSearchParam("test") === "true")
  }, [])

  // Set plan name
  useEffect(() => {
    if (plan && SUBSCRIPTION_PLANS[plan]) {
      const planInfo = SUBSCRIPTION_PLANS[plan]
      setPlanName(isArabic ? planInfo.nameAr : planInfo.name)
    } else if (isTest) {
      setPlanName(isArabic ? "اختبار الدفع ($0.01)" : "Payment Test ($0.01)")
    } else {
      setPlanName(isArabic ? "اشتراكك الجديد" : "Your new subscription")
    }
  }, [plan, isTest, isArabic])

  // Verify payment with Dodo API
  const verifyPayment = useCallback(async () => {
    if (!sessionId) {
      setPaymentStatus("unknown")
      setLoading(false)
      return
    }

    setLoading(true)
    setPaymentStatus("verifying")

    try {
      const res = await fetch(`/api/payments/verify?sessionId=${encodeURIComponent(sessionId)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.verified && data.paid) {
          setPaymentStatus("paid")
        } else if (data.verified && !data.paid) {
          setPaymentStatus("failed")
        } else {
          setPaymentStatus("unknown")
        }
      } else {
        setPaymentStatus("unknown")
      }
    } catch {
      setPaymentStatus("unknown")
    }

    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    if (sessionId !== null) {
      verifyPayment()
    }
  }, [sessionId, verifyPayment])

  // Auto-retry if still verifying
  useEffect(() => {
    if (paymentStatus === "verifying" && retryCount < 5) {
      const timer = setTimeout(() => {
        setRetryCount(c => c + 1)
        verifyPayment()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [paymentStatus, retryCount, verifyPayment])

  const goToDashboard = () => {
    router.push(`/${lang}`)
  }

  // Still verifying
  if (loading || paymentStatus === "verifying") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-emerald-500" />
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
            <h1 className="text-xl font-bold text-foreground">
              {isArabic ? "جاري التحقق من الدفع..." : "Verifying payment..."}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isArabic
                ? `جاري التأكد من حالة الدفع مع بوابة الدفع${retryCount > 0 ? ` (محاولة ${retryCount + 1})` : ""}`
                : `Checking payment status with payment gateway${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ""}`}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Payment FAILED
  if (paymentStatus === "failed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-red-500 to-orange-500" />
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isArabic ? "الدفع لم يكتمل" : "Payment Not Completed"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {isArabic
                  ? "لم يتم خصم أي مبلغ من بطاقتك. حاول مرة أخرى أو استخدم بطاقة أخرى."
                  : "No amount was charged to your card. Please try again with a different card."}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400 text-sm">
                  {isArabic ? "البطاقة رُفضت أو انتهت العملية بدون دفع" : "Card was declined or the transaction was not completed"}
                </span>
              </div>
            </div>
            <Button
              onClick={() => router.back()}
              className="w-full bg-gradient-to-r from-[#3F4A69] to-emerald-500 hover:from-[#3F4A69] hover:to-emerald-400 text-white"
            >
              {isArabic ? "العودة والمحاولة مجدداً" : "Go Back and Retry"}
            </Button>
            <Button
              variant="outline"
              onClick={goToDashboard}
              className="w-full border-border text-foreground hover:bg-muted"
            >
              {isArabic ? "العودة إلى لوحة التحكم" : "Back to Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Unknown status
  if (paymentStatus === "unknown") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-yellow-500 to-orange-500" />
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-yellow-500/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {isArabic ? "لا يمكن التحقق من حالة الدفع" : "Cannot Verify Payment Status"}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {isArabic
                  ? "لم نتمكن من التأكد من حالة الدفع حالياً. اذهب للوحة التحكم وتحقق من حالة الاشتراك."
                  : "We couldn't verify the payment status right now. Go to dashboard and check your subscription status."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={verifyPayment}
                className="w-full border-border text-foreground hover:bg-muted"
              >
                <RefreshCw className={`w-4 h-4 ${isArabic ? "ml-2" : "mr-2"}`} />
                {isArabic ? "إعادة التحقق" : "Retry Verification"}
              </Button>
              <Button
                onClick={goToDashboard}
                className="w-full bg-gradient-to-r from-[#3F4A69] to-emerald-500 hover:from-[#3F4A69] hover:to-emerald-400 text-white"
              >
                {isArabic ? "العودة إلى لوحة التحكم" : "Back to Dashboard"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Payment SUCCESS (verified)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border-border overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-blue-600" />
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isArabic ? "تم الدفع بنجاح!" : "Payment Successful!"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isArabic
                ? (isTest ? `تم اختبار الدفع بنجاح (${planName})` : `تم ترقية اشتراكك إلى ${planName}`)
                : (isTest ? `Test payment completed (${planName})` : `Your subscription has been upgraded to ${planName}`)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <Crown className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                {isArabic ? (isTest ? "الدفع التجريبي اكتمل" : "اشتراكك الجديد مفعّل") : (isTest ? "Test payment completed" : "Your new plan is active")}
              </span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground text-xs">
                {isArabic
                  ? (isTest ? "بوابة الدفع تعمل بشكل صحيح" : "يمكنك الآن استخدام جميع ميزات الخطة الجديدة")
                  : (isTest ? "Payment gateway is working correctly" : "You can now use all features of your new plan")}
              </span>
            </div>
          </div>
          <Button
            onClick={goToDashboard}
            className="w-full bg-gradient-to-r from-[#3F4A69] to-emerald-500 hover:from-[#3F4A69] hover:to-emerald-400 text-white"
          >
            {isArabic ? "العودة إلى لوحة التحكم" : "Back to Dashboard"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {isArabic
              ? "سيتم إرسال تأكيد الدفع على بريدك الإلكتروني"
              : "A payment confirmation will be sent to your email"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
