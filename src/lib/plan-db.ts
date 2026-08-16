// ============================================
// Server-side plan limits from database
// Reads from plan_configs table — changes in admin
// are reflected immediately (30s cache)
// ============================================

import { db } from "@/lib/db"

export interface PlanFromDB {
  name: string
  nameAr: string
  price: number
  tokenBudget: number
  maxEmployees: number
  maxDepartments: number
  features: string[]
  featuresEn: string[]
}

let cachedPlan: Record<string, PlanFromDB> | null = null
let cacheTime = 0
const CACHE_TTL = 30 * 1000 // 30 seconds

export async function getPlanFromDB(planKey: string): Promise<PlanFromDB | null> {
  const now = Date.now()
  if (cachedPlan && cachedPlan[planKey] && now - cacheTime < CACHE_TTL) {
    return cachedPlan[planKey]
  }

  try {
    // Fetch all plans and cache them
    const plans = await db.planConfig.findMany({
      where: { isActive: true },
    })

    cachedPlan = {}
    for (const plan of plans) {
      const features = typeof plan.features === "string" ? JSON.parse(plan.features) : plan.features || []
      const featuresEn = typeof plan.featuresEn === "string" ? JSON.parse(plan.featuresEn) : plan.featuresEn || []
      cachedPlan[plan.planKey] = {
        name: plan.name,
        nameAr: plan.nameAr,
        price: plan.price,
        tokenBudget: plan.tokenBudget,
        maxEmployees: plan.maxEmployees,
        maxDepartments: plan.maxDepartments,
        features,
        featuresEn,
      }
    }
    cacheTime = now

    return cachedPlan[planKey] || null
  } catch (error) {
    console.error("[getPlanFromDB_ERROR]", error)
    return null
  }
}

export function clearPlanDBCache() {
  cachedPlan = null
  cacheTime = 0
}
