// @ts-nocheck
// ============================================
// نظام الأدوات (Tools) للوكلاء الذكية
//
// الموظفين (AI Employees) يستخدموا هاي الأدوات
// عشان يخدمو المشتركين فعلياً — مش بس يحكي!
//
// الأدوات المتوفرة:
// 1️⃣ web_search   — بحث في الإنترنت
// 2️⃣ web_fetch    — قراءة صفحة ويب
// 3️⃣ api_request  — استدعاء API خارجي (GET/POST)
// 4️⃣ db_query     — استعلام قاعدة بيانات الشركة
// 5️⃣ send_email   — إرسال إيميل
// 6️⃣ file_read    — قراءة ملف
// 7️⃣ file_write   — كتابة ملف
// 8️⃣ calculate    — حسابات رياضية
// 9️⃣ notify_user  — إرسال إشعار للمشترك
// 🔟 manage_account — إدارة حساب المشترك (تحديث بيانات)
//
// الأمان:
// - كل استدعاء أداه بيتسجل بالـ AuditLog
// - بعض الأدوات محمية (admin only)
// - لا أداة بتقدر تعدل بيانات حساسة بدون موافقة
// ============================================

import { db } from "@/lib/db"
import type { RequestType } from "@/types"

// ============================================
// تعريف الأدوة (Tool Definition)
// بصيغة OpenAI Function Calling
// ============================================

export interface ToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, {
        type: string
        description: string
        enum?: string[]
      }>
      required: string[]
    }
  }
}

export interface ToolCallResult {
  success: boolean
  output: string
  error?: string
  cost?: number  // تكلفة تقريبية
  durationMs?: number
}

// ============================================
// الأدوات المتوفرة — Definitions
// ============================================

