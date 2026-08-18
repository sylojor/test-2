// ============================================
// Demo Mode — Static Mock Data (READ-ONLY)
// ============================================

import type { ICompany, IEmployee, IDepartment, IProject, IWorkOrder, IConversation, IMessage, IWorkOrderTask, IWorkOrderUpdate } from "@/types"
import type { Locale } from "@/lib/i18n-config"

export const DEMO_COMPANY: ICompany = {
  id: "demo-co",
  name: "BlivoAI Demo Company",
  description: "A fictional company demonstrating BlivoAI capabilities",
  industry: "Technology",
  tone: "professional",
  dialect: "english",
  logoUrl: "/logo-v2.png",
  ownerId: "demo-user",
  subscription: "PROFESSIONAL",
  tokenBudgetMonthly: 15000000,
  tokenUsedMonthly: 127450,
  tokenBudgetResetAt: new Date(Date.now() + 15 * 86400000),
  tokenAddOnsPurchased: 0,
  tokenAddOnsUsed: 0,
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date(),
}

export const DEMO_DEPARTMENTS: IDepartment[] = [
  { id: "dept-eng", name: "Engineering", description: "Software development and infrastructure", color: "#3B82F6", tokenBudgetPercent: 40, companyId: "demo-co", employees: [], createdAt: new Date("2026-01-15"), updatedAt: new Date() },
  { id: "dept-mkt", name: "Marketing", description: "Digital marketing and content", color: "#8B5CF6", tokenBudgetPercent: 25, companyId: "demo-co", employees: [], createdAt: new Date("2026-01-15"), updatedAt: new Date() },
  { id: "dept-sales", name: "Sales", description: "Sales operations", color: "#10B981", tokenBudgetPercent: 15, companyId: "demo-co", employees: [], createdAt: new Date("2026-01-20"), updatedAt: new Date() },
  { id: "dept-cs", name: "Customer Success", description: "Support and success", color: "#F59E0B", tokenBudgetPercent: 10, companyId: "demo-co", employees: [], createdAt: new Date("2026-02-01"), updatedAt: new Date() },
  { id: "dept-hr", name: "Human Resources", description: "HR operations", color: "#EF4444", tokenBudgetPercent: 10, companyId: "demo-co", employees: [], createdAt: new Date("2026-02-01"), updatedAt: new Date() },
]

export const DEMO_EMPLOYEES: IEmployee[] = [
  { id: "emp-sarah", name: "Sarah", role: "Engineering Manager", specialization: "Software Architecture & Leadership", status: "ACTIVE", avatarColor: "#3B82F6", personality: "Strategic, encouraging", capabilities: '["Code Review","Architecture","Team Coordination","Technical Docs","Sprint Planning"]', constraints: '["Cannot deploy to production directly"]', approvalMode: "AUTO_WITH_NOTIFY", companyId: "demo-co", departmentId: "dept-eng", createdAt: new Date("2026-01-20"), updatedAt: new Date() },
  { id: "emp-omar", name: "Omar", role: "Backend Engineer", specialization: "API Development & Database Design", status: "ACTIVE", avatarColor: "#8B5CF6", personality: "Analytical, systematic", capabilities: '["API Development","Database Design","Authentication","Performance","Testing"]', constraints: '["Cannot modify production DB directly"]', approvalMode: "AUTO_WITH_NOTIFY", companyId: "demo-co", departmentId: "dept-eng", createdAt: new Date("2026-01-22"), updatedAt: new Date() },
  { id: "emp-lina", name: "Lina", role: "Frontend Engineer", specialization: "React & UI/UX", status: "ACTIVE", avatarColor: "#EC4899", personality: "Creative, user-focused", capabilities: '["React","UI Implementation","Responsive Design","Accessibility","Performance"]', constraints: '["Cannot change design system without approval"]', approvalMode: "ALWAYS_APPROVE", companyId: "demo-co", departmentId: "dept-eng", createdAt: new Date("2026-01-25"), updatedAt: new Date() },
  { id: "emp-adam", name: "Adam", role: "QA Engineer", specialization: "Testing & Quality Assurance", status: "ACTIVE", avatarColor: "#F59E0B", personality: "Thorough, quality-driven", capabilities: '["Test Planning","Automation","Bug Reporting","Regression","Performance"]', constraints: '["Cannot merge code"]', approvalMode: "AUTO_SILENT", companyId: "demo-co", departmentId: "dept-eng", createdAt: new Date("2026-02-01"), updatedAt: new Date() },
  { id: "emp-maya", name: "Maya", role: "Product Manager", specialization: "Product Strategy & Roadmap", status: "ACTIVE", avatarColor: "#10B981", personality: "Visionary, data-driven", capabilities: '["Product Roadmap","User Research","Requirements","Stakeholder Comm","Sprint Planning"]', constraints: '["Cannot commit engineering without approval"]', approvalMode: "AUTO_WITH_NOTIFY", companyId: "demo-co", departmentId: "dept-mkt", createdAt: new Date("2026-01-20"), updatedAt: new Date() },
  { id: "emp-alex", name: "Alex", role: "DevOps Engineer", specialization: "CI/CD & Infrastructure", status: "ACTIVE", avatarColor: "#06B6D4", personality: "Efficient, reliable", capabilities: '["CI/CD","Docker","Kubernetes","Monitoring","IaC"]', constraints: '["Cannot delete production resources"]', approvalMode: "AUTO_WITH_NOTIFY", companyId: "demo-co", departmentId: "dept-eng", createdAt: new Date("2026-02-05"), updatedAt: new Date() },
]

