// ============================================
// نافذة إنشاء موظف جديد — النسخة الذكية
// يدعم: اسم + مسمى وظيفي + تخصص + قسم
// Theme-aware — respects light/dark mode
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { IEmployee, IDepartment } from "@/types"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface CreateEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, role: string, roleDescription?: string, departmentId?: string, specialization?: string) => void
  departments?: IDepartment[]
  employees?: IEmployee[]
}

const ROLE_SUGGESTION_KEYS = [
  "createEmployee.roleSuggestion.accountant",
  "createEmployee.roleSuggestion.socialMedia",
  "createEmployee.roleSuggestion.programmer",
  "createEmployee.roleSuggestion.designer",
  "createEmployee.roleSuggestion.marketing",
  "createEmployee.roleSuggestion.hr",
  "createEmployee.roleSuggestion.manager",
]

const DEFAULT_SPECIALIZATION_HINTS = [
  "إدارة متجر إلكتروني",
  "تعبية بيانات Excel",
  "محاسبة مالية",
  "سوشال ميديا",
  "مراقبة مخزون",
  "برمجة",
  "تصميم جرافيك",
  "تسويق رقمي",
  "خدمة عملاء",
  "إدارة مشاريع",
  "كتابة محتوى",
  "تحليل بيانات",
]

