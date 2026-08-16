// ============================================
// One Employer Company — TypeScript Types
// كل الأنواع المطلوبة بالمشروع مجمّعة هون
// ============================================

// --- الأدوار ---
export type UserRole = "OWNER" | "ADMIN" | "VIEWER"

// --- حالة الموظف ---
export type EmployeeStatus = 
  | "SETUP"
  | "ACTIVE"
  | "PAUSED"
  | "AWAITING_APPROVAL"
  | "REPLACED"
  | "DELETED"

// --- وضع الموافقة ---
export type ApprovalMode = 
  | "ALWAYS_APPROVE"
  | "AUTO_WITH_NOTIFY"
  | "AUTO_SILENT"

// --- أنواع القرارات ---
export type DecisionType = 
  | "POST_PUBLISH"
  | "COMMENT_REPLY"
  | "MESSAGE_REPLY"
  | "CONTENT_CREATE"
  | "SCHEDULE_CHANGE"
  | "BUDGET_ALLOCATION"
  | "TASK_ASSIGNMENT"
  | "OTHER"

// --- حالة القرار ---
export type DecisionStatus = 
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "AUTO_EXECUTED"
  | "CANCELLED"

// --- حالة المهمة ---
export type TaskStatus = 
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"

// --- حالة المشروع ---
export type ProjectStatus =
  | "PLANNING"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED"

// --- نوع المحادثة ---
export type ConversationType = 
  | "DIRECT"           // مدير ↔ موظف
  | "EMPLOYEE_CHAT"    // موظف ↔ موظف
  | "DEPARTMENT_CHAT"  // محادثة القسم كامل
  | "PROJECT_CHAT"     // محادثة مشروع
  | "MEETING"          // اجتماع جماعي

// --- نوع المُرسل ---
export type SenderType = "USER" | "EMPLOYEE" | "SYSTEM"

// --- نوع المشارك ---
export type ParticipantType = "USER" | "EMPLOYEE"

// --- منصات التكامل ---
export type IntegrationPlatform = 
  | "FACEBOOK"
  | "INSTAGRAM"
  | "TWITTER"
  | "LINKEDIN"
  | "GOOGLE"
  | "TIKTOK"
  | "OTHER"
  | "SSH"

// --- نبرة التواصل ---
export type Tone = 
  | "friendly"
  | "formal"
  | "casual"
  | "professional"
  | "playful"

// --- اللهجة / اللغة ---
export type Dialect = 
  | "levantine"
  | "egyptian"
  | "gulf"
  | "iraqi"
  | "moroccan"
  | "formal"
  | "english"

// --- خطط الاشتراك ---
export type SubscriptionPlan =
  | "FREE_TRIAL"
  | "STARTER"
  | "PROFESSIONAL"
  | "ENTERPRISE"

// --- مستوى الموديل ---
export type ModelTier = 
  | "LIGHT"    // موديل خفيف ورخيص
  | "MEDIUM"   // موديل متوسط
  | "HEAVY"    // موديل ثقيل وذكي

// --- مزوّد الـ LLM ---
export type LLMProvider = 
  | "together"    // Together AI — أرخص + تنوع موديلات
  | "grok"        // Grok (xAI) — ذكاء عالي + عربي ممتاز
  | "openrouter"  // OpenRouter — أسهل إعداد
  | "local"       // سيرفر GPU محلي — مجاني
  | "zai"         // ZAI SDK — ذكاء حقيقي فوري (الافتراضي)
  | "mock"        // للتجربة والتطوير

// --- نوع طلب الـ LLM ---
export type RequestType =
  | "CHAT"
  | "GENERATION"
  | "SUMMARIZATION"
  | "ANALYSIS"
  | "TRANSLATION"
  | "CODE"
  | "OTHER"

// --- تصنيف الملفات ---
export type FileCategory =
  | "INVOICE"
  | "CONTRACT"
  | "INVENTORY"
  | "BANK_STATEMENT"
  | "TAX_DOCUMENT"
  | "REPORT"
  | "IMAGE"
  | "SPREADSHEET"
  | "GENERAL"

