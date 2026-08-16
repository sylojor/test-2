// ============================================
// لوحة الإعدادات — النسخة المحدّثة مع استعراض الموديلز
// معلومات الشركة + إعدادات التواصل + الاشتراك + إعدادات LLM
// الآن: تحط API Key → يطلعلك الموديلز → تختار
// ============================================

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Settings, Plug, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Loader2, Sparkles, Brain,
} from "lucide-react"
import type { ICompany, LLMProvider, ModelTier } from "@/types"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { t } from "@/lib/i18n"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"

interface SettingsPanelProps {
  company: ICompany | null
}

const PROVIDER_OPTIONS: { value: LLMProvider; label: string; labelAr: string; descriptionKey: string; icon: string }[] = [
  { value: "together", label: "Together AI", labelAr: "توغيذر AI", descriptionKey: "settings.llm.provider.together.desc", icon: "🤖" },
  { value: "grok", label: "Groq", labelAr: "غروك", descriptionKey: "settings.llm.provider.grok.desc", icon: "⚡" },
  { value: "openrouter", label: "OpenRouter", labelAr: "أوبن راوتر", descriptionKey: "settings.llm.provider.openrouter.desc", icon: "🌐" },
  { value: "local", label: "Local GPU Server", labelAr: "سيرفر GPU محلي", descriptionKey: "settings.llm.provider.local.desc", icon: "🖥️" },
  { value: "mock", label: "Trial Mode", labelAr: "وضع التجربة", descriptionKey: "settings.llm.provider.mock.desc", icon: "🎭" },
]

const SUBSCRIPTION_KEY_MAP: Record<string, string> = {
  FREE_TRIAL: "tokenBudget.plan.free",
  STARTER: "tokenBudget.plan.starter",
  PROFESSIONAL: "tokenBudget.plan.professional",
  ENTERPRISE: "tokenBudget.plan.enterprise",
}

interface LLMStatus {
  provider: LLMProvider
  connected: boolean
  models: Record<string, string>
  pricing: { input: number; output: number }
  providerLabel: string
  apiKeyMasked: string
}

interface AvailableModel {
  id: string
  name: string
  provider: string
  tier: string
  pricing?: { input: number; output: number }
  contextLength?: number
  type?: string
}