export const DEMO_PROJECTS: IProject[] = [
  { id: "proj-1", name: "Authentication Module", description: "OAuth2 and JWT authentication system", status: "IN_PROGRESS",
    priority: 1,
    departmentId: "dept-eng", companyId: "demo-co", createdBy: "demo-user", startDate: new Date("2026-07-01"), deadline: new Date("2026-08-30"), createdAt: new Date("2026-07-01"), updatedAt: new Date() },
  { id: "proj-2", name: "Marketing Campaign Q3", description: "Q3 digital marketing campaign", status: "IN_PROGRESS",
    priority: 2,
    departmentId: "dept-mkt", companyId: "demo-co", createdBy: "demo-user", startDate: new Date("2026-07-15"), deadline: new Date("2026-09-30"), createdAt: new Date("2026-07-15"), updatedAt: new Date() },
  { id: "proj-3", name: "Customer Onboarding", description: "Redesign onboarding experience", status: "PLANNING", priority: 3, departmentId: "dept-cs", companyId: "demo-co", createdBy: "demo-user", startDate: new Date("2026-08-01"), deadline: new Date("2026-10-15"), createdAt: new Date("2026-08-01"), updatedAt: new Date() },
]

export const DEMO_WORK_ORDERS: IWorkOrder[] = [
  {
    id: "wo-1",
    companyId: "demo-co",
    createdById: "demo-user",
    createdByName: "Demo Manager",
    title: "Fix authentication bug",
    description: "Users cannot log in when email is unverified.",
    priority: 1,
    status: "COMPLETED",
    progress: 100,
    assignedDepartmentId: "dept-eng",
    subTasks: [
      { id: "st-1", workOrderId: "wo-1", title: "Analyze the authentication flow", description: "Review login handler", status: "COMPLETED", assigneeId: "emp-omar", result: "Found missing email verification check", completedAt: new Date(Date.now() - 5 * 86400000), createdAt: new Date(Date.now() - 7 * 86400000), updatedAt: new Date() },
      { id: "st-2", workOrderId: "wo-1", title: "Implement fix", description: "Add verification redirect", status: "COMPLETED", assigneeId: "emp-omar", result: "Added verification check and clear error", completedAt: new Date(Date.now() - 3 * 86400000), createdAt: new Date(Date.now() - 5 * 86400000), updatedAt: new Date() },
      { id: "st-3", workOrderId: "wo-1", title: "Write tests", description: "Cover all auth scenarios", status: "COMPLETED", assigneeId: "emp-adam", result: "12 test cases covering auth scenarios", completedAt: new Date(Date.now() - 2 * 86400000), createdAt: new Date(Date.now() - 3 * 86400000), updatedAt: new Date() },
      { id: "st-4", workOrderId: "wo-1", title: "Deploy to staging", description: "Deploy and verify", status: "COMPLETED", assigneeId: "emp-alex", result: "Deployed to staging, verified fix", completedAt: new Date(Date.now() - 1 * 86400000), createdAt: new Date(Date.now() - 2 * 86400000), updatedAt: new Date() },
    ],
    updates: [
      { id: "u-1", workOrderId: "wo-1", updatedByType: "USER", updatedById: "demo-user", updatedByName: "Demo Manager", content: "Created work order: Fix authentication bug", type: "STATUS_CHANGE", createdAt: new Date(Date.now() - 7 * 86400000) },
      { id: "u-2", workOrderId: "wo-1", updatedByType: "SYSTEM", updatedByName: "System", content: "Auto-assigned to Engineering", type: "ASSIGNMENT", createdAt: new Date(Date.now() - 7 * 86400000) },
      { id: "u-3", workOrderId: "wo-1", updatedByType: "EMPLOYEE", updatedById: "emp-omar", updatedByName: "Omar", content: "Analyzing authentication flow. Found the issue.", type: "PROGRESS", createdAt: new Date(Date.now() - 6 * 86400000) },
      { id: "u-4", workOrderId: "wo-1", updatedByType: "EMPLOYEE", updatedById: "emp-omar", updatedByName: "Omar", content: "Fix implemented and reviewed by Sarah.", type: "PROGRESS", createdAt: new Date(Date.now() - 3 * 86400000) },
      { id: "u-5", workOrderId: "wo-1", updatedByType: "EMPLOYEE", updatedById: "emp-adam", updatedByName: "Adam", content: "All 12 tests passing.", type: "PROGRESS", createdAt: new Date(Date.now() - 2 * 86400000) },
      { id: "u-6", workOrderId: "wo-1", updatedByType: "EMPLOYEE", updatedById: "emp-alex", updatedByName: "Alex", content: "Deployed to staging. Ready for production.", type: "COMPLETION", createdAt: new Date(Date.now() - 1 * 86400000) },
    ],
    deadline: new Date(Date.now() + 5 * 86400000),
    completedAt: new Date(Date.now() - 1 * 86400000),
    createdAt: new Date(Date.now() - 7 * 86400000),
    updatedAt: new Date(),
  },
  {
    id: "wo-2",
    companyId: "demo-co",
    createdById: "demo-user",
    createdByName: "Demo Manager",
    title: "GitHub integration for repo analysis",
    description: "Allow AI employees to analyze repos, review issues, and suggest fixes.",
    priority: 2,
    status: "IN_PROGRESS",
    progress: 65,
    assignedDepartmentId: "dept-eng",
    subTasks: [
      { id: "st-5", workOrderId: "wo-2", title: "Design integration architecture", description: "", status: "COMPLETED", assigneeId: "emp-sarah", result: "Architecture with webhook approach", completedAt: new Date(Date.now() - 4 * 86400000), createdAt: new Date(Date.now() - 6 * 86400000), updatedAt: new Date() },
      { id: "st-6", workOrderId: "wo-2", title: "Implement GitHub API client", description: "", status: "COMPLETED", assigneeId: "emp-omar", result: "GitHub API client with rate limiting", completedAt: new Date(Date.now() - 2 * 86400000), createdAt: new Date(Date.now() - 4 * 86400000), updatedAt: new Date() },
      { id: "st-7", workOrderId: "wo-2", title: "Build repository analysis", description: "", status: "IN_PROGRESS", assigneeId: "emp-omar", createdAt: new Date(Date.now() - 2 * 86400000), updatedAt: new Date() },
      { id: "st-8", workOrderId: "wo-2", title: "Create PR review automation", description: "", status: "PENDING", assigneeId: "emp-lina", createdAt: new Date(Date.now() - 2 * 86400000), updatedAt: new Date() },
    ],
    updates: [
      { id: "u-7", workOrderId: "wo-2", updatedByType: "EMPLOYEE", updatedById: "emp-omar", updatedByName: "Omar", content: "Working on repository analysis. Building the file tree parser.", type: "PROGRESS", createdAt: new Date(Date.now() - 1 * 86400000) },
    ],
    deadline: new Date(Date.now() + 10 * 86400000),
    createdAt: new Date(Date.now() - 6 * 86400000),
    updatedAt: new Date(),
  },
]

