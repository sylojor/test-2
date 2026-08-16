# BlivoAI Demo Platform — Feature Enhancement Implementation Plan

## Executive Summary

This plan covers 5 major features for the BlivoAI demo platform (Next.js 16, Prisma, TypeScript, Docker). Each feature is broken down into concrete steps with file paths, code patterns, complexity ratings, and deployment considerations.

**Current Architecture Key Points:**
- Prisma schema: 1266 lines, PostgreSQL, 30+ models
- LLM service: multi-provider (together/grok/openrouter/local/zai/mock), tier-based (LIGHT/MEDIUM/HEAVY)
- Employee system: soft delete exists (status=DELETED), company-level Integration model
- Agent executor: already has AgentSession for autonomous tasks, but only triggered at creation time
- Employee generator: keyword-based capability matching (BUG: cross-domain suggestions leak)
- Docker: demo-chatbot container on port 3001

---

## PHASE 1: Employee Access Tokens (per-employee, not per-company)

**Priority: HIGHEST | Complexity: MEDIUM (6/10) | Estimated Time: 4-6 hours**

### 1.1 Prisma Schema Changes

**File:** `prisma/schema.prisma`

Add new `EmployeeAccessToken` model:

```prisma
// ============================================
// Employee Access Tokens — per-employee OAuth tokens
// Ahmad (social media manager) gets Instagram + Facebook tokens
// ============================================

model EmployeeAccessToken {
  id            String   @id @default(cuid())
  
  // مين يملك هاد التوكن — الموظف مش الشركة!
  employeeId    String
  employee      Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  // المنصة
  platform      IntegrationPlatform
  
  // التوكنات
  accessToken   String                // OAuth access token
  refreshToken  String?               // OAuth refresh token (لو المنصة بتعطي)
  tokenExpiresAt DateTime?            // تاريخ انتهاء التوكن
  scopes        String?               // JSON array — scopes الممنوحة
  
  // بيانات المنصة
  platformUserId String?              // ID المستخدم على المنصة
  platformName   String?              // اسم المستخدم على المنصة
  platformAvatar String?              // صورة المستخدم على المنصة
  
  // حالة التوكن
  isActive      Boolean  @default(true)
  lastUsedAt    DateTime?             // آخر استخدام
  
  // Preservation: لو الموظف حذف/استبدل → التوكن يضل
  inheritedFromEmployeeId String?     // من موظف سابق ورث التوكن
  inheritedAt   DateTime?             // تاريخ الوراثة
  
  // Metadata
  metadata      String?               // JSON — بيانات إضافية حسب المنصة
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([employeeId, platform])    // موظف واحد → توكن واحد لكل منصة
  @@map("employee_access_tokens")
}
```

**Also update Employee model** — add relation:

```prisma
model Employee {
  // ... existing fields ...
  
  // Employee Access Tokens — per-employee OAuth
  accessTokens  EmployeeAccessToken[]
  
  // ... existing relations ...
}
```

**Also add `replacedByEmployeeId` field** on Employee for data preservation:

```prisma
model Employee {
  // ... existing fields ...
  
  // Data preservation — when replaced
  replacedByEmployeeId String?        // الموظف الجديد اللي ورث البيانات
  replacedAt    DateTime?             // تاريخ الاستبدال
  
  // ... existing relations ...
}
```

**New enum values** — expand IntegrationPlatform:

```prisma
enum IntegrationPlatform {
  FACEBOOK
  INSTAGRAM
  TWITTER
  LINKEDIN
  GOOGLE
  TIKTOK
  YOUTUBE
  SNAPCHAT
  WHATSAPP_BUSINESS
  EMAIL         // IMAP/SMTP tokens
  STRIPE        // payment gateway
  SHOPIFY       // e-commerce
  CUSTOM_API    // any custom API
  OTHER
}
```

### 1.2 Migration

```bash
npx prisma migrate dev --name add_employee_access_tokens
```

This creates:
- `employee_access_tokens` table
- Unique constraint on (employeeId, platform)
- FK to employees

### 1.3 API Routes

**Create:** `src/app/api/employees/[id]/tokens/route.ts`

```typescript
// GET  — List all tokens for an employee
// POST — Add a new token for an employee
// PATCH — Update a token (revoke, refresh, edit)
// DELETE — Remove a token

// GET /api/employees/[id]/tokens
export async function GET(request, { params }) {
  // Auth check
  // Fetch employee's tokens
  // Mask accessToken for display (show last 4 chars only)
  // Return tokens with platform info
}

// POST /api/employees/[id]/tokens
export async function POST(request, { params }) {
  // Auth check + verify employee belongs to user's company
  // Validate: platform, accessToken required
  // Check unique constraint (employeeId + platform)
  // Create EmployeeAccessToken
  // Audit log: "employee_token_added"
}

// PATCH /api/employees/[id]/tokens
export async function PATCH(request, { params }) {
  // Auth check
  // Update: isActive, refreshToken, scopes, metadata
  // If isActive=false → soft revoke
  // Audit log: "employee_token_updated"
}

// DELETE /api/employees/[id]/tokens?tokenId=xxx
export async function DELETE(request, { params }) {
  // Auth check
  // Delete token by tokenId
  // Audit log: "employee_token_removed"
}
```

**Create:** `src/app/api/employees/[id]/tokens/[tokenId]/route.ts`

```typescript
// GET  — Get single token details
// PATCH — Update specific token (refresh, revoke)
// DELETE — Delete specific token
```

### 1.4 Token Inheritance Logic

**Create:** `src/lib/token-inheritance.ts`

```typescript
// When employee is deleted/replaced:
export async function inheritTokensToReplacement(
  oldEmployeeId: string,
  newEmployeeId: string
): Promise<void> {
  // 1. Find all active tokens for old employee
  const tokens = await db.employeeAccessToken.findMany({
    where: { employeeId: oldEmployeeId, isActive: true }
  })
  
  // 2. For each token, create a new one for the replacement employee
  for (const token of tokens) {
    await db.employeeAccessToken.create({
      data: {
        employeeId: newEmployeeId,
        platform: token.platform,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        tokenExpiresAt: token.tokenExpiresAt,
        scopes: token.scopes,
        platformUserId: token.platformUserId,
        platformName: token.platformName,
        inheritedFromEmployeeId: oldEmployeeId,
        inheritedAt: new Date(),
        isActive: true,
      }
    })
  }
  
  // 3. Mark old employee tokens as inherited (not active anymore for old employee)
  await db.employeeAccessToken.updateMany({
    where: { employeeId: oldEmployeeId },
    data: { isActive: false }
  })
}
```

### 1.5 UI Components

**Create:** `src/components/employees/employee-detail-view.tsx`

A new component that shows when clicking on employee name:

```typescript
interface EmployeeDetailViewProps {
  employee: IEmployee
  onClose: () => void
}

// Layout:
// - Header: employee avatar, name, role, specialization, status badge
// - Tab 1: Employee Info (personality, capabilities, constraints, system prompt)
// - Tab 2: Access Tokens (list, add, edit, revoke)
// - Tab 3: Model Routing (per-employee model config) — PHASE 2
// - Tab 4: Activity History (recent decisions, tasks, conversations)
// - Tab 5: Data Preservation (if replaced → show predecessor info)
```

