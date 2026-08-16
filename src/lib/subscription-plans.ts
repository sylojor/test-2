// ============================================
// ثوابت خطط الاشتراك — ملف منفصل بدون أي import من db
//
// هذا الملف يستخدم في مكونات Client-side
// فلا يمكنه استورد PrismaClient (Node.js-only)
//
// القيم هنا هي الافتراضية — لو في بيانات بالداتابيز
// (PlanConfig) بتغلب هاد الملف
// ============================================

import type { SubscriptionPlan } from "@/types"

// --- نوع تفاصيل الخطة ---
export interface PlanDetail {
  name: string
  nameAr: string
  price: number
  priceDisplay: string
  tokenBudget: number
  maxEmployees: number
  maxDepartments: number
  features: string[]
  featuresAr?: string[]
  featuresEn?: string[]
}

// --- تفاصيل خطط الاشتراك (الافتراضية) ---
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanDetail> = {
  FREE_TRIAL: {
    name: "Free Trial",
    nameAr: "تجربة مجانية",
    price: 0,
    priceDisplay: "Free",
    tokenBudget: 500_000,
    maxEmployees: 2,
    maxDepartments: 1,
    features: [
      "500K tokens/month",
      "1 department only",
      "2 employees only",
      "Direct chat with employees",
      "All dialects supported",
    ],
    featuresAr: [
      "500K توكن شهرياً",
      "قسم واحد فقط",
      "موظفين اثنين فقط",
      "محادثة مباشرة مع الموظف",
      "دعم كل اللهجات",
    ],
    featuresEn: [
      "500K tokens/month",
      "1 department only",
      "2 employees only",
      "Direct chat with employees",
      "All dialects supported",
    ],
  },
  STARTER: {
    name: "Starter",
    nameAr: "أساسي",
    price: 29,
    priceDisplay: "$29/mo",
    tokenBudget: 3_000_000,
    maxEmployees: 5,
    maxDepartments: 3,
    features: [
      "3M tokens/month",
      "3 departments",
      "5 employees",
      "Employee cross-chat",
      "Departments & Projects",
      "Extra token top-ups",
    ],
    featuresAr: [
      "3M توكن شهرياً",
      "3 أقسام",
      "5 موظفين",
      "محادثة بين الموظفين",
      "أقسام ومشاريع",
      "شحن توكنات إضافية",
    ],
    featuresEn: [
      "3M tokens/month",
      "3 departments",
      "5 employees",
      "Employee cross-chat",
      "Departments & Projects",
      "Extra token top-ups",
    ],
  },
  PROFESSIONAL: {
    name: "Professional",
    nameAr: "احترافي",
    price: 79,
    priceDisplay: "$79/mo",
    tokenBudget: 15_000_000,
    maxEmployees: 15,
    maxDepartments: 10,
    features: [
      "15M tokens/month",
      "10 departments",
      "15 employees",
      "Cross-department chat",
      "File uploads & requests",
      "Advanced reports",
      "Extra token top-ups",
    ],
    featuresAr: [
      "15M توكن شهرياً",
      "10 أقسام",
      "15 موظف",
      "محادثة بين الأقسام",
      "رفع ملفات وطلبات",
      "تقارير متقدمة",
      "شحن توكنات إضافية",
    ],
    featuresEn: [
      "15M tokens/month",
      "10 departments",
      "15 employees",
      "Cross-department chat",
      "File uploads & requests",
      "Advanced reports",
      "Extra token top-ups",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    nameAr: "مؤسسي",
    price: 199,
    priceDisplay: "$199/mo",
    tokenBudget: 50_000_000,
    maxEmployees: 999999,
    maxDepartments: 999999,
    features: [
      "50M tokens/month",
      "Unlimited departments",
      "Unlimited employees",
      "All features",
      "Priority support",
      "Discounted token top-ups",
    ],
    featuresAr: [
      "50M توكن شهرياً",
      "أقسام غير محدودة",
      "موظفين غير محدودين",
      "كل الميزات",
      "أولوية بالدعم",
      "شحن توكنات إضافية بسعر مخفض",
    ],
    featuresEn: [
      "50M tokens/month",
      "Unlimited departments",
      "Unlimited employees",
      "All features",
      "Priority support",
      "Discounted token top-ups",
    ],
  },
}

// --- جلب الخطط من الـ API (ديناميكي) ---
let cachedPlans: Record<string, PlanDetail> | null = null
let cacheTime = 0
const CACHE_TTL = 30 * 1000 // 30 ثانية — عشان التعديلات من الأدمين تنعكس بسرعة

export async function getPlansFromAPI(): Promise<Record<string, PlanDetail>> {
  const now = Date.now()
  if (cachedPlans && now - cacheTime < CACHE_TTL) {
    return cachedPlans
  }

  try {
    const res = await fetch("/api/plans")
    if (res.ok) {
      const data = await res.json()
      const plans: Record<string, PlanDetail> = {}

      for (const plan of data.plans || []) {
        const features = typeof plan.features === "string" ? JSON.parse(plan.features) : plan.features
        const featuresEn = typeof plan.featuresEn === "string" ? JSON.parse(plan.featuresEn) : plan.featuresEn

        plans[plan.planKey] = {
          name: plan.name,
          nameAr: plan.nameAr,
          price: plan.price,
          priceDisplay: plan.price === 0 ? 'Free' : `$${plan.price}/mo`,
          tokenBudget: plan.tokenBudget,
          maxEmployees: plan.maxEmployees,
          maxDepartments: plan.maxDepartments,
          features: features || [],
          featuresAr: plan.featuresAr || features || [],
          featuresEn: featuresEn || [],
        }
      }

      cachedPlans = plans
      cacheTime = now
      return plans
    }
  } catch {
    // fallback to hardcoded
  }

  return SUBSCRIPTION_PLANS
}

// --- تنظيف الكاش ---
export function clearPlansCache() {
  cachedPlans = null
  cacheTime = 0
}

// --- أسعار شحن التوكنات ---
export const TOKEN_ADD_ON_PACKAGES = [
  { tokens: 1_000_000, price: 5, label: "1M tokens - $5" },
  { tokens: 5_000_000, price: 20, label: "5M tokens - $20" },
  { tokens: 10_000_000, price: 35, label: "10M tokens - $35" },
  { tokens: 50_000_000, price: 150, label: "50M tokens - $150" },
]
