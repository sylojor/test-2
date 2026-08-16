// ============================================
// Employee Detail Panel — عرض تفاصيل الموظف
// اسم + تخصص + قسم + توكنات + موديلات
// ============================================

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Key, Plus, Trash2, Cpu, Edit2, Save, X } from "lucide-react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n"
import type { IEmployee, IDepartment } from "@/types"

interface EmployeeAccessTokenUI {
  id: string
  platform: string
  accessToken: string
  refreshToken?: string
  scopes?: string
  platformUserId?: string
  platformName?: string
  isActive: boolean
  inheritedFromEmployeeId?: string
  inheritedAt?: string
  createdAt: string
}

interface EmployeeModelRoutingUI {
  id: string
  taskType: string
  llmModelId?: string
  llmModel?: { id: string; name: string; modelId: string; provider: string }
  priority: number
  isActive: boolean
}

interface LLMModelUI {
  id: string
  name: string
  modelId: string
  provider: string
  tier: string
  isActive: boolean
}

interface EmployeeDetailPanelProps {
  employee: IEmployee
  departments: IDepartment[]
  onBack: () => void
}

const PLATFORM_OPTIONS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "TWITTER", label: "Twitter/X" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "GOOGLE", label: "Google" },
  { value: "WHATSAPP_BUSINESS", label: "WhatsApp Business" },
  { value: "EMAIL", label: "Email (IMAP/SMTP)" },
  { value: "STRIPE", label: "Stripe" },
  { value: "SHOPIFY", label: "Shopify" },
  { value: "CUSTOM_API", label: "Custom API" },
  { value: "OTHER", label: "Other" },
]

const TASK_TYPE_OPTIONS = [
  { value: "CHAT", labelAr: "محادثة", labelEn: "Chat" },
  { value: "GENERATION", labelAr: "توليد محتوى", labelEn: "Content Generation" },
  { value: "IMAGE", labelAr: "توليد صور", labelEn: "Image Generation" },
  { value: "ANALYSIS", labelAr: "تحليل", labelEn: "Analysis" },
  { value: "CODE", labelAr: "برمجة", labelEn: "Code" },
  { value: "DECISION", labelAr: "قرارات", labelEn: "Decision Making" },
  { value: "TRANSLATION", labelAr: "ترجمة", labelEn: "Translation" },
  { value: "SUMMARIZATION", labelAr: "تلخيص", labelEn: "Summarization" },
]