**Create:** `src/components/employees/token-manager.tsx`

```typescript
interface TokenManagerProps {
  employeeId: string
  tokens: EmployeeAccessToken[]
  onAddToken: (platform: IntegrationPlatform, accessToken: string, ...) => void
  onRemoveToken: (tokenId: string) => void
  onUpdateToken: (tokenId: string, updates: ...) => void
}

// Features:
// - List tokens by platform with status badges (active/expired/revoked)
// - Add token dialog: select platform + paste access token
// - Edit token: update scopes, refresh token
// - Revoke token: set isActive=false
// - Visual: platform icons (Instagram, Facebook, etc.)
// - Show inherited tokens with badge "موروث من [اسم الموظف السابق]"
```

**Modify:** `src/components/dashboard/employees-panel.tsx`

Add click handler on employee name to open detail view:

```typescript
// Current: just a card with basic info
// New: click on employee name → setSelectedEmployee(id) + setActiveTab("employee-detail")
```

**Modify:** `src/stores/dashboard-store.ts`

Add new tab:

```typescript
export type DashboardTab = 
  | ... existing tabs ...
  | "employee-detail"  // NEW: employee detail + tokens + model routing
```

**Modify:** `src/types/index.ts`

Add new interfaces:

```typescript
export interface IEmployeeAccessToken {
  id: string
  employeeId: string
  platform: IntegrationPlatform
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: Date
  scopes?: string
  platformUserId?: string
  platformName?: string
  isActive: boolean
  inheritedFromEmployeeId?: string
  inheritedAt?: Date
  lastUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

### 1.6 Modify Employee DELETE endpoint

**Modify:** `src/app/api/employees/[id]/route.ts`

```typescript
// DELETE handler changes:
// If body includes { replacementEmployeeId: "xxx" } → inherit data
// Otherwise → just soft delete (status = "DELETED")

export async function DELETE(request, { params }) {
  const body = await request.json().catch(() => {}) // optional body
  
  const existing = await db.employee.findUnique({ where: { id } })
  
  // Soft delete
  const employee = await db.employee.update({
    where: { id },
    data: {
      status: "DELETED",
      replacedByEmployeeId: body?.replacementEmployeeId || null,
      replacedAt: new Date(),
    }
  })
  
  // If replacement specified → inherit tokens + data
  if (body?.replacementEmployeeId) {
    await inheritTokensToReplacement(id, body.replacementEmployeeId)
    await inheritDataToReplacement(id, body.replacementEmployeeId) // PHASE 5
  }
}
```

---

## PHASE 2: Smart Model Routing (per-employee, per-task-type)

**Priority: HIGH | Complexity: HIGH (8/10) | Estimated Time: 8-12 hours**

### 2.1 Prisma Schema Changes

**Add:** `EmployeeModelRouting` model

```prisma
// ============================================
// Model Routing per Employee — each employee uses different models for different tasks
// Ahmad (social media): Flux Pro for images, Grok-3 for conversation, DeepSeek for analysis
// ============================================

model EmployeeModelRouting {
  id          String   @id @default(cuid())
  
  employeeId  String
  employee    Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  // نوع المهمة
  taskType    RequestType              // CHAT, GENERATION, ANALYSIS, CODE, IMAGE, TRANSLATION
  
  // الموديل المحدد لهذه المهمة
  llmModelId  String
  llmModel    LLMModel  @relation(fields: [llmModelId], references: [id], onDelete: Cascade)
  
  // أولوية (لو في أكثر من موديل لنوع المهمة)
  priority    Int      @default(1)     // 1 = primary, 2 = fallback
  
  // هل هذا التوجيه نشط
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([employeeId, taskType, priority])  // موظف + نوع مهمة + أولوية = توجيه واحد
  @@map("employee_model_routing")
}
```

**Add new RequestType enum value:**

```prisma
enum RequestType {
  CHAT
  GENERATION
  SUMMARIZATION
  ANALYSIS
  TRANSLATION
  CODE
  IMAGE          // NEW: image generation
  DECISION       // NEW: decision making
  OTHER
}
```

**Update Employee and LLMModel relations:**

```prisma
model Employee {
  // ... existing ...
  modelRoutings  EmployeeModelRouting[]
}

model LLMModel {
  // ... existing ...
  employeeRoutings EmployeeModelRouting[]
}
```

### 2.2 Migration

```bash
npx prisma migrate dev --name add_employee_model_routing
```

### 2.3 Smart Model Routing Logic

**Modify:** `src/lib/llm-service.ts`

Add new function `getSmartModelForEmployee()`:

```typescript
// ============================================
// Smart Model Routing — per-employee, per-task-type
// Priority: Employee routing > Company default > Global tier
// ============================================

export async function sendToLLM(
  request: LLMRequest,
  companyId: string,
  employeeId: string,
): Promise<LLMResponse> {
  // NEW STEP: Check employee-specific model routing first
  const routedModel = await getSmartModelForEmployee(
    employeeId,
    request.requestType,
    companyId,
  )
  
  if (routedModel) {
    // Use the specifically routed model
    return callSpecificModel(request, routedModel, companyId, employeeId)
  }
  
  // Fallback: existing tier-based logic
  // ... (keep existing code unchanged)
}

async function getSmartModelForEmployee(
  employeeId: string,
  taskType: RequestType,
  companyId: string,
): Promise<LLMModel | null> {
  try {
    const db = await getDb()
    
    // 1. Check employee-specific routing
    const employeeRouting = await db.employeeModelRouting.findFirst({
      where: {
        employeeId,
        taskType,
        isActive: true,
      },
      include: { llmModel: true },
      orderBy: { priority: "asc" },
    })
    
    if (employeeRouting?.llmModel?.isActive) {
      return employeeRouting.llmModel
    }
    
    // 2. Check department-level routing (future enhancement)
    // const employee = await db.employee.findUnique({ where: { id: employeeId } })
    // ... department defaults
    
    // 3. Check company-level LLMModel defaults
    const companyDefault = await db.lLMModel.findFirst({
      where: {
        isActive: true,
        isDefault: true,
        // Match by capability
        capabilities: { contains: taskType },
      },
      orderBy: { priority: "asc" },
    })
    
    if (companyDefault) {
      return companyDefault
    }
    
    // 4. No specific routing → null (fall back to tier-based)
    return null
  } catch {
    return null
  }
}

