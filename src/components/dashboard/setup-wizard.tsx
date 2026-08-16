// ============================================
// معالج تهيئة الشركة (Setup Wizard)
//
// للمستخدم الجديد — بيسأله عن:
// 1. اسم الشركة
// 2. المجال
// 3. اللهجة
// 4. نبرة التواصل
// ============================================

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Dialect, Tone } from "@/types"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface SetupWizardProps {
  onSubmit: (data: {
    name: string
    description: string
    industry: string
    dialect: Dialect
    tone: Tone
  }) => void
  onBack?: () => void
}

const DIALECTS: { value: Dialect; labelKey: string; descKey: string }[] = [
  { value: "levantine", labelKey: "setup.dialect.levantine", descKey: "setup.dialect.levantine.desc" },
  { value: "egyptian", labelKey: "setup.dialect.egyptian", descKey: "setup.dialect.egyptian.desc" },
  { value: "gulf", labelKey: "setup.dialect.gulf", descKey: "setup.dialect.gulf.desc" },
  { value: "iraqi", labelKey: "setup.dialect.iraqi", descKey: "setup.dialect.iraqi.desc" },
  { value: "moroccan", labelKey: "setup.dialect.moroccan", descKey: "setup.dialect.moroccan.desc" },
  { value: "formal", labelKey: "setup.dialect.formal", descKey: "setup.dialect.formal.desc" },
  { value: "english", labelKey: "setup.dialect.english", descKey: "setup.dialect.english.desc" },
]

const TONES: { value: Tone; labelKey: string; descKey: string }[] = [
  { value: "friendly", labelKey: "setup.tone.friendly", descKey: "setup.tone.friendly.desc" },
  { value: "formal", labelKey: "setup.tone.formal", descKey: "setup.tone.formal.desc" },
  { value: "casual", labelKey: "setup.tone.casual", descKey: "setup.tone.casual.desc" },
  { value: "professional", labelKey: "setup.tone.professional", descKey: "setup.tone.professional.desc" },
  { value: "playful", labelKey: "setup.tone.playful", descKey: "setup.tone.playful.desc" },
]

export function SetupWizard({ onSubmit, onBack }: SetupWizardProps) {
  const language = useLocale()
  const isRTL = language === "ar"
  
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [industry, setIndustry] = useState("")
  const [dialect, setDialect] = useState<Dialect>("levantine")
  const [tone, setTone] = useState<Tone>("friendly")

  const steps = [
    // الخطوة 0: اسم الشركة
    // الخطوة 1: اللهجة
    // الخطوة 2: النبرة
    // الخطوة 3: تأكيد
  ]

  const canProceed = () => {
    if (step === 0) return name.trim().length >= 2
    if (step === 1) return !!dialect
    if (step === 2) return !!tone
    return true
  }

  const handleSubmit = () => {
    onSubmit({ name, description, industry, dialect, tone })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="w-full max-w-lg space-y-6">
        {/* الشعار والعنوان */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("setup.title", language)}</h1>
          <p className="text-muted-foreground text-sm">{t("setup.subtitle", language)}</p>
        </div>

        {/* مؤشر التقدم */}
        <div className="flex gap-2 justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? "w-10 bg-emerald-500" : "w-6 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* الخطوة 0: اسم الشركة */}
        {step === 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">{t("setup.step1", language)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("setup.name", language)} *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("setup.namePlaceholder", language)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("setup.description", language)}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("setup.descriptionPlaceholder", language)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("setup.industry", language)}</Label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder={t("setup.industryPlaceholder", language)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* الخطوة 1: اللهجة */}
        {step === 1 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">{t("setup.dialect", language)}</CardTitle>
              <p className="text-muted-foreground text-sm">{t("setup.dialect.desc", language)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {DIALECTS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDialect(d.value)}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                    dialect === d.value
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-border bg-muted/50 hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">{t(d.labelKey, language)}</span>
                    <span className="text-sm text-muted-foreground">{t(d.descKey, language)}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* الخطوة 2: النبرة */}
        {step === 2 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">{t("setup.tone", language)}</CardTitle>
              <p className="text-muted-foreground text-sm">{t("setup.tone.desc", language)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {TONES.map((toneItem) => (
                <button
                  key={toneItem.value}
                  onClick={() => setTone(toneItem.value)}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                    tone === toneItem.value
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-border bg-muted/50 hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-medium text-foreground block">{t(toneItem.labelKey, language)}</span>
                    <span className="text-sm text-muted-foreground">{t(toneItem.descKey, language)}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* الخطوة 3: تأكيد */}
        {step === 3 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">{t("setup.button", language)}</CardTitle>
              <p className="text-muted-foreground text-sm">{t("setup.step2", language)}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("setup.name", language)}</span>
                  <span className="text-foreground font-medium">{name}</span>
                </div>
                {industry && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("setup.industry", language)}</span>
                    <span className="text-foreground">{industry}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("setup.dialect", language)}</span>
                  <span className="text-foreground">{t(DIALECTS.find(d => d.value === dialect)?.labelKey ?? "", language)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("setup.tone", language)}</span>
                  <span className="text-foreground">{t(TONES.find(tn => tn.value === tone)?.labelKey ?? "", language)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* أزرار التنقل */}
        <div className="flex gap-3 justify-between">
          {step > 0 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t("setup.prev", language)}
            </Button>
          ) : onBack ? (
            <Button
              variant="outline"
              onClick={onBack}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              ← {t("setup.prev", language)}
            </Button>
          ) : null}

          <div className="flex-1" />

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {t("setup.next", language)}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {t("setup.button", language)}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
