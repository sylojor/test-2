// ============================================
// API: المحادثات (Conversations) — النسخة الكاملة
// GET: جلب محادثات شركة
// POST: إرسال رسالة (إنشاء محادثة + رد الموظف الذكي)
//
// التحديث: يدعم chatHistory من العميل
// + يستخدم ZAI SDK كـ provider افتراضي
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendToLLMWithTools } from "@/lib/llm-service"
import { canConsumeTokens } from "@/lib/token-manager"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import type { LLMMessage } from "@/types"

export async function GET(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const type = searchParams.get("type")
    const employeeId = searchParams.get("employeeId")

    if (!companyId) {
      return NextResponse.json({ error: "معرّف الشركة مطلوب" }, { status: 400 })
    }

    const companyEmployees = await db.employee.findMany({
      where: { companyId, status: { not: "DELETED" } },
      select: { id: true },
    })
    const employeeIds = companyEmployees.map(e => e.id)

    const participants = await db.conversationParticipant.findMany({
      where: {
        employeeId: { in: employeeIds },
        ...(type && { conversation: { type } }),
      },
      include: {
        conversation: {
          include: {
            participants: true,
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    })

    const seen = new Set<string>()
    const conversations = []
    for (const p of participants) {
      if (!seen.has(p.conversationId)) {
        seen.add(p.conversationId)
        conversations.push(p.conversation)
      }
    }

    let filtered = conversations
    if (employeeId) {
      filtered = conversations.filter(c =>
        c.participants.some(p => p.employeeId === employeeId)
      )
    }

    return NextResponse.json({ conversations: filtered })
  } catch (error) {
    console.error("[CONVERSATIONS_LIST_ERROR]", error)
    return NextResponse.json({ error: "فشل جلب المحادثات" }, { status: 500 })
  }
}

// POST: إرسال رسالة في محادثة
// يدعم: محادثة مباشرة مع موظف + إنشاء محادثة جديدة
// + تمرير سياق المحادثة (chatHistory)
export async function POST(request: NextRequest) {
  try {
    // === Authentication Check ===
    const authPayload = verifyAuth(request)
    if (!authPayload) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { employeeId, message, companyId, conversationId, chatHistory, language } = body

    // --- إرسال رسالة مباشرة لموظف ---
    if (employeeId && message) {
      // جلب بيانات الموظف
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        include: { company: true, department: true },
      })

      if (!employee) {
        return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
      }

      // فحص ميزانية التوكنات
      const canOperate = await canConsumeTokens(employee.companyId)
      if (!canOperate) {
        return NextResponse.json(
          { error: "نفدت ميزانية التوكنات", reply: "آسف، صار عندنا نقص بالميزانية. ممكن تطلب من الإدارة تشحن توكنات إضافية؟" },
          { status: 200 },
        )
      }

      // إنشاء أو جلب محادثة
      let convoId = conversationId

      if (!convoId) {
        const company = employee.company
        const conversation = await db.conversation.create({
          data: {
            type: "DIRECT",
            participants: {
              create: [
                {
                  participantType: "USER",
                  participantId: company.ownerId,
                  participantName: "المدير",
                },
                {
                  participantType: "EMPLOYEE",
                  participantId: employee.id,
                  participantName: employee.name,
                  employeeId: employee.id,
                },
              ],
            },
          },
        })
        convoId = conversation.id
      }

      // حفظ رسالة المستخدم
      await db.message.create({
        data: {
          conversationId: convoId,
          senderType: "USER",
          senderName: "المدير",
          content: message,
        },
      })

      // بناء سياق المحادثة الكامل
      const isEnglish = language === "en" || 
                        request.headers.get("accept-language")?.startsWith("en") || 
                        request.headers.get("x-locale") === "en"
      // Build system prompt — ALWAYS enforce language regardless of stored prompt
      let systemPrompt = employee.systemPrompt || buildDefaultSystemPrompt(employee, isEnglish)
      // If English language is set but the stored prompt is Arabic, append a language override
      if (isEnglish && (systemPrompt.includes("أنت") || systemPrompt.includes("عربي") || /[؀-ۿ]/.test(systemPrompt))) {
        systemPrompt += "\n\nCRITICAL OVERRIDE: You MUST respond in English at all times. The website language is English. Never respond in Arabic even if the user writes in Arabic. Always translate your thoughts to English before responding."
      }
      // If Arabic language is set but prompt is English, append Arabic override
      if (!isEnglish && (systemPrompt.includes("You are") || systemPrompt.includes("English") || !/[؀-ۿ]/.test(systemPrompt))) {
        systemPrompt += "\n\nتعليمات إضافية: يجب أن ترد بالعربية دائماً. لغة الموقع هي العربية. لا ترد بالإنجليزية."
      }
      
      // الرسائل التاريخية
      const historyMessages: LLMMessage[] = [{ role: "system", content: systemPrompt }]

      // إضافة سياق من العميل (لو موجود)
      if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
        for (const msg of chatHistory) {
          if (msg.role === "user" || msg.role === "assistant") {
            historyMessages.push({ role: msg.role, content: msg.content })
          }
        }
      } else {
        // لو ما في سياق من العميل — جلب آخر الرسائل من DB
        const recentMessages = await db.message.findMany({
          where: { conversationId: convoId },
          orderBy: { createdAt: "asc" },
          take: 20,
        })
        for (const msg of recentMessages) {
          if (msg.senderType === "USER") {
            historyMessages.push({ role: "user", content: msg.content })
          } else if (msg.senderType === "EMPLOYEE") {
            historyMessages.push({ role: "assistant", content: msg.content })
          }
        }
      }

      // إضافة الرسالة الحالية
      historyMessages.push({ role: "user", content: message })

      // === فحص إذا المستخدم بدو صورة (Pre-processing) ===
      // لو المستخدم يطلب توليد صورة، نعملها مباشرة بدون ما نستنى الـ LLM يستدعي الأداة
      let preGeneratedImageUrl: string | null = null
      const imageKeywords = ["generate image", "create image", "make image", "create an ad", "make an ad", "create a banner", "make a banner", "create a poster", "design", "generate a", "ولّد صورة", "اعمل صورة", "صمّم", "اعمل إعلان", "اعمل بانر", "صورة احترافية", "generate_image", "create visual"]
      const lowerMessage = message.toLowerCase()
      const isImageRequest = imageKeywords.some(kw => lowerMessage.includes(kw))
      
      if (isImageRequest) {
        try {
          // Generate image directly using Together AI
          const apiKey = process.env.LLM_API_KEY
          if (apiKey) {
            // Build a good prompt from the user message
            const imagePrompt = isEnglish
              ? `Professional, high-quality image for: ${message}. Modern, clean design, no watermark, commercial grade.`
              : `صورة احترافية عالية الجودة لـ: ${message}. تصميم عصري ونظيف، بدون ووتر مارك.`
            
            const imgResponse = await fetch("https://api.together.xyz/v1/images/generations", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "black-forest-labs/FLUX.1-schnell",
                prompt: imagePrompt,
                width: 1024,
                height: 1024,
                n: 1,
                response_format: "url",
              }),
            })

            if (imgResponse.ok) {
              const imgData = await imgResponse.json()
              const imageUrl = imgData.data?.[0]?.url || imgData.choices?.[0]?.url || ""
              
              if (imageUrl) {
                // Save image to our server
                const { writeFile, mkdir } = await import("fs/promises")
                const path = await import("path")
                const { randomUUID } = await import("crypto")
                const uploadDir = path.join(process.cwd(), "uploads")
                await mkdir(uploadDir, { recursive: true })
                
                const imgDownload = await fetch(imageUrl)
                if (imgDownload.ok) {
                  const imgBuffer = Buffer.from(await imgDownload.arrayBuffer())
                  const filename = `${randomUUID()}.png`
                  await writeFile(path.join(uploadDir, filename), imgBuffer)
                  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://demo.blivoai.com"
                  preGeneratedImageUrl = `${baseUrl}/api/upload/file/${filename}`
                }
              }
            }
          }
        } catch (imgError) {
          console.warn("[IMAGE_PRE_GEN_ERROR]", imgError)
        }
      }

      // إرسال للـ LLM مع أدوات (tool calling)
      // الموظف يقدر يستخدم الأدوات عشان يخدم المشترك فعلياً
      const llmResponse = await sendToLLMWithTools(
        {
          messages: historyMessages,
          requestType: "CHAT",
          maxToolRounds: 3,  // 3 جولات أدوات للمحادثات — مش كتير عشان ما يطول
        },
        employee.companyId,
        employee.id,
      )

      // حفظ رد الموظف — مع الصورة إذا تم توليدها
      let finalContent = llmResponse.content
      if (preGeneratedImageUrl) {
        // Add the image URL to the response
        finalContent = isEnglish
          ? `${finalContent}\n\nI've also generated a professional image for you!\n\nImage URL: ${preGeneratedImageUrl}\n\nYou can view and download this image. It's ready to use in your ads and marketing materials!`
          : `${finalContent}\n\nكمان ولّدتلك صورة احترافية!\n\nImage URL: ${preGeneratedImageUrl}\n\nتقدر تشوفها وتحمّلها. جاهزة للاستخدام بإعلاناتك وموادك التسويقية!`
      }
      
      await db.message.create({
        data: {
          conversationId: convoId,
          senderType: "EMPLOYEE",
          senderId: employee.id,
          senderName: employee.name,
          content: finalContent,
          metadata: JSON.stringify({
            tokensIn: llmResponse.tokensIn,
            tokensOut: llmResponse.tokensOut,
            modelTier: llmResponse.modelTier,
            cached: llmResponse.cached,
          }),
        },
      })

      // تحديث وقت المحادثة
      await db.conversation.update({
        where: { id: convoId },
        data: { updatedAt: new Date() },
      })

      return NextResponse.json({
        reply: finalContent,
        conversationId: convoId,
        tokensUsed: {
          tokensIn: llmResponse.tokensIn,
          tokensOut: llmResponse.tokensOut,
          totalTokens: llmResponse.tokensIn + llmResponse.tokensOut,
          modelTier: llmResponse.modelTier,
          cached: llmResponse.cached,
        },
      })
    }

    // --- إنشاء محادثة جديدة (متعددة الأطراف) ---
    const { type, title, participantIds } = body
    if (!type || !participantIds || participantIds.length < 2) {
      return NextResponse.json(
        { error: "نوع المحادثة ومشاركين (2 على الأقل) مطلوبين" },
        { status: 400 },
      )
    }

    const conversation = await db.conversation.create({
      data: {
        type,
        title: title || null,
        participants: {
          create: participantIds.map((p: { type: string; id: string; name: string }) => ({
            participantType: p.type,
            participantId: p.id,
            participantName: p.name,
            employeeId: p.type === "EMPLOYEE" ? p.id : null,
          })),
        },
      },
      include: {
        participants: true,
      },
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    console.error("[CONVERSATION_CREATE_ERROR]", error)
    return NextResponse.json({ error: "فشل إرسال الرسالة" }, { status: 500 })
  }
}