async function callSpecificModel(
  request: LLMRequest,
  model: LLMModel,
  companyId: string,
  employeeId: string,
): Promise<LLMResponse> {
  // Build config from the specific model
  const config: LLMConfig = {
    provider: model.provider as LLMProvider,
    apiKey: model.apiKeyValue || process.env.LLM_API_KEY,
    baseUrl: model.baseUrl || PROVIDER_BASE_URLS[model.provider] || "",
    models: {
      LIGHT: model.modelId,
      MEDIUM: model.modelId,
      HEAVY: model.modelId,
    },
  }
  
  // Use existing provider call infrastructure
  const messages = buildConversationContext(request.messages)
  const baseUrl = config.baseUrl || PROVIDER_BASE_URLS[config.provider] || config.baseUrl
  
  // Call via openAICompatibleCall (works for together, grok, openrouter, local)
  if (["together", "grok", "openrouter", "local"].includes(config.provider)) {
    const response = await openAICompatibleCall(messages, model.tier, config, baseUrl)
    // Record token usage with specific model info
    await recordTokenUsage({
      employeeId,
      modelTier: model.tier,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      requestType: request.requestType,
      cached: false,
    })
    // Update model statistics
    await db.lLMModel.update({
      where: { id: model.id },
      data: {
        totalCalls: { increment: 1 },
        totalTokensIn: { increment: response.tokensIn },
        totalTokensOut: { increment: response.tokensOut },
        totalCost: { increment: response.estimatedCost },
        lastUsedAt: new Date(),
      },
    })
    return response
  }
  
  // ZAI or mock fallback
  if (config.provider === "zai") {
    return zaiLLMCall(messages, model.tier, request.requestType)
  }
  
  return mockLLMCall(messages, model.tier, request.requestType)
}
```

### 2.4 Admin Model Configuration Enhancement

**Modify:** `src/app/api/admin/models/route.ts`

Add endpoint for setting up per-employee model routing:

**Create:** `src/app/api/employees/[id]/model-routing/route.ts`

```typescript
// GET  — Get employee's model routing config
// POST — Set model routing for a task type
// PUT  — Update model routing
// DELETE — Remove model routing for a task type

// GET /api/employees/[id]/model-routing
export async function GET(request, { params }) {
  // Auth check
  // Fetch EmployeeModelRouting records for this employee
  // Include llmModel details
  // Return routing config + available models list
}

// POST /api/employees/[id]/model-routing
export async function POST(request, { params }) {
  // Auth check + verify employee belongs to user's company
  // Body: { taskType, llmModelId, priority }
  // Validate: taskType is valid RequestType, llmModelId exists and is active
  // Create EmployeeModelRouting record
  // Audit log
}
```

### 2.5 Recommended Model Configuration

**Create:** `src/lib/model-recommendations.ts`

```typescript
// Smart recommendations for model routing based on employee specialization
// "powerful but cheap" models mapped to task types