export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the internet for information. Returns relevant search results with titles, URLs, and snippets. Use this to find current data, news, products, services, or any web content.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query string",
          },
          language: {
            type: "string",
            description: "Language preference for results (ar, en, etc.)",
            enum: ["ar", "en", "auto"],
          },
          max_results: {
            type: "number",
            description: "Maximum number of results to return (1-10)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_fetch",
      description: "Fetch and read the content of a web page. Returns the page title, text content, and key information. Use this to read articles, documentation, product pages, or any URL content.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to fetch and read",
          },
          extract_type: {
            type: "string",
            description: "What to extract from the page",
            enum: ["full_text", "summary", "links", "metadata"],
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "api_request",
      description: "Make an HTTP API request to an external service. Supports GET, POST, PUT, DELETE methods. Use this to interact with external APIs, fetch data from services, or submit information to third-party platforms.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The API endpoint URL",
          },
          method: {
            type: "string",
            description: "HTTP method",
            enum: ["GET", "POST", "PUT", "DELETE"],
          },
          headers: {
            type: "object",
            description: "Optional HTTP headers (JSON object)",
          },
          body: {
            type: "string",
            description: "Request body for POST/PUT (JSON string or plain text)",
          },
          timeout_seconds: {
            type: "number",
            description: "Request timeout in seconds (default: 30)",
          },
        },
        required: ["url", "method"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_query",
      description: "Query the company database to retrieve customer information, employee data, projects, orders, or any business data. Use this to help customers with their accounts, check statuses, or retrieve records.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "The database table to query",
            enum: ["users", "companies", "employees", "departments", "projects", "conversations", "messages", "payments", "integrations", "tasks", "decisions", "meetings"],
          },
          filter: {
            type: "string",
            description: "Filter condition (e.g., 'companyId=xyz' or 'status=ACTIVE'). Provide as key=value pairs separated by commas.",
          },
          fields: {
            type: "string",
            description: "Which fields to return (comma-separated). Leave empty for all fields.",
          },
          limit: {
            type: "number",
            description: "Maximum number of records to return (default: 10, max: 50)",
          },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email to a customer, team member, or external contact. Use this to communicate important information, send reports, or notify stakeholders.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address",
          },
          subject: {
            type: "string",
            description: "Email subject line",
          },
          body: {
            type: "string",
            description: "Email body content (plain text or simple HTML)",
          },
          cc: {
            type: "string",
            description: "CC recipient email addresses (comma-separated)",
          },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Perform mathematical calculations. Supports basic arithmetic, percentages, currency conversions, and financial computations. Use this for pricing calculations, budget analysis, or any numeric tasks.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The mathematical expression to evaluate (e.g., '250 * 0.15 + 100' or 'monthly_budget / 12')",
          },
          context: {
            type: "string",
            description: "Optional context variables as key=value pairs (e.g., 'monthly_budget=3000, tax_rate=0.15')",
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notify_user",
      description: "Send a notification message to the company owner or a specific user. Use this to alert about important events, request approval, or provide status updates.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The notification message content",
          },
          type: {
            type: "string",
            description: "Notification type/priority",
            enum: ["info", "warning", "urgent", "approval_request"],
          },
          target_user_id: {
            type: "string",
            description: "Specific user ID to notify. Leave empty to notify the company owner.",
          },
        },
        required: ["message", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_account",
      description: "Manage a customer account — update profile information, change subscription plan, adjust settings, or modify employee configurations. Requires proper authorization.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "The account management action to perform",
            enum: ["update_profile", "change_subscription", "update_settings", "add_integration", "remove_integration"],
          },
          target_id: {
            type: "string",
            description: "The ID of the target entity (user, company, employee, etc.)",
          },
          data: {
            type: "string",
            description: "The data to update (JSON string with key-value pairs)",
          },
        },
        required: ["action", "target_id", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "file_read",
      description: "Read the content of a file stored in the company's system. Use this to access invoices, contracts, reports, or any document uploaded to the platform.",
      parameters: {
        type: "object",
        properties: {
          file_id: {
            type: "string",
            description: "The ID of the file to read",
          },
          file_name: {
            type: "string",
            description: "The name of the file to search for (alternative to file_id)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ssh_command",
      description: "Execute a command on a remote server via SSH. Use this to manage servers, deploy applications, check server status, restart services, read logs, or perform any server administration task. Requires SSH credentials to be configured in the company's integrations.",
      parameters: {
        type: "object",
        properties: {
          host: {
            type: "string",
            description: "The server hostname or IP address to connect to",
          },
          command: {
            type: "string",
            description: "The shell command to execute on the remote server",
          },
          username: {
            type: "string",
            description: "SSH username (default: root). If not provided, uses the default from company integrations.",
          },
          timeout_seconds: {
            type: "number",
            description: "Command timeout in seconds (default: 30, max: 120)",
          },
          working_directory: {
            type: "string",
            description: "The directory to run the command in (default: home directory)",
          },
        },
        required: ["host", "command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "social_media_post",
      description: "Post content to social media platforms (Instagram, Twitter/X, Facebook, LinkedIn, etc.). Use this to publish posts, upload images, or manage social media accounts on behalf of the company. Requires social media API credentials to be configured in the company's integrations.",
      parameters: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            description: "The social media platform to post to",
            enum: ["instagram", "twitter", "facebook", "linkedin", "tiktok", "youtube"],
          },
          action: {
            type: "string",
            description: "The social media action to perform",
            enum: ["post", "post_with_image", "story", "reel", "schedule_post", "get_analytics", "get_comments", "reply_comment"],
          },
          content: {
            type: "string",
            description: "The post content/caption text",
          },
          image_url: {
            type: "string",
            description: "URL of the image to attach (for post_with_image, story, reel)",
          },
          hashtags: {
            type: "string",
            description: "Comma-separated hashtags to include (e.g., 'business,marketing,ai')",
          },
          schedule_time: {
            type: "string",
            description: "ISO datetime to schedule the post (for schedule_post action)",
          },
          target_id: {
            type: "string",
            description: "ID of the target post/comment (for reply_comment, get_comments actions)",
          },
        },
        required: ["platform", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ssh_deploy",
      description: "Deploy a project or application to a remote server via SSH. Handles git pull, dependency installation, build, and service restart. Use this to deploy websites, APIs, or any application to a server.",
      parameters: {
        type: "object",
        properties: {
          host: {
            type: "string",
            description: "The server hostname or IP address",
          },
          project_path: {
            type: "string",
            description: "The project directory path on the server (e.g., /home/ubuntu/my-project)",
          },
          action: {
            type: "string",
            description: "The deployment action to perform",
            enum: ["deploy", "restart", "status", "logs", "rollback"],
          },
          branch: {
            type: "string",
            description: "Git branch to deploy (default: main)",
          },
          username: {
            type: "string",
            description: "SSH username (default: root)",
          },
        },
        required: ["host", "project_path", "action"],
      },
    },
  },
]

// ============================================
// أسماء الأدوات — للبحث السريع
// ============================================

export const TOOL_NAMES = AVAILABLE_TOOLS.map(t => t.function.name)

// ============================================
// تنفيذ الأدوات (Tool Execution)
// ============================================

export async function executeTool(
  toolName: string,
  parameters: Record<string, unknown>,
  companyId: string,
  employeeId: string,
  requestType: RequestType,
): Promise<ToolCallResult> {
  const startTime = Date.now()

  try {
    let result: string
    let cost = 0

    switch (toolName) {
      case "web_search":
        result = await executeWebSearch(parameters)
        cost = 0.01 // تكلفة تقريبية
        break

      case "web_fetch":
        result = await executeWebFetch(parameters)
        cost = 0.02
        break

      case "api_request":
        result = await executeApiRequest(parameters)
        cost = 0.05
        break

      case "db_query":
        result = await executeDbQuery(parameters, companyId)
        cost = 0.001
        break

      case "send_email":
        result = await executeSendEmail(parameters, companyId)
        cost = 0.03
        break

      case "calculate":
        result = await executeCalculate(parameters)
        cost = 0
        break

      case "notify_user":
        result = await executeNotifyUser(parameters, companyId)
        cost = 0
        break

      case "manage_account":
        result = await executeManageAccount(parameters, companyId, employeeId)
        cost = 0.01
        break

      case "file_read":
        result = await executeFileRead(parameters, companyId)
        cost = 0.001
        break

      case "ssh_command":
        result = await executeSshCommand(parameters, companyId)
        cost = 0.05
        break

      case "social_media_post":
        result = await executeSocialMediaPost(parameters, companyId)
        cost = 0.03
        break

      case "ssh_deploy":
        result = await executeSshDeploy(parameters, companyId)
        cost = 0.08
        break

      default:
        return {
          success: false,
          output: `Unknown tool: ${toolName}`,
          error: `Tool "${toolName}" is not available. Available tools: ${TOOL_NAMES.join(", ")}`,
          durationMs: Date.now() - startTime,
        }
    }

    // تسجيل الاستخدام بالـ AuditLog
    try {
      await db.auditLog.create({
        data: {
          companyId,
          actorId: employeeId,
          action: `TOOL_CALL_${toolName}`,
          details: JSON.stringify({
            toolName,
            parameters: sanitizeParams(parameters),
            success: true,
            durationMs: Date.now() - startTime,
            cost,
          }),
        },
      })
    } catch {
      // AuditLog write failure shouldn't break the tool call
      console.warn(`[TOOL_AUDIT_LOG_ERROR] Failed to log ${toolName} call`)
    }

    return {
      success: true,
      output: result,
      cost,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"

    // تسجيل الخطأ
    try {
      await db.auditLog.create({
        data: {
          companyId,
          actorId: employeeId,
          action: `TOOL_CALL_${toolName}_FAILED`,
          details: JSON.stringify({
            toolName,
            parameters: sanitizeParams(parameters),
            error: errorMsg,
            durationMs: Date.now() - startTime,
          }),
        },
      })
    } catch {
      console.warn(`[TOOL_AUDIT_LOG_ERROR] Failed to log ${toolName} error`)
    }

    return {
      success: false,
      output: `Error executing ${toolName}: ${errorMsg}`,
      error: errorMsg,
      durationMs: Date.now() - startTime,
    }
  }
}

// ============================================
// تنفيذ كل أداة — Implementation
// ============================================

// --- 1️⃣ Web Search ---
async function executeWebSearch(params: Record<string, unknown>): Promise<string> {
  const query = String(params.query || "")
  const language = String(params.language || "auto")
  const maxResults = Number(params.max_results || 5)

  if (!query) return "Error: Search query is required"

  try {
    // Use ZAI web-search SDK
    const ZAIModule = await import("z-ai-web-dev-sdk")
    const ZAI = ZAIModule.default || ZAIModule
    const zai = await ZAI.create()

    const results = await (zai as any).webSearch({
      query,
      language: language === "auto" ? undefined : language,
      maxResults,
    })

    if (!results || results.length === 0) {
      return `No search results found for: "${query}". Try a different query.`
    }

    // Format results
    const formatted = results.map((r: any, i: number) => {
      const title = r.title || r.name || "Untitled"
      const url = r.url || r.link || ""
      const snippet = r.snippet || r.content || r.description || ""
      return `${i + 1}. **${title}**\n   URL: ${url}\n   ${snippet}`
    }).join("\n\n")

    return `Found ${results.length} results for "${query}":\n\n${formatted}`
  } catch (sdkError) {
    // Fallback: use direct fetch to a search API
    console.warn("[TOOL_WEB_SEARCH] ZAI SDK failed, using fetch fallback:", sdkError)

    try {
      // Try DuckDuckGo HTML search as fallback
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      const response = await fetch(searchUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BlivoBot/1.0)" },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return `Search failed for "${query}". HTTP status: ${response.status}. Try again later.`
      }

      const html = await response.text()
      
      // Extract results from DDG HTML (basic parsing)
      const results: string[] = []
      const titleRegex = /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/gi
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi
      const urlRegex = /<a[^>]*class="result__url"[^>]*>(.*?)<\/a>/gi

      const titles = [...html.matchAll(titleRegex)].map(m => m[1].replace(/<[^>]+>/g, "").trim())
      const snippets = [...html.matchAll(snippetRegex)].map(m => m[1].replace(/<[^>]+>/g, "").trim())
      const urls = [...html.matchAll(urlRegex)].map(m => m[1].replace(/<[^>]+>/g, "").trim())

      for (let i = 0; i < Math.min(maxResults, titles.length); i++) {
        results.push(`${i + 1}. **${titles[i] || "Untitled"}**\n   URL: ${urls[i] || "N/A"}\n   ${snippets[i] || ""}`)
      }

      if (results.length === 0) {
        return `No search results found for: "${query}". The search service might be unavailable. Try again later.`
      }

      return `Found ${results.length} results for "${query}":\n\n${results.join("\n\n")}`
    } catch (fetchError) {
      return `Search unavailable for "${query}". Both ZAI SDK and fallback search failed. Try again later.`
    }
  }
}

// --- SSRF Protection ---
function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Block localhost variants
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1") {
      return true
    }

    // Block 10.0.0.0/8
    if (hostname.startsWith("10.")) return true

    // Block 172.16.0.0/12
    if (hostname.startsWith("172.")) {
      const second = parseInt(hostname.split(".")[1], 10)
      if (second >= 16 && second <= 31) return true
    }

    // Block 192.168.0.0/16
    if (hostname.startsWith("192.168.")) return true

    // Block 169.254.0.0/16 (link-local)
    if (hostname.startsWith("169.254.")) return true

    // Block GCP metadata
    if (hostname === "metadata.google.internal") return true

    return false
  } catch {
    return true // If URL can't be parsed, block it
  }
}