export function EmployeeDetailPanel({ employee, departments, onBack }: EmployeeDetailPanelProps) {
  const language = useLocale()
  const [tokens, setTokens] = useState<EmployeeAccessTokenUI[]>([])
  const [routings, setRoutings] = useState<EmployeeModelRoutingUI[]>([])
  const [models, setModels] = useState<LLMModelUI[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddToken, setShowAddToken] = useState(false)
  const [showAddRouting, setShowAddRouting] = useState(false)
  const [newTokenPlatform, setNewTokenPlatform] = useState("")
  const [newTokenValue, setNewTokenValue] = useState("")
  const [newRoutingTaskType, setNewRoutingTaskType] = useState("")
  const [newRoutingModelId, setNewRoutingModelId] = useState("")
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null)

  const dept = employee.departmentId
    ? departments.find(d => d.id === employee.departmentId)
    : null

  // Load tokens and routings
  useEffect(() => {
    async function loadData() {
      try {
        const [tokensRes, routingsRes, modelsRes] = await Promise.all([
          fetch(`/api/employees/${employee.id}/tokens`),
          fetch(`/api/employees/${employee.id}/model-routing`),
          fetch("/api/admin/models"),
        ])

        if (tokensRes.ok) {
          const data = await tokensRes.json()
          setTokens(data.tokens || [])
        }
        if (routingsRes.ok) {
          const data = await routingsRes.json()
          setRoutings(data.routings || [])
        }
        if (modelsRes.ok) {
          const data = await modelsRes.json()
          setModels(data.models || [])
        }
      } catch {
        toast.error(language === "ar" ? "خطأ في تحميل البيانات" : "Error loading data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [employee.id])

  const handleAddToken = async () => {
    if (!newTokenPlatform || !newTokenValue) {
      toast.error(language === "ar" ? "المنصة والتوكن مطلوبين" : "Platform and token are required")
      return
    }

    try {
      const res = await fetch(`/api/employees/${employee.id}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: newTokenPlatform,
          accessToken: newTokenValue,
        }),
      })

      if (res.ok) {
        toast.success(language === "ar" ? "تم إضافة التوكن" : "Token added")
        setShowAddToken(false)
        setNewTokenPlatform("")
        setNewTokenValue("")
        // Reload tokens
        const data = await (await fetch(`/api/employees/${employee.id}/tokens`)).json()
        setTokens(data.tokens || [])
      } else {
        toast.error(language === "ar" ? "خطأ في إضافة التوكن" : "Error adding token")
      }
    } catch {
      toast.error(language === "ar" ? "خطأ في الاتصال" : "Connection error")
    }
  }

  const handleDeleteToken = async (tokenId: string) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}/tokens?tokenId=${tokenId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success(language === "ar" ? "تم حذف التوكن" : "Token deleted")
        setTokens(tokens.filter(t => t.id !== tokenId))
      }
    } catch {
      toast.error(language === "ar" ? "خطأ" : "Error")
    }
  }

  const handleToggleToken = async (tokenId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}/tokens`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, isActive }),
      })
      if (res.ok) {
        setTokens(tokens.map(t => t.id === tokenId ? { ...t, isActive } : t))
      }
    } catch {
      toast.error(language === "ar" ? "خطأ" : "Error")
    }
  }

  const handleAddRouting = async () => {
    if (!newRoutingTaskType) {
      toast.error(language === "ar" ? "نوع المهمة مطلوب" : "Task type required")
      return
    }

    try {
      const res = await fetch(`/api/employees/${employee.id}/model-routing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: newRoutingTaskType,
          llmModelId: newRoutingModelId || null,
        }),
      })

      if (res.ok) {
        toast.success(language === "ar" ? "تم تحديث توجيه الموديل" : "Model routing updated")
        setShowAddRouting(false)
        const data = await (await fetch(`/api/employees/${employee.id}/model-routing`)).json()
        setRoutings(data.routings || [])
      } else {
        toast.error(language === "ar" ? "خطأ" : "Error")
      }
    } catch {
      toast.error(language === "ar" ? "خطأ" : "Error")
    }
  }

  const handleDeleteRouting = async (routingId: string) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}/model-routing?routingId=${routingId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setRoutings(routings.filter(r => r.id !== routingId))
      }
    } catch {
      toast.error(language === "ar" ? "خطأ" : "Error")
    }
  }

  const platformLabel = (platform: string) => {
    const found = PLATFORM_OPTIONS.find(p => p.value === platform)
    return found?.label || platform
  }

  const taskTypeLabel = (taskType: string) => {
    const found = TASK_TYPE_OPTIONS.find(t => t.value === taskType)
    return found ? (language === "ar" ? found.labelAr : found.labelEn) : taskType
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{language === "ar" ? "جاري التحميل..." : "Loading..."}</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
        >
          {language === "ar" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{language === "ar" ? "رجوع" : "Back"}</span>
        </button>
      </div>

      {/* Employee Info Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: employee.avatarColor || dept?.color || "#10b981" }}
            >
              {employee.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold" style={{ color: dept?.color || "#fff" }}>
                {employee.name}
              </h2>
              <p className="text-slate-400">{employee.role}</p>
              <div className="flex items-center gap-2 mt-1">
                {employee.specialization && (
                  <Badge variant="secondary" className="bg-emerald-900/30 text-emerald-400 text-xs">
                    {employee.specialization}
                  </Badge>
                )}
                {dept && (
                  <Badge variant="secondary" className="bg-slate-800 text-xs" style={{ color: dept.color }}>
                    {dept.name}
                  </Badge>
                )}
                <Badge variant="secondary" className={`text-xs ${employee.status === "ACTIVE" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                  {employee.status === "ACTIVE" ? (language === "ar" ? "نشط" : "Active") : employee.status}
                </Badge>
              </div>
            </div>
          </div>

          {employee.capabilities && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-slate-500 text-xs uppercase mb-2">{language === "ar" ? "القدرات" : "Capabilities"}</p>
              <div className="flex flex-wrap gap-1.5">
                {JSON.parse(employee.capabilities).map((cap: string, i: number) => (
                  <Badge key={i} variant="secondary" className="bg-slate-800/50 text-slate-300 text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Tokens Section */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              {language === "ar" ? "التوكنات والأكسس" : "Access Tokens"}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAddToken(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {language === "ar" ? "إضافة توكن" : "Add Token"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tokens.length === 0 && !showAddToken ? (
            <div className="text-center py-6">
              <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                {language === "ar" ? "لا توكنات — أضيف أكسس للمنصات" : "No tokens — add platform access"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map(token => (
                <div key={token.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <Key className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{platformLabel(token.platform)}</p>
                    <p className="text-slate-500 text-xs">{token.accessToken}</p>
                    {token.inheritedFromEmployeeId && (
                      <p className="text-emerald-400 text-xs mt-0.5">
                        {language === "ar" ? "ورث من موظف سابق" : "Inherited from previous employee"}
                      </p>
                    )}
                    {token.platformName && (
                      <p className="text-slate-400 text-xs">{token.platformName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleToken(token.id, !token.isActive)}
                      className={`w-3 h-3 rounded-full ${token.isActive ? "bg-green-500" : "bg-slate-600"}`}
                      title={token.isActive ? (language === "ar" ? "نشط" : "Active") : (language === "ar" ? "معطل" : "Inactive")}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteToken(token.id)}
                      className="text-red-400 hover:text-red-500 h-8 w-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddToken && (
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-3">
              <Select value={newTokenPlatform} onValueChange={setNewTokenPlatform}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder={language === "ar" ? "اختر المنصة" : "Select platform"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PLATFORM_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-white focus:bg-slate-700">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newTokenValue}
                onChange={e => setNewTokenValue(e.target.value)}
                placeholder={language === "ar" ? "Access Token / API Key" : "Access Token / API Key"}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
              <div className="flex gap-2">
                <Button onClick={handleAddToken} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  <Save className="w-3.5 h-3.5" />
                  {language === "ar" ? "حفظ" : "Save"}
                </Button>
                <Button variant="ghost" onClick={() => setShowAddToken(false)} className="text-slate-400 text-xs">
                  <X className="w-3.5 h-3.5" />
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Routing Section */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              {language === "ar" ? "توجيه الموديلات" : "Model Routing"}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAddRouting(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {language === "ar" ? "إضافة توجيه" : "Add Routing"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-slate-500 text-xs">
            {language === "ar"
              ? "كل موظف يستخدم موديل مختلف حسب نوع المهمة — المصمم للصور موديل، المحاسب للقرارات موديل"
              : "Each employee uses a different model per task type — designer for images, accountant for decisions"}
          </p>

          {routings.length === 0 && !showAddRouting ? (
            <div className="text-center py-4">
              <Cpu className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                {language === "ar" ? "لا توجيهات — يستخدم الموديل الافتراضي" : "No routing — uses default model"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {routings.map(routing => (
                <div key={routing.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <div className="flex-1">
                    <p className="text-white text-sm">{taskTypeLabel(routing.taskType)}</p>
                    <p className="text-slate-400 text-xs">
                      {routing.llmModel
                        ? `${routing.llmModel.name} (${routing.llmModel.provider})`
                        : (language === "ar" ? "موديل افتراضي" : "Default model")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRouting(routing.id)}
                    className="text-red-400 hover:text-red-500 h-8 w-8"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showAddRouting && (
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-3">
              <Select value={newRoutingTaskType} onValueChange={setNewRoutingTaskType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder={language === "ar" ? "نوع المهمة" : "Task type"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {TASK_TYPE_OPTIONS.map(tt => (
                    <SelectItem key={tt.value} value={tt.value} className="text-white focus:bg-slate-700">
                      {language === "ar" ? tt.labelAr : tt.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newRoutingModelId} onValueChange={setNewRoutingModelId}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder={language === "ar" ? "اختر الموديل" : "Select model"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {models.filter(m => m.isActive).map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-white focus:bg-slate-700">
                      {m.name} ({m.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleAddRouting} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  <Save className="w-3.5 h-3.5" />
                  {language === "ar" ? "حفظ" : "Save"}
                </Button>
                <Button variant="ghost" onClick={() => setShowAddRouting(false)} className="text-slate-400 text-xs">
                  <X className="w-3.5 h-3.5" />
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