export const DEMO_CONVERSATIONS: IConversation[] = [
  {
    id: "conv-1", type: "DIRECT", title: "Authentication Bug Fix",
    participants: [],
    messages: [
      { id: "m-1", conversationId: "conv-1", senderType: "USER", senderName: "You", content: "We have a bug where users cannot log in when their email is not verified. Can you look into this?", createdAt: new Date(Date.now() - 7 * 3600000) },
      { id: "m-2", conversationId: "conv-1", senderType: "EMPLOYEE", senderId: "emp-omar", senderName: "Omar", content: "I will analyze the authentication flow right away. Let me check the login handler and the email verification logic.", createdAt: new Date(Date.now() - 6.9 * 3600000) },
      { id: "m-3", conversationId: "conv-1", senderType: "EMPLOYEE", senderId: "emp-omar", senderName: "Omar", content: "I found the issue. The login handler does not properly check the email verification status before allowing login. The error message is also not user-friendly. I will prepare a fix.", createdAt: new Date(Date.now() - 6 * 3600000) },
      { id: "m-4", conversationId: "conv-1", senderType: "USER", senderName: "You", content: "Good catch. Please implement the fix and add proper error handling.", createdAt: new Date(Date.now() - 5 * 3600000) },
      { id: "m-5", conversationId: "conv-1", senderType: "EMPLOYEE", senderId: "emp-omar", senderName: "Omar", content: "Fix implemented. Changes include: 1) Added email verification check in login flow, 2) Redirect to verification page with clear message, 3) Added proper error codes for different auth failure scenarios. The fix has been reviewed by Sarah.", createdAt: new Date(Date.now() - 3 * 3600000) },
      { id: "m-6", conversationId: "conv-1", senderType: "EMPLOYEE", senderId: "emp-omar", senderName: "Omar", content: "All tests are passing. Adam has verified the test coverage. Ready for deployment to staging.", createdAt: new Date(Date.now() - 2 * 3600000) },
    ] as IMessage[],
    createdAt: new Date(Date.now() - 7 * 3600000),
    updatedAt: new Date(),
  },
]

