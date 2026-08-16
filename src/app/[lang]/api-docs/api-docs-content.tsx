"use client"

import { use, useState } from "react"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { PublicPageLayout } from "@/components/public/public-page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Code2,
  Zap,
  Shield,
  Users,
  BarChart3,
  MessageSquare,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Globe,
  Lock,
  Clock,
  ArrowRight,
  Terminal,
  FileJson,
} from "lucide-react"

// ============================================
// Code Block with Copy
// ============================================

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <div className="bg-zinc-950 dark:bg-zinc-900 rounded-lg p-4 text-sm font-mono overflow-x-auto border border-zinc-800">
        <pre className="text-zinc-300 whitespace-pre leading-relaxed">{code}</pre>
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
}

// ============================================
// Method Badge
// ============================================

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    POST: "bg-green-500/10 text-green-500 border-green-500/20",
    PUT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
    PATCH: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  }
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${colors[method] || colors.GET}`}>
      {method}
    </span>
  )
}

// ============================================
// Status Badge
// ============================================

function StatusBadge({ code, label }: { code: number; label: string }) {
  const color = code >= 200 && code < 300 ? "text-green-500" : code >= 400 ? "text-red-500" : "text-amber-500"
  return (
    <span className={`${color} font-mono text-xs`}>{code} {label}</span>
  )
}

// ============================================
// Endpoint Card
// ============================================

function EndpointCard({
  method,
  path,
  title,
  description,
  requestExample,
  responseExample,
  params,
  lang,
}: {
  method: string
  path: string
  title: string
  description: string
  requestExample?: string
  responseExample?: string
  params?: { name: string; type: string; required: boolean; desc: string }[]
  lang: "ar" | "en"
}) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="border-border/50 hover:border-brand/30 transition-all">
      <CardContent className="p-0">
        <button
          onClick={() => setOpen(!open)}
          className="w-full p-5 flex items-start gap-4 text-left"
        >
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <MethodBadge method={method} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <code className="text-sm font-mono text-foreground">{path}</code>
            </div>
            <p className="font-semibold text-foreground text-sm mb-0.5">{title}</p>
            <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
          </div>
          <ArrowRight className={`w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>

        {open && (
          <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
            {/* Parameters */}
            {params && params.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  {lang === "ar" ? "المعاملات" : "Parameters"}
                </h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-2.5 font-semibold text-foreground">{lang === "ar" ? "الاسم" : "Name"}</th>
                        <th className="text-left p-2.5 font-semibold text-foreground">Type</th>
                        <th className="text-left p-2.5 font-semibold text-foreground">{lang === "ar" ? "مطلوب" : "Required"}</th>
                        <th className="text-left p-2.5 font-semibold text-foreground">{lang === "ar" ? "الوصف" : "Description"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {params.map((p) => (
                        <tr key={p.name} className="border-t border-border">
                          <td className="p-2.5 font-mono text-brand">{p.name}</td>
                          <td className="p-2.5 text-muted-foreground">{p.type}</td>
                          <td className="p-2.5">
                            {p.required ? (
                              <Badge variant="destructive" className="text-[10px]">Required</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                            )}
                          </td>
                          <td className="p-2.5 text-muted-foreground">{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Request Example */}
            {requestExample && (
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  {lang === "ar" ? "مثال على الطلب" : "Request Example"}
                </h4>
                <CodeBlock code={requestExample} lang="json" />
              </div>
            )}

            {/* Response Example */}
            {responseExample && (
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  {lang === "ar" ? "مثال على الاستجابة" : "Response Example"}
                </h4>
                <CodeBlock code={responseExample} lang="json" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// Main Component
// ============================================

export function ApiDocsContent({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale
  const isAr = lang === "ar"

  const isEn = lang === "en"

  return (
    <PublicPageLayout params={params}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center py-10 sm:py-14">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center mx-auto mb-6 border border-brand/10">
            <Code2 className="w-10 h-10 text-brand" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
            {isAr ? "واجهة برمجة التطبيقات" : "Developer API"}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? "ادمج موظفي BlivoAI الذكاء في منصتك. واجهة REST API احترافية مع مصادقة آمنة، حد للطلبات، وتتبع الاستخدام."
              : "Integrate BlivoAI smart employees into your platform. A professional REST API with secure authentication, rate limiting, and usage tracking."}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Badge variant="outline" className="gap-1.5 border-brand/20 text-brand">
              <Shield className="w-3.5 h-3.5" /> v1.0
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Lock className="w-3.5 h-3.5" /> {isAr ? "SHA-256" : "SHA-256 Encrypted"}
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" /> REST
            </Badge>
          </div>
        </div>

        {/* Plans Notice */}
        <Card className="border-brand/20 bg-brand/5 mb-8">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                {isAr ? "متوفر لخطط الاشتراك المتقدمة" : "Available on Advanced Plans"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr
                  ? "واجهة API متاحة للاشتراكات الاحترافية والمؤسسية فقط. احصل على مفتاح API من لوحة التحكم في قسم \"مفاتيح API\"."
                  : "The API is available on Professional and Enterprise subscriptions only. Get your API key from the dashboard under \"API Keys\" section."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="quickstart" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="quickstart" className="text-xs sm:text-sm">
              <Zap className="w-4 h-4 mr-1.5 hidden sm:inline" />
              {isAr ? "البدء السريع" : "Quick Start"}
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="text-xs sm:text-sm">
              <Terminal className="w-4 h-4 mr-1.5 hidden sm:inline" />
              {isAr ? "النقاط" : "Endpoints"}
            </TabsTrigger>
            <TabsTrigger value="auth" className="text-xs sm:text-sm">
              <Key className="w-4 h-4 mr-1.5 hidden sm:inline" />
              {isAr ? "المصادقة" : "Auth"}
            </TabsTrigger>
            <TabsTrigger value="errors" className="text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 mr-1.5 hidden sm:inline" />
              {isAr ? "الأخطاء" : "Errors"}
            </TabsTrigger>
            <TabsTrigger value="sdks" className="text-xs sm:text-sm">
              <FileJson className="w-4 h-4 mr-1.5 hidden sm:inline" />
              SDKs
            </TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* Quick Start */}
          {/* ============================================ */}
          <TabsContent value="quickstart" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="w-5 h-5 text-brand" />
                  {isAr ? "الخطوة 1: احصل على مفتاح API" : "Step 1: Get Your API Key"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {isAr
                    ? "سجّل دخولك في لوحة التحكم، اذهب لقسم \"مفاتيح API\"، وأنشئ مفتاح جديد. المفتاح يظهر مرة واحدة فقط — احفظه في مكان آمن."
                    : "Log into your dashboard, go to the \"API Keys\" section, and create a new key. The key is shown only once — save it in a secure location."}
                </p>
                <CodeBlock
                  code={`// Your API key looks like this:
blv_sk_a1b2c3d4e5f67890abcdef1234567890...

// Include it in the Authorization header:
Authorization: Bearer blv_sk_a1b2c3d4e5f6...`}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="w-5 h-5 text-brand" />
                  {isAr ? "الخطوة 2: أرسل أول رسالة" : "Step 2: Send Your First Message"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CodeBlock
                  code={`const response = await fetch('https://blivoai.com/api/v1/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer blv_sk_YOUR_KEY_HERE'
  },
  body: JSON.stringify({
    employeeId: 'YOUR_EMPLOYEE_ID',
    message: 'Hello! Can you help me with...'
  })
});

const result = await response.json();
console.log(result.data.reply); // AI employee response`}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-brand" />
                  {isAr ? "الخطوة 3: استعرض موظفيك" : "Step 3: List Your Employees"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CodeBlock
                  code={`const response = await fetch('https://blivoai.com/api/v1/employees', {
  headers: {
    'Authorization': 'Bearer blv_sk_YOUR_KEY_HERE'
  }
});

const result = await response.json();
console.log(result.data); // Array of employees
console.log(result.pagination); // { page, limit, total, totalPages }`}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================ */}
          {/* Endpoints */}
          {/* ============================================ */}
          <TabsContent value="endpoints" className="space-y-4">
            {/* Chat */}
            <EndpointCard
              method="POST"
              path="/api/v1/chat"
              title={isAr ? "محادثة مع موظف AI" : "Chat with AI Employee"}
              description={isAr
                ? "أرسل رسالة لموظف ذكاء اصطناعي واحصل على رد. يدعم محادثات متواصلة عبر conversationId."
                : "Send a message to an AI employee and get a response. Supports continuous conversations via conversationId."}
              params={[
                { name: "employeeId", type: "string", required: true, desc: isAr ? "معرّف الموظف" : "Employee ID" },
                { name: "message", type: "string", required: true, desc: isAr ? "نص الرسالة (حد أقصى 10,000 حرف)" : "Message text (max 10,000 chars)" },
                { name: "conversationId", type: "string", required: false, desc: isAr ? "معرّف محادثة سابقة للتكملة" : "Previous conversation ID for continuity" },
                { name: "language", type: "string", required: false, desc: "'ar' | 'en' (default: 'ar')" },
              ]}
              requestExample={`{
  "employeeId": "clx employee_id_here",
  "message": "Write a social media post about our new product",
  "language": "en"
}`}
              responseExample={`{
  "data": {
    "id": "convo_abc123",
    "reply": "Here's a draft for your social media post...",
    "conversationId": "convo_abc123",
    "employeeName": "Sara",
    "employeeRole": "Social Media Manager",
    "tokensUsed": 342,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}`}
              lang={lang}
            />

            {/* List Employees */}
            <EndpointCard
              method="GET"
              path="/api/v1/employees"
              title={isAr ? "قائمة الموظفين" : "List Employees"}
              description={isAr
                ? "جلب قائمة بجميع الموظفين النشطين. يدعم التصفية حسب القسم والتخصص."
                : "Fetch all active employees. Supports filtering by department and specialization."}
              params={[
                { name: "departmentId", type: "string", required: false, desc: isAr ? "تصفية حسب القسم" : "Filter by department" },
                { name: "specialization", type: "string", required: false, desc: isAr ? "تصفية حسب التخصص" : "Filter by specialization" },
                { name: "status", type: "string", required: false, desc: isAr ? "حالة الموظف (افتراضي: ACTIVE)" : "Employee status (default: ACTIVE)" },
                { name: "page", type: "number", required: false, desc: isAr ? "رقم الصفحة" : "Page number" },
                { name: "limit", type: "number", required: false, desc: isAr ? "عدد النتائج (أقصى 100)" : "Results count (max 100)" },
              ]}
              responseExample={`{
  "data": [
    {
      "id": "emp_abc123",
      "name": "Sara",
      "role": "Social Media Manager",
      "status": "ACTIVE",
      "specialization": "social_media",
      "capabilities": ["content_creation", "scheduling"],
      "department": { "id": "dept_1", "name": "Marketing", "color": "#10b981" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "totalPages": 1
  }
}`}
              lang={lang}
            />

            {/* Employee Detail */}
            <EndpointCard
              method="GET"
              path="/api/v1/employees/:id"
              title={isAr ? "تفاصيل موظف" : "Employee Detail"}
              description={isAr
                ? "جلب بيانات موظف محدد مع إحصائيات الأداء."
                : "Fetch specific employee data with performance statistics."}
              responseExample={`{
  "data": {
    "id": "emp_abc123",
    "name": "Sara",
    "role": "Social Media Manager",
    "specialization": "social_media",
    "personality": "Creative and detail-oriented...",
    "capabilities": ["content_creation", "analytics"],
    "constraints": ["no_political_content"],
    "department": { "id": "dept_1", "name": "Marketing" },
    "_count": {
      "conversations": 42,
      "tokenUsages": 156,
      "decisions": 8,
      "tasks": 23
    }
  }
}`}
              lang={lang}
            />

            {/* Conversations */}
            <EndpointCard
              method="GET"
              path="/api/v1/conversations"
              title={isAr ? "قائمة المحادثات" : "List Conversations"}
              description={isAr
                ? "جلب جميع المحادثات مع تفاصيل المشاركين وآخر رسالة."
                : "Fetch all conversations with participant details and last message."}
              params={[
                { name: "employeeId", type: "string", required: false, desc: isAr ? "تصفية حسب الموظف" : "Filter by employee" },
                { name: "page", type: "number", required: false, desc: isAr ? "رقم الصفحة" : "Page number" },
                { name: "limit", type: "number", required: false, desc: isAr ? "عدد النتائج" : "Results count" },
              ]}
              lang={lang}
            />

            {/* Usage */}
            <EndpointCard
              method="GET"
              path="/api/v1/usage"
              title={isAr ? "إحصائيات الاستخدام" : "Usage Analytics"}
              description={isAr
                ? "إحصائيات شاملة: استخدام يومي/أسبوعي/شهلي، أكثر النقاط استخداماً، أداء المفاتيح."
                : "Comprehensive stats: daily/weekly/monthly usage, top endpoints, key performance."}
              responseExample={`{
  "data": {
    "summary": {
      "today": { "requests": 142, "tokens": 28500 },
      "thisWeek": { "requests": 891, "tokens": 178200, "avgResponseTime": 1200 },
      "thisMonth": { "requests": 3420, "tokens": 684000, "avgResponseTime": 1150 }
    },
    "topEndpoints": [
      { "endpoint": "POST /api/v1/chat", "requests": 2100, "tokensUsed": 420000 }
    ],
    "dailyUsage": [
      { "date": "2025-01-15", "requests": 142, "tokens": 28500 }
    ],
    "apiKeys": [
      { "name": "Production App", "totalRequests": 3000, "totalTokensUsed": 600000 }
    ]
  }
}`}
              lang={lang}
            />
          </TabsContent>

          {/* ============================================ */}
          {/* Authentication */}
          {/* ============================================ */}
          <TabsContent value="auth" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Key className="w-5 h-5 text-brand" />
                  {isAr ? "كيف تعمل المصادقة" : "How Authentication Works"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>{isAr
                    ? "كل طلب API يجب أن يحتوي على مفتاح API صالح في header المصادقة. المفاتيح تبدأ بـ blv_sk_ وتُخزّن مشفرة بـ SHA-256 — لا نحتفظ بالمفتاح الأصلي أبداً."
                    : "Every API request must include a valid API key in the Authorization header. Keys start with blv_sk_ and are stored encrypted with SHA-256 — we never store the original key."}</p>
                </div>
                <CodeBlock
                  code={`// Include in every request:
Authorization: Bearer blv_sk_a1b2c3d4e5f6...

// Or as query parameter (for simple integrations):
GET /api/v1/employees?api_key=blv_sk_a1b2c3d4e5f6...`}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-brand" />
                  {isAr ? "الصلاحيات (Scopes)" : "Scopes"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["chat", "employees", "conversations", "usage"].map((scope) => (
                    <div key={scope} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="w-2 h-2 rounded-full bg-brand" />
                      <div>
                        <code className="text-sm font-mono text-foreground">{scope}</code>
                        <p className="text-xs text-muted-foreground">
                          {scope === "chat" && (isAr ? "إرسال واستقبال الرسائل" : "Send and receive messages")}
                          {scope === "employees" && (isAr ? "عرض بيانات الموظفين" : "View employee data")}
                          {scope === "conversations" && (isAr ? "عرض المحادثات" : "View conversations")}
                          {scope === "usage" && (isAr ? "إحصائيات الاستخدام" : "Usage analytics")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-brand" />
                  {isAr ? "حدود الطلبات" : "Rate Limits"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-semibold">Plan</th>
                        <th className="text-center p-3 font-semibold">{isAr ? "طلبات/دقيقة" : "Requests/min"}</th>
                        <th className="text-center p-3 font-semibold">{isAr ? "طلبات/يوم" : "Requests/day"}</th>
                        <th className="text-center p-3 font-semibold">{isAr ? "أقصى مفاتيح" : "Max Keys"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="p-3 font-medium">Professional</td>
                        <td className="p-3 text-center">60</td>
                        <td className="p-3 text-center">10,000</td>
                        <td className="p-3 text-center">5</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="p-3 font-medium">Enterprise</td>
                        <td className="p-3 text-center">200</td>
                        <td className="p-3 text-center">50,000</td>
                        <td className="p-3 text-center">20</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {isAr
                    ? "عند تجاوز الحد، ستحصل على استجابة 429 مع header Retry-After. تحقق من headers X-RateLimit-Remaining و X-RateLimit-Reset."
                    : "When the limit is exceeded, you will receive a 429 response with a Retry-After header. Check X-RateLimit-Remaining and X-RateLimit-Reset headers."}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================ */}
          {/* Errors */}
          {/* ============================================ */}
          <TabsContent value="errors" className="space-y-4">
            {[
              { code: 401, label: "UNAUTHORIZED", desc: isAr ? "مفتاح API غير صالح أو مفقود" : "Invalid or missing API key", example: `{\n  "error": {\n    "code": "UNAUTHORIZED",\n    "message": "Invalid or missing API key. Provide a valid key via Authorization: Bearer blv_sk_..."\n  }\n}` },
              { code: 403, label: "FORBIDDEN", desc: isAr ? "ليس لديك صلاحية (خطة أو scope)" : "Insufficient permissions (plan or scope)", example: `{\n  "error": {\n    "code": "FORBIDDEN",\n    "message": "Your API key does not have 'chat' scope"\n  }\n}` },
              { code: 429, label: "RATE_LIMITED", desc: isAr ? "تجاوزت حد الطلبات" : "Rate limit exceeded", example: `{\n  "error": {\n    "code": "RATE_LIMITED",\n    "message": "API rate limit exceeded.",\n    "retryAfterSeconds": 45\n  }\n}` },
              { code: 400, label: "VALIDATION_ERROR", desc: isAr ? "معاملات غير صالحة" : "Invalid parameters", example: `{\n  "error": {\n    "code": "VALIDATION_ERROR",\n    "message": "employeeId and message are required"\n  }\n}` },
              { code: 404, label: "NOT_FOUND", desc: isAr ? "الموظف أو المحادثة غير موجود" : "Employee or conversation not found", example: `{\n  "error": {\n    "code": "NOT_FOUND",\n    "message": "Employee not found or does not belong to your company"\n  }\n}` },
            ].map((err) => (
              <Card key={err.code} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-lg font-bold font-mono ${err.code >= 400 && err.code < 500 ? (err.code === 429 ? "text-amber-500" : "text-red-500") : "text-blue-500"}`}>
                      {err.code}
                    </span>
                    <code className="text-xs font-mono text-muted-foreground">{err.label}</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{err.desc}</p>
                  <CodeBlock code={err.example} lang="json" />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ============================================ */}
          {/* SDKs */}
          {/* ============================================ */}
          <TabsContent value="sdks" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-brand" />
                  {isAr ? "JavaScript / TypeScript SDK" : "JavaScript / TypeScript SDK"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isAr ? "استخدم هذا الكود مباشرة في مشروعك. لا يحتاج لتثبيت حزم خارجية."
                    : "Use this code directly in your project. No external packages required."}
                </p>
                <CodeBlock
                  code={`class BlivoAI {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.baseUrl = 'https://blivoai.com/api/v1'
  }

  private async request(endpoint: string, options?: RequestInit) {
    const res = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.apiKey}\`,
        ...options?.headers,
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'API Error')
    return data
  }

  // Chat with an AI employee
  async chat(employeeId: string, message: string, opts?: {
    conversationId?: string
    language?: 'ar' | 'en'
  }) {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ employeeId, message, ...opts }),
    })
  }

  // List employees
  async listEmployees(opts?: {
    departmentId?: string
    specialization?: string
    page?: number
    limit?: number
  }) {
    const params = new URLSearchParams(opts as Record<string, string>)
    return this.request(\`/employees?\${params}\`)
  }

  // Get employee details
  async getEmployee(id: string) {
    return this.request(\`/employees/\${id}\`)
  }

  // List conversations
  async listConversations(opts?: {
    employeeId?: string
    page?: number
    limit?: number
  }) {
    const params = new URLSearchParams(opts as Record<string, string>)
    return this.request(\`/conversations?\${params}\`)
  }

  // Get usage analytics
  async getUsage() {
    return this.request('/usage')
  }
}

// Usage:
const blivo = new BlivoAI('blv_sk_YOUR_KEY_HERE')

// Chat
const reply = await blivo.chat('emp_123', 'Write a marketing plan')
console.log(reply.data.reply)

// List employees
const employees = await blivo.listEmployees()
console.log(employees.data)`}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Terminal className="w-5 h-5 text-brand" />
                  cURL {isAr ? "أمثلة" : "Examples"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock
                  code={`# Chat with employee
curl -X POST https://blivoai.com/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer blv_sk_YOUR_KEY" \\
  -d '{
    "employeeId": "emp_123",
    "message": "Hello!"
  }'

# List employees
curl https://blivoai.com/api/v1/employees \\
  -H "Authorization: Bearer blv_sk_YOUR_KEY"

# Get usage stats
curl https://blivoai.com/api/v1/usage \\
  -H "Authorization: Bearer blv_sk_YOUR_KEY"`}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center py-10 border-t border-border mt-8">
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "تحتاج مساعدة؟ تواصل معنا أو راجع لوحة التحكم لإنشاء مفتاح API."
              : "Need help? Contact us or visit your dashboard to create an API key."}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            BlivoAI Developer API v1.0 — {isAr ? "جميع الحقوق محفوظة" : "All rights reserved"}
          </p>
        </div>
      </div>
    </PublicPageLayout>
  )
}