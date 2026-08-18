// ============================================
// Demo Mode — Global Fetch Interceptor
// Intercepts all /api/* calls and returns mock data
// NO production API calls are made in demo mode
// ============================================

import {
  DEMO_COMPANY, DEMO_EMPLOYEES, DEMO_DEPARTMENTS, DEMO_PROJECTS,
  DEMO_WORK_ORDERS, DEMO_CONVERSATIONS, DEMO_GITHUB_REPO,
} from "./demo-data"
import type { IWorkOrder, IConversation, IMessage } from "@/types"
import type { Locale } from "@/lib/i18n-config"

let _lang: string = "en"
export function setDemoLang(lang: string) { _lang = lang }

// Unique IDs for demo
const DEMO_USER_ID = "demo-user"
const DEMO_CONV_ID = "conv-1"

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function emptyOk(): Response {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

function demoToastResponse(): Response {
  const msg = _lang === "ar"
    ? "\u0648\u0636\u0639 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062a\u062c\u0631\u064a\u0628\u064a \u2014 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0645\u062a\u0627\u062d \u0641\u064a \u0627\u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u0631\u0633\u0645\u064a \u0641\u0642\u0637\u060c \u0648\u0644\u0646 \u064a\u062a\u0645 \u062a\u0646\u0641\u064a\u0630 \u0623\u064a \u062a\u063a\u064a\u064a\u0631 \u0641\u0639\u0644\u064a \u0647\u0646\u0627."
    : "Demo Mode \u2014 This action is available in the official account and will not be executed in this demo."
  return jsonResponse({ error: msg, demoMode: true }, 400)
}

// Parse URL to extract pathname and query params
function parseUrl(url: string): { pathname: string; search: string } {
  try {
    const u = new URL(url, "http://localhost")
    return { pathname: u.pathname, search: u.search }
  } catch {
    // Relative URL
    const [path, search] = url.split("?")
    return { pathname: path, search: search ? `?${search}` : "" }
  }
}

function getQueryParam(search: string, key: string): string | null {
  const params = new URLSearchParams(search)
  return params.get(key)
}

// Main interceptor function
export function createDemoFetchInterceptor(): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    const { pathname, search } = parseUrl(url)
    const method = (init?.method || "GET").toUpperCase()

    // Only intercept /api/* calls
    if (!pathname.startsWith("/api/")) {
      return originalFetch(input, init)
    }

    console.log(`[Demo Fetch] ${method} ${pathname}${search}`)

    // ---- GET endpoints (read data) ----
    if (method === "GET") {
      // Work Orders
      if (pathname === "/api/work-orders") {
        return jsonResponse({ workOrders: DEMO_WORK_ORDERS })
      }

      // Single Work Order
      if (pathname.startsWith("/api/work-orders/")) {
        const id = pathname.split("/").pop()
        const wo = DEMO_WORK_ORDERS.find(w => w.id === id)
        return wo ? jsonResponse(wo) : jsonResponse({ error: "Not found" }, 404)
      }

      // Meetings — panel expects { meetings: [...] } with scheduledAt, departmentIds as JSON string, participantIds as JSON string
      if (pathname === "/api/meetings") {
        return jsonResponse({ meetings: DEMO_MOCK_MEETINGS })
      }

      // HR
      if (pathname === "/api/hr") {
        return jsonResponse({ requests: [], policies: DEMO_MOCK_HR_POLICIES, leaves: DEMO_MOCK_LEAVES })
      }

      // Token Budget — panel expects { budget: {...}, plans: {...} }
      if (pathname === "/api/token-budget") {
        const companyId = getQueryParam(search, "companyId") || "demo-co"
        const budget = {
          companyId,
          subscription: DEMO_COMPANY.subscription,
          monthly: DEMO_COMPANY.tokenBudgetMonthly,
          used: DEMO_COMPANY.tokenUsedMonthly,
          percentUsed: DEMO_COMPANY.tokenUsedMonthly / DEMO_COMPANY.tokenBudgetMonthly,
          remaining: DEMO_COMPANY.tokenBudgetMonthly - DEMO_COMPANY.tokenUsedMonthly,
          alertLevel: "normal" as const,
          addOnsPurchased: DEMO_COMPANY.tokenAddOnsPurchased,
          addOnsRemaining: 0,
          addOnsUsed: DEMO_COMPANY.tokenAddOnsUsed,
          canOperate: true,
          resetAt: DEMO_COMPANY.tokenBudgetResetAt,
          dailyUsage: DEMO_MOCK_DAILY_USAGE,
          byDepartment: { "dept-eng": Math.floor(DEMO_COMPANY.tokenUsedMonthly * 0.5), "dept-mkt": Math.floor(DEMO_COMPANY.tokenUsedMonthly * 0.2), "dept-sales": Math.floor(DEMO_COMPANY.tokenUsedMonthly * 0.1), "dept-cs": Math.floor(DEMO_COMPANY.tokenUsedMonthly * 0.1), "dept-hr": Math.floor(DEMO_COMPANY.tokenUsedMonthly * 0.1) },
          byEmployee: {},
        }
        return jsonResponse({ budget, plans: {} })
      }

      // Invoices — panel expects { invoices, total, page, limit } with proper fields
      if (pathname === "/api/invoices") {
        return jsonResponse({ invoices: DEMO_MOCK_INVOICES, total: DEMO_MOCK_INVOICES.length, page: 1, limit: 20 })
      }

      // API Keys — panel expects { keys: [...] } with full key fields
      if (pathname === "/api/api-keys") {
        return jsonResponse({ keys: DEMO_MOCK_API_KEYS })
      }

      // Decisions
      if (pathname === "/api/decisions") {
        return jsonResponse({ decisions: [] })
      }

      // Employee Requests
      if (pathname === "/api/employee-requests") {
        return jsonResponse({ requests: [] })
      }

      // Companies (me) - used by settings, requests panels
      if (pathname === "/api/companies/me") {
        return jsonResponse(DEMO_COMPANY)
      }

      // Conversations list
      if (pathname === "/api/conversations") {
        return jsonResponse({ conversations: DEMO_CONVERSATIONS })
      }

      // Single conversation
      if (pathname.startsWith("/api/conversations/") && !pathname.includes("/messages")) {
        const conv = DEMO_CONVERSATIONS[0]
        return jsonResponse(conv)
      }

      // Employees list
      if (pathname === "/api/employees" || pathname === "/api/employees/list") {
        return jsonResponse({ employees: DEMO_EMPLOYEES })
      }

      // Single employee
      if (pathname.startsWith("/api/employees/") && !pathname.includes("/capabilities")) {
        const id = pathname.split("/").filter(Boolean).pop()
        const emp = DEMO_EMPLOYEES.find(e => e.id === id)
        return emp ? jsonResponse(emp) : jsonResponse({ error: "Not found" }, 404)
      }

      // Departments
      if (pathname === "/api/departments") {
        return jsonResponse({ departments: DEMO_DEPARTMENTS })
      }

      // Projects
      if (pathname === "/api/projects") {
        return jsonResponse({ projects: DEMO_PROJECTS })
      }

      // Project tasks
      if (pathname === "/api/projects/tasks") {
        return jsonResponse({ tasks: DEMO_MOCK_PROJECT_TASKS })
      }

      // Single project
      if (pathname.startsWith("/api/projects/")) {
        const id = pathname.split("/").filter(Boolean).pop()
        const proj = DEMO_PROJECTS.find(p => p.id === id)
        return proj ? jsonResponse(proj) : jsonResponse({ error: "Not found" }, 404)
      }

      // Users
      if (pathname === "/api/users") {
        return jsonResponse({ user: { id: DEMO_USER_ID, name: "Demo User", email: "demo@blivoai.com", role: "OWNER" } })
      }

      // Track visitor - return empty
      if (pathname === "/api/track-visitor") {
        return emptyOk()
      }

      // Settings LLM
      if (pathname === "/api/settings/llm") {
        return jsonResponse({ models: [], selectedModel: null })
      }

      // Plans
      if (pathname === "/api/plans") {
        return jsonResponse({ plans: [] })
      }

      // Default GET: return empty success
      return jsonResponse({})
    }

    // ---- POST/PUT/DELETE endpoints (mutations) ----
    // All mutations in demo mode return a demo toast message
    // Chat endpoints have special handling

    // Chat - return mock AI response
    if (pathname === "/api/chat" || pathname === "/api/v1/chat") {
      const body = init?.body ? JSON.parse(init.body as string) : {}
      const { getDemoChatResponse } = await import("./demo-data")
      const reply = getDemoChatResponse(body.message || "", _lang as Locale)
      return jsonResponse({
        response: reply,
        conversationId: DEMO_CONV_ID,
      })
    }

    // Conversations - create new conversation or send message
    if (pathname === "/api/conversations") {
      const body = init?.body ? JSON.parse(init.body as string) : {}
      // If it's a send message (has employeeId + message, no conversationId), return mock reply
      if (body.employeeId && body.message && !body.conversationId) {
        const { getDemoChatResponse } = await import("./demo-data")
        const reply = getDemoChatResponse(body.message, _lang as Locale)
        return jsonResponse({
          reply,
          content: reply,
          tokensUsed: { totalTokens: Math.floor(Math.random() * 500 + 200) },
        })
      }
      // If it has conversationId, return mock reply
      if (body.conversationId) {
        const { getDemoChatResponse } = await import("./demo-data")
        const reply = getDemoChatResponse(body.content || body.message || "", _lang as Locale)
        return jsonResponse({
          id: `msg-demo-${Date.now()}`,
          conversationId: body.conversationId,
          senderType: "EMPLOYEE",
          senderName: _lang === "ar" ? "موظف تجريبي" : "Demo Employee",
          content: reply,
          createdAt: new Date().toISOString(),
        })
      }
      // Creating new conversation (no message)
      return jsonResponse({
        id: DEMO_CONV_ID,
        type: "DIRECT",
        participants: [],
        messages: [],
        createdAt: new Date().toISOString(),
      })
    }

    // Coordinate (department chat)
    if (pathname === "/api/coordinate") {
      const { getDemoChatResponse } = await import("./demo-data")
      const body = init?.body ? JSON.parse(init.body as string) : {}
      const reply = getDemoChatResponse(body.message || "", _lang as Locale)
      return jsonResponse({ response: reply })
    }

    // All other mutations: return demo mode message
    console.log(`[Demo Fetch] Blocked mutation: ${method} ${pathname}`)
    return demoToastResponse()
  }
}