// --- 2️⃣ Web Fetch ---
async function executeWebFetch(params: Record<string, unknown>): Promise<string> {
  const url = String(params.url || "")
  const extractType = String(params.extract_type || "summary")

  if (!url) return "Error: URL is required"
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "Error: URL must start with http:// or https://"
  }
  if (isPrivateUrl(url)) {
    return "Error: Access to private/internal URLs is blocked for security reasons"
  }

  try {
    // Use ZAI web-reader SDK
    const ZAIModule = await import("z-ai-web-dev-sdk")
    const ZAI = ZAIModule.default || ZAIModule
    const zai = await ZAI.create()

    const pageContent = await (zai as any).readWebPage({ url })

    if (!pageContent) {
      return `Could not fetch content from: ${url}`
    }

    const title = pageContent.title || ""
    const content = pageContent.content || pageContent.html || pageContent.text || ""

    if (extractType === "full_text") {
      // Truncate very long content
      const maxLen = 8000
      const truncated = content.length > maxLen 
        ? content.slice(0, maxLen) + "\n\n[Content truncated — full page is ${content.length} characters]"
        : content
      return `**Page: ${title}**\nURL: ${url}\n\n${truncated}`
    }

    if (extractType === "links") {
      // Extract links from HTML content
      const linkRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>(.*?)<\/a>/gi
      const links = [...content.matchAll(linkRegex)].slice(0, 20).map(m => `- ${m[2].replace(/<[^>]+>/g, "").trim()}: ${m[1]}`)
      return `**Links found on ${title}** (${url}):\n\n${links.join("\n") || "No links found."}`
    }

    if (extractType === "metadata") {
      return `**Page Metadata**\nTitle: ${title}\nURL: ${url}\nContent Length: ${content.length} characters\n`
    }

    // Default: summary — first ~2000 chars
    const summaryLen = 2000
    const summary = content.length > summaryLen 
      ? content.slice(0, summaryLen) + "\n\n[... truncated]"
      : content
    return `**Summary of: ${title}**\nURL: ${url}\n\n${summary}`
  } catch (sdkError) {
    // Fallback: use fetch directly
    console.warn("[TOOL_WEB_FETCH] ZAI SDK failed, using fetch fallback:", sdkError)

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BlivoBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        return `Failed to fetch ${url}. HTTP status: ${response.status}`
      }

      const text = await response.text()
      // Strip HTML tags for readability
      const cleanText = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()

      const maxLen = 4000
      const truncated = cleanText.length > maxLen
        ? cleanText.slice(0, maxLen) + "\n\n[Content truncated]"
        : cleanText

      return `**Content from: ${url}**\n\n${truncated}`
    } catch (fetchError) {
      return `Failed to fetch ${url}. The page might be unavailable or blocking automated access.`
    }
  }
}

