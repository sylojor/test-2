import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { sendToLLM } from "@/lib/llm-service"

// Specialization keyword mapping for auto-assignment
const SPECIALIZATION_KEYWORDS: Record<string, string[]> = {
  "accounting": ["محاسبة", "مالية", "فاتورة", "ميزانية", "تقرير مالي", "ضريبة", "حساب", "budget", "financial", "invoice", "tax", "accounting"],
  "programming": ["برمجة", "كود", "تطبيق", "موقع", "software", "code", "app", "web", "development"],
  "marketing": ["تسويق", "إعلان", "حملة", "brand", "campaign", "advertising", "promotion", "content", "social media"],
  "design": ["تصميم", "شعار", "واجهة", "UX", "UI", "design", "graphic", "logo", "visual"],
  "sales": ["بيع", "مبيعات", "عميل", "customer", "sales", "deal", "negotiation"],
  "hr": ["موظف", "توظيف", "رواتب", "employee", "hiring", "salary", "HR", "human resources"],
  "customer_service": ["خدمة", "دعم", "شكوى", "complaint", "support", "service", "customer"],
  "management": ["إدارة", "قيادة", "strategy", "planning", "management", "leader"],
  "legal": ["قانون", "عقد", "legal", "contract", "compliance", "regulation"],
  "operations": ["عمليات", "logistics", "operations", "supply", "inventory", "إنتاج"],
}

function findMatchingEmployees(employees: any[], title: string, description: string | null): any[] {
  const text = `${title} ${description || ""}`.toLowerCase()
  return employees
    .filter(e => e.status === "ACTIVE")
    .map(emp => {
      const spec = (emp.specialization || "").toLowerCase()
      let score = 0
      for (const [category, keywords] of Object.entries(SPECIALIZATION_KEYWORDS)) {
        if (keywords.some(k => text.includes(k.toLowerCase())) && 
            (spec.includes(category) || keywords.some(k => spec.includes(k.toLowerCase())))) {
          score += 10
        }
      }
      return { employee: emp, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.employee)
}

async function generateAutoResponse(employee: any, title: string, description: string | null): Promise<string | null> {
  try {
    const prompt = `أنت ${employee.name}، ${employee.role || "موظف"} متخصص في ${employee.specialization || "عام"}.
تم توجيه طلب إليك تلقائياً:
عنوان: ${title}
${description ? `تفاصيل: ${description}` : ""}
قدم رد مهني وعملي ضمن نطاق تخصصك.`
    
    const result = await sendToLLM({
      model: "free",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: title }
      ],
      maxTokens: 250,
      temperature: 0.7,
    })
    return result?.content || null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated) return unauthorizedResponse()
  
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const status = searchParams.get("status")
    
    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 })
    }
    
    const requests = await db.employeeRequest.findMany({
      where: {
        employee: { company: { id: companyId } },
        ...(status ? { status: status as any } : {}),
      },
      include: {
        employee: {
          select: { id: true, name: true, role: true, avatarColor: true, specialization: true }
        }
      },
      orderBy: { createdAt: "desc" },
    })
    
    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error("Error fetching employee requests:", error)
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated) return unauthorizedResponse()
  
  try {
    const body = await request.json()
    const { employeeId, type, title, description, priority, companyId } = body
    
    if (!employeeId || !type || !title) {
      return NextResponse.json({ error: "employeeId, type, and title required" }, { status: 400 })
    }
    
    // Create the request
    const newRequest = await db.employeeRequest.create({
      data: {
        employeeId,
        type: type as any,
        title,
        description: description || null,
        priority: priority || 1,
        status: "PENDING",
      }
    })
    
    // AUTO-ASSIGN: Find matching employees and auto-process
    let autoAssigned: any[] = []
    let autoReply: string | null = null
    let autoAssignedEmployee: any = null
    
    if (companyId) {
      const allEmployees = await db.employee.findMany({
        where: {
          company: { id: companyId },
          status: "ACTIVE"
        }
      })
      
      autoAssigned = findMatchingEmployees(allEmployees, title, description)
      
      if (autoAssigned.length > 0) {
        autoAssignedEmployee = autoAssigned[0]
        autoReply = await generateAutoResponse(autoAssignedEmployee, title, description)
        
        if (autoReply) {
          // Auto-approve and respond
          await db.employeeRequest.update({
            where: { id: newRequest.id },
            data: {
              status: "APPROVED",
              response: `[تلقائي - ${autoAssignedEmployee.name} (${autoAssignedEmployee.specialization})]: ${autoReply}`,
              respondedBy: "AUTO_ASSIGNED",
              respondedAt: new Date(),
            }
          })
          
          // Save to employee memory
          await db.employeeMemory.create({
            data: {
              employeeId: autoAssignedEmployee.id,
              category: "auto_assigned_response",
              key: `request_${newRequest.id}`,
              value: `Q: ${title} | A: ${autoReply}`,
              companyId: companyId,
            }
          })
          
          newRequest.status = "APPROVED"
          newRequest.response = `[تلقائي - ${autoAssignedEmployee.name} (${autoAssignedEmployee.specialization})]: ${autoReply}`
        }
      }
    }
    
    return NextResponse.json({
      request: newRequest,
      autoAssigned: autoAssigned.map(e => ({
        id: e.id,
        name: e.name,
        specialization: e.specialization,
        role: e.role,
      })),
      autoProcessed: autoReply !== null,
      autoReply,
      assignedTo: autoAssignedEmployee?.name,
    }, { status: 201 })
    
  } catch (error: any) {
    console.error("Error creating employee request:", error)
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
  }
}
