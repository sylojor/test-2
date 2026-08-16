"use client"

// ============================================
// PlansTab — إدارة الخطط (صاحب المنصة)
// PRIMARY admin tool for managing subscription plans
// ============================================

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Plus, Trash2, Save, Loader2, Edit3, Check, X,
  CreditCard, RefreshCw, AlertTriangle,
} from "lucide-react"

// --- Types ---
interface PlanConfigType {
  id: string
  planKey: string
  name: string
  nameAr: string
  price: number
  tokenBudget: number
  maxEmployees: number
  maxDepartments: number
  features: string
  featuresEn: string
  isActive: boolean
  order: number
}

// --- Fallback Plans (only used when API completely fails) ---
const PLANS_FALLBACK: PlanConfigType[] = [
  { id: "fb-1", planKey: "FREE_TRIAL", name: "Free Trial", nameAr: "تجربة مجانية", price: 0, tokenBudget: 500000, maxEmployees: 2, maxDepartments: 1, features: JSON.stringify(["500K توكن شهرياً","قسم واحد فقط","موظفين اثنين فقط","محادثة مباشرة مع الموظف","دعم كل اللهجات"]), featuresEn: JSON.stringify(["500K tokens/month","1 department only","2 employees only","Direct chat with employees","All dialects supported"]), isActive: true, order: 0 },
  { id: "fb-2", planKey: "STARTER", name: "Starter", nameAr: "أساسي", price: 29, tokenBudget: 3000000, maxEmployees: 5, maxDepartments: 3, features: JSON.stringify(["3M توكن شهرياً","3 أقسام","5 موظفين","محادثة بين الموظفين","أقسام ومشاريع","شحن توكنات إضافية"]), featuresEn: JSON.stringify(["3M tokens/month","3 departments","5 employees","Employee cross-chat","Departments & Projects","Extra token top-ups"]), isActive: true, order: 1 },
  { id: "fb-3", planKey: "PROFESSIONAL", name: "Professional", nameAr: "احترافي", price: 79, tokenBudget: 15000000, maxEmployees: 15, maxDepartments: 10, features: JSON.stringify(["15M توكن شهرياً","10 أقسام","15 موظف","محادثة بين الأقسام","رفع ملفات وطلبات","تقارير متقدمة","شحن توكنات إضافية"]), featuresEn: JSON.stringify(["15M tokens/month","10 departments","15 employees","Cross-department chat","File uploads & requests","Advanced reports","Extra token top-ups"]), isActive: true, order: 2 },
  { id: "fb-4", planKey: "ENTERPRISE", name: "Enterprise", nameAr: "مؤسسي", price: 199, tokenBudget: 50000000, maxEmployees: 999999, maxDepartments: 999999, features: JSON.stringify(["50M توكن شهرياً","أقسام غير محدودة","موظفين غير محدودين","كل الميزات","أولوية بالدعم","شحن توكنات إضافية بسعر مخفض"]), featuresEn: JSON.stringify(["50M tokens/month","Unlimited departments","Unlimited employees","All features","Priority support","Discounted token top-ups"]), isActive: true, order: 3 },
]

const PLAN_COLORS: Record<string, string> = {
  FREE_TRIAL: "bg-muted text-muted-foreground",
  STARTER: "bg-brand/10 text-brand",
  PROFESSIONAL: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  ENTERPRISE: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
}

const PLAN_BORDER_COLORS: Record<string, string> = {
  FREE_TRIAL: "border-muted/50",
  STARTER: "border-brand/30",
  PROFESSIONAL: "border-sky-300/50 dark:border-sky-700/30",
  ENTERPRISE: "border-violet-300/50 dark:border-violet-700/30",
}

