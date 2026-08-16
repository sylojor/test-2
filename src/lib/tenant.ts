// ============================================
// Multi-Tenant Isolation — CRITICAL SECURITY HELPERS
// ============================================
// Every API route MUST use these helpers.
// Tenant context comes ONLY from the authenticated JWT.
// NEVER trust client-supplied companyId, employeeId, etc.
// ============================================

import { db } from "@/lib/db"
import type { JWTPayload } from "./auth"
import { forbiddenResponse } from "./auth"

/**
 * Get the authenticated user's companyId from JWT.
 * Use this INSTEAD of reading companyId from query/body.
 */
export function getAuthCompanyId(auth: JWTPayload): string | Response {
  if (!auth.companyId) {
    return forbiddenResponse("المستخدم لا ينتمي لأي شركة")
  }
  return auth.companyId
}

/**
 * Verify that a requested companyId matches the JWT's companyId.
 */
export function requireCompanyAccess(
  auth: JWTPayload,
  requestedCompanyId: string
): string | Response {
  if (!auth.companyId) {
    return forbiddenResponse("المستخدم لا ينتمي لأي شركة")
  }
  if (auth.companyId !== requestedCompanyId) {
    return forbiddenResponse("ليس لديك صلاحية الوصول لهذه الشركة")
  }
  return requestedCompanyId
}

/**
 * Verify that a resource (by model name and ID) belongs to the user's company.
 */
export async function requireResourceAccess(
  modelName: string,
  resourceId: string,
  authCompanyId: string
): Promise<true | Response> {
  try {
    // @ts-expect-error — dynamic Prisma model for tenant check
    const resource = await db[modelName].findUnique({
      where: { id: resourceId },
      select: { companyId: true },
    })
    if (!resource) {
      return new Response(
        JSON.stringify({ error: "المورد غير موجود" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }
    if (resource.companyId !== authCompanyId) {
      return forbiddenResponse("ليس لديك صلاحية الوصول لهذا المورد")
    }
    return true
  } catch (error) {
    console.error(`[TENANT] Resource check failed:`, error)
    return forbiddenResponse("خطأ في التحقق من الصلاحية")
  }
}

/**
 * Require specific roles.
 */
export function requireRole(auth: JWTPayload, roles: string[]): true | Response {
  if (!roles.includes(auth.role)) {
    return forbiddenResponse("ليس لديك الصلاحية المطلوبة لهذا الإجراء")
  }
  return true
}