export const TASK_MODEL_RECOMMENDATIONS: Record<string, {
  taskType: RequestType
  recommendedModels: { modelId: string; provider: string; name: string; priceInput: number; priceOutput: number }[]
}> = {
  IMAGE_GENERATION: {
    taskType: "IMAGE",
    recommendedModels: [
      { modelId: "black-forest-labs/FLUX.1-pro", provider: "together", name: "Flux Pro", priceInput: 0, priceOutput: 0.05 },
      { modelId: "stabilityai/stable-diffusion-xl", provider: "together", name: "SDXL", priceInput: 0, priceOutput: 0.02 },
    ]
  },
  DECISION_MAKING: {
    taskType: "DECISION",
    recommendedModels: [
      { modelId: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", provider: "together", name: "Llama 405B", priceInput: 3.0, priceOutput: 5.0 },
      { modelId: "grok-3", provider: "grok", name: "Grok-3", priceInput: 3.0, priceOutput: 5.0 },
    ]
  },
  CONVERSATION: {
    taskType: "CHAT",
    recommendedModels: [
      { modelId: "grok-3", provider: "grok", name: "Grok-3", priceInput: 3.0, priceOutput: 5.0 },
      { modelId: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", provider: "together", name: "Llama 70B", priceInput: 0.88, priceOutput: 0.88 },
    ]
  },
  ANALYSIS: {
    taskType: "ANALYSIS",
    recommendedModels: [
      { modelId: "deepseek-ai/DeepSeek-V3", provider: "together", name: "DeepSeek-V3", priceInput: 0.50, priceOutput: 1.50 },
      { modelId: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", provider: "together", name: "Llama 405B", priceInput: 3.0, priceOutput: 5.0 },
    ]
  },
  CODE_GENERATION: {
    taskType: "CODE",
    recommendedModels: [
      { modelId: "deepseek-ai/DeepSeek-V3", provider: "together", name: "DeepSeek-V3", priceInput: 0.50, priceOutput: 1.50 },
      { modelId: "Qwen/Qwen2.5-Coder-32B-Instruct", provider: "together", name: "Qwen Coder 32B", priceInput: 0.20, priceOutput: 0.60 },
    ]
  },
}

// Get recommendations for an employee based on their specialization
export function getModelRecommendationsForEmployee(specialization: string): typeof TASK_MODEL_RECOMMENDATIONS {
  const context = specialization.toLowerCase()
  
  // Map specialization to relevant task types
  if (context.includes("سوشال") || context.includes("social") || context.includes("محتوى") || context.includes("content")) {
    return {
      ...TASK_MODEL_RECOMMENDATIONS.CONVERSATION,
      ...TASK_MODEL_RECOMMENDATIONS.IMAGE_GENERATION,
      ...TASK_MODEL_RECOMMENDATIONS.ANALYSIS,
    }
  }
  
  if (context.includes("محاسب") || context.includes("مال") || context.includes("finance")) {
    return {
      ...TASK_MODEL_RECOMMENDATIONS.ANALYSIS,
      ...TASK_MODEL_RECOMMENDATIONS.DECISION_MAKING,
    }
  }
  
  // Default: all task types
  return TASK_MODEL_RECOMMENDATIONS
}
```

### 2.6 UI Components for Model Routing

**Create:** `src/components/employees/model-routing-config.tsx`

```typescript
interface ModelRoutingConfigProps {
  employeeId: string
  currentRouting: EmployeeModelRouting[]
  availableModels: LLMModel[]
  onUpdateRouting: (taskType: RequestType, llmModelId: string) => void
}

// Layout:
// - Grid of task types: CHAT, GENERATION, ANALYSIS, CODE, IMAGE, DECISION
// - Each task type shows:
//   - Current model assignment (if set)
//   - Dropdown to select from available models
//   - Recommended models for this employee (based on specialization)
//   - Price estimate for each model
// - "Auto-configure" button: set up recommended models based on employee specialization
// - "Reset to default" button: remove all routing, use global tier system
```

**Modify:** `src/components/employees/employee-detail-view.tsx`

Add Tab 2 (Model Routing) using the new component.

**Modify:** `src/components/dashboard/settings-panel.tsx`

Add section for Together AI API key configuration (persisted to LLMModel table, not just env vars):

```typescript
// Current: only tests connection, doesn't persist API key
// New: ability to add API keys per provider (stored in LLMModel.apiKeyValue)
// This enables per-employee model routing with different providers
```

---

## PHASE 3: Autonomous Action Execution

**Priority: MEDIUM-HIGH | Complexity: HIGH (9/10) | Estimated Time: 12-16 hours**

### 3.1 Prisma Schema Changes

**Add:** `EmployeeAction` model for tracking autonomous actions

```prisma
// ============================================
// Autonomous Actions — employees execute actions independently
// Not just at creation time — employees proactively act
// ============================================

model EmployeeAction {
  id            String   @id @default(cuid())
  
  employeeId    String
  employee      Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  companyId     String
  
  // نوع العمل
  actionType    EmployeeActionType
  
  // تفاصيل العمل
  title         String                   // عنوان مختصر
  description   String                   // تفصيل العمل
  trigger       String?                  // ما الذي أ trigger هاد العمل (periodic, user_request, proactive, scheduled)
  
  // المدخلات
  input         String?                  // JSON — بيانات المدخلات
  
  // النتيجة
  output        String?                  // JSON — نتيجة العمل
  status        ActionStatus @default(PENDING)
  
  // هل يحتاج موافقة
  requiresApproval Boolean @default(false)
  approvedBy    String?                  // userId اللي وافق
  approvedAt    DateTime?
  
  // التوكن المستخدم
  tokensUsed    Int      @default(0)
  cost          Float    @default(0)
  
  // العلاقات
  parentActionId String?                 // لو هاد عمل فرعي
  parentAction   EmployeeAction? @relation("ActionChain", fields: [parentActionId], references: [id], onDelete: SetNull)
  childActions   EmployeeAction[] @relation("ActionChain")
  
  // المحادثة المرتبطة
  conversationId String?
  
  // Timing
  scheduledAt   DateTime?               // لو مجدول
  executedAt    DateTime?               // تاريخ التنفيذ الفعلي
  completedAt   DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@map("employee_actions")
}

enum EmployeeActionType {
  POST_CONTENT        // نشر محتوى على منصة
  REPLY_COMMENT       // رد على تعليق
  SEND_MESSAGE        // إرسال رسالة
  GENERATE_IMAGE      // توليد صورة
  CREATE_REPORT       // إنشاء تقرير
  ANALYZE_DATA        // تحليل بيانات
  MAKE_DECISION       // اتخاذ قرار
  SCHEDULE_CONTENT    // جدولة محتوى
  FETCH_DATA          // جلب بيانات من منصة
  EXECUTE_API_CALL    // استدعاء API عام
  INTERNAL_PROCESS    // عملية داخلية
  OTHER
}

enum ActionStatus {
  PENDING           // بانتظار التنفيذ
  SCHEDULED         // مجدول
  AWAITING_APPROVAL // بانتظار موافقة المدير
  EXECUTING         // جاري التنفيذ
  COMPLETED         // مكتمل
  FAILED            // فشل
  CANCELLED         // ملغى
}
```

### 3.2 Autonomous Action Engine

**Create:** `src/lib/autonomous-actions.ts`

```typescript
// ============================================
// Autonomous Action Engine
// Employees proactively decide when, where, and what to do
// ============================================

import { db } from "@/lib/db"
import { sendToLLM, getSmartModelForEmployee } from "@/lib/llm-service"
import type { RequestType, LLMMessage } from "@/types"

// --- Action triggers ---
export type ActionTrigger = 
  | "periodic"     // دوري (كل يوم/ساعة)
  | "proactive"    // الموظف decides to act
  | "user_request" // المدير طلب
  | "scheduled"    // مجدول (وقت محدد)
  | "event"        // حدث (تعليق جديد، إشعار...)

// --- Main execution function ---
export async function executeEmployeeAction(
  employeeId: string,
  companyId: string,
  actionType: EmployeeActionType,
  trigger: ActionTrigger,
  title: string,
  description: string,
  input?: Record<string, any>,
  requiresApproval?: boolean,
): Promise<EmployeeAction> {
  
  // 1. Get employee + check status
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { accessTokens: { where: { isActive: true } } }
  })
  
  if (!employee || employee.status !== "ACTIVE") {
    throw new Error("Employee not active")
  }
  
  // 2. Check approval mode
  if (employee.approvalMode === "ALWAYS_APPROVE" && requiresApproval) {
    // Create action in AWAITING_APPROVAL state
    return await db.employeeAction.create({
      data: {
        employeeId,
        companyId,
        actionType,
        title,
        description,
        trigger,
        input: input ? JSON.stringify(input) : null,
        requiresApproval: true,
        status: "AWAITING_APPROVAL",
      }
    })
  }
  
  // 3. Create action record
  const action = await db.employeeAction.create({
    data: {
      employeeId,
      companyId,
      actionType,
      title,
      description,
      trigger,
      input: input ? JSON.stringify(input) : null,
      status: "EXECUTING",
      requiresApproval: requiresApproval ?? false,
      executedAt: new Date(),
    }
  })
  
  try {
    // 4. Determine task type for LLM routing
    const taskType = mapActionTypeToRequestType(actionType)
    
    // 5. Get appropriate model (smart routing)
    const routedModel = await getSmartModelForEmployee(employeeId, taskType, companyId)
    
    // 6. Build LLM messages for action execution
    const messages = buildActionMessages(employee, action, input)
    
    // 7. Call LLM
    const llmResponse = await sendToLLM(
      { messages, requestType: taskType, maxTokens: 4096 },
      companyId,
      employeeId,
    )
    
    // 8. Parse action output
    const output = parseActionOutput(llmResponse.content, actionType)
    
    // 9. Execute the actual action (if it involves an external platform)
    let executionResult: Record<string, any> | null = null
    
    if (requiresPlatformExecution(actionType)) {
      executionResult = await executeOnPlatform(
        employee,
        actionType,
        output,
        input,
      )
    }
    
    // 10. Update action record
    const finalOutput = executionResult || output
    await db.employeeAction.update({
      where: { id: action.id },
      data: {
        status: "COMPLETED",
        output: JSON.stringify(finalOutput),
        tokensUsed: llmResponse.tokensIn + llmResponse.tokensOut,
        cost: llmResponse.estimatedCost,
        completedAt: new Date(),
      }
    })
    
    // 11. Audit log
    await db.auditLog.create({
      data: {
        companyId,
        action: "employee_autonomous_action",
        actorType: "EMPLOYEE",
        actorId: employeeId,
        actorName: employee.name,
        details: JSON.stringify({
          actionId: action.id,
          actionType,
          title,
          trigger,
          tokensUsed: llmResponse.tokensIn + llmResponse.tokensOut,
          cost: llmResponse.estimatedCost,
        }),
      }
    })
    
    return action
  } catch (error) {
    await db.employeeAction.update({
      where: { id: action.id },
      data: {
        status: "FAILED",
        output: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        completedAt: new Date(),
      }
    })
    throw error
  }
}

// --- Platform execution ---
async function executeOnPlatform(
  employee: Employee & { accessTokens: EmployeeAccessToken[] },
  actionType: EmployeeActionType,
  output: Record<string, any>,
  input?: Record<string, any>,
): Promise<Record<string, any> | null> {
  
  // For POST_CONTENT: use the employee's platform access token
  if (actionType === "POST_CONTENT") {
    const platform = input?.platform || "INSTAGRAM"
    const token = employee.accessTokens.find(t => t.platform === platform)
    
    if (!token) {
      return { error: `No access token for ${platform}` }
    }
    
    // Call platform API using the employee's personal access token
    return await postOnPlatform(platform, token.accessToken, output)
  }
  
  // Similar for other action types...
  return null
}

// --- Proactive action trigger ---
// The employee decides to act based on its context
export async function triggerProactiveAction(
  employeeId: string,
  companyId: string,
): Promise<EmployeeAction | null> {
  // 1. Ask LLM: "Given your role and recent context, should you do something right now?"
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      memories: { orderBy: { updatedAt: "desc" }, take: 10 },
      tasks: { where: { status: "PENDING" }, take: 5 },
    }
  })
  
  if (!employee) return null
  
  const prompt = buildProactivePrompt(employee)
  const response = await sendToLLM(
    { messages: prompt, requestType: "DECISION" },
    companyId,
    employeeId,
  )
  
  // Parse: should the employee act? If yes, what action?
  const decision = parseProactiveDecision(response.content)
  
  if (!decision.shouldAct) return null
  
  return await executeEmployeeAction(
    employeeId,
    companyId,
    decision.actionType,
    "proactive",
    decision.title,
    decision.description,
    decision.input,
    decision.requiresApproval,
  )
}