// Reference to the original fetch
let originalFetch: typeof globalThis.fetch = globalThis.fetch

// Install the interceptor
export function installDemoFetchInterceptor() {
  if (typeof window === "undefined") return
  originalFetch = globalThis.fetch
  const interceptor = createDemoFetchInterceptor()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).fetch = interceptor
  console.log("[Demo] Fetch interceptor installed")
}

// Uninstall (for cleanup)
export function uninstallDemoFetchInterceptor() {
  if (typeof window === "undefined") return
  globalThis.fetch = originalFetch
  console.log("[Demo] Fetch interceptor removed")
}

// ---- Additional Mock Data for API endpoints ----

export const DEMO_MOCK_MEETINGS = [
  {
    id: "meeting-1",
    companyId: "demo-co",
    title: _lang === "ar" ? "اجتماع مراجعة المشروع" : "Project Review Meeting",
    description: _lang === "ar" ? "مراجعة تقدم المشاريع الحالية" : "Review current project progress",
    scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    duration: 45,
    departmentIds: JSON.stringify(["dept-eng"]),
    participantIds: JSON.stringify(["emp-sarah", "emp-omar", "emp-maya"]),
    status: "SCHEDULED",
    type: "TEAM",
    meetingLink: null,
    notes: "",
    createdById: DEMO_USER_ID,
    createdByName: "Demo User",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "meeting-2",
    companyId: "demo-co",
    title: _lang === "ar" ? "متابعة فريق الهندسة" : "Engineering Team Sync",
    description: _lang === "ar" ? "متابعة المهام الأسبوعية" : "Weekly task follow-up",
    scheduledAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    duration: 30,
    departmentIds: JSON.stringify(["dept-eng"]),
    participantIds: JSON.stringify(["emp-sarah", "emp-lina", "emp-adam", "emp-alex"]),
    status: "SCHEDULED",
    type: "TEAM",
    meetingLink: null,
    notes: "",
    createdById: DEMO_USER_ID,
    createdByName: "Demo User",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const DEMO_MOCK_HR_POLICIES = [
  {
    id: "pol-1",
    companyId: "demo-co",
    title: _lang === "ar" ? "سياسة الإجازات" : "Leave Policy",
    content: _lang === "ar" ? "كل موظف يحق له 21 يوم إجازة سنوية" : "Each employee is entitled to 21 annual leave days",
    type: "LEAVE",
    createdAt: new Date().toISOString(),
  },
  {
    id: "pol-2",
    companyId: "demo-co",
    title: _lang === "ar" ? "سياسة العمل عن بُعد" : "Remote Work Policy",
    content: _lang === "ar" ? "يُسمح بالعمل عن بُعد يومين في الأسبوع" : "Remote work is allowed 2 days per week",
    type: "GENERAL",
    createdAt: new Date().toISOString(),
  },
]

export const DEMO_MOCK_LEAVES = [
  {
    id: "leave-1",
    companyId: "demo-co",
    employeeId: "emp-omar",
    type: "ANNUAL",
    startDate: new Date(Date.now() + 10 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: "PENDING",
    reason: _lang === "ar" ? "إجازة سنوية" : "Annual leave",
    createdById: DEMO_USER_ID,
    createdAt: new Date().toISOString(),
  },
]

export const DEMO_MOCK_DAILY_USAGE = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split("T")[0],
  tokens: Math.floor(3000 + Math.random() * 12000),
}))