function parseFeatures(jsonStr: string): string[] {
  try { return JSON.parse(jsonStr) } catch { return [] }
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function formatNumber(n: number) {
  return n.toLocaleString()
}

// ============================================
// PlansTab Component
// ============================================
export function PlansTab({ lang }: { lang: "ar" | "en" }) {
  const [plans, setPlans] = useState<PlanConfigType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<PlanConfigType | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [newPlan, setNewPlan] = useState({
    planKey: "", name: "", nameAr: "", price: 0,
    tokenBudget: 500000, maxEmployees: 2, maxDepartments: 1,
    features: [] as string[], featuresEn: [] as string[],
    isActive: true, order: 0,
  })
  const [newFeatureAr, setNewFeatureAr] = useState("")
  const [newFeatureEn, setNewFeatureEn] = useState("")
  const [editFeatureAr, setEditFeatureAr] = useState("")
  const [editFeatureEn, setEditFeatureEn] = useState("")

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setIsFallback(false)
    try {
      const res = await fetch("/api/admin/plans")
      if (res.ok) {
        const data = await res.json()
        const apiPlans = data.plans || []
        if (apiPlans.length > 0) {
          setPlans(apiPlans)
        } else {
          setPlans(PLANS_FALLBACK)
          setIsFallback(true)
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error("[PlansTab] API error:", res.status, errorData)
        setPlans(PLANS_FALLBACK)
        setIsFallback(true)
        if (res.status === 401) {
          toast.error(lang === "ar" ? "غير مصرح — سجّل دخولك كمشرف" : "Unauthorized — please log in as admin")
        }
      }
    } catch (err) {
      console.error("[PlansTab] Network error:", err)
      setPlans(PLANS_FALLBACK)
      setIsFallback(true)
    } finally { setLoading(false) }
  }, [lang])

  useEffect(() => { loadPlans() }, [loadPlans])

  async function savePlan(plan: PlanConfigType, updatedData: Record<string, unknown>) {
    setSaving(plan.id)
    try {
      const res = await fetch("/api/admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plan.id, data: updatedData }),
      })
      if (res.ok) {
        toast.success(lang === "ar" ? "تم تحديث الخطة بنجاح" : "Plan updated successfully")
        loadPlans()
        setEditingPlan(null)
      } else {
        const data = await res.json().catch(() => ({}))
        const errMsg = data.error || (lang === "ar" ? "فشل التحديث" : "Update failed")
        toast.error(errMsg)
        console.error("[PlansTab] Save error:", res.status, data)
      }
    } catch (err) {
      console.error("[PlansTab] Save network error:", err)
      toast.error(lang === "ar" ? "خطأ في الاتصال — تحقق من الإنترنت" : "Connection error — check your internet")
    } finally { setSaving(null) }
  }

  async function addPlan() {
    if (!newPlan.planKey || !newPlan.name || !newPlan.nameAr) {
      toast.error(lang === "ar" ? "مفتاح الخطة والاسم مطلوبان" : "Plan key and name are required")
      return
    }
    setSaving("new")
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      })
      if (res.ok) {
        toast.success(lang === "ar" ? "تم إضافة الخطة بنجاح" : "Plan added successfully")
        setShowAddForm(false)
        setNewPlan({
          planKey: "", name: "", nameAr: "", price: 0,
          tokenBudget: 500000, maxEmployees: 2, maxDepartments: 1,
          features: [], featuresEn: [], isActive: true, order: plans.length,
        })
        loadPlans()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || (lang === "ar" ? "فشل الإضافة" : "Add failed"))
      }
    } catch (err) {
      console.error("[PlansTab] Add network error:", err)
      toast.error(lang === "ar" ? "خطأ في الاتصال" : "Connection error")
    } finally { setSaving(null) }
  }

  async function deletePlan(plan: PlanConfigType) {
    if (!confirm(lang === "ar" ? "هل أنت متأكد من حذف هذه الخطة؟" : "Are you sure you want to delete this plan?")) return
    setSaving(plan.id)
    try {
      const res = await fetch(`/api/admin/plans?id=${plan.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success(lang === "ar" ? "تم حذف الخطة" : "Plan deleted")
        loadPlans()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || (lang === "ar" ? "فشل الحذف" : "Delete failed"))
      }
    } catch (err) {
      console.error("[PlansTab] Delete network error:", err)
      toast.error(lang === "ar" ? "خطأ في الاتصال" : "Connection error")
    } finally { setSaving(null) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" />
          <p className="text-sm text-muted-foreground">
            {lang === "ar" ? "جاري تحميل الخطط..." : "Loading plans..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Prominent Header */}
      <div className="bg-gradient-to-r from-brand/5 via-brand/10 to-brand/5 rounded-xl p-5 border border-brand/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {lang === "ar" ? "إدارة الخطط والاشتراكات" : "Plans & Subscriptions Management"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {lang === "ar" ? "تحكم بأسعار ومزايا وتوكنات كل خطة — التغييرات تُطبّق فوراً" : "Control prices, features, and tokens for each plan — changes apply instantly"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button onClick={loadPlans} size="sm" variant="outline" className="border-brand/30 text-brand hover:bg-brand/10">
              <RefreshCw className="w-4 h-4 mr-1" />
              {lang === "ar" ? "تحديث" : "Refresh"}
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" className="bg-brand hover:bg-brand-dark text-white">
              <Plus className="w-4 h-4 mr-1" />
              {lang === "ar" ? "إضافة خطة جديدة" : "Add New Plan"}
            </Button>
          </div>
        </div>
      </div>

      {/* Fallback Warning */}
      {isFallback && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {lang === "ar" ? "خطط افتراضية — غير متصلة بقاعدة البيانات" : "Fallback plans — not connected to database"}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {lang === "ar" ? "التعديلات لن تُحفظ. تأكد من تسجيل الدخول كمشرف." : "Edits won't be saved. Make sure you're logged in as admin."}
            </p>
          </div>
        </div>
      )}

      {/* Add Plan Form */}
      {showAddForm && (
        <Card className="bg-card border-brand/30 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand" />
              {lang === "ar" ? "خطة جديدة" : "New Plan"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{lang === "ar" ? "مفتاح الخطة (بالإنجليزي)" : "Plan Key (English)"}</Label>
                <Input value={newPlan.planKey} onChange={e => setNewPlan(p => ({ ...p, planKey: e.target.value.toUpperCase().replace(/\s+/g, "_") }))} placeholder="e.g. PREMIUM" className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{lang === "ar" ? "السعر الشهري ($)" : "Monthly Price ($)"}</Label>
                <Input type="number" value={newPlan.price} onChange={e => setNewPlan(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{lang === "ar" ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                <Input value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Premium" className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{lang === "ar" ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                <Input value={newPlan.nameAr} onChange={e => setNewPlan(p => ({ ...p, nameAr: e.target.value }))} placeholder="مثال: مميز" className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{lang === "ar" ? "ميزانية التوكنات الشهرية" : "Monthly Token Budget"}</Label>
                <Input type="number" value={newPlan.tokenBudget} onChange={e => setNewPlan(p => ({ ...p, tokenBudget: parseInt(e.target.value) || 500000 }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{lang === "ar" ? "أقصى عدد موظفين" : "Max Employees"}</Label>
                <Input type="number" value={newPlan.maxEmployees} onChange={e => setNewPlan(p => ({ ...p, maxEmployees: parseInt(e.target.value) || 2 }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{lang === "ar" ? "أقصى عدد أقسام" : "Max Departments"}</Label>
                <Input type="number" value={newPlan.maxDepartments} onChange={e => setNewPlan(p => ({ ...p, maxDepartments: parseInt(e.target.value) || 1 }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center gap-2 pb-1">
                  <Switch checked={newPlan.isActive} onCheckedChange={v => setNewPlan(p => ({ ...p, isActive: v }))} />
                  <Label className="text-xs font-medium">{lang === "ar" ? "خطة متاحة" : "Plan Active"}</Label>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{lang === "ar" ? "المزايا" : "Features"}</Label>
              <div className="flex gap-2">
                <Input value={newFeatureAr} onChange={e => setNewFeatureAr(e.target.value)} placeholder={lang === "ar" ? "ميزة بالعربي" : "Feature (Arabic)"} className="h-9 text-sm flex-1"
                  onKeyDown={e => { if (e.key === "Enter" && newFeatureAr.trim()) { setNewPlan(p => ({ ...p, features: [...p.features, newFeatureAr.trim()], featuresEn: [...p.featuresEn, newFeatureEn.trim() || newFeatureAr.trim()] })); setNewFeatureAr(""); setNewFeatureEn("") } }}
                />
                <Input value={newFeatureEn} onChange={e => setNewFeatureEn(e.target.value)} placeholder="Feature (English)" className="h-9 text-sm flex-1"
                  onKeyDown={e => { if (e.key === "Enter" && newFeatureAr.trim()) { setNewPlan(p => ({ ...p, features: [...p.features, newFeatureAr.trim()], featuresEn: [...p.featuresEn, newFeatureEn.trim() || newFeatureAr.trim()] })); setNewFeatureAr(""); setNewFeatureEn("") } }}
                />
                <Button size="sm" variant="outline" onClick={() => { if (newFeatureAr.trim()) { setNewPlan(p => ({ ...p, features: [...p.features, newFeatureAr.trim()], featuresEn: [...p.featuresEn, newFeatureEn.trim() || newFeatureAr.trim()] })); setNewFeatureAr(""); setNewFeatureEn("") } }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newPlan.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {newPlan.features.map((f, i) => (
                    <Badge key={i} variant="outline" className="text-xs gap-1 pr-1">
                      {f}
                      <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setNewPlan(p => ({ ...p, features: p.features.filter((_, j) => j !== i), featuresEn: p.featuresEn.filter((_, j) => j !== i) }))} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={addPlan} size="sm" className="bg-brand hover:bg-brand-dark text-white" disabled={saving === "new"}>
                {saving === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === "ar" ? "إضافة الخطة" : "Add Plan")}
              </Button>
              <Button onClick={() => setShowAddForm(false)} size="sm" variant="outline">
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{lang === "ar" ? "لا خطط بعد — أضف خطة جديدة" : "No plans yet — add a new plan"}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map(plan => {
            const featuresList = parseFeatures(plan.features)
            const featuresEnList = parseFeatures(plan.featuresEn)
            const isEditing = editingPlan?.id === plan.id

            return (
              <Card key={plan.id} className={`bg-card border-2 transition-all ${PLAN_BORDER_COLORS[plan.planKey] || "border-border"} ${!plan.isActive ? "opacity-50" : "hover:shadow-lg"}`}>
                <CardContent className="p-5 space-y-4">
                  {/* Plan Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${PLAN_COLORS[plan.planKey] || "bg-brand/10 text-brand"}`}>
                          {plan.planKey}
                        </Badge>
                        {!plan.isActive && (
                          <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">
                            {lang === "ar" ? "معطّلة" : "Inactive"}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-semibold">{lang === "ar" ? plan.nameAr : plan.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-brand">
                        {plan.price === 0 ? (lang === "ar" ? "مجاني" : "Free") : `$${plan.price}`}
                      </p>
                      {plan.price > 0 && <p className="text-xs text-muted-foreground">/{lang === "ar" ? "شهر" : "month"}</p>}
                    </div>
                  </div>

                  {/* Plan Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">{lang === "ar" ? "التوكنات" : "Tokens"}</p>
                      <p className="text-sm font-semibold">{formatTokens(plan.tokenBudget)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatNumber(plan.tokenBudget)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">{lang === "ar" ? "الموظفين" : "Employees"}</p>
                      <p className="text-sm font-semibold">{plan.maxEmployees >= 999999 ? "∞" : plan.maxEmployees}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">{lang === "ar" ? "الأقسام" : "Depts"}</p>
                      <p className="text-sm font-semibold">{plan.maxDepartments >= 999999 ? "∞" : plan.maxDepartments}</p>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{lang === "ar" ? "المزايا:" : "Features:"}</p>
                    <div className="space-y-1">
                      {(lang === "ar" ? featuresList : featuresEnList).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Edit Mode */}
                  {isEditing && (
                    <div className="space-y-4 pt-3 border-t border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{lang === "ar" ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                          <Input value={editingPlan.name} onChange={e => setEditingPlan(p => p ? { ...p, name: e.target.value } : p)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{lang === "ar" ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                          <Input value={editingPlan.nameAr} onChange={e => setEditingPlan(p => p ? { ...p, nameAr: e.target.value } : p)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{lang === "ar" ? "السعر ($)" : "Price ($)"}</Label>
                          <Input type="number" value={editingPlan.price} onChange={e => setEditingPlan(p => p ? { ...p, price: parseFloat(e.target.value) || 0 } : p)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{lang === "ar" ? "ميزانية التوكنات" : "Token Budget"}</Label>
                          <Input type="number" value={editingPlan.tokenBudget} onChange={e => setEditingPlan(p => p ? { ...p, tokenBudget: parseInt(e.target.value) || 500000 } : p)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{lang === "ar" ? "أقصى موظفين" : "Max Employees"}</Label>
                          <Input type="number" value={editingPlan.maxEmployees} onChange={e => setEditingPlan(p => p ? { ...p, maxEmployees: parseInt(e.target.value) || 2 } : p)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{lang === "ar" ? "أقصى أقسام" : "Max Departments"}</Label>
                          <Input type="number" value={editingPlan.maxDepartments} onChange={e => setEditingPlan(p => p ? { ...p, maxDepartments: parseInt(e.target.value) || 1 } : p)} className="h-8 text-sm" />
                        </div>
                      </div>

                      {/* Edit Features */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">{lang === "ar" ? "المزايا" : "Features"}</Label>
                        <div className="flex gap-2">
                          <Input value={editFeatureAr} onChange={e => setEditFeatureAr(e.target.value)} placeholder={lang === "ar" ? "ميزة بالعربي" : "Feature (Arabic)"} className="h-8 text-sm flex-1"
                            onKeyDown={e => { if (e.key === "Enter" && editFeatureAr.trim()) { setEditingPlan(p => p ? { ...p, features: JSON.stringify([...parseFeatures(p.features), editFeatureAr.trim()]), featuresEn: JSON.stringify([...parseFeatures(p.featuresEn), editFeatureEn.trim() || editFeatureAr.trim()]) } : p); setEditFeatureAr(""); setEditFeatureEn("") } }}
                          />
                          <Input value={editFeatureEn} onChange={e => setEditFeatureEn(e.target.value)} placeholder="Feature (English)" className="h-8 text-sm flex-1"
                            onKeyDown={e => { if (e.key === "Enter" && editFeatureAr.trim()) { setEditingPlan(p => p ? { ...p, features: JSON.stringify([...parseFeatures(p.features), editFeatureAr.trim()]), featuresEn: JSON.stringify([...parseFeatures(p.featuresEn), editFeatureEn.trim() || editFeatureAr.trim()]) } : p); setEditFeatureAr(""); setEditFeatureEn("") } }}
                          />
                          <Button size="sm" variant="outline" className="h-8" onClick={() => { if (editFeatureAr.trim()) { setEditingPlan(p => p ? { ...p, features: JSON.stringify([...parseFeatures(p.features), editFeatureAr.trim()]), featuresEn: JSON.stringify([...parseFeatures(p.featuresEn), editFeatureEn.trim() || editFeatureAr.trim()]) } : p); setEditFeatureAr(""); setEditFeatureEn("") } }}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        {parseFeatures(editingPlan.features).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {parseFeatures(editingPlan.features).map((f, i) => (
                              <Badge key={i} variant="outline" className="text-xs gap-1 pr-1">
                                {f}
                                <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setEditingPlan(p => p ? { ...p, features: JSON.stringify(parseFeatures(p.features).filter((_, j) => j !== i)), featuresEn: JSON.stringify(parseFeatures(p.featuresEn).filter((_, j) => j !== i)) } : p)} />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Active Toggle */}
                      <div className="flex items-center gap-2">
                        <Switch checked={editingPlan.isActive} onCheckedChange={v => setEditingPlan(p => p ? { ...p, isActive: v } : p)} />
                        <Label className="text-xs font-medium">{lang === "ar" ? "خطة متاحة" : "Plan Active"}</Label>
                      </div>

                      {/* Save / Cancel */}
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-brand hover:bg-brand-dark text-white" disabled={saving === plan.id} onClick={() => { savePlan(plan, { name: editingPlan.name, nameAr: editingPlan.nameAr, price: editingPlan.price, tokenBudget: editingPlan.tokenBudget, maxEmployees: editingPlan.maxEmployees, maxDepartments: editingPlan.maxDepartments, features: parseFeatures(editingPlan.features), featuresEn: parseFeatures(editingPlan.featuresEn), isActive: editingPlan.isActive }) }}>
                          {saving === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                          {lang === "ar" ? "حفظ التغييرات" : "Save Changes"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}>
                          {lang === "ar" ? "إلغاء" : "Cancel"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isEditing && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingPlan(plan)} className="text-xs border-brand/30 text-brand hover:bg-brand/10">
                        <Edit3 className="w-3 h-3 mr-1" />
                        {lang === "ar" ? "تعديل الخطة" : "Edit Plan"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deletePlan(plan)} className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-3 h-3 mr-1" />
                        {lang === "ar" ? "حذف" : "Delete"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