// --- 3️⃣ API Request ---
async function executeApiRequest(params: Record<string, unknown>): Promise<string> {
  const url = String(params.url || "")
  const method = String(params.method || "GET").toUpperCase()
  const headers = params.headers as Record<string, string> | undefined
  const body = String(params.body || "")
  const timeout = Number(params.timeout_seconds || 30) * 1000

  if (!url) return "Error: URL is required"

  // Security: block internal/private IPs
  const blockedPatterns = [
    /localhost/i,
    /127\.0\.0\./,
    /10\.\d+\.\d+\.\d+/,
    /172\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)\.\d+\.\d+/,
    /192\.168\./,
    /0\.0\.0\.0/,
    /internal/i,
    /private/i,
  ]
  
  for (const pattern of blockedPatterns) {
    if (pattern.test(url)) {
      return `Error: Cannot make requests to internal/private network addresses for security reasons.`
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "User-Agent": "BlivoBot/1.0",
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      signal: AbortSignal.timeout(timeout),
    }

    if (method !== "GET" && method !== "DELETE" && body) {
      fetchOptions.body = body
    }

    const response = await fetch(url, fetchOptions)

    const responseText = await response.text()

    // Truncate large responses
    const maxLen = 8000
    const truncated = responseText.length > maxLen
      ? responseText.slice(0, maxLen) + `\n\n[Response truncated — ${responseText.length} total characters]`
      : responseText

    return `**API Response**\nURL: ${url}\nMethod: ${method}\nStatus: ${response.status}\n\n${truncated}`
  } catch (error) {
    return `API request failed: ${error instanceof Error ? error.message : "Unknown error"}\nURL: ${url}\nMethod: ${method}`
  }
}

