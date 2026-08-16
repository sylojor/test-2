import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { sendToLLM } from "@/lib/llm-service"

// Specialization keyword mapping for auto-assignment
const SPECIALIZATION_MAP: Record<string, string[]> = {
  "accounting": ["محاسبة", "مالية", "فاتورة", "ميزانية", "تقرير مالي", "ضريبة", "حساب", "budget", "financial", "invoice", "tax", "accounting"],
  "programming": ["برمجة", "كود", "تطبيق", "موقع", "software", "code", "app", "web", "development", "برمجيات", "تطوير"],
  "marketing": ["تسويق", "إعلان", "حملة", "brand", "campaign", "advertising", "promotion", "محتوى", "content", "social media"],
  "design": ["تصميم", "شعار", "واجهة", "UX", "UI", "design", "graphic", "logo", "visual", "creativity"],
  "sales": ["بيع", "مبيعات", "عميل", "customer", "sales", "deal", "negotiation", "شراء", "عرض"],
  "hr": ["موظف", "توظيف", "رواتب", "employee", "hiring", "salary", "HR", "human resources", "personnel"],
  "customer_service": ["خدمة", "دعم", "شكوى", "complaint", "support", "service", "customer", "help"],
  "management": ["إدارة", "قيادة", "strategy", "planning", "management", "leader", "تنظيم", "مشروع"],
  "legal": ["قانون", "عقد", "legal", "contract", "compliance", "regulation", "محامي"],
  "operations": ["عمليات", "logistics", "operations", "supply", "inventory", "إنتاج"],
}

function matchEmployeeToRequest(
  employees: any[], 
  requestType: string, 
  requestTitle: string, 
  requestDescription?: string
): any[] {
  const text = `${requestTitle} ${requestDescription || ""}`.toLowerCase()
  
  const scored = employees
    .filter(e => e.status === "ACTIVE")
    .map(employee => {
      const spec = (employee.specialization || "").toLowerCase()
      let score = 0
      
      for (const [category, keywords] of Object.entries(SPECIALIZATION_MAP)) {
        const matchesKeyword = keywords.some(k => text.includes(k.toLowerCase()))
        const specMatchesCategory = spec.includes(category) || 
          keywords.some(k => spec.includes(k.toLowerCase()))
        
        if (matchesKeyword && specMatchesCategory) {
          score += 10
        } else if (matchesKeyword) {
          score += 2
        }
      }
      
      const typeMapping: Record<string, string[]> = {
        "INFORMATION": ["accounting", "management", "hr", "legal"],
        "FILE": ["programming", "design", "operations"],
        "APPROVAL": ["management", "hr", "legal"],
        "CLARIFICATION": ["customer_service", "management", "hr"],
        "RESOURCE": ["programming", "design", "operations", "accounting"],
      }
      
      const typeSpecs = typeMapping[requestType] || []
      if (typeSpecs.some(ts => spec.includes(ts))) {
        score += 5
      }
      
      return { employee, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
  
  return scored.slice(0, 3).map(item => item.employee)
}

async function autoProcessRequest(
  employee: any,
  requestTitle: string,
  requestDescription: string | null,
  companyId: string
): Promise<string | null> {
  try {
    const spec = employee.specialization || "general"
    const role = employee.role || "موظف"
    const name = employee.name
    
    const prompt = `أنت ${name}، ${role} متخصص في ${spec}.
تم توجيه طلب إليك تلقائياً بناءً على تخصصك:
عنوان الطلب: ${requestTitle}
${requestDescription ? `تفاصيل: ${requestDescription}` : ""}
قم بالرد على هذا الطلب بشكل مهني وعملي ضمن نطاق تخصصك. قدم خطوات واضحة أو حل مقترح.
إذا كان الطلب خارج نطاق تخصصك، اذكر ذلك وأوصي بتوجيهه للقسم المناسب.`
    
    const reply = await sendToLLM({
      model: "free",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: requestTitle }
      ],
      maxTokens: 300,
      temperature: 0.7,
    })
    
    return reply?.content || null
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated) return unauthorizedResponse()
  
  try {
    const body = await request.json()
    const { companyId, requestId } = body
    
    if (!companyId || !requestId) {
      return NextResponse.json({ error: "companyId and requestId required" }, { status: 400 })
    }
    
    const empRequest = await db.employeeRequest.findUnique({
      where: { id: requestId },
      include: { employee: true }
    })
    
    if (!empRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }
    
    const companyEmployees = await db.employee.findMany({
      where: {
        company: { id: companyId },
        status: "ACTIVE"
      }
    })
    
    const matchedEmployees = matchEmployeeToRequest(
      companyEmployees,
      empRequest.type,
      empRequest.title,
      empRequest.description || undefined
    )
    
    if (matchedEmployees.length === 0) {
      return NextResponse.json({
        message: "No matching employees found for auto-assignment",
        matched: [],
        autoProcessed: false
      })
    }
    
    const bestMatch = matchedEmployees[0]
    const autoReply = await autoProcessRequest(
      bestMatch,
      empRequest.title,
      empRequest.description,
      companyId
    )
    
    if (autoReply) {
      await db.employeeRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          response: `[تلقائي - ${bestMatch.name} (${bestMatch.specialization})]: ${autoReply}`,
          respondedBy: "AUTO_ASSIGNED",
          respondedAt: new Date(),
        }
      })
      
      await db.employeeMemory.create({
        data: {
          employeeId: bestMatch.id,
          category: "auto_assigned_response",
          key: `request_${requestId}`,
          value: `Q: ${empRequest.title} | A: ${autoReply}`,
          companyId: companyId,
        }
      })
    }
    
    const assignments = matchedEmployees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.name,
      specialization: emp.specialization,
      autoProcessed: emp.id === bestMatch.id && autoReply !== null,
    }))
    
    return NextResponse.json({
      message: "Auto-assignment completed",
      matched: assignments,
      autoProcessed: autoReply !== null,
      autoReply: autoReply,
      assignedTo: bestMatch.name,
      assignedSpecialization: bestMatch.specialization,
    })
    
  } catch (error: any) {
    console.error("Auto-assign error:", error)
    return NextResponse.json({ error: "Auto-assignment failed", details: error.message }, { status: 500 })
  }
}
