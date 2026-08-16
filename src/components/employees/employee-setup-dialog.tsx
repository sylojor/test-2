// ============================================
// نافذة تهيئة الموظف — النسخة الذكية
// 
// الجديد: عرض القدرات المقترحة من النظام
// المدير يختار أي قدرات يقبلها (اللي نسيها)
// ============================================

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { IEmployee, ApprovalMode } from "@/types"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface EmployeeSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: IEmployee | null
  questions: string[]
  suggestedCapabilities: string[]
  onSubmit: (employeeId: string, answers: Record<string, string>, approvalMode: ApprovalMode, acceptedCapabilities?: string[]) => void
}

const APPROVAL_OPTION_KEYS: { value: ApprovalMode; labelKey: string; descriptionKey: string }[] = [
  {
    value: "ALWAYS_APPROVE",
    labelKey: "setupEmployee.approval.always",
    descriptionKey: "setupEmployee.approval.always.desc",
  },
  {
    value: "AUTO_WITH_NOTIFY",
    labelKey: "setupEmployee.approval.notify",
    descriptionKey: "setupEmployee.approval.notify.desc",
  },
  {
    value: "AUTO_SILENT",
    labelKey: "setupEmployee.approval.silent",
    descriptionKey: "setupEmployee.approval.silent.desc",
  },
]

export function EmployeeSetupDialog({
  open,
  onOpenChange,
  employee,
  questions,
  suggestedCapabilities = [],
  onSubmit,
}: EmployeeSetupDialogProps) {
  const language = useLocale()

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("ALWAYS_APPROVE")
  const [acceptedCaps, setAcceptedCaps] = useState<Set<string>>(new Set())
  const [currentStep, setCurrentStep] = useState(0) // 0..questions.length-1 = أسئلة, questions.length = قدرات مقترحة, questions.length+1 = وضع الموافقة

  if (!employee || questions.length === 0) return null

  const totalSteps = questions.length + (suggestedCapabilities.length > 0 ? 1 : 0) + 1 // أسئلة + قدرات + موافقة
  const progress = ((currentStep + 1) / totalSteps) * 100
  const isQuestionsStep = currentStep < questions.length
  const isCapabilitiesStep = currentStep === questions.length && suggestedCapabilities.length > 0
  const isApprovalStep = currentStep === totalSteps - 1

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    const filledAnswers: Record<string, string> = {}
    for (const q of questions) {
      filledAnswers[q] = answers[q] ?? ""
    }
    const accepted = Array.from(acceptedCaps)
    onSubmit(employee.id, filledAnswers, approvalMode, accepted.length > 0 ? accepted : undefined)
    // إعادة تعيين
    setAnswers({})
    setCurrentStep(0)
    setApprovalMode("ALWAYS_APPROVE")
    setAcceptedCaps(new Set())
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setAnswers({})
      setCurrentStep(0)
      setApprovalMode("ALWAYS_APPROVE")
      setAcceptedCaps(new Set())
    }
    onOpenChange(open)
  }

  const currentQ = isQuestionsStep ? questions[currentStep] : null
  const hasAnswer = currentQ ? (answers[currentQ]?.trim().length ?? 0) > 0 : true

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg" dir="ltr">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold">
              {employee.name.charAt(0)}
            </div>
            {isApprovalStep
              ? t("setupEmployee.approvalMode", language)
              : isCapabilitiesStep
                ? t("setupEmployee.suggestedCapabilities", language)
                : t("setupEmployee.questions", language)
            }
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isApprovalStep
              ? t("setupEmployee.subtitle", language)
              : isCapabilitiesStep
                ? t("setupEmployee.suggestedCapabilities", language)
                : t("setupEmployee.subtitle", language)
            }
          </DialogDescription>
        </DialogHeader>

        {/* شريط التقدم */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* خطوة الأسئلة */}
        {isQuestionsStep && currentQ && (
          <div className="space-y-4 py-2">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white text-sm leading-relaxed">
                <span className="text-emerald-400 font-medium">{employee.name}:</span>{" "}
                {currentQ}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{language === "ar" ? "جاوب:" : "Answer:"}</Label>
              <Textarea
                value={answers[currentQ] ?? ""}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ]: e.target.value }))}
                placeholder={language === "ar" ? "اكتب جوابك هنا..." : "Type your answer here..."}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px]"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handleBack} className="border-slate-700 text-slate-300">
                  {t("setupEmployee.prev", language)}
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!hasAnswer}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {t("setupEmployee.next", language)}
              </Button>
            </div>

            <p className="text-slate-600 text-xs text-center">
              {t("setupEmployee.step", language)} {currentStep + 1} / {totalSteps}
            </p>
          </div>
        )}

        {/* خطوة القدرات المقترحة */}
        {isCapabilitiesStep && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              {suggestedCapabilities.map((cap) => (
                <button
                  key={cap}
                  onClick={() => {
                    setAcceptedCaps(prev => {
                      const next = new Set(prev)
                      if (next.has(cap)) next.delete(cap)
                      else next.add(cap)
                      return next
                    })
                  }}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    acceptedCaps.has(cap)
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      acceptedCaps.has(cap)
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-slate-600"
                    }`}>
                      {acceptedCaps.has(cap) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-white text-sm">{cap}</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-slate-600 text-xs text-center">
              {language === "ar"
                ? "اختار القدرات اللي بدك تضيفها — الباقي ما رح يتضف"
                : "Select the capabilities you want to add — the rest won't be added"
              }
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="border-slate-700 text-slate-300">
                {t("setupEmployee.prev", language)}
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {t("setupEmployee.next", language)}
              </Button>
            </div>
          </div>
        )}

        {/* خطوة وضع الموافقة */}
        {isApprovalStep && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              {APPROVAL_OPTION_KEYS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setApprovalMode(opt.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    approvalMode === opt.value
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  <span className="text-white text-sm font-medium block">{t(opt.labelKey, language)}</span>
                  <span className="text-slate-400 text-xs">{t(opt.descriptionKey, language)}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="border-slate-700 text-slate-300">
                {t("setupEmployee.prev", language)}
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {t("setupEmployee.activate", language)} {employee.name}!
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