// --- 4️⃣ DB Query ---
async function executeDbQuery(params: Record<string, unknown>, companyId: string): Promise<string> {
  const table = String(params.table || "")
  const filter = String(params.filter || "")
  const fields = String(params.fields || "")
  const limit = Math.min(Number(params.limit || 10), 50)

  if (!table) return "Error: Table name is required"

  // Parse filter string (e.g., "companyId=xyz,status=ACTIVE")
  const whereClause: Record<string, unknown> = { companyId } // Always restrict to company data!
  
  if (filter) {
    const pairs = filter.split(",").map(p => p.trim())
    for (const pair of pairs) {
      const [key, value] = pair.split("=").map(s => s.trim())
      if (key && value) {
        // Handle special values
        if (value === "true") whereClause[key] = true
        else if (value === "false") whereClause[key] = false
        else if (value === "null") whereClause[key] = null
        else if (!isNaN(Number(value))) whereClause[key] = Number(value)
        else whereClause[key] = value
      }
    }
  }

  // Parse fields to select
  const selectClause: Record<string, boolean> = {}
  if (fields) {
    const fieldList = fields.split(",").map(f => f.trim())
    for (const f of fieldList) {
      selectClause[f] = true
    }
  }

  try {
    // Map table names to Prisma models
    const modelMap: Record<string, string> = {
      users: "user",
      companies: "company",
      employees: "employee",
      departments: "department",
      projects: "project",
      conversations: "conversation",
      messages: "message",
      payments: "payment",
      integrations: "integration",
      tasks: "projectTask",
      decisions: "decision",
      meetings: "meeting",
    }

    const prismaModel = modelMap[table]
    if (!prismaModel) {
      return `Error: Table "${table}" is not available. Available tables: ${Object.keys(modelMap).join(", ")}`
    }

    // Use dynamic Prisma access
    // @ts-ignore — dynamic model access
    const results = await db[prismaModel].findMany({
      where: whereClause,
      ...(selectClause && Object.keys(selectClause).length > 0 ? { select: selectClause } : {}),
      take: limit,
      orderBy: { createdAt: "desc" },
    })

    if (!results || results.length === 0) {
      return `No records found in ${table} matching the filter criteria.`
    }

    // Sanitize: remove sensitive fields
    const sanitized = results.map((r: any) => {
      const clean = { ...r }
      // Remove password hashes, API keys, etc.
      delete clean.password
      delete clean.apiKey
      delete clean.apiKeyValue
      delete clean.webhookSecret
      delete clean.secret
      return clean
    })

    return `**Query Results** (${table}): Found ${results.length} records\n\n${JSON.stringify(sanitized, null, 2)}`
  } catch (error) {
    return `Database query error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

// --- 5️⃣ Send Email ---
async function executeSendEmail(params: Record<string, unknown>, companyId: string): Promise<string> {
  const to = String(params.to || "")
  const subject = String(params.subject || "")
  const body = String(params.body || "")
  const cc = String(params.cc || "")

  if (!to || !subject || !body) return "Error: to, subject, and body are required"

  // Check if Resend API key is available
  const resendKey = process.env.RESEND_API_KEY
  
  if (!resendKey) {
    // Save email as a pending request for the owner to send manually
    try {
      await db.employeeRequest.create({
        data: {
          employeeId: `system-email-${companyId}`,
          type: "APPROVAL",
          title: `Email: ${subject}`,
          description: `To: ${to}${cc ? `, CC: ${cc}` : ""}\n\n${body}`,
          priority: 5,
          status: "PENDING",
        },
      })
      return `Email saved as pending request (no email API configured). The company owner will need to send this manually.\nTo: ${to}\nSubject: ${subject}\n\nConfigure RESEND_API_KEY in environment variables to enable automatic email sending.`
    } catch {
      return `Email cannot be sent — no email API configured (RESEND_API_KEY missing). Please configure email service.`
    }
  }

  try {
    // Use Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BlivoAI <notifications@blivoai.com>",
        to: [to],
        ...(cc ? { cc: cc.split(",").map(e => e.trim()) } : {}),
        subject,
        text: body,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return `Email send failed. Resend API error (${response.status}): ${errorText}`
    }

    const data = await response.json()
    return `Email sent successfully!\nTo: ${to}\nSubject: ${subject}\nID: ${data.id || "N/A"}`
  } catch (error) {
    return `Email send failed: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

// --- 6️⃣ Calculate ---
async function executeCalculate(params: Record<string, unknown>): Promise<string> {
  const expression = String(params.expression || "")
  const contextStr = String(params.context || "")

  if (!expression) return "Error: Expression is required"

  // Parse context variables
  const context: Record<string, number> = {}
  if (contextStr) {
    const pairs = contextStr.split(",").map(p => p.trim())
    for (const pair of pairs) {
      const [key, value] = pair.split("=").map(s => s.trim())
      if (key && value && !isNaN(Number(value))) {
        context[key] = Number(value)
      }
    }
  }

  try {
    // Replace context variables in expression
    let evalExpression = expression
    for (const [key, value] of Object.entries(context)) {
      evalExpression = evalExpression.replace(new RegExp(key, "g"), String(value))
    }

    // Validate: only allow safe math expressions
    const safePattern = /^[0-9+\-*/().%\s]+$/
    if (!safePattern.test(evalExpression)) {
      return `Error: Expression contains invalid characters. Only numbers and basic operators (+, -, *, /, %, parentheses) are allowed.\nExpression: ${expression}`
    }

    // Evaluate using Function constructor (safer than eval)
    const result = new Function(`return ${evalExpression}`)()

    if (typeof result !== "number" || isNaN(result)) {
      return `Error: Expression did not produce a valid number.\nExpression: ${expression}\nResult: ${result}`
    }

    // Format result nicely
    const formatted = Number.isInteger(result) ? result : Math.round(result * 100) / 100

    const contextInfo = Object.keys(context).length > 0
      ? `\nContext: ${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(", ")}`
      : ""

    return `**Calculation Result**\nExpression: ${expression}${contextInfo}\nResult: ${formatted}`
  } catch (error) {
    return `Calculation error: ${error instanceof Error ? error.message : "Unknown error"}\nExpression: ${expression}`
  }
}

// --- 7️⃣ Notify User ---
async function executeNotifyUser(params: Record<string, unknown>, companyId: string): Promise<string> {
  const message = String(params.message || "")
  const type = String(params.type || "info")
  const targetUserId = String(params.target_user_id || "")

  if (!message) return "Error: Notification message is required"

  try {
    // Find the target user (owner if no specific user)
    let userId = targetUserId
    if (!userId) {
      const company = await db.company.findUnique({ where: { id: companyId } })
      userId = company?.ownerId || ""
    }

    if (!userId) {
      return `Could not find target user. Notification saved but not delivered.`
    }

    // Create an employee request as notification
    await db.employeeRequest.create({
      data: {
        employeeId: `system-notification-${companyId}`,
        type: "INFORMATION",
        title: `[${type.toUpperCase()}] Notification`,
        description: message,
        priority: type === "urgent" ? 1 : type === "approval_request" ? 2 : type === "warning" ? 3 : 5,
        status: type === "approval_request" ? "PENDING" : "APPROVED",
      },
    })

    // Also log as audit event
    await db.auditLog.create({
      data: {
        companyId,
        actorId: userId,
        action: `NOTIFICATION_${type.toUpperCase()}`,
        details: JSON.stringify({ message, type, targetUserId: userId }),
      },
    })

    return `Notification sent successfully!\nType: ${type}\nMessage: ${message}\nTarget: ${userId ? "User" : "Company Owner"}`
  } catch (error) {
    return `Notification failed: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

// --- 8️⃣ Manage Account ---
async function executeManageAccount(
  params: Record<string, unknown>,
  companyId: string,
  employeeId: string,
): Promise<string> {
  const action = String(params.action || "")
  const targetId = String(params.target_id || "")
  const dataStr = String(params.data || "")

  if (!action || !targetId) return "Error: action and target_id are required"

  // Parse data
  let updateData: Record<string, unknown> = {}
  try {
    updateData = JSON.parse(dataStr)
  } catch {
    return `Error: Data must be valid JSON. Example: {"name": "New Name"}`
  }

  // Security: Remove dangerous fields
  const forbiddenFields = ["password", "apiKey", "secret", "token", "role", "ownerId", "subscription"]
  for (const field of forbiddenFields) {
    delete updateData[field]
  }

  try {
    switch (action) {
      case "update_profile": {
        const user = await db.user.update({
          where: { id: targetId },
          data: updateData,
        })
        return `User profile updated successfully.\nUpdated fields: ${Object.keys(updateData).join(", ")}`
      }

      case "update_settings": {
        const company = await db.company.update({
          where: { id: companyId },
          data: updateData,
        })
        return `Company settings updated successfully.\nUpdated fields: ${Object.keys(updateData).join(", ")}`
      }

      case "change_subscription": {
        // Subscription changes require owner approval
        await db.employeeRequest.create({
          data: {
            employeeId,
            type: "APPROVAL",
            title: `Subscription Change Request`,
            description: `Requested subscription change to: ${JSON.stringify(updateData)}. This requires owner approval.`,
            priority: 1,
            status: "PENDING",
          },
        })
        return `Subscription change request submitted for owner approval. Changes: ${JSON.stringify(updateData)}\n\n⚠️ Subscription changes require owner approval and will be processed after approval.`
      }

      case "add_integration": {
        const integration = await db.integration.create({
          data: {
            companyId,
            platform: String(updateData.platform || "OTHER"),
            platformUserId: String(updateData.platformUserId || ""),
            platformName: String(updateData.platformName || ""),
            scopes: String(updateData.scopes || ""),
            isActive: true,
          },
        })
        return `Integration added successfully.\nPlatform: ${updateData.platform}\nID: ${integration.id}`
      }

      case "remove_integration": {
        await db.integration.delete({
          where: { id: targetId },
        })
        return `Integration removed successfully.`
      }

      default:
        return `Error: Unknown action "${action}". Available actions: update_profile, change_subscription, update_settings, add_integration, remove_integration`
    }
  } catch (error) {
    return `Account management error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

// --- 9️⃣ File Read ---
async function executeFileRead(params: Record<string, unknown>, companyId: string): Promise<string> {
  const fileId = String(params.file_id || "")
  const fileName = String(params.file_name || "")

  try {
    let whereClause: Record<string, unknown> = { companyId }
    if (fileId) {
      whereClause.id = fileId
    } else if (fileName) {
      whereClause.fileName = fileName
    } else {
      return "Error: Either file_id or file_name is required"
    }

    const file = await db.fileAttachment.findFirst({ where: whereClause })

    if (!file) {
      return `File not found. ${fileId ? `ID: ${fileId}` : `Name: ${fileName}`}`
    }

    // Return file metadata (we can't read binary content in LLM context)
    return `**File Information**\nName: ${file.fileName}\nType: ${file.fileType}\nSize: ${(file.fileSize / 1024).toFixed(1)} KB\nCategory: ${file.category}\nDescription: ${file.description || "N/A"}\nUploaded by: ${file.uploadedBy}\nCreated: ${file.createdAt}\n\nNote: Binary file content cannot be displayed directly. For text files, use the file path on the server.`
  } catch (error) {
    return `File read error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

// ============================================
// 10️⃣ SSH Command — تنفيذ أوامر على سيرفر بعيد
// ============================================
async function executeSshCommand(params: Record<string, unknown>, companyId: string): Promise<string> {
  const host = String(params.host || "")
  const command = String(params.command || "")
  const username = String(params.username || "root")
  const timeoutSeconds = Math.min(Number(params.timeout_seconds || 30), 120)
  const workingDir = String(params.working_directory || "")

  if (!host || !command) return "Error: host and command are required"

  // Security: Block dangerous commands
  const dangerousPatterns = [
    /rm\s+-rf\s+\//i,
    /mkfs/i,
    /dd\s+if=/i,
    />\s*\/dev\/sd/i,
    /format\s+[a-z]:/i,
    /shutdown/i,
    /reboot/i,
    /init\s+[06]/i,
    /:\s*\(\)\s*\{\s*:\s*\|\s*:&\s*\}/i, // fork bomb
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return `Error: Command blocked for security reasons. The command "${command.slice(0, 50)}" matches a dangerous pattern. Please use a safer alternative.`
    }
  }

  try {
    // Try to get SSH credentials from company integrations
    const integration = await db.integration.findFirst({
      where: {
        companyId,
        platform: "SSH" as any as any,
        isActive: true,
      },
    })

    // Check if we have SSH key or password configured
    const sshKey = integration?.platformUserId || process.env.SSH_PRIVATE_KEY || ""
    const sshPassword = integration?.scopes || process.env.SSH_PASSWORD || ""

    if (!sshKey && !sshPassword) {
      // No SSH credentials configured — create a request for the owner
      await db.employeeRequest.create({
        data: {
          employeeId: `system-ssh-${companyId}`,
          type: "APPROVAL",
          title: `SSH Command: ${command.slice(0, 50)}`,
          description: `Host: ${host}\nUser: ${username}\nCommand: ${command}\n\n⚠️ SSH credentials not configured. Please add SSH integration or set SSH_PRIVATE_KEY/SSH_PASSWORD environment variables.`,
          priority: 3,
          status: "PENDING",
        },
      })
      return `SSH credentials not configured for ${host}. I've created a request for the company owner to set up SSH access.\n\nTo enable SSH access, configure one of:\n1. Add an SSH integration in the company settings\n2. Set SSH_PRIVATE_KEY or SSH_PASSWORD environment variables\n\nHost: ${host}\nCommand: ${command}`
    }

    // Use the internal SSH API endpoint (server-side only)
    // This avoids importing child_process in the client bundle
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"
    const sshResponse = await fetch(`${baseUrl}/api/tools/ssh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        command,
        username,
        timeoutSeconds,
        workingDirectory: workingDir,
        sshKey,
        sshPassword,
      }),
      signal: AbortSignal.timeout((timeoutSeconds + 10) * 1000),
    })

    if (!sshResponse.ok) {
      const errorText = await sshResponse.text()
      return `SSH execution failed (HTTP ${sshResponse.status}): ${errorText}\nHost: ${host}\nCommand: ${command}`
    }

    const data = await sshResponse.json()
    const output = data.output || data.error || "No output"

    const truncated = output.length > 8000
      ? output.slice(0, 8000) + "\n\n[Output truncated]"
      : output

    return `**SSH Command Result**\nHost: ${host}\nUser: ${username}\nCommand: ${command}\n\n${truncated}`
  } catch (error) {
    return `SSH execution error: ${error instanceof Error ? error.message : "Unknown error"}\nHost: ${host}\nCommand: ${command}\n\nNote: The SSH API endpoint may not be available. Make sure the server is running.`
  }
}

// ============================================
// 11️⃣ Social Media Post — نشر على السوشيال ميديا
// ============================================
async function executeSocialMediaPost(params: Record<string, unknown>, companyId: string): Promise<string> {
  const platform = String(params.platform || "")
  const action = String(params.action || "")
  const content = String(params.content || "")
  const imageUrl = String(params.image_url || "")
  const hashtags = String(params.hashtags || "")
  const scheduleTime = String(params.schedule_time || "")
  const targetId = String(params.target_id || "")

  if (!platform || !action) return "Error: platform and action are required"

  // Check if social media credentials are configured
  const integration = await db.integration.findFirst({
    where: {
      companyId,
      platform: platform.toUpperCase() as any,
      isActive: true,
    },
  })

  const platformToken = integration?.scopes || process.env[`${platform.toUpperCase()}_API_TOKEN`] || ""
  const platformAccountId = integration?.platformUserId || ""

  if (!platformToken && !integration) {
    // No credentials — create a request for the owner
    await db.employeeRequest.create({
      data: {
        employeeId: `system-social-${companyId}`,
        type: "APPROVAL",
        title: `Social Media: ${action} on ${platform}`,
        description: `Platform: ${platform}\nAction: ${action}\nContent: ${content.slice(0, 200)}${hashtags ? `\nHashtags: ${hashtags}` : ""}${imageUrl ? `\nImage: ${imageUrl}` : ""}\n\n⚠️ ${platform} API credentials not configured. Please add a ${platform} integration in the company settings or set ${platform.toUpperCase()}_API_TOKEN environment variable.`,
        priority: 2,
        status: "PENDING",
      },
    })

    return `⚠️ ${platform} API credentials not configured. I've created a request for the company owner to set up the ${platform} integration.\n\nTo enable ${platform} posting:\n1. Add a ${platform} integration in company settings\n2. Set ${platform.toUpperCase()}_API_TOKEN environment variable\n\nI'll be able to post once the credentials are configured.\n\nYour pending post:\n- Platform: ${platform}\n- Action: ${action}\n- Content: "${content.slice(0, 100)}${content.length > 100 ? "..." : ""}"${hashtags ? `\n- Hashtags: ${hashtags}` : ""}`
  }

  // We have credentials — execute the action
  try {
    const formattedContent = content + (hashtags ? `\n\n${hashtags.split(",").map(h => h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`).join(" ")}` : "")

    // Platform-specific API calls
    switch (platform.toLowerCase()) {
      case "twitter": {
        // Twitter/X API v2
        const response = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${platformToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: formattedContent.slice(0, 280),
          }),
          signal: AbortSignal.timeout(15000),
        })

        if (!response.ok) {
          const errorText = await response.text()
          return `Twitter post failed (${response.status}): ${errorText}`
        }

        const data = await response.json()
        return `✅ Tweet posted successfully!\nID: ${data.data?.id || "N/A"}\nContent: "${formattedContent.slice(0, 100)}"`
      }

      case "instagram": {
        // Instagram Graph API — requires a Facebook Page connected to Instagram Business account
        if (!platformAccountId) {
          return `Instagram posting requires a connected Instagram Business account. Please configure the Instagram Business account ID in the integration settings.\n\nYour pending post content:\n"${formattedContent.slice(0, 200)}"`
        }

        // Create media container
        const createData: Record<string, string> = {
          caption: formattedContent.slice(0, 2200),
          access_token: platformToken,
        }

        if (imageUrl && (action === "post_with_image" || action === "post")) {
          createData.image_url = imageUrl
        }

        const containerResponse = await fetch(
          `https://graph.facebook.com/v18.0/${platformAccountId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createData),
            signal: AbortSignal.timeout(30000),
          }
        )

        if (!containerResponse.ok) {
          const errorText = await containerResponse.text()
          return `Instagram media creation failed (${containerResponse.status}): ${errorText}`
        }

        const containerData = await containerResponse.json()
        const containerId = containerData.id

        // Publish the media container
        const publishResponse = await fetch(
          `https://graph.facebook.com/v18.0/${platformAccountId}/media_publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: containerId,
              access_token: platformToken,
            }),
            signal: AbortSignal.timeout(15000),
          }
        )

        if (!publishResponse.ok) {
          const errorText = await publishResponse.text()
          return `Instagram publish failed (${publishResponse.status}): ${errorText}`
        }

        const publishData = await publishResponse.json()
        return `✅ Instagram post published successfully!\nID: ${publishData.id || "N/A"}\nContent: "${formattedContent.slice(0, 100)}"`
      }

      case "linkedin": {
        // LinkedIn API
        if (!platformAccountId) {
          return `LinkedIn posting requires a connected LinkedIn account. Please configure the LinkedIn account ID in the integration settings.\n\nYour pending post content:\n"${formattedContent.slice(0, 200)}"`
        }

        const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${platformToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            author: `urn:li:person:${platformAccountId}`,
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: {
                  text: formattedContent.slice(0, 3000),
                },
                shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
                ...(imageUrl ? {
                  media: [{
                    status: "READY",
                    originalUrl: imageUrl,
                  }],
                } : {}),
              },
            },
            visibility: {
              "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
          }),
          signal: AbortSignal.timeout(15000),
        })

        if (!response.ok) {
          const errorText = await response.text()
          return `LinkedIn post failed (${response.status}): ${errorText}`
        }

        const data = await response.json()
        return `✅ LinkedIn post published successfully!\nID: ${data.id || "N/A"}\nContent: "${formattedContent.slice(0, 100)}"`
      }

      case "facebook": {
        // Facebook Graph API
        if (!platformAccountId) {
          return `Facebook posting requires a connected Facebook Page. Please configure the Facebook Page ID in the integration settings.\n\nYour pending post content:\n"${formattedContent.slice(0, 200)}"`
        }

        const postData: Record<string, string> = {
          message: formattedContent.slice(0, 63206),
          access_token: platformToken,
        }

        if (imageUrl) {
          postData.url = imageUrl
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${platformAccountId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(postData),
            signal: AbortSignal.timeout(15000),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          return `Facebook post failed (${response.status}): ${errorText}`
        }

        const data = await response.json()
        return `✅ Facebook post published successfully!\nID: ${data.id || "N/A"}\nContent: "${formattedContent.slice(0, 100)}"`
      }

      case "tiktok":
      case "youtube":
        return `${platform} posting requires video upload which is not supported yet. Please post manually.\n\nYour pending post content:\n"${formattedContent.slice(0, 200)}"`

      default:
        return `Platform "${platform}" is not supported. Available platforms: instagram, twitter, facebook, linkedin, tiktok, youtube`
    }
  } catch (error) {
    return `Social media post error: ${error instanceof Error ? error.message : "Unknown error"}\nPlatform: ${platform}\nAction: ${action}`
  }
}

