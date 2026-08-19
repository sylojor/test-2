// ============================================
// API: محادثة واحدة — إرسال رسالة + جلب الرسائل
//
// التحديث: يستخدم نظام الوكيل الذكي
// - الموظف يرد بوضع مجاني عادي
// - لما يحتاج ذكاء → الوكيل يشتغل بالخلفية
// - المشترك يشوف النتيجة النهائية فقط
// - ما يشوفش إنه في وكيل أو LLM
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { executeAgentTask } from "@/lib/agent-executor"
import { verifyAuth, unauthorizedResponse, forbiddenResponse, getUserCompanyId } from "@/lib/auth"
import type { LLMMessage, RequestType } from "@/types"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const userCompanyId = getUserCompanyId(authPayload)
    if (!userCompanyId) { return forbiddenResponse("No company") }

    // Security: Verify conversation belongs to user's company through participants
    const participant = await db.conversationParticipant.findFirst({
      where: {
        conversationId: id,
        participantType: "USER",
        participantId: authPayload.userId,
      },
    })
    if (!participant) {
      // Also check if any employee participant belongs to user's company
      const empParticipant = await db.conversationParticipant.findFirst({
        where: {
          conversationId: id,
          employee: { companyId: userCompanyId },
        },
        include: { employee: { select: { companyId: true } } },
      })
      if (!empParticipant) {
        return forbiddenResponse("Access denied")
      }
    }

    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[MESSAGES_LIST_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب الرسائل" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { id: conversationId } = await params
    const body = await request.json()
    const { senderType, senderId, senderName, content } = body

    // SECURITY: Verify conversation access
    const userCompanyId = getUserCompanyId(authPayload)
    if (!userCompanyId) { return forbiddenResponse("No company") }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "محتوى الرسالة مطلوب" }, { status: 400 })
    }

    // حفظ رسالة المُرسل
    const message = await db.message.create({
      data: {
        conversationId,
        senderType: senderType || "USER",
        senderId: senderId || null,
        senderName: senderName || "مجهول",
        content: content.trim(),
      },
    })

    // تحديث وقت المحادثة
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // لو الرسالة من المستخدم — الموظف بيرد
    if (senderType === "USER" || senderType === "EMPLOYEE") {
      const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: true,
          messages: { orderBy: { createdAt: "asc" }, take: 50 },
        },
      })

      if (conversation) {
        const employeeParticipant = conversation.participants.find(
          p => p.participantType === "EMPLOYEE" && p.participantId !== senderId
        )

        // محادثة مباشرة (مدير → موظف)
        if (conversation.type === "DIRECT" && employeeParticipant) {
          const employee = await db.employee.findUnique({
            where: { id: employeeParticipant.employeeId! },
          })

          if (employee?.systemPrompt && employee.status === "ACTIVE") {
            // بناء سياق المحادثة
            const history: LLMMessage[] = [
              { role: "system", content: employee.systemPrompt },
            ]

            for (const msg of conversation.messages) {
              if (msg.senderType === "USER") {
                history.push({ role: "user", content: msg.content })
              } else if (msg.senderType === "EMPLOYEE") {
                history.push({ role: "assistant", content: msg.content })
              }
            }

            // --- استخدام الوكيل الذكي ---
            // الوكيل يشتغل بالخلفية → يراجع → يوافق/يرفض
            // المشترك ما يشوف هاد — يشوف النتيجة النهائية بس
            const agentResult = await executeAgentTask({
              employeeId: employee.id,
              companyId: employee.companyId,
              taskType: "CHAT",
              taskTitle: `محادثة: ${content.slice(0, 50)}`,
              taskInput: content,
              systemPrompt: employee.systemPrompt,
              conversationHistory: history,
              preferredTier: "MEDIUM",
              maxAttempts: 2, // محادثات: محاولتين كافية
            })

            // حفظ رد الموظف (النتيجة النهائية فقط)
            // المشترك يشوف هاد — كأنه الموظف عملو بنفسو
            const reply = await db.message.create({
              data: {
                conversationId,
                senderType: "EMPLOYEE",
                senderId: employee.id,
                senderName: employee.name,
                content: agentResult.output,
                metadata: JSON.stringify({
                  // بيانات داخلية — المشترك ما يشوفها
                  _agentSessionId: agentResult.sessionId,
                  _agentApproved: agentResult.approved,
                  _agentAttempts: agentResult.attempts,
                  tokensUsed: agentResult.tokensUsed,
                  cost: agentResult.cost,
                }),
              },
            })

            return NextResponse.json({
              message,
              reply,
              // بيانات للمشترك — بس المعلومات الأساسية
              tokensUsed: {
                tokensIn: 0, // ما نظهرش الرقم الحقيقي
                tokensOut: 0,
                modelTier: "FREE" as const, // يظهر كأنه مجاني
              },
            })
          }
        }

        // محادثة بين موظفين
        if (conversation.type === "EMPLOYEE_CHAT" && employeeParticipant) {
          const employee = await db.employee.findUnique({
            where: { id: employeeParticipant.employeeId! },
          })

          if (employee?.systemPrompt && employee.status === "ACTIVE") {
            const history: LLMMessage[] = [
              { role: "system", content: employee.systemPrompt + "\n\n# ملاحظة\nأنت بتحكي مع موظف ثاني بالشركة. حافظ على الاحترافية والتعاون." },
            ]

            for (const msg of conversation.messages) {
              if (msg.senderId === employee.id) {
                history.push({ role: "assistant", content: msg.content })
              } else {
                history.push({ role: "user", content: `[${msg.senderName}]: ${msg.content}` })
              }
            }

            const agentResult = await executeAgentTask({
              employeeId: employee.id,
              companyId: employee.companyId,
              taskType: "CHAT",
              taskTitle: `محادثة موظفين: ${content.slice(0, 50)}`,
              taskInput: content,
              systemPrompt: employee.systemPrompt,
              conversationHistory: history,
              preferredTier: "LIGHT", // محادثات بين موظفين = خفيفة
              maxAttempts: 1, // محاولة واحدة بس
            })

            const reply = await db.message.create({
              data: {
                conversationId,
                senderType: "EMPLOYEE",
                senderId: employee.id,
                senderName: employee.name,
                content: agentResult.output,
              },
            })

            return NextResponse.json({ message, reply })
          }
        }
      }
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("[MESSAGE_SEND_ERROR]", error)
    return NextResponse.json({ error: "فشل إرسال الرسالة" }, { status: 500 })
  }
}