export const DEMO_GITHUB_REPO = {
  name: "blivoai-demo/sample-project",
  description: "A demo repository showcasing BlivoAI GitHub integration",
  language: "TypeScript",
  stars: 24,
  forks: 8,
  issues: 5,
  pullRequests: 2,
  branches: ["main", "develop", "feature/auth-fix", "feature/github-integration"],
  defaultBranch: "main",
  lastCommit: { message: "fix: resolve auth flow for unverified emails", author: "Omar (via BlivoAI)", date: new Date(Date.now() - 86400000), sha: "a3f7c2d" },
  demoIssues: [
    { number: 42, title: "Authentication fails when email is unverified", status: "CLOSED", assignee: "Omar", labels: ["bug", "authentication"], createdAt: new Date(Date.now() - 8 * 86400000) },
    { number: 43, title: "Add dark mode toggle to settings page", status: "OPEN", assignee: "Lina", labels: ["enhancement", "UI"], createdAt: new Date(Date.now() - 3 * 86400000) },
    { number: 44, title: "Optimize database queries for employee listing", status: "OPEN", assignee: null, labels: ["performance"], createdAt: new Date(Date.now() - 2 * 86400000) },
    { number: 45, title: "Implement rate limiting for API endpoints", status: "IN_PROGRESS", assignee: "Omar", labels: ["security", "API"], createdAt: new Date(Date.now() - 86400000) },
    { number: 46, title: "Add export functionality to reports", status: "OPEN", assignee: null, labels: ["feature"], createdAt: new Date(Date.now() - 43200000) },
  ],
  demoPRs: [
    { number: 18, title: "Fix: authentication flow for unverified emails", status: "MERGED", author: "Omar", branch: "feature/auth-fix", additions: 47, deletions: 12, createdAt: new Date(Date.now() - 5 * 86400000) },
    { number: 19, title: "Feature: GitHub integration architecture", status: "OPEN", author: "Sarah", branch: "feature/github-integration", additions: 156, deletions: 0, createdAt: new Date(Date.now() - 2 * 86400000) },
  ],
  demoFiles: [
    { name: "src/auth/login.ts", status: "modified", changes: 12 },
    { name: "src/auth/verify.ts", status: "modified", changes: 8 },
    { name: "src/api/employees/route.ts", status: "added", changes: 45 },
    { name: "src/components/Dashboard.tsx", status: "modified", changes: 23 },
    { name: "src/utils/helpers.ts", status: "unchanged", changes: 0 },
  ],
}

export function getDemoChatResponse(message: string, lang: Locale): string {
  const lower = message.toLowerCase()
  const isAr = lang === "ar"
  if (lower.includes("github") || lower.includes("repository") || lower.includes("repo") || lower.includes("pull request")) {
    return isAr ? "أستطيع تحليل المستودعات واقتراح تحسينات في مساحة العمل الرسمية، لكن وضع العرض التجريبي لا يمكنه الوصول إلى مستودعات حقيقية أو تعديلها." : "I can analyze repositories and propose changes in the official workspace, but Demo Mode cannot access or modify real repositories."
  }
  if (lower.includes("bug") || lower.includes("fix") || lower.includes("error") || lower.includes("issue")) {
    return isAr ? "لقد حللت المشكلة وحددت الملفات المتأثرة. في مساحة العمل الحقيقية، سأقوم بإعداد خطة التنفيذ وتنفيذ الإصلاح. هذه محاكاة فقط." : "I have analyzed the issue and identified the affected files. In the official workspace, I would prepare an implementation plan and execute the fix. This is a simulation only."
  }
  if (lower.includes("deploy") || lower.includes("release")) {
    return isAr ? "في مساحة العمل الرسمية، سأقوم بتشغيل عملية النشر. هذا الإجراء محاكاة في وضع العرض التجريبي." : "In the official workspace, I would trigger deployment and monitor results. This action is simulated in Demo Mode."
  }
  return isAr ? "أفهم طلبك. في مساحة العمل الحقيقية، سأقوم بتحليل هذا الطلب وتنفيذه. هذه استجابة محاكاة في وضع العرض التجريبي." : "I understand your request. In the official workspace, I would analyze and execute it using my specialized capabilities. This is a simulated response in Demo Mode."
}
