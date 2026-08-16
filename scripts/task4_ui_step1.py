#!/usr/bin/env python3
"""Task 4 Step 1: Create employee-detail-panel.tsx"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

detail_panel_content = '''// ============================================
// لوحة تفاصيل الموظف — عرض معلومات الموظف بالتفصيل
// التوكنات، توجيه الموديلات، ميزانية التوكنات
// ============================================

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ArrowRight,
  Key,
  Cpu,
  Wallet,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react"
import type { IEmployee, IDepartment, ICompany } from "@/types"
import { getEmployeeStatusColor, getEmployeeStatusDisplay } from "@/lib/employee-generator"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import { useDashboardStore } from "@/stores/dashboard-store"

// --- أسماء المنصات ---
const PLATFORM_NAMES: Record<string, { ar: string; en: string }> = {
  FACEBOOK: { ar: "فيسبوك", en: "Facebook" },
  INSTAGRAM: { ar: "إنستغرام", en: "Instagram" },
  TWITTER: { ar: "تويتر/X", en: "Twitter/X" },
  LINKEDIN: { ar: "لينكدإن", en: "LinkedIn" },
  GOOGLE: { ar: "جوجل", en: "Google" },
  TIKTOK: { ar: "تيك توك", en: "TikTok" },
  YOUTUBE: { ar: "يوتيوب", en: "YouTube" },
  SNAPCHAT: { ar: "سناب شات", en: "Snapchat" },
  WHATSAPP_BUSINESS: { ar: "واتساب بزنس", en: "WhatsApp Business" },
  EMAIL: { ar: "بريد إلكتروني", en: "Email" },
  STRIPE: { ar: "سترايب", en: "Stripe" },
  SHOPIFY: { ar: "شوبيفاي", en: "Shopify" },
  CUSTOM_API: { ar: "API مخصص", en: "Custom API" },
  OTHER: { ar: "منصة أخرى", en: "Other" },
}

// --- أنواع المهام ---
const TASK_TYPE_INFO: Record<string, { ar: string; en: string }> = {
  CHAT: { ar: "محادثة", en: "Chat" },
  GENERATION: { ar: "توليد محتوى", en: "Content Generation" },
  IMAGE: { ar: "توليد صور", en: "Image Generation" },
  ANALYSIS: { ar: "تحليل", en: "Analysis" },
  CODE: { ar: "كود", en: "Code" },
  DECISION: { ar: "اتخاذ قرار", en: "Decision Making" },
  TRANSLATION: { ar: "ترجمة", en: "Translation" },
  SUMMARIZATION: { ar: "تلخيص", en: "Summarization" },
}

interface TokenData {
  id: string
  platform: string
  accessToken: string
  refreshToken: string | null
  isActive: boolean
  scopes: string | null
  platformUserId: string | null
  platformName: string | null
  platformAvatar: string | null
  tokenExpiresAt: string | null
  inheritedFromEmployeeId: string | null
  createdAt: string
  updatedAt: string
}

interface RoutingData {
  id: string
  taskType: string
  llmModelId: string | null
  priority: number
  isActive: boolean
  llmModel: {
    id: string
    name: string
    provider: string
    modelId: string
    tier: string
    isActive: boolean
  } | null
}

interface AvailableModel {
  id: string
  name: string
  provider: string
  modelId: string
  tier: string
}

interface EmployeeDetailPanelProps {
  employee: IEmployee
  departments: IDepartment[]
  company: ICompany | null
}

export function EmployeeDetailPanel({ employee, departments, company }: EmployeeDetailPanelProps) {
  const language = useLocale()
  const { setActiveTab } = useDashboardStore()
  const isRTL = language === "ar"
  const BackIcon = isRTL ? ArrowRight : ArrowLeft

  // --- حالة التوكنات ---
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [tokensLoading, setTokensLoading] = useState(true)

  // --- حالة توجيه الموديلات ---
  const [routings, setRoutings] = useState<RoutingData[]>([])
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [routingsLoading, setRoutingsLoading] = useState(true)

  // --- ميزانية التوكنات ---
  const [budgetInfo, setBudgetInfo] = useState({ used: 0, budget: 0 })

  // --- جلب التوكنات ---
  useEffect(() => {
    async function fetchTokens() {
      setTokensLoading(true)
      try {
        const res = await fetch(`/api/employees/${employee.id}/tokens`)
        if (res.ok) {
          const data = await res.json()
          setTokens(data.tokens || [])
        }
      } catch (e) {
        console.error("[TOKENS_FETCH_ERROR]", e)
      }
      setTokensLoading(false)
    }
    fetchTokens()
  }, [employee.id])

  // --- جلب توجيهات الموديلات ---
  useEffect(() => {
    async function fetchRoutings() {
      setRoutingsLoading(true)
      try {
        const res = await fetch(`/api/employees/${employee.id}/model-routing`)
        if (res.ok) {
          const data = await res.json()
          setRoutings(data.routings || [])
          setAvailableModels(data.availableModels || [])
        }
      } catch (e) {
        console.error("[ROUTINGS_FETCH_ERROR]", e)
      }
      setRoutingsLoading(false)
    }
    fetchRoutings()
  }, [employee.id])

  // --- جلب ميزانية التوكنات ---
  useEffect(() => {
    async function fetchBudget() {
      try {
        const res = await fetch(`/api/token-budget?companyId=${company?.id}`)
        if (res.ok) {
          const data = await res.json()
          setBudgetInfo({
            used: data.usedMonthly ?? 0,
            budget: data.budgetMonthly ?? 0,
          })
        }
      } catch (e) {
        console.error("[BUDGET_FETCH_ERROR]", e)
      }
    }
    if (company) fetchBudget()
  }, [company])

  // --- حذف توكن ---
  const deleteToken = async (tokenId: string) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}/tokens?tokenId=${tokenId}`, { method: "DELETE" })
      if (res.ok) {
        setTokens(tokens.filter(t => t.id !== tokenId))
      }
    } catch (e) {
      console.error("[DELETE_TOKEN_ERROR]", e)
    }
  }

  // --- حذف توجيه موديل ---
  const deleteRouting = async (routingId: string) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}/model-routing?routingId=${routingId}`, { method: "DELETE" })
      if (res.ok) {
        setRoutings(routings.filter(r => r.id !== routingId))
      }
    } catch (e) {
      console.error("[DELETE_ROUTING_ERROR]", e)
    }
  }

  const dept = departments.find(d => d.id === employee.departmentId)
  const budgetPercent = budgetInfo.budget > 0 ? (budgetInfo.used / budgetInfo.budget) * 100 : 0

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      {/* --- رأس اللوحة --- */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => setActiveTab("employees")}
          className="text-slate-400 hover:text-white min-h-[44px]"
        >
          <BackIcon className="w-4 h-4 mr-2" />
          {t("employeeDetail.back", language)}
        </Button>
      </div>

      {/* --- بطاقة الموظف --- */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: employee.avatarColor || "#10b981" }}
            >
              {employee.name.charAt(0)}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-white text-xl font-bold">{employee.name}</h2>
                <Badge variant="secondary" className={`text-xs ${getEmployeeStatusColor(employee.status)}`}>
                  {getEmployeeStatusDisplay(employee.status)}
                </Badge>
              </div>
              <p className="text-slate-400">{employee.role}</p>
              {employee.specialization && (
                <Badge variant="outline" className="text-xs border-emerald-700 text-emerald-400">
                  {language === "ar" ? `تخصص: ${employee.specialization}` : `Specialization: ${employee.specialization}`}
                </Badge>
              )}
              {dept && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                  <span className="text-slate-400 text-sm">{dept.name}</span>
                </div>
              )}
              {employee.replacedByEmployeeId && (
                <div className="mt-2 text-yellow-400 text-xs">
                  {t("employeeDetail.replaced", language)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- توكنات الوصول --- */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              {t("employeeDetail.accessTokens", language)}
            </CardTitle>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
              {tokens.length} {language === "ar" ? "منصة مربوط" : "platforms linked"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {tokensLoading ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {t("employeeDetail.noTokens", language)}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-custom">
              {tokens.map((token) => {
                const platformInfo = PLATFORM_NAMES[token.platform] || { ar: token.platform, en: token.platform }
                return (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {language === "ar" ? platformInfo.ar : platformInfo.en}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {token.accessToken}
                          {token.platformName && ` \\u2022 ${token.platformName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {token.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      {token.inheritedFromEmployeeId && (
                        <Badge variant="outline" className="text-[10px] border-yellow-700 text-yellow-400">
                          {t("employeeDetail.inherited", language)}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteToken(token.id)}
                        className="text-slate-400 hover:text-red-400 min-h-[44px] min-w-[44px]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- توجيه الموديلات --- */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#5C6A8A]" />
              {t("employeeDetail.modelRouting", language)}
            </CardTitle>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
              {routings.length} {language === "ar" ? "توجيه" : "routing"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {routingsLoading ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : routings.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {t("employeeDetail.noRoutings", language)}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-custom">
              {routings.map((routing) => {
                const taskInfo = TASK_TYPE_INFO[routing.taskType] || { ar: routing.taskType, en: routing.taskType }
                return (
                  <div
                    key={routing.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">
                        {language === "ar" ? taskInfo.ar.charAt(0) : taskInfo.en.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {language === "ar" ? taskInfo.ar : taskInfo.en}
                        </p>
                        {routing.llmModel ? (
                          <p className="text-slate-500 text-xs">
                            {routing.llmModel.name} ({routing.llmModel.provider})
                          </p>
                        ) : (
                          <p className="text-slate-600 text-xs">
                            {t("employeeDetail.defaultModel", language)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {routing.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                        P{routing.priority}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRouting(routing.id)}
                        className="text-slate-400 hover:text-red-400 min-h-[44px] min-w-[44px]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- ميزانية التوكنات --- */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            {t("employeeDetail.tokenBudget", language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{t("employeeDetail.used", language)}</span>
              <span className="text-white">{budgetInfo.used.toLocaleString()} tokens</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(budgetPercent, 100)}%`,
                  backgroundColor: budgetPercent >= 100 ? "#ef4444" : budgetPercent >= 80 ? "#f59e0b" : "#10b981",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{budgetPercent.toFixed(1)}%</span>
              <span>{t("employeeDetail.totalBudget", language)}: {budgetInfo.budget.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'''

with sftp.open("/home/ubuntu/blivoai-demo/src/components/dashboard/employee-detail-panel.tsx", "w") as f:
    f.write(detail_panel_content.encode())
print("✓ employee-detail-panel.tsx created")

sftp.close()
client.close()
