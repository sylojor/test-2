"use client"

// ============================================
// Payment Cancel Page — BlivoAI
// Shown when user cancels Dodo payment
// Allows retry or return to dashboard
// ============================================

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react"

export default function PaymentCancelPage() {
  const params = useParams()
  const router = useRouter()
  const lang = (params.lang as string) || "ar"
  const isArabic = lang === "ar"

  const goToDashboard = () => {
    router.push(`/${lang}`)
  }

  const goToBilling = () => {
    // Navigate to billing tab in dashboard
    router.push(`/${lang}`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border-border overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-red-500 to-orange-500" />
        <CardContent className="p-8 text-center space-y-6">
          {/* Cancel icon */}
          <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isArabic ? "تم إلغاء الدفع" : "Payment Cancelled"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isArabic
                ? "لم يتم إجراء أي دفع. اشتراكك لم يتغير."
                : "No payment was made. Your subscription remains unchanged."}
            </p>
          </div>

          {/* Info */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
            <p className="text-muted-foreground text-sm">
              {isArabic
                ? "يمكنك المحاولة مرة أخرى أو العودة إلى لوحة التحكم."
                : "You can try again or go back to your dashboard."}
            </p>
          </div>

          {/* CTA buttons */}
          <div className="space-y-3">
            <Button
              onClick={goToBilling}
              className="w-full bg-gradient-to-r from-[#3F4A69] to-emerald-500 hover:from-[#3F4A69] hover:to-emerald-400 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isArabic ? "محاولة الدفع مرة أخرى" : "Try Payment Again"}
            </Button>

            <Button
              onClick={goToDashboard}
              variant="outline"
              className="w-full border-border text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isArabic ? "العودة إلى لوحة التحكم" : "Back to Dashboard"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {isArabic
              ? "لا توجد رسوم على بطاقتك — عملية الدفع لم تكتمل"
              : "No charges were made to your card — the payment process was not completed"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