function mapActionTypeToRequestType(actionType: EmployeeActionType): RequestType {
  const map: Record<string, RequestType> = {
    POST_CONTENT: "GENERATION",
    REPLY_COMMENT: "CHAT",
    SEND_MESSAGE: "CHAT",
    GENERATE_IMAGE: "IMAGE",
    CREATE_REPORT: "GENERATION",
    ANALYZE_DATA: "ANALYSIS",
    MAKE_DECISION: "DECISION",
    SCHEDULE_CONTENT: "GENERATION",
    FETCH_DATA: "OTHER",
    EXECUTE_API_CALL: "CODE",
    INTERNAL_PROCESS: "OTHER",
    OTHER: "OTHER",
  }
  return map[actionType] ?? "OTHER"
}
```

### 3.3 Periodic Action Scheduler

**Create:** `src/lib/action-scheduler.ts`

```typescript
// Runs periodic checks to trigger proactive employee actions
// Uses setTimeout/setInterval within the Next.js server process

const SCHEDULED_CHECKS = {
  daily: 24 * 60 * 60 * 1000,    // Once per day
  hourly: 60 * 60 * 1000,        // Once per hour
  frequent: 15 * 60 * 1000,      // Every 15 minutes
}

export function startActionScheduler() {
  // For each active employee with AUTO_WITH_NOTIFY or AUTO_SILENT mode:
  // Schedule periodic proactive action checks based on their role
  
  // Social media employees: check every hour for content opportunities
  // Accountant employees: daily financial check
  // Developer employees: check for code review opportunities
  
  setInterval(async () => {
    try {
      const activeEmployees = await db.employee.findMany({
        where: { 
          status: "ACTIVE",
          approvalMode: { in: ["AUTO_WITH_NOTIFY", "AUTO_SILENT"] }
        },
      })
      
      for (const emp of activeEmployees) {
        try {
          await triggerProactiveAction(emp.id, emp.companyId)
        } catch (error) {
          console.warn(`[ACTION_SCHEDULER] Failed for employee ${emp.id}:`, error)
        }
      }
    } catch (error) {
      console.error("[ACTION_SCHEDULER_ERROR]", error)
    }
  }, SCHEDULED_CHECKS.hourly)
}
```

### 3.4 API Routes for Actions

**Create:** `src/app/api/employees/[id]/actions/route.ts`

```typescript
// GET  — List employee's actions
// POST — Manually trigger an action for an employee
// PATCH — Approve/reject a pending action

// GET: Return action history with status, results
// POST: { actionType, title, description, input } → execute action
// PATCH: { actionId, approved: true/false } → approve or reject
```

### 3.5 Integration with Agent Executor

**Modify:** `src/lib/agent-executor.ts`

Update `executeAgentTask` to use smart model routing:

```typescript
// Current: selectModelForTask uses generic tier-based selection
// New: use getSmartModelForEmployee first, then fallback

async function selectModelForTask(
  taskType: RequestType,
  preferredTier?: ModelTier,
  employeeId?: string,  // NEW parameter
) {
  // 1. Check employee-specific routing
  if (employeeId) {
    const routedModel = await getSmartModelForEmployee(employeeId, taskType)
    if (routedModel) return routedModel
  }
  
  // 2. Existing logic: check LLMModel table
  // ... (keep existing code)
}
```

### 3.6 UI Components

**Create:** `src/components/dashboard/actions-panel.tsx`

```typescript
// New tab in dashboard: "actions" 
// Shows all employee actions (pending, executing, completed)
// Allow manual triggering of actions
// Show proactive actions with approval buttons
```

**Add tab:** `src/stores/dashboard-store.ts`

```typescript
export type DashboardTab = 
  | ... existing ...
  | "actions"  // NEW: autonomous actions panel
```

---

## PHASE 4: Role-Specific Suggestions Fix

**Priority: MEDIUM | Complexity: LOW (3/10) | Estimated Time: 2-3 hours**

### 4.1 The Bug

**Current behavior in `employee-generator.ts`:**

The `generateSmartCapabilities()` function checks ALL keyword groups independently. If a role description contains "محاسب" AND "سوشال" together, it gets BOTH accounting and social media suggestions. But more critically, even a pure social media employee could trigger accounting suggestions if the role description accidentally contains a keyword like "ضريب" (tax) or similar overlap.

The real problem: **suggestions are additive, not domain-restricted**. The system adds suggestions from every keyword match without checking if they belong to the employee's primary specialization domain.

### 4.2 Fix Strategy

**Modify:** `src/lib/employee-generator.ts`

Replace the additive approach with a **domain-first, exclusion-based** approach:

```typescript
// ============================================
// Domain mapping — each specialization maps to allowed domains
// Suggestions outside the domain are excluded
// ============================================

const DOMAIN_MAP: Record<string, string[]> = {
  // Social media domain
  "سوشال": ["social", "content", "marketing"],
  "محتوى": ["social", "content", "marketing"],
  "تواصل": ["social", "content", "marketing"],
  "social": ["social", "content", "marketing"],
  "content": ["social", "content", "marketing"],
  
  // Finance/accounting domain
  "محاسب": ["finance", "accounting", "tax"],
  "محاسبة": ["finance", "accounting", "tax"],
  "مال": ["finance", "accounting", "tax"],
  "finance": ["finance", "accounting", "tax"],
  "account": ["finance", "accounting", "tax"],
  
  // Programming domain
  "برمج": ["development", "code", "tech"],
  "كود": ["development", "code", "tech"],
  "تطوير": ["development", "code", "tech"],
  "code": ["development", "code", "tech"],
  "develop": ["development", "code", "tech"],
  
  // Design domain
  "تصميم": ["design", "visual", "creative"],
  "design": ["design", "visual", "creative"],
  "جرافيك": ["design", "visual", "creative"],
  
  // Sales domain
  "بيع": ["sales", "ecommerce", "customer"],
  "مبيع": ["sales", "ecommerce", "customer"],
  "store": ["sales", "ecommerce", "customer"],
  
  // Data domain
  "بيان": ["data", "analysis", "reports"],
  "تحليل": ["data", "analysis", "reports"],
  "data": ["data", "analysis", "reports"],
  
  // Management domain
  "إدار": ["management", "leadership", "organization"],
  "مدير": ["management", "leadership", "organization"],
  "manage": ["management", "leadership", "organization"],
  
  // Customer service domain
  "خدم": ["customer", "support", "service"],
  "دعم": ["customer", "support", "service"],
  "customer": ["customer", "support", "service"],
}