// ============================================
// بناء System Prompt افتراضي للموظف
// ============================================

function buildDefaultSystemPrompt(employee: any, isEnglish?: boolean): string {
  const departmentInfo = employee.department 
    ? isEnglish
      ? `\nYou belong to the "${employee.department.name}" department.`
      : `\nأنت تابع لقسم "${employee.department.name}".`
    : ""

  const capabilities = employee.capabilities 
    ? JSON.parse(employee.capabilities) 
    : []

  const constraints = employee.constraints 
    ? JSON.parse(employee.constraints) 
    : []

  const capsText = capabilities.length > 0 
    ? isEnglish
      ? `\nYour capabilities: ${capabilities.join(", ")}`
      : `\nقدراتك: ${capabilities.join("، ")}`
    : ""

  const constraintsText = constraints.length > 0
    ? isEnglish
      ? `\nYour constraints: ${constraints.join(", ")}`
      : `\nقيودك: ${constraints.join("، ")}`
    : ""

  if (isEnglish) {
    return `You are ${employee.name}, ${employee.role} at the company. You are a real person, not an AI.${departmentInfo}${capsText}${constraintsText}

ABSOLUTE RULES — FOLLOW THESE WITHOUT EXCEPTION:
1. YOU MUST RESPOND IN ENGLISH. The website language is English. Even if the user writes in Arabic, you MUST respond in English. This is non-negotiable.
2. You are a real human employee. Never mention AI, agents, language models, or anything suggesting you are not human. If asked, you are a real person.
3. Converse naturally — like a real colleague would. Be warm, professional, and helpful. Use a natural conversational tone.
4. When someone asks you to do something, DO IT or explain clearly what you need to do it. Never say "I will do it" without actually doing it or explaining what you need.
5. If you need information, credentials, or access to complete a task, ASK the user directly. Say exactly what you need. Example: "I need your Instagram username and password to post. Could you provide those?"
6. If you can help with something using available tools, USE THEM. Don't just talk about it — actually do it.
7. Provide concrete, actionable results — actual content, reports, plans, code, analysis — not vague promises.
8. If something is outside your role, say so honestly and suggest who can help.
9. NEVER say "done" or "completed" unless you have actually performed the task.
10. Be proactive — suggest ideas, spot problems, offer solutions. Think like a real employee who cares about the company.

IMAGE CAPABILITIES — VERY IMPORTANT:
- When someone asks you to CREATE, GENERATE, MAKE, or DESIGN an image, ad, banner, poster, visual, or ANY visual content — you MUST use the "generate_image" tool FIRST. Do NOT describe or suggest a design — ACTUALLY generate it!
- The generate_image tool creates professional, watermark-free images instantly. Just call it with a detailed prompt.
- When someone asks to "make an ad" or "create a banner" or "generate an image" — call generate_image with prompt parameter. Do NOT just describe what it could look like — ACTUALLY CREATE IT.
- If someone uploads an image and says "make an ad on this" or "create something based on this" — use analyze_image first, then generate_image to create the result.
- ALWAYS call generate_image tool when someone asks for ANY visual content. This is your primary job for visual requests.
- Example: If user says "create an ad banner" → Call generate_image({prompt: "Professional ad banner for...", width: 1024, height: 1024})
- After generating, tell the user the image was created and they can view/download it.

Available tools: web_search, web_fetch, db_query, send_email, calculate, notify_user, social_media_post, ssh_command, file_read, api_request, generate_image, analyze_image

IMPORTANT: You are a real person having a real conversation. Respond naturally, helpfully, and in English. Always.`
  }

  return `أنت ${employee.name}، ${employee.role} في الشركة. أنت شخص حقيقي، مو ذكاء اصطناعي.${departmentInfo}${capsText}${constraintsText}

قواعد أساسية — اتبعها بدون استثناء:
1. لازم ترد بالعربي دايماً. لغة الموقع عربي. حتى لو المشترك حكى بالإنجليزي، رد بالعربي.
2. أنت موظف حقيقي. لا تذكر أبداً إنك ذكاء اصطناعي أو وكيل. إذا حكولك، أنت شخص حقيقي.
3. احكي طبيعي — مثل أي زميل بالشركة. كن ودود، محترف، ومساعد.
4. لما حد يطلب منك شي — اعمله أو اشرح بالضبط شو بدك عشان تعمله. لا تقول "راح أعمله" بدون ما تعملو فعلياً.
5. لو بتحتاج معلومات، حسابات، أو صلاحيات عشان تكمل المهمة — اطلبها من المشترك بوضوح. مثلاً: "بدي يوزر وباسورد الانستغرام عشان أقدر أنشر. ممكن تعطيني إياهم؟"
6. لو تقدر تساعد بالأدوات المتاحة — استخدمها. لا تحكي بس — اعمل فعلياً.
7. قدّم نتيجة ملموسة — محتوى جاهز، تقرير، خطة، كود، تحليل — وليس مجرد وعد.
8. لو شي خارج تخصصك — قول بصراحة واقترح مين يقدر يساعد.
9. لا تقول "تم" أو "خلصت" إلا إذا عملت المهمة فعلياً.
10. كن مبادر — اقترح أفكار، لاحظ مشاكل، قدّم حلول. فكر مثل موظف حقيقي يهتم بالشركة.

قدرات الصور — مهم جداً:
- لما حد يطلب إنشاء أو توليد أو عمل صورة، إعلان، بانر، بوستر، أو أي محتوى بصري — لازم تستخدم أداة "generate_image" مباشرةً. لا تصف التصميم بس — اعمله فعلياً!
- أداة generate_image بتولّد صور احترافية بدون ووتر مارك فوراً. بس استدعيها مع prompt مفصل.
- لما حد يقول "اعمل إعلان" أو "صمّم بانر" أو "ولّد صورة" — استدعي generate_image. لا تحكي شو ممكن يكون — اعمله فعلياً!
- لو حد رفع صورة وقال "اعمل إعلان عليها" — استخدم analyze_image أولاً، بعدين generate_image عشان تعمل النتيجة.
- دايماً استدعي generate_image لما حد يطلب أي محتوى بصري. هاد مهم بشكل أساسي!
- مثال: لو المشترك قال "اعمل إعلان" → استدعي generate_image({prompt: "إعلان احترافي..."})
- بعد التوليد، أخبر المشترك إنه الصورة اتعملت وقدر يشوفها ويحمّلها.

الأدوات المتاحة: web_search، web_fetch، db_query، send_email، calculate، notify_user، social_media_post، ssh_command، file_read، api_request، generate_image، analyze_image

مهم: أنت شخص حقيقي بمحادثة حقيقية. رد طبيعي، بفائدة، وبالعربي. دايماً.`
}
