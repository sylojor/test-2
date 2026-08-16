// ============================================
// Platform Activity Logger
// Helper function to log platform activities from API routes
//
// Usage:
//   import { logActivity } from "@/lib/activity-logger"
//   await logActivity({ action: "login", userId: user.id, userEmail: user.email, ... })
// ============================================

import { db } from "@/lib/db"

interface LogActivityParams {
  action: string
  userId?: string
  userEmail?: string
  userRole?: string
  ip?: string
  details?: string | Record<string, any>
  statusCode?: number
  path?: string
  method?: string
  userAgent?: string
  success?: boolean
  error?: string
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        action: params.action,
        userId: params.userId || null,
        userEmail: params.userEmail || null,
        userRole: params.userRole || null,
        ip: params.ip || null,
        details: typeof params.details === "object" ? JSON.stringify(params.details) : (params.details || null),
        statusCode: params.statusCode || 200,
        path: params.path || null,
        method: params.method || null,
        userAgent: params.userAgent || null,
        success: params.success ?? true,
        error: params.error || null,
      },
    })
  } catch (err) {
    // Activity logging should never break the main operation
    console.error("[Activity Logger] Failed to log:", err)
  }
}

// --- Get IP from request ---
export function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp.trim()
  return "unknown"
}

// --- Common action types ---
export const ACTIONS = {
  LOGIN: "login",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  REGISTER: "register",
  UPLOAD_LOGO: "upload_logo",
  UPLOAD_FAVICON: "upload_favicon",
  UPLOAD_BLOG_IMAGE: "upload_blog_image",
  CREATE_BLOG: "create_blog",
  UPDATE_BLOG: "update_blog",
  DELETE_BLOG: "delete_blog",
  CREATE_COMPANY: "create_company",
  CREATE_EMPLOYEE: "create_employee",
  UPDATE_SETTINGS: "update_settings",
  REBUILD: "rebuild",
  BLOCK_IP: "block_ip",
  UNBLOCK_IP: "unblock_ip",
  AUTO_BLOCK_IP: "auto_block_ip",
  UPDATE_LLM: "update_llm",
  CREATE_DEPARTMENT: "create_department",
  CREATE_PROJECT: "create_project",
  API_ERROR: "api_error",
}
