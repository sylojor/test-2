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
  Settings } from "lucide-react"
import type { ICompany, LLMProvider, ModelTier } from "@/types"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { t } from "@/lib/i18n"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"

interface SettingsPanelProps {
  company: ICompany | null
}

const SUBSCRIPTION_KEY_MAP: Record<string, string> = {
  FREE_TRIAL: "tokenBudget.plan.free",
  STARTER: "tokenBudget.plan.starter",
  PROFESSIONAL: "tokenBudget.plan.professional",
  ENTERPRISE: "tokenBudget.plan.enterprise" }

  providerLabel: string
  apiKeyMasked: string
}

  contextLength?: number
  type?: string
}

export function SettingsPanel({ company }: SettingsPanelProps) {
  const language = useLocale()
  const isArabic = language === "ar"

              
  // New: Model fetching and selection
            

  const dialectLabels: Record<string, string> = {
    levantine: t("setup.dialect.levantine", language),
    egyptian: t("setup.dialect.egyptian", language),
    gulf: t("setup.dialect.gulf", language),
    iraqi: t("setup.dialect.iraqi", language),
    moroccan: t("setup.dialect.moroccan", language),
    formal: t("setup.dialect.formal", language),
    english: t("setup.dialect.english", language) }

  const toneLabels: Record<string, string> = {
    friendly: t("setup.tone.friendly", language),
    formal: t("setup.tone.formal", language),
    casual: t("setup.tone.casual", language),
    professional: t("setup.tone.professional", language),
    playful: t("setup.tone.playful", language) }

  
  
  // LLM & Payment config are managed by platform owner via admin panel

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
          baseUrl: testBaseUrl || undefined }) })

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
        message: `${isArabic ? "فشل الاتصال" : "Connection failed"}: ${error instanceof Error ? error.message : "Unknown error"}` })
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
          models: selectedModels }) })

      const data = await res.json()
      setSaveResult(data)

      if (data.success) {
        // Reload LLM status to reflect changes
        await loadLLMStatus()
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: `${isArabic ? "فشل الحفظ" : "Save failed"}: ${error instanceof Error ? error.message : "Unknown error"}` })
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
        <p className="text-muted-foreground text-sm mt-1">{isArabic ? "إعدادات الشركة والاشتراك" : "Company & Subscription Settings"}</p>
      </div>

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
              onClick={() => {
                window.location.reload()
              }}
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