// Capabilities mapped to domains
const CAPABILITY_DOMAINS: Record<string, { capabilities: string[], suggestedCapabilities: string[], domain: string[] }> = {
  social_media: {
    domain: ["social", "content", "marketing"],
    capabilities: [
      "إنشاء ونشر محتوى على منصات التواصل",
      "الرد على التعليقات والرسائل بشكل احترافي",
    ],
    suggestedCapabilities: [
      "إعداد تقارير أداء أسبوعية",
      "إدارة الحملات الإعلانية المدفوعة",
    ],
  },
  finance: {
    domain: ["finance", "accounting", "tax"],
    capabilities: [
      "تسجيل العمليات المالية اليومية",
      "إعداد تقارير مالية دورية",
      "متابعة المصروفات والإيرادات",
    ],
    suggestedCapabilities: [
      "إقرار ضريبي سنوي",
      "إعداد كشف تدفق النقد",
      "متابعة المستحقات والمديونيات",
    ],
  },
  // ... all other domains
}

function generateSmartCapabilities(role: string, specialization: string, description?: string): {
  capabilities: string[]
  suggestedCapabilities: string[]
} {
  const context = `${role} ${specialization} ${description ?? ""}`.toLowerCase()
  
  // 1. Determine the PRIMARY domain from specialization
  const primaryDomain = determinePrimaryDomain(specialization.toLowerCase())
  
  // 2. Base capabilities (always included)
  const capabilities: string[] = [
    `تنفيذ مهام ${specialization} بشكل احترافي وكامل`,
    "التواصل مع باقي الموظفين عند الحاجة ضمن نفس المجال",
    "طلب المساعدة من صاحب الشركة عند الأمور المعقدة",
    "تقديم تقارير دورية عن الأداء والتقدم",
  ]
  
  const suggestedCapabilities: string[] = []
  
  // 3. Add ONLY domain-specific capabilities
  // Iterate over CAPABILITY_DOMAINS, add only if domain matches primaryDomain
  for (const [key, domainData] of Object.entries(CAPABILITY_DOMAINS)) {
    // Check if ANY of the context keywords match this domain's tags
    const contextMatchesDomain = domainData.domain.some(d => 
      Object.entries(DOMOMAIN_MAP).some(([keyword, domains]) => 
        domains.includes(d) && context.includes(keyword)
      )
    )
    
    // BUT: only add if the domain matches the employee's PRIMARY domain
    if (contextMatchesDomain && domainData.domain.some(d => primaryDomain.includes(d))) {
      capabilities.push(...domainData.capabilities)
      suggestedCapabilities.push(...domainData.suggestedCapabilities)
    }
  }
  
  // 4. Fallback if no suggestions matched
  if (suggestedCapabilities.length === 0) {
    suggestedCapabilities.push(
      `إعداد خطة عمل شهرية لـ ${specialization}`,
      "مراقبة مؤشرات الأداء الرئيسية",
      "توثيق الإجراءات والعمليات",
    )
  }
  
  return { capabilities, suggestedCapabilities }
}

function determinePrimaryDomain(specializationContext: string): string[] {
  // Find the most relevant domain(s) based on specialization
  let bestDomains: string[] = []
  let matchCount = 0
  
  for (const [keyword, domains] of Object.entries(DOMAIN_MAP)) {
    if (specializationContext.includes(keyword)) {
      if (domains.length > matchCount) {
        bestDomains = domains
        matchCount = domains.length
      }
      // Always include matching domains
      bestDomains = [...new Set([...bestDomains, ...domains])]
    }
  }
  
  // Default: general domain
  if (bestDomains.length === 0) {
    bestDomains = ["general"]
  }
  
  return bestDomains
}
```

### 4.3 Also Fix LLM Generation Path

**Modify:** `src/lib/employee-generator.ts` — `generateEmployeeViaLLM()`

Add domain restriction to the LLM prompt:

```typescript
// Current prompt includes: 
// "الـ suggestedCapabilities لازم تكون 3-5 قدرات ناقصة المدير ممكن نسيها (مثلاً: لو محاسب → إقرار ضريبي)"

// New: add EXPLICIT domain restriction:
const prompt = `أنت نظام توليد موظفين ذكي. بناءً على المعلومات التالية، ولّد موظف كامل.

⚠️ قاعدة التخصص الصارمة للمقترحات:
- الـ suggestedCapabilities لازم تكون فقط ضمن تخصص "${spec}"
- لو الموظف تخصص "سوشال ميديا" → المقترحات لازم تكون ONLY عن سوشال ميديا (منشورات، حملات، تحليل أداء)
- لو الموظف تخصص "محاسبة" → المقترحات لازم تكون ONLY عن محاسبة (إقرار ضريبي، تدفق نقد)
- لا تقترح قدرات خارج التخصص أبداً!
- مثال خاطئ: تقترح "إقرار ضريبي" لموظف سوشال ميديا ← هذا خطأ!

... rest of existing prompt ...
`
```

### 4.4 Types Update

**Modify:** `src/types/index.ts`

No changes needed for this phase — it's purely logic changes in employee-generator.ts.

---

## PHASE 5: Data Preservation on Employee Changes

**Priority: MEDIUM | Complexity: MEDIUM (5/10) | Estimated Time: 4-6 hours**

### 5.1 The Problem

Currently when an employee is deleted (status=DELETED):
- Their data (decisions, tasks, conversations, work orders) still exists in DB (not hard-deleted)
- But there's no mechanism for a replacement employee to:
  - See what the predecessor was working on
  - Continue unfinished tasks
  - Access inherited context

### 5.2 Prisma Schema Changes (already covered in Phase 1)

The `replacedByEmployeeId` and `replacedAt` fields on Employee enable data linking.

### 5.3 Data Inheritance Logic

**Create:** `src/lib/employee-data-preservation.ts`

```typescript
// ============================================
// Data Preservation & Inheritance
// When an employee is deleted/replaced, their data is preserved
// Replacement employee can inherit and continue
// ============================================

import { db } from "@/lib/db"