// ============================================
// 12️⃣ SSH Deploy — نشر مشروع على سيرفر بعيد
// ============================================
async function executeSshDeploy(params: Record<string, unknown>, companyId: string): Promise<string> {
  const host = String(params.host || "")
  const projectPath = String(params.project_path || "")
  const action = String(params.action || "")
  const branch = String(params.branch || "main")
  const username = String(params.username || "root")

  if (!host || !projectPath || !action) return "Error: host, project_path, and action are required"

  // Commands for each action
  const deployCommands: Record<string, string> = {
    deploy: `cd ${projectPath} && git pull origin ${branch} && npm install && npm run build && pm2 restart all || systemctl restart *.service`,
    restart: `cd ${projectPath} && pm2 restart all || systemctl restart *.service`,
    status: `cd ${projectPath} && git status && echo "---" && pm2 status || systemctl status *.service`,
    logs: `cd ${projectPath} && pm2 logs --lines 50 --nostream || journalctl -u *.service -n 50 --no-pager`,
    rollback: `cd ${projectPath} && git reset --hard HEAD~1 && npm install && npm run build && pm2 restart all || systemctl restart *.service`,
  }

  const command = deployCommands[action]
  if (!command) {
    return `Error: Unknown deploy action "${action}". Available actions: ${Object.keys(deployCommands).join(", ")}`
  }

  // Use the SSH command tool to execute
  return executeSshCommand({
    host,
    command,
    username,
    working_directory: projectPath,
    timeout_seconds: 120,
  }, companyId)
}

// ============================================
// Sanitize parameters for audit logging
// (Remove sensitive values)
// ============================================

function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...params }
  // Mask potential secrets
  for (const key of Object.keys(sanitized)) {
    if (/password|secret|key|token|auth/i.test(key)) {
      sanitized[key] = "***masked***"
    }
  }
  return sanitized
}