export function CreateEmployeeDialog({
  open,
  onOpenChange,
  onSubmit,
  departments = [],
  employees = [],
}: CreateEmployeeDialogProps) {
  const language = useLocale()

  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [roleDescription, setRoleDescription] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [specializationMode, setSpecializationMode] = useState<"select" | "new">("select")
  const [step, setStep] = useState<"name" | "role">("name")

  const existingSpecializations = (() => {
    const specs = employees
      .filter(e => e.specialization && e.specialization.trim())
      .map(e => e.specialization!.trim())
    return [...new Set(specs)].sort()
  })()

  const effectiveMode = existingSpecializations.length === 0 && specializationMode === "select"
    ? "new"
    : specializationMode

  const handleNameSubmit = () => {
    if (name.trim().length >= 2) {
      setStep("role")
    }
  }

  const handleRoleSubmit = () => {
    if (role.trim().length >= 2 && departmentId && specialization.trim().length >= 2) {
      onSubmit(
        name.trim(),
        role.trim(),
        roleDescription.trim() || undefined,
        departmentId,
        specialization.trim(),
      )
      setName("")
      setRole("")
      setRoleDescription("")
      setDepartmentId("")
      setSpecialization("")
      setSpecializationMode("select")
      setStep("name")
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setName("")
      setRole("")
      setRoleDescription("")
      setDepartmentId("")
      setSpecialization("")
      setSpecializationMode("select")
      setStep("name")
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-md max-h-[90vh] overflow-y-auto scrollbar-custom" dir={language === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "name" ? t("createEmployee.title", language) : t("createEmployee.role", language)}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === "name"
              ? t("createEmployee.namePlaceholder", language)
              : language === "ar"
                ? "حدد المسمى الوظيفي + التخصص + القسم — كل موظف تخصص واحد فقط لا يتجاوزه"
                : "Define the role + specialization + department — each employee has one specialization only"
            }
          </DialogDescription>
        </DialogHeader>

        {step === "name" ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">{t("createEmployee.name", language)}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                placeholder={t("createEmployee.namePlaceholder", language)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground text-lg py-3"
                autoFocus
              />
            </div>
            <Button
              onClick={handleNameSubmit}
              disabled={name.trim().length < 2}
              className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
            >
              {t("setupEmployee.next", language)}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* المسمى الوظيفي */}
            <div className="space-y-2">
              <Label className="text-foreground">{t("createEmployee.role", language)}</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={t("createEmployee.rolePlaceholder", language)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground text-lg py-3"
                autoFocus
              />
            </div>

            {/* اقتراحات المسمى */}
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                {language === "ar" ? "أو اختر من الاقتراحات:" : "Or choose a suggestion:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {ROLE_SUGGESTION_KEYS.map((key) => {
                  const label = t(key, language)
                  return (
                    <button
                      key={key}
                      onClick={() => setRole(label)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                        role === label
                          ? "bg-emerald-600 dark:bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* التخصص */}
            <div className="space-y-2">
              <Label className="text-emerald-600 dark:text-emerald-400 font-bold">
                {language === "ar" ? "التخصص (إجباري — تخصص واحد فقط)" : "Specialization (required — one only)"}
              </Label>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSpecializationMode("select")
                    setSpecialization("")
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    effectiveMode === "select"
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {language === "ar" ? "من التخصصات الموجودة" : "From existing"}
                </button>
                <button
                  onClick={() => {
                    setSpecializationMode("new")
                    setSpecialization("")
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    effectiveMode === "new"
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {language === "ar" ? "+ إضافة تخصص جديد" : "+ Add new specialization"}
                </button>
              </div>

              {effectiveMode === "select" && existingSpecializations.length > 0 ? (
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2.5"
                >
                  <option value="">
                    {language === "ar" ? "اختر تخصص..." : "Select specialization..."}
                  </option>
                  {existingSpecializations.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder={
                    language === "ar"
                      ? "أي تخصص تريده — مثلاً: إدارة متجر إلكتروني، تعبية Excel، مراقبة مخزون..."
                      : "Any specialization you want — e.g. e-commerce management, Excel data entry..."
                  }
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground text-lg py-3"
                  autoFocus={effectiveMode === "new"}
                />
              )}

              {effectiveMode === "new" && (
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_SPECIALIZATION_HINTS.map((spec) => (
                    <button
                      key={spec}
                      onClick={() => setSpecialization(spec)}
                      className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                        specialization === spec
                          ? "bg-emerald-600 dark:bg-emerald-500 text-white"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-amber-600 dark:text-amber-400/70 text-[10px]">
                {language === "ar"
                  ? "الموظف ما بيقدر يتجاوز تخصصو أبداً — لو انطلب منو شي برا تخصصو بيرفض ويوجّه للقسم المناسب"
                  : "The employee cannot exceed their specialization — if asked something outside it, they refuse and redirect"
                }
              </p>
            </div>

            {/* اختيار القسم */}
            <div className="space-y-2">
              <Label className="text-emerald-600 dark:text-emerald-400 font-bold">
                {language === "ar" ? "القسم (إجباري)" : "Department (required)"}
              </Label>
              {departments.length > 0 ? (
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2"
                >
                  <option value="">
                    {language === "ar" ? "اختر القسم..." : "Select department..."}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg p-3">
                  <p className="text-amber-700 dark:text-amber-400 text-xs">
                    {language === "ar"
                      ? "لازم تنشئ قسم أول قبل ما تضيف موظفين! روح لتبويب الأقسام وأنشئ قسم."
                      : "You must create a department first before adding employees! Go to the Departments tab."
                    }
                  </p>
                </div>
              )}
            </div>

            {/* وصف الدور */}
            <div className="space-y-2">
              <Label className="text-foreground">{t("createEmployee.roleDescription", language)}</Label>
              <Textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder={t("createEmployee.roleDescriptionPlaceholder", language)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground min-h-[60px] text-sm"
              />
              <p className="text-muted-foreground text-[10px]">
                {language === "ar"
                  ? "لو كتبت وصف، النظام رح يفهم شو بدك وبيقترح قدرات ناقصة"
                  : "If you write a description, the system will understand what you need and suggest missing capabilities"
                }
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("name")}
                className="border-border text-foreground"
              >
                {t("setupEmployee.prev", language)}
              </Button>
              <Button
                onClick={handleRoleSubmit}
                disabled={role.trim().length < 2 || !departmentId || specialization.trim().length < 2}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
              >
                {t("createEmployee.generate", language)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