// --- نوع طلب الموظف ---
export type EmployeeRequestType =
  | "INFORMATION"
  | "FILE"
  | "APPROVAL"
  | "CLARIFICATION"
  | "RESOURCE"

// --- حالة طلب الموظف ---
export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"

// ============================================
// واجهات الكائنات (Interfaces)
// ============================================

export interface ICompany {
  id: string
  name: string
  description?: string
  industry?: string
  tone: Tone
  dialect: Dialect
  logoUrl?: string
  ownerId: string
  subscription: SubscriptionPlan
  tokenBudgetMonthly: number
  tokenUsedMonthly: number
  tokenBudgetResetAt: Date
  tokenAddOnsPurchased: number
  tokenAddOnsUsed: number
  subscriptionStartAt?: Date
  subscriptionEndAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IDepartment {
  id: string
  name: string
  description?: string
  color: string
  tokenBudgetPercent: number
  companyId: string
  employees: IEmployee[]
  createdAt: Date
  updatedAt: Date
}

export interface IEmployee {
  id: string
  name: string
  role: string
  specialization?: string  // التخصص الأساسي — يحدده المستخدم حرّة (أي تخصص يريده)
  status: EmployeeStatus
  avatarColor?: string
  personality?: string
  systemPrompt?: string
  capabilities?: string   // JSON array
  constraints?: string    // JSON array
  suggestedCapabilities?: string // JSON array — مقترحة من النظام
  approvalMode: ApprovalMode
  companyId: string
  departmentId?: string
  createdAt: Date
  updatedAt: Date
}

export interface IProject {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  priority: number
  departmentId?: string
  companyId: string
  createdBy?: string
  startDate?: Date
  deadline?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IProjectTask {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: number
  projectId: string
  assigneeId?: string
  createdBy?: string
  dependsOnId?: string
  result?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IDecision {
  id: string
  employeeId: string
  type: DecisionType
  title: string
  description: string
  reasoning?: string
  data?: string
  status: DecisionStatus
  reviewedBy?: string
  reviewNote?: string
  reviewedAt?: Date
  createdAt: Date
}

export interface ITask {
  id: string
  employeeId: string
  title: string
  description?: string
  status: TaskStatus
  priority: number
  requestedBy?: string
  result?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IMessage {
  id: string
  conversationId: string
  senderType: SenderType
  senderId?: string
  senderName: string
  content: string
  metadata?: string
  createdAt: Date
}

export interface IConversation {
  id: string
  type: ConversationType
  title?: string
  participants: IConversationParticipant[]
  messages: IMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface IConversationParticipant {
  id: string
  conversationId: string
  participantType: ParticipantType
  participantId: string
  participantName: string
  employeeId?: string
  joinedAt: Date
}

export interface ITokenUsage {
  id: string
  employeeId: string
  modelTier: ModelTier
  tokensIn: number
  tokensOut: number
  totalTokens: number
  requestType: RequestType
  conversationId?: string
  estimatedCost: number
  cached: boolean
  createdAt: Date
}

export interface IFileAttachment {
  id: string
  employeeId: string
  uploadedBy: string
  uploadedByType: "USER" | "EMPLOYEE" | "SYSTEM"
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  description?: string
  category: FileCategory
  requestId?: string
  createdAt: Date
}

export interface IEmployeeRequest {
  id: string
  employeeId: string
  type: EmployeeRequestType
  title: string
  description: string
  priority: number
  status: RequestStatus
  response?: string
  respondedBy?: string
  respondedAt?: Date
  conversationId?: string
  messageId?: string
  createdAt: Date
  updatedAt: Date
}

export interface IIntegration {
  id: string
  companyId: string
  platform: IntegrationPlatform
  platformUserId?: string
  platformName?: string
  scopes?: string
  isActive: boolean
  lastSyncedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// ============================================
// واجهات API (Request/Response)
// ============================================

export interface CreateEmployeeRequest {
  name: string
  role: string
  roleDescription?: string // وصف الدور — عشان المولد يفهم أكتر
  departmentId?: string
}

export interface CreateEmployeeResponse {
  employee: IEmployee
  setupQuestions: string[]
  suggestedCapabilities: string[] // قدرات مقترحة من النظام
}

export interface SetupEmployeeRequest {
  employeeId: string
  answers: Record<string, string>
  approvalMode: ApprovalMode
  acceptedCapabilities?: string[] // القدرات اللي المدير قبلها
}

// --- نوع الاجتماع ---
export type MeetingType = 
  | "SCHEDULED"
  | "EMERGENCY"
  | "STANDUP"
  | "REVIEW"
  | "BRAINSTORM"

// --- حالة الاجتماع ---
export type MeetingStatus = 
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"

// --- نوع تقرير HR ---
export type HRReportType = 
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "ON_DEMAND"

export interface IMeeting {
  id: string
  companyId: string
  createdById?: string
  createdByType: string
  createdByName: string
  title: string
  description?: string
  agenda?: string
  type: MeetingType
  scheduledAt: Date
  duration: number
  endedAt?: Date
  departmentIds?: string
  participantIds?: string
  conversationId?: string
  status: MeetingStatus
  notes?: string
  summary?: string
  createdAt: Date
  updatedAt: Date
}

export interface IHRReport {
  id: string
  companyId: string
  type: HRReportType
  title: string
  summary: string
  details: string
  totalEmployees: number
  activeEmployees: number
  tasksCompleted: number
  tasksPending: number
  avgResponseTime: number
  tokenUsage: number
  recommendations?: string
  alerts?: string
  periodStart: Date
  periodEnd: Date
  deliveredAt?: Date
  createdAt: Date
}

export interface ChatMessageRequest {
  employeeId: string
  message: string
  conversationId?: string
}

export interface ChatMessageResponse {
  reply: string
  conversationId: string
  decision?: IDecision
  tokensUsed?: {
    tokensIn: number
    tokensOut: number
    modelTier: ModelTier
  }
}

export interface ReviewDecisionRequest {
  decisionId: string
  approved: boolean
  note?: string
}

export interface GenerateEmployeeResult {
  personality: string
  systemPrompt: string
  capabilities: string[]
  constraints: string[]
  suggestedCapabilities: string[] // قدرات مقترحة — النظام بيسأل المدير يضيفها
  setupQuestions: string[]
}

export interface CreateDepartmentRequest {
  name: string
  description?: string
  color?: string
  tokenBudgetPercent?: number
}

export interface CreateProjectRequest {
  name: string
  description?: string
  departmentId?: string
  priority?: number
  deadline?: string
}

export interface CreateProjectTaskRequest {
  title: string
  description?: string
  assigneeId?: string
  priority?: number
  dependsOnId?: string
}

export interface EmployeeToEmployeeChatRequest {
  fromEmployeeId: string
  toEmployeeId: string
  message: string
  projectId?: string // لو المحادثة ضمن مشروع
}

export interface DepartmentChatRequest {
  departmentId: string
  fromEmployeeId: string
  message: string
}

export interface UploadFileRequest {
  employeeId: string
  file: File
  category?: FileCategory
  description?: string
  requestId?: string
}

export interface RespondToEmployeeRequest {
  requestId: string
  status: "APPROVED" | "REJECTED"
  response?: string
}

// ============================================
// حالة الـ Dashboard (Zustand Store)
// ============================================

export interface DashboardState {
  selectedEmployeeId: string | null
  selectedDepartmentId: string | null
  selectedProjectId: string | null
  sidebarOpen: boolean
  activeTab: DashboardTab
  hydrated: boolean
  selectedEmployeeDetailId: string | null
  activeCompanyId: string | null
  subscription: SubscriptionPlan | null
  setSelectedEmployee: (id: string | null) => void
  setSelectedDepartment: (id: string | null) => void
  setSelectedProject: (id: string | null) => void
  setSelectedEmployeeDetail: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setActiveTab: (tab: DashboardTab, skipUrlUpdate?: boolean) => void
  hydrate: () => void
}

export type DashboardTab = 
  | "chatbot"
  | "overview"
  | "departments"
  | "employees"
  | "talk"
  | "projects"
  | "chat"
  | "department-chat"
  | "meetings"
  | "hr"
  | "work-orders"
  | "monitor"
  | "decisions"
  | "requests"
  | "token-budget"
  | "billing"
  | "invoices"
  | "settings"
  | "api-keys"
  | "employee-detail"
  | "access-tokens"
  | "available"

// ============================================
// حالة الـ Token Management
// ============================================

export interface TokenBudgetInfo {
  monthly: number
  used: number
  remaining: number
  addOnsPurchased: number
  addOnsUsed: number
  addOnsRemaining: number
  totalRemaining: number // monthly remaining + addOns remaining
  percentUsed: number
  alertLevel: "normal" | "warning" | "critical" | "depleted"
  subscription: SubscriptionPlan
  canOperate: boolean // هل في توكنات كافية للعمل
  byDepartment: Record<string, {
    name: string
    color: string
    budget: number
    used: number
    remaining: number
    percentUsed: number
  }>
  byEmployee: Record<string, {
    name: string
    role: string
    used: number
    percentOfTotal: number
  }>
}

// ============================================
// LLM Service Types
// ============================================

// ============================================
// طلبات العمل (Work Orders)
// ============================================

export type WorkOrderStatus =
  | "SUBMITTED"
  | "ASSIGNING"
  | "IN_PROGRESS"
  | "PARTIALLY_DONE"
  | "COMPLETED"
  | "CANCELLED"

export type UpdateType =
  | "PROGRESS"
  | "ASSIGNMENT"
  | "HANDOFF"
  | "QUESTION"
  | "COMPLETION"
  | "STATUS_CHANGE"
  | "WARNING"

export interface IWorkOrder {
  id: string
  companyId: string
  createdById: string
  createdByName: string
  title: string
  description: string
  priority: number
  status: WorkOrderStatus
  progress: number // 0-100
  assignedDepartmentId?: string
  warnings?: Array<{ departmentName: string; message: string; affectedPart: string; required: boolean }> // تنبيهات — أقسام مفقودة
  subTasks: IWorkOrderTask[]
  updates: IWorkOrderUpdate[]
  conversationId?: string
  deadline?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IWorkOrderTask {
  id: string
  workOrderId: string
  title: string
  description?: string
  status: TaskStatus
  assigneeId?: string
  assigneeName?: string
  departmentId?: string
  result?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IWorkOrderUpdate {
  id: string
  workOrderId: string
  updatedByType: "USER" | "EMPLOYEE" | "SYSTEM"
  updatedById?: string
  updatedByName: string
  content: string
  type: UpdateType
  createdAt: Date
}

export interface CreateWorkOrderRequest {
  title: string
  description: string
  priority?: number
  deadline?: string
}

// ============================================
// Blog Types
// ============================================

export interface BlogPostType {
  id: string
  slug: string
  title: string
  titleAr: string
  titleEn: string
  metaTitleAr: string
  metaTitleEn: string
  metaDescAr: string
  metaDescEn: string
  excerptAr: string
  excerptEn: string
  coverImage: string
  content: string
  publishedAt: string | Date
  createdAt: string | Date
  updatedAt: string | Date
}

// ============================================
// LLM Service Types
// ============================================

export interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface LLMRequest {
  messages: LLMMessage[]
  model?: ModelTier
  maxTokens?: number
  temperature?: number
  requestType: RequestType
}

export interface LLMResponse {
  content: string
  tokensIn: number
  tokensOut: number
  modelTier: ModelTier
  cached: boolean
  estimatedCost: number
}

export interface LLMToolResponse {
  reply: string
  conversationId: string
  tokensIn: number
  tokensOut: number
  totalTokens: number
  modelTier: ModelTier
  cached: boolean
  estimatedCost: number
  decision?: any
  tokensUsed?: any
}