export const DEMO_MOCK_INVOICES = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2026-008",
    companyId: "demo-co",
    amount: 49.99,
    currency: "USD",
    status: "PAID",
    planName: "Professional",
    description: _lang === "ar" ? "اشتراك شهري - أغسطس" : "Monthly subscription - August",
    issuedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    dueDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    paidAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-2026-007",
    companyId: "demo-co",
    amount: 49.99,
    currency: "USD",
    status: "PAID",
    planName: "Professional",
    description: _lang === "ar" ? "اشتراك شهري - يوليو" : "Monthly subscription - July",
    issuedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    dueDate: new Date(Date.now() - 40 * 86400000).toISOString(),
    paidAt: new Date(Date.now() - 44 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
]

export const DEMO_MOCK_API_KEYS = [
  {
    id: "key-1",
    companyId: "demo-co",
    name: _lang === "ar" ? "مفتاح الاختبار" : "Test Key",
    keyPrefix: "demo_sk_...",
    scopes: ["read", "write"],
    rateLimitRpm: 60,
    totalRequests: 1247,
    totalTokensUsed: 89420,
    todayRequests: 23,
    todayTokens: 1540,
    lastUsedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    isActive: true,
    expiresAt: new Date(Date.now() + 180 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
]

export const DEMO_MOCK_PROJECT_TASKS = [
  { id: "pt-1", projectId: "proj-1", title: _lang === "ar" ? "تصميم واجهة الدخول" : "Design login UI", status: "COMPLETED", assigneeId: "emp-lina", priority: "HIGH", deadline: new Date(Date.now() + 5 * 86400000).toISOString() },
  { id: "pt-2", projectId: "proj-1", title: _lang === "ar" ? "تنفيذ OAuth2" : "Implement OAuth2", status: "IN_PROGRESS", assigneeId: "emp-omar", priority: "HIGH", deadline: new Date(Date.now() + 10 * 86400000).toISOString() },
  { id: "pt-3", projectId: "proj-1", title: _lang === "ar" ? "اختبار الأمان" : "Security testing", status: "PENDING", assigneeId: "emp-adam", priority: "MEDIUM", deadline: new Date(Date.now() + 15 * 86400000).toISOString() },
  { id: "pt-4", projectId: "proj-2", title: _lang === "ar" ? "كتابة محتوى الحملة" : "Write campaign content", status: "IN_PROGRESS", assigneeId: "emp-maya", priority: "MEDIUM", deadline: new Date(Date.now() + 7 * 86400000).toISOString() },
  { id: "pt-5", projectId: "proj-2", title: _lang === "ar" ? "تصميم البانرات" : "Design banners", status: "PENDING", assigneeId: "emp-lina", priority: "LOW", deadline: new Date(Date.now() + 12 * 86400000).toISOString() },
  { id: "pt-6", projectId: "proj-3", title: _lang === "ar" ? "تحليل تجربة المستخدم" : "UX analysis", status: "PENDING", assigneeId: null, priority: "HIGH", deadline: new Date(Date.now() + 20 * 86400000).toISOString() },
]