export async function inheritDataToReplacement(
  oldEmployeeId: string,
  newEmployeeId: string,
): Promise<void> {
  
  // 1. Inherit UNFINISHED tasks
  const pendingTasks = await db.task.findMany({
    where: {
      employeeId: oldEmployeeId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    }
  })
  
  for (const task of pendingTasks) {
    await db.task.update({
      where: { id: task.id },
      data: {
        // Don't change employeeId — keep original for audit trail
        // Instead, create a note in the task
        result: task.result ? `${task.result}\n[موروث من الموظف السابق]` : "[موروث من الموظف السابق — يحتاج استكمال]",
      }
    })
    
    // Also create a NEW task for the replacement employee
    await db.task.create({
      data: {
        employeeId: newEmployeeId,
        title: `[استكمال] ${task.title}`,
        description: `موروث من الموظف السابق. المهمة الأصلية: ${task.description}`,
        status: "PENDING",
        priority: task.priority,
        requestedBy: task.requestedBy,
      }
    })
  }
  
  // 2. Inherit access tokens (already covered in Phase 1)
  await inheritTokensToReplacement(oldEmployeeId, newEmployeeId)
  
  // 3. Inherit employee memories (transfer knowledge)
  const memories = await db.employeeMemory.findMany({
    where: { employeeId: oldEmployeeId }
  })
  
  for (const memory of memories) {
    await db.employeeMemory.create({
      data: {
        employeeId: newEmployeeId,
        category: memory.category,
        key: `موروث_${memory.key}`,
        value: `[من الموظف السابق] ${memory.value}`,
        embedding: memory.embedding,
      }
    })
  }
  
  // 4. Mark old employee as replaced
  await db.employee.update({
    where: { id: oldEmployeeId },
    data: {
      status: "REPLACED",  // Changed from "DELETED" to "REPLACED" when there's a successor
      replacedByEmployeeId: newEmployeeId,
      replacedAt: new Date(),
    }
  })
  
  // 5. Create a "handoff" conversation
  const conversation = await db.conversation.create({
    data: {
      type: "DIRECT",
      title: "تسليم المهام —交接",
    }
  })
  
  // Add both participants
  await db.conversationParticipant.create({
    data: {
      conversationId: conversation.id,
      participantType: "SYSTEM",
      participantId: "system",
      participantName: "النظام",
    }
  })
  
  await db.conversationParticipant.create({
    data: {
      conversationId: conversation.id,
      participantType: "EMPLOYEE",
      participantId: newEmployeeId,
      participantName: "الموظف الجديد",
      employeeId: newEmployeeId,
    }
  })
  
  // Create a system message with handoff info
  const handoffSummary = await buildHandoffSummary(oldEmployeeId)
  await db.message.create({
    data: {
      conversationId: conversation.id,
      senderType: "SYSTEM",
      senderName: "النظام",
      content: handoffSummary,
      metadata: JSON.stringify({
        type: "employee_handoff",
        fromEmployeeId: oldEmployeeId,
        toEmployeeId: newEmployeeId,
        inheritedTasks: pendingTasks.length,
        inheritedMemories: memories.length,
      }),
    }
  })
}

async function buildHandoffSummary(oldEmployeeId: string): Promise<string> {
  const employee = await db.employee.findUnique({
    where: { id: oldEmployeeId },
    include: {
      tasks: { where: { status: { in: ["PENDING", "IN_PROGRESS"] } } },
      decisions: { orderBy: { createdAt: "desc" }, take: 5 },
      memories: { orderBy: { updatedAt: "desc" }, take: 10 },
    }
  })
  
  if (!employee) return "لا توجد بيانات للموظف السابق"
  
  const pendingTasks = employee.tasks.map(t => `- ${t.title} (${t.status})`).join("\n")
  const recentDecisions = employee.decisions.map(d => `- ${d.title}: ${d.status}`).join("\n")
  const keyMemories = employee.memories.map(m => `- ${m.key}: ${m.value.slice(0, 100)}`).join("\n")
  
  return `📋 تسليم المهام من ${employee.name} (${employee.role}):

🎯 المهام غير المكتملة:
${pendingTasks || "لا مهام معلقة"}

📊 القرارات الأخيرة:
${recentDecisions || "لا قرارات حديثة"}

🧠 المعرفة الموروثة:
${keyMemories || "لا معرفة موروثة"}

---
الموظف الجديد يرجى استكمال المهام المعلقة والاطلاع على المعرفة الموروثة.`
}
```

### 5.4 Employee Replace API

**Create:** `src/app/api/employees/[id]/replace/route.ts`

```typescript
// POST /api/employees/[id]/replace
// Body: { newEmployeeName, newRole, newSpecialization, departmentId }

export async function POST(request, { params }) {
  const { id } = await params
  const body = await request.json()
  
  // 1. Auth check
  // 2. Verify old employee exists and belongs to user's company
  // 3. Generate new employee (using generateEmployeeWithLLM)
  // 4. Create new employee with same department
  // 5. Run inheritDataToReplacement(oldId, newId)
  // 6. Return new employee + handoff summary
}
```

### 5.5 UI — Employee Replacement Dialog

**Create:** `src/components/employees/employee-replace-dialog.tsx`

```typescript
// When clicking "Replace Employee" on a DELETED/PAUSED employee:
// - Shows a form to create replacement (name, role, specialization)
// - Pre-fills same department and similar role
// - Shows inherited data preview (tasks, tokens, memories)
// - Confirmation step with handoff summary
```

### 5.6 UI — Predecessor Info in Employee Detail

**Modify:** `src/components/employees/employee-detail-view.tsx`

Add "Data Preservation" tab:

```typescript
// Tab 5: Data Preservation
// If employee has predecessor (replacedByEmployeeId or inheritedFromEmployeeId):
//   - Show predecessor name, role, and replacement date
//   - Show inherited tasks
//   - Show inherited tokens (with "موروث" badge)
//   - Show inherited memories/knowledge
//   - Link to predecessor's archived conversations
```

### 5.7 Preserve Work Order Links

**Modify:** Work order handling to not break when employee changes:

```typescript
// When employee is replaced:
// WorkOrderTask.assigneeId stays pointing to old employee (for audit)
// But system shows: "الموظف السابق: Ahmad → الموظف الجديد: Sara"
// New tasks created for replacement employee are linked via parentActionId
```

### 5.8 EmployeeStatus Update

**Modify:** Prisma schema enum:

```prisma
enum EmployeeStatus {
  SETUP
  ACTIVE
  PAUSED
  AWAITING_APPROVAL
  REPLACED    // NEW: distinguishes from DELETED — means a successor exists
  DELETED     // means no successor — just removed
}
```

---

## PHASE 6: Deployment to Docker Container

**Priority: ALWAYS | Complexity: LOW (2/10) | Estimated Time: 1-2 hours per deployment**

### 6.1 Deployment Process

```bash
# 1. SSH to server
ssh ubuntu@141.95.55.5

# 2. Navigate to project
cd ~/blivoai-demo

# 3. Pull latest code (or push from local)
git pull origin main  # or: copy files via scp/rsync

# 4. Run Prisma migration
docker compose exec app npx prisma migrate deploy

# 5. Regenerate Prisma client
docker compose exec app npx prisma generate

# 6. Rebuild and restart container
docker compose down
docker compose build --no-cache
docker compose up -d

# 7. Verify
docker compose logs -f app  # Watch for errors
curl https://demo.blivoai.com/api/settings/llm  # Check API health
```

### 6.2 Deployment Script Enhancement

**Modify:** `scripts/deploy.sh` or create `scripts/deploy-feature.sh`

```bash
#!/bin/bash
# Deploy feature changes to BlivoAI demo