export function SettingsPanel({ company }: SettingsPanelProps) {
  const language = useLocale()
  const isArabic = language === "ar"

  const [llmStatus, setLlmStatus] = useState<LLMStatus | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("mock")
  const [testApiKey, setTestApiKey] = useState("")
  const [testBaseUrl, setTestBaseUrl] = useState("")
  const [showAllProviders, setShowAllProviders] = useState(false)

  // New: Model fetching and selection
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [selectedModels, setSelectedModels] = useState<Record<ModelTier, string>>({
    LIGHT: "",
    MEDIUM: "",
    HEAVY: "",
  })
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)
  const [modelsFetched, setModelsFetched] = useState(false)

  const dialectLabels: Record<string, string> = {
    levantine: t("setup.dialect.levantine", language),
    egyptian: t("setup.dialect.egyptian", language),
    gulf: t("setup.dialect.gulf", language),
    iraqi: t("setup.dialect.iraqi", language),
    moroccan: t("setup.dialect.moroccan", language),
    formal: t("setup.dialect.formal", language),
    english: t("setup.dialect.english", language),
  }

  const toneLabels: Record<string, string> = {
    friendly: t("setup.tone.friendly", language),
    formal: t("setup.tone.formal", language),
    casual: t("setup.tone.casual", language),
    professional: t("setup.tone.professional", language),
    playful: t("setup.tone.playful", language),
  }

  const tierLabels: Record<string, string> = {
    LIGHT: isArabic ? "خفيف (سريع)" : "Light (Fast)",
    MEDIUM: isArabic ? "متوسط (متوازن)" : "Medium (Balanced)",
    HEAVY: isArabic ? "قوي (ذكي)" : "Heavy (Smart)",
  }

  const tierDescriptions: Record<string, string> = {
    LIGHT: isArabic ? "للمهام البسيطة: تلخيص، ترجمة، ردود سريعة" : "Simple tasks: summaries, translations, quick replies",
    MEDIUM: isArabic ? "للمحادثات العادية: ردود ذكية متوازنة" : "Normal conversations: smart balanced replies",
    HEAVY: isArabic ? "للمهام المعقدة: كود، تحليل، قرارات" : "Complex tasks: code, analysis, decisions",
  }

  useEffect(() => {
    loadLLMStatus()
  }, [])

  async function loadLLMStatus() {
    try {
      const res = await fetch("/api/settings/llm")
      if (res.ok) {
        const data = await res.json()
        setLlmStatus(data)
        setSelectedProvider(data.provider)
      }
    } catch (error) {
      console.error("Failed to load LLM status:", error)
    }
  }

  // Fetch available models from the selected provider
  async function fetchAvailableModels() {
    if (!testApiKey && selectedProvider !== "mock" && selectedProvider !== "local") {
      setTestResult({ success: false, message: isArabic ? "حط ال API Key أول" : "Enter API Key first" })
      return
    }

    setFetchingModels(true)
    setTestResult(null)

    try {
      // First test the connection
      const testRes = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: testApiKey,
          baseUrl: testBaseUrl || undefined,
        }),
      })

      const testData = await testRes.json()

      if (!testData.success) {
        setTestResult(testData)
        setFetchingModels(false)
        return
      }

      setTestResult(testData)

      // Then fetch available models
      const modelsUrl = `/api/llm/models?provider=${selectedProvider}&apiKey=${encodeURIComponent(testApiKey)}${testBaseUrl ? `&baseUrl=${encodeURIComponent(testBaseUrl)}` : ""}`
      const modelsRes = await fetch(modelsUrl)

      if (modelsRes.ok) {
        const modelsData = await modelsRes.json()
        const models = modelsData.models || []
        setAvailableModels(models)

        // Auto-select recommended models per tier
        const autoSelected: Record<ModelTier, string> = { LIGHT: "", MEDIUM: "", HEAVY: "" }
        for (const tier of ["LIGHT", "MEDIUM", "HEAVY"] as ModelTier[]) {
          const tierModels = models.filter((m: AvailableModel) => m.tier === tier)
          if (tierModels.length > 0) {
            // Pick the cheapest free model for LIGHT, or the first one
            const freeModels = tierModels.filter((m: AvailableModel) => 
              m.pricing && m.pricing.input === 0 && m.pricing.output === 0
            )
            if (tier === "LIGHT" && freeModels.length > 0) {
              autoSelected[tier] = freeModels[0].id
            } else {
              autoSelected[tier] = tierModels[0].id
            }
          }
        }

        setSelectedModels(autoSelected)
        setModelsFetched(true)
      } else {
        const errorData = await modelsRes.json()
        console.error("Failed to fetch models:", errorData)
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `${isArabic ? "فشل الاتصال" : "Connection failed"}: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setFetchingModels(false)
    }
  }

  // Save the selected models to the database
  async function saveSettings() {
    setSaving(true)
    setSaveResult(null)

    try {
      const res = await fetch("/api/llm/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: testApiKey,
          baseUrl: testBaseUrl || undefined,
          models: selectedModels,
        }),
      })

      const data = await res.json()
      setSaveResult(data)

      if (data.success) {
        // Reload LLM status to reflect changes
        await loadLLMStatus()
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: `${isArabic ? "فشل الحفظ" : "Save failed"}: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setSaving(false)
    }
  }

  if (!company) return null

  const subscription = company.subscription ?? "FREE_TRIAL"
  const planInfo = SUBSCRIPTION_PLANS[subscription]

  // Get models for a specific tier for the dropdown
  const getModelsForTier = (tier: string) => {
    return availableModels.filter(m => m.tier === tier)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {t("settings.title", language)}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{isArabic ? "إعدادات الذكاء الاصطناعي والشركة" : "AI & Company Settings"}</p>
      </div>

      {/* ============================================ */}
      {/* إعدادات الـ LLM — مع استعراض الموديلز */}
      {/* ============================================ */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {t("settings.llm", language)}
            {llmStatus && (
              <Badge className={
                llmStatus.connected
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/30"
                  : "bg-amber-600/20 text-amber-400 border-amber-800/30"
              }>
                {llmStatus.connected ? (isArabic ? "متصل" : "Connected") : (isArabic ? "غير متصل" : "Disconnected")}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* حالة الـ LLM الحالية */}
          {llmStatus && llmStatus.connected && (
            <div className="p-3 rounded-lg bg-emerald-900/10 border border-emerald-800/20 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-300 text-sm font-medium">
                  {isArabic ? "الذكاء الاصطناعي متصل ويعمل!" : "AI is connected and working!"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">{isArabic ? "المزود" : "Provider"}</span>
                <span className="text-foreground text-sm font-medium">{llmStatus.providerLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">{isArabic ? "API Key" : "API Key"}</span>
                <span className="text-foreground text-sm font-mono">{llmStatus.apiKeyMasked}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">{isArabic ? "موديل المحادثة" : "Chat Model"}</span>
                <span className="text-foreground text-xs font-mono">{llmStatus.models.MEDIUM}</span>
              </div>
            </div>
          )}

          {llmStatus && !llmStatus.connected && (
            <div className="p-3 rounded-lg bg-amber-900/10 border border-amber-800/20 space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-amber-400" />
                <span className="text-amber-300 text-sm font-medium">
                  {isArabic ? "الذكاء الاصطناعي غير متصل — حط API Key" : "AI is disconnected — add an API Key"}
                </span>
              </div>
            </div>
          )}

          {/* اختيار المزود */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium flex items-center gap-2">
              <Plug className="h-4 w-4" />
              {isArabic ? "اختار مزود الذكاء الاصطناعي" : "Select AI Provider"}
            </Label>
            <div className="space-y-2">
              {(showAllProviders ? PROVIDER_OPTIONS : PROVIDER_OPTIONS.slice(0, 4)).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors min-h-[44px] ${
                    selectedProvider === opt.value
                      ? "bg-blue-600/10 border border-blue-600/30 shadow-sm"
                      : "bg-muted/30 border border-transparent hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={opt.value}
                    checked={selectedProvider === opt.value}
                    onChange={(e) => {
                      setSelectedProvider(e.target.value as LLMProvider)
                      setModelsFetched(false)
                      setAvailableModels([])
                      setTestResult(null)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{opt.icon}</span>
                      <p className="text-foreground text-sm font-medium">
                        {isArabic ? opt.labelAr : opt.label}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">{t(opt.descriptionKey, language)}</p>
                  </div>
                </label>
              ))}
              {!showAllProviders && PROVIDER_OPTIONS.length > 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllProviders(true)}
                  className="text-muted-foreground text-xs w-full"
                >
                  <ChevronDown className="h-3 w-3 mr-1" />
                  {isArabic ? "عرض المزيد" : "Show more"}
                </Button>
              )}
              {showAllProviders && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllProviders(false)}
                  className="text-muted-foreground text-xs w-full"
                >
                  <ChevronUp className="h-3 w-3 mr-1" />
                  {isArabic ? "عرض أقل" : "Show less"}
                </Button>
              )}
            </div>
          </div>

          {/* API Key */}
          {selectedProvider !== "mock" && selectedProvider !== "local" && (
            <div className="space-y-2">
              <Label className="text-foreground">
                {isArabic ? "مفتاح API" : "API Key"}
                {selectedProvider === "together" && (
                  <a href="https://together.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mr-2 hover:underline">
                    {isArabic ? "سجل هنا ←" : "Register here ←"}
                  </a>
                )}
                {selectedProvider === "grok" && (
                  <a href="https://console.groq.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mr-2 hover:underline">
                    {isArabic ? "سجل هنا ←" : "Register here ←"}
                  </a>
                )}
                {selectedProvider === "openrouter" && (
                  <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mr-2 hover:underline">
                    {isArabic ? "سجل هنا ←" : "Register here ←"}
                  </a>
                )}
              </Label>
              <Input
                type="password"
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
                placeholder={
                  selectedProvider === "grok"
                    ? "gsk_..."
                    : selectedProvider === "together"
                    ? "xxxxxxxx..."
                    : "sk-..."
                }
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground font-mono text-sm min-h-[44px]"
                dir="ltr"
              />
            </div>
          )}

          {/* Base URL */}
          {(selectedProvider === "local" || selectedProvider === "openrouter") && (
            <div className="space-y-2">
              <Label className="text-foreground">
                {selectedProvider === "local" ? (isArabic ? "عنوان السيرفر" : "Server URL") : (isArabic ? "رابط API (اختياري)" : "API URL (optional)")}
              </Label>
              <Input
                value={testBaseUrl}
                onChange={(e) => setTestBaseUrl(e.target.value)}
                placeholder={selectedProvider === "local" ? "http://192.168.1.100:8000" : "https://api.groq.com/openai/v1"}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground font-mono text-sm min-h-[44px]"
                dir="ltr"
              />
            </div>
          )}

          {/* زر الاتصال واستعراض الموديلز */}
          <Button
            onClick={fetchAvailableModels}
            disabled={fetchingModels || (!testApiKey && selectedProvider !== "mock" && selectedProvider !== "local")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] flex items-center gap-2"
          >
            {fetchingModels ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {fetchingModels
              ? (isArabic ? "جاري الاتصال واستعراض الموديلز..." : "Connecting & fetching models...")
              : (isArabic ? "اتصل واستعرض الموديلز" : "Connect & Fetch Models")
            }
          </Button>

          {/* نتيجة الاتصال */}
          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${
              testResult.success
                ? "bg-emerald-900/20 border border-emerald-800/30 text-emerald-300"
                : "bg-red-900/20 border border-red-800/30 text-red-300"
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testResult.message}
              </div>
              {testResult.success && testResult.model && (
                <p className="text-xs mt-1">{isArabic ? `الموديل: ${testResult.model}` : `Model: ${testResult.model}`}</p>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* استعراض واختيار الموديلز */}
          {/* ============================================ */}
          {modelsFetched && availableModels.length > 0 && (
            <div className="space-y-4 p-4 rounded-lg bg-blue-900/10 border border-blue-800/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                <h3 className="text-blue-300 text-sm font-semibold">
                  {isArabic ? `وجدنا ${availableModels.length} موديل — اختار المناسب لكل مستوى` : `Found ${availableModels.length} models — pick for each tier`}
                </h3>
              </div>

              {/* LIGHT tier */}
              <div className="space-y-2">
                <Label className="text-foreground text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">L</span>
                  {tierLabels.LIGHT}
                  <span className="text-muted-foreground text-xs">— {tierDescriptions.LIGHT}</span>
                </Label>
                <select
                  value={selectedModels.LIGHT}
                  onChange={(e) => setSelectedModels(prev => ({ ...prev, LIGHT: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm min-h-[44px] focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{isArabic ? "-- اختار موديل خفيف --" : "-- Select Light Model --"}</option>
                  {getModelsForTier("LIGHT").map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.pricing ? `($${m.pricing.input}/M)` : ""} {m.contextLength ? `[${(m.contextLength/1000).toFixed(0)}K]` : ""}
                    </option>
                  ))}
                  {/* Also show MEDIUM models as fallback for LIGHT */}
                  {getModelsForTier("MEDIUM").length > 0 && (
                    <optgroup label={isArabic ? "موديلز متوسطة (أقوى)" : "Medium models (stronger)"}>
                      {getModelsForTier("MEDIUM").map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.pricing ? `($${m.pricing.input}/M)` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* MEDIUM tier */}
              <div className="space-y-2">
                <Label className="text-foreground text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">M</span>
                  {tierLabels.MEDIUM}
                  <span className="text-muted-foreground text-xs">— {tierDescriptions.MEDIUM}</span>
                </Label>
                <select
                  value={selectedModels.MEDIUM}
                  onChange={(e) => setSelectedModels(prev => ({ ...prev, MEDIUM: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm min-h-[44px] focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{isArabic ? "-- اختار موديل متوسط --" : "-- Select Medium Model --"}</option>
                  {getModelsForTier("MEDIUM").map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.pricing ? `($${m.pricing.input}/M)` : ""} {m.contextLength ? `[${(m.contextLength/1000).toFixed(0)}K]` : ""}
                    </option>
                  ))}
                  {/* Also show HEAVY models as fallback for MEDIUM */}
                  {getModelsForTier("HEAVY").length > 0 && (
                    <optgroup label={isArabic ? "موديلز قوية (أذكى)" : "Heavy models (smartest)"}>
                      {getModelsForTier("HEAVY").map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.pricing ? `($${m.pricing.input}/M)` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* HEAVY tier */}
              <div className="space-y-2">
                <Label className="text-foreground text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">H</span>
                  {tierLabels.HEAVY}
                  <span className="text-muted-foreground text-xs">— {tierDescriptions.HEAVY}</span>
                </Label>
                <select
                  value={selectedModels.HEAVY}
                  onChange={(e) => setSelectedModels(prev => ({ ...prev, HEAVY: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm min-h-[44px] focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{isArabic ? "-- اختار موديل قوي --" : "-- Select Heavy Model --"}</option>
                  {getModelsForTier("HEAVY").map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.pricing ? `($${m.pricing.input}/M)` : ""} {m.contextLength ? `[${(m.contextLength/1000).toFixed(0)}K]` : ""}
                    </option>
                  ))}
                  {/* Also show MEDIUM models as cheaper fallback for HEAVY */}
                  {getModelsForTier("MEDIUM").length > 0 && (
                    <optgroup label={isArabic ? "موديلز متوسطة (أرخص)" : "Medium models (cheaper)"}>
                      {getModelsForTier("MEDIUM").map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.pricing ? `($${m.pricing.input}/M)` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* ملخص الاختيار */}
              {(selectedModels.LIGHT || selectedModels.MEDIUM || selectedModels.HEAVY) && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-foreground text-xs font-medium">{isArabic ? "ملخص اختيارك:" : "Your selection:"}</p>
                  {selectedModels.LIGHT && (
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <span className="text-green-400">L:</span> {availableModels.find(m => m.id === selectedModels.LIGHT)?.name || selectedModels.LIGHT}
                    </p>
                  )}
                  {selectedModels.MEDIUM && (
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <span className="text-blue-400">M:</span> {availableModels.find(m => m.id === selectedModels.MEDIUM)?.name || selectedModels.MEDIUM}
                    </p>
                  )}
                  {selectedModels.HEAVY && (
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <span className="text-purple-400">H:</span> {availableModels.find(m => m.id === selectedModels.HEAVY)?.name || selectedModels.HEAVY}
                    </p>
                  )}
                </div>
              )}

              {/* زر الحفظ */}
              <Button
                onClick={saveSettings}
                disabled={saving || (!selectedModels.LIGHT && !selectedModels.MEDIUM && !selectedModels.HEAVY)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving
                  ? (isArabic ? "جاري الحفظ..." : "Saving...")
                  : (isArabic ? "حفظ الإعدادات" : "Save Settings")
                }
              </Button>

              {/* نتيجة الحفظ */}
              {saveResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  saveResult.success
                    ? "bg-emerald-900/20 border border-emerald-800/30 text-emerald-300"
                    : "bg-red-900/20 border border-red-800/30 text-red-300"
                }`}>
                  <div className="flex items-center gap-2">
                    {saveResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {saveResult.message}
                  </div>
                </div>
              )}
            </div>
          )}

          {modelsFetched && availableModels.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-900/10 border border-amber-800/20 text-amber-300 text-sm">
              {isArabic ? "لم نجد موديلز متوفرة — تأكد إنه ال API Key صحيح" : "No models found — make sure the API Key is correct"}
            </div>
          )}

          {/* شرح كيفية الربط */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
            <p className="text-foreground text-sm font-medium">{isArabic ? "كيف تربط الذكاء الاصطناعي?" : "How to connect AI?"}</p>
            <div className="space-y-2 text-muted-foreground text-xs">
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                {isArabic ? "اختار المزود (Groq, Together, OpenRouter)" : "Select a provider (Groq, Together, OpenRouter)"}
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
                {isArabic ? "حط ال API Key من حسابك بالمزود" : "Add your API Key from the provider account"}
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
                {isArabic ? "اضغط 'اتصل' — يطلعلك كل الموديلز المتوفرة" : "Click 'Connect' — it shows all available models"}
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">4</span>
                {isArabic ? "اختار موديل لكل مستوى وخزّن" : "Pick a model for each tier and save"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* معلومات الشركة */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">{t("settings.company", language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">{t("settings.company.name", language)}</Label>
            <Input
              defaultValue={company.name}
              className="bg-muted border-border text-foreground min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">{t("settings.company.industry", language)}</Label>
            <Input
              defaultValue={company.industry ?? ""}
              placeholder={t("settings.company.industryPlaceholder", language)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">{t("settings.company.description", language)}</Label>
            <Input
              defaultValue={company.description ?? ""}
              placeholder={t("settings.company.descriptionPlaceholder", language)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[44px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات التواصل */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">{t("settings.communication", language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
            <span className="text-foreground">{t("settings.communication.dialect", language)}</span>
            <span className="text-foreground font-medium">{dialectLabels[company.dialect] ?? company.dialect}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
            <span className="text-foreground">{t("settings.communication.tone", language)}</span>
            <span className="text-foreground font-medium">{toneLabels[company.tone] ?? company.tone}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("settings.communication.changeNote", language)}
          </p>
        </CardContent>
      </Card>

      {/* الاشتراك */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">{t("settings.subscription", language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-foreground font-semibold text-lg">{t(SUBSCRIPTION_KEY_MAP[subscription] ?? "tokenBudget.plan.free", language)}</p>
              <p className="text-muted-foreground text-sm">{planInfo.priceDisplay}</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/30">
              {t(SUBSCRIPTION_KEY_MAP[subscription] ?? "tokenBudget.plan.free", language)}
            </Badge>
          </div>
          <ul className="space-y-1.5">
            {planInfo.features.map((f, i) => (
              <li key={i} className="text-muted-foreground text-sm flex items-center gap-2">
                <span className="text-emerald-400">&#10003;</span> {f}
              </li>
            ))}
          </ul>
          {company.subscriptionEndAt && (
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground text-sm">{t("settings.subscription.renewal", language)}</span>
              <span className="text-foreground text-sm">
                {new Date(company.subscriptionEndAt as string | Date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
              </span>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full border-emerald-600 text-emerald-400 hover:bg-emerald-900/20"
            onClick={() => window.location.reload()}
          >
            {t("settings.subscription.upgrade", language)}
          </Button>
        </CardContent>
      </Card>

      {/* المنصات */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">{t("settings.platforms", language)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">{t("settings.platforms.desc", language)}</p>
            <Button variant="outline" className="mt-3 border-border text-foreground">
              {t("settings.platforms.connectFacebook", language)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