echo "=== BlivoAI Feature Deployment ==="

# Step 1: Pull latest code
echo "[1] Pulling latest code..."
cd ~/blivoai-demo
git pull origin main

# Step 2: Run database migration
echo "[2] Running database migration..."
docker compose exec app npx prisma migrate deploy --schema /app/prisma/schema.prisma

# Step 3: Generate Prisma client
echo "[3] Generating Prisma client..."
docker compose exec app npx prisma generate --schema /app/prisma/schema.prisma

# Step 4: Rebuild application
echo "[4] Rebuilding application..."
docker compose down app
docker compose build app --no-cache
docker compose up -d app

# Step 5: Wait for health check
echo "[5] Waiting for app to start..."
sleep 15
curl -sf https://demo.blivoai.com/api/settings/llm > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Deployment successful! App is running."
else
  echo "⚠️ App may need more time to start. Check logs:"
  docker compose logs app --tail 50
fi
```

### 6.3 Environment Variables for New Features

Add to `docker-compose.yml`:

```yaml
environment:
  # ... existing vars ...
  - ACTION_SCHEDULER_ENABLED=${ACTION_SCHEDULER_ENABLED:-true}  # Enable autonomous actions
  - ACTION_SCHEDULER_INTERVAL=${ACTION_SCHEDULER_INTERVAL:-3600000}  # Default: 1 hour
  - ACTION_AUTO_APPROVE=${ACTION_AUTO_APPROVE:-false}  # Auto-approve proactive actions?
```

---

## Implementation Order & Dependencies

```
Phase 4 (Role-Specific Fix) → INDEPENDENT, can start immediately
    ↓ (2-3 hours)

Phase 1 (Employee Access Tokens) → Foundation for Phase 3
    ↓ (4-6 hours)
    
Phase 5 (Data Preservation) → Uses Phase 1's token inheritance + replacement model
    ↓ (4-6 hours)

Phase 2 (Smart Model Routing) → Foundation for Phase 3
    ↓ (8-12 hours)
    
Phase 3 (Autonomous Actions) → Depends on Phase 1 (tokens) + Phase 2 (model routing)
    ↓ (12-16 hours)

Phase 6 (Deployment) → After each phase or after all phases
```

**Recommended order:** Phase 4 → Phase 1 → Phase 2 → Phase 5 → Phase 3 → Phase 6

**Total estimated time:** 30-45 hours across all phases

---

## Risk Assessment & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prisma migration breaks existing data | HIGH | Test migration on local DB first; use `migrate dev` not `migrate deploy` until verified |
| Autonomous actions run without approval | HIGH | Default to AWAITING_APPROVAL; add clear approval UI; log all actions |
| Token security (access tokens exposed) | HIGH | Encrypt tokens at rest; mask in API responses; audit all token access |
| LLM routing picks wrong model | MEDIUM | Fallback to tier-based system; log routing decisions; allow manual override |
| Employee replacement data loss | MEDIUM | Soft delete + REPLACED status; thorough audit trail; inheritance verification step |
| Docker rebuild fails | LOW | Keep backup of current running container; test build locally first |

---

## Testing Strategy

### Unit Tests
- `token-inheritance.ts`: Test token transfer between employees
- `employee-generator.ts`: Test domain-restricted suggestions (social employee → NO tax suggestions)
- `autonomous-actions.ts`: Test action creation, execution, approval flow
- `model-routing.ts`: Test routing priority (employee > company > global tier)

### Integration Tests
- Create employee → add tokens → delete → create replacement → verify inheritance
- Create employee → set model routing → send chat → verify correct model used
- Trigger proactive action → verify action record created → approve → verify execution

### Manual Testing (UI)
- Click employee name → see detail view with tabs
- Add Instagram token to social media employee → verify token stored
- Configure model routing for employee → verify LLM uses routed model
- Create social media employee → verify ONLY social media suggestions appear
- Delete employee with replacement → verify data preserved and accessible

---

## File Change Summary

### New Files (to create)
| File | Purpose | Phase |
|------|---------|-------|
| `src/app/api/employees/[id]/tokens/route.ts` | Employee token CRUD | 1 |
| `src/app/api/employees/[id]/tokens/[tokenId]/route.ts` | Single token operations | 1 |
| `src/app/api/employees/[id]/model-routing/route.ts` | Model routing config | 2 |
| `src/app/api/employees/[id]/actions/route.ts` | Autonomous actions API | 3 |
| `src/app/api/employees/[id]/replace/route.ts` | Employee replacement | 5 |
| `src/lib/token-inheritance.ts` | Token transfer logic | 1 |
| `src/lib/autonomous-actions.ts` | Action execution engine | 3 |
| `src/lib/action-scheduler.ts` | Periodic action scheduler | 3 |
| `src/lib/model-recommendations.ts` | Model recommendation engine | 2 |
| `src/lib/employee-data-preservation.ts` | Data preservation/inheritance | 5 |
| `src/components/employees/employee-detail-view.tsx` | Employee detail + tabs | 1 |
| `src/components/employees/token-manager.tsx` | Token management UI | 1 |
| `src/components/employees/model-routing-config.tsx` | Model routing UI | 2 |
| `src/components/employees/employee-replace-dialog.tsx` | Employee replacement UI | 5 |
| `src/components/dashboard/actions-panel.tsx` | Actions dashboard | 3 |

### Modified Files (to edit)
| File | Changes | Phase |
|------|---------|-------|
| `prisma/schema.prisma` | +EmployeeAccessToken, +EmployeeModelRouting, +EmployeeAction, +EmployeeActionType, +ActionStatus, expanded IntegrationPlatform, RequestType changes, Employee.replacedByEmployeeId | All |
| `src/lib/llm-service.ts` | Add `getSmartModelForEmployee()`, `callSpecificModel()`, modify `sendToLLM()` to use routing | 2 |
| `src/lib/employee-generator.ts` | Replace additive keyword matching with domain-restricted approach; fix LLM prompt | 4 |
| `src/lib/agent-executor.ts` | Add employeeId parameter to `selectModelForTask()`, use smart routing | 3 |
| `src/lib/token-manager.ts` | Update `selectModelTier()` to accept optional employee routing override | 2 |
| `src/app/api/employees/[id]/route.ts` | Update DELETE handler for replacement + data preservation | 1,5 |
| `src/app/api/employees/route.ts` | No changes needed (creation stays same) | - |
| `src/components/dashboard/employees-panel.tsx` | Add click handler → employee detail view | 1 |
| `src/components/dashboard/settings-panel.tsx` | Add Together AI key persistence section | 2 |
| `src/components/dashboard/main-content.tsx` | Add employee-detail and actions tabs | 1,3 |
| `src/stores/dashboard-store.ts` | Add "employee-detail" and "actions" tabs | 1,3 |
| `src/types/index.ts` | Add IEmployeeAccessToken, IEmployeeAction, IEmployeeModelRouting, EmployeeActionType, ActionStatus types | All |
| `docker-compose.yml` | Add ACTION_SCHEDULER env vars | 3 |
