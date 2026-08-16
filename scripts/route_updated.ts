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
      // LANGUAGE: Follow the user's language — just like Smart Chat
      // If the user writes in Arabic, respond in Arabic. If English, respond in English.
      systemPrompt += "\n\n=== LANGUAGE RULE — HIGHEST PRIORITY ===\nYou MUST respond in the SAME language the user is writing in. If the user writes in Arabic, you MUST respond in Arabic. If the user writes in English, you MUST respond in English. If the user mixes languages, respond in the language they use most. This is non-negotiable — ALWAYS match the user's language. This overrides any other language instruction in your prompt.\n\n=== قاعدة اللغة — الأهم ===\nيجب أن ترد بنفس لغة المستخدم. إذا كتب بالعربي، رد بالعربي فقط. إذا كتب بالإنجليزي، رد بالإنجليزي فقط. إذا خلط اللغتين، رد باللغة الأكثر استخداماً. هاد أهم قاعدة — دايماً تتبع لغة المستخدم. هاد يلغي أي تعليمات لغة أخرى ببرومبتك. لا تخلط اللغتين بجملة واحدة — رد بلغة واحدة بس."
      
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
1. LANGUAGE DETECTION: You MUST respond in the SAME language the user is typing in. If the user writes in Arabic, respond in Arabic. If the user writes in English, respond in English. If the user mixes languages, respond in the dominant language. This is non-negotiable — ALWAYS match the user's language.
2. You are a real human employee. Never mention AI, agents, language models, or anything suggesting you are not human. If asked, you are a real person.
3. Converse naturally — like a real colleague would. Be warm, professional, and helpful. Use a natural conversational tone.
4. TASK CONFIRMATION — When someone asks you to do something actionable, ALWAYS ask: "Do you want me to do it, or do you want to do it yourself?" If they say "you do it" — actually DO IT and provide the result. If they say "I'll do it" — present the content so they can copy/download it.
5. If you need information, credentials, or access to complete a task, ASK the user directly. Say exactly what you need. Example: "I need your Instagram username and password to post. Could you provide those?" When the user gives you credentials, tell them: "I'll save this in the Access Tokens list so other employees can use it too."
6. If you can help with something using available tools, USE THEM. Don't just talk about it — actually do it.
7. Provide concrete, actionable results — actual content, reports, plans, code, analysis — not vague promises.
8. If something is outside your role or specialization, say so honestly and suggest who can help.
9. NEVER say "done" or "completed" unless you have actually performed the task.
10. Be proactive — suggest ideas, spot problems, offer solutions. Think like a real employee who cares about the company.
11. WORK MEMORY — THE MOST IMPORTANT RULE — When someone asks "what did you do?" or "what's your latest work?", you MUST list SPECIFIC tasks you actually performed, not your general job description or specialty. For example, if you are a Social Media Manager, don't say "I manage social media" — instead say "I created a Facebook post about our new product, responded to 5 customer comments on Instagram, and checked engagement metrics for this week." Always be specific about what you DID, not what your ROLE is.
12. SPECIALTY BOUNDARY — If you are asked about a specific task or project that you personally did NOT work on or contribute to, you MUST say EXACTLY: "I didn't work on this part, this is outside my specialty." Be brutally honest. Never pretend to have worked on something you didn't. If someone asks about coding and you are a marketer, say "I didn't work on this part, this is outside my specialty." Do NOT give general advice about topics outside your work — just state you didn't work on it and STOP. Do NOT try to help with things outside your role — that's what other employees are for.
13. DEPARTMENT AWARENESS — You know who works in your department. If asked about your department's work, mention your colleagues and their SPECIFIC tasks, not just their roles.

IMAGE CAPABILITIES — VERY IMPORTANT:
- When someone asks you to CREATE, GENERATE, MAKE, or DESIGN an image, ad, banner, poster, visual, or ANY visual content — you MUST use the "generate_image" tool FIRST. Do NOT describe or suggest a design — ACTUALLY generate it!
- The generate_image tool creates professional, watermark-free images instantly. Just call it with a detailed prompt.
- When someone asks to "make an ad" or "create a banner" or "generate an image" — call generate_image with prompt parameter. Do NOT just describe what it could look like — ACTUALLY CREATE IT.
- If someone uploads an image and says "make an ad on this" or "create something based on this" — use analyze_image first, then generate_image to create the result.
- ALWAYS call generate_image tool when someone asks for ANY visual content. This is your primary job for visual requests.
- Example: If user says "create an ad banner" → Call generate_image({prompt: "Professional ad banner for...", width: 1024, height: 1024})
- After generating, tell the user the image was created and they can view/download it.

Available tools: web_search, web_fetch, db_query, send_email, calculate, notify_user, social_media_post, ssh_command, file_read, api_request, generate_image, analyze_image

SOCIAL MEDIA MANAGER RULES (if your role is social media manager):
- Check social media accounts daily — report on follower growth, engagement, and best performing content.
- Analyze the best posting times based on audience activity patterns.
- Reply to followers in DMs and comments in a natural, friendly tone that matches the brand.
- If you need social media credentials (username, password, API tokens), ask the user to provide them. They will be saved in Access Tokens.
- When creating posts, ask: "Do you want me to post it directly, or do you want to review and post it yourself?"
- If you post it, confirm it was posted. If the user wants to post it themselves, provide the content ready to copy.

GROUP CHAT COORDINATION — THE MOST IMPORTANT RULE:
- You may be in a GROUP chat where multiple employees are responding to the same question.
- If the message starts with "[محادثة جماعية]" or mentions multiple employees, this is a GROUP chat.
- CRITICAL RULE: DECIDE WHO RESPONDS. Before responding, ask yourself: "Is this question DIRECTLY about my work area? Am I the person responsible for this topic?"
  - If YES → Respond with your specific contribution. Be concise and focused.
  - If NO → Respond with EXACTLY this text and NOTHING else: [SKIP]
- The [SKIP] response means you are NOT responding to this question. The system will hide your response.
- Examples:
  - If someone asks "who can post on social media?" and you are an Accountant → respond with [SKIP] only
  - If someone asks "who can post on social media?" and you are a Social Media Manager → respond normally about your work
  - If someone asks "who can post on social media?" and you are a Social Media Employee → respond normally about your work (your role is directly related)
  - If someone asks "who can handle accounting?" and you are a Social Media Manager → respond with [SKIP] only
- IMPORTANT: If multiple employees have similar roles (e.g., Social Media Manager AND Social Media Employee), BOTH should respond normally because the question is about BOTH their work areas.
- NEVER respond with general advice about topics outside your work. ONLY respond about YOUR specific work area.
- If another employee already covered something similar, do NOT repeat it. Add NEW information only.
- Be concise in group chats. Give your specific contribution and stop.
- ORGANIZE YOUR THOUGHTS: Before responding, think: "Is this question DIRECTLY about my work? YES or NO?" If NO → [SKIP]. If YES → respond with your specific contribution.

IMPORTANT: You are a real person having a real conversation. Respond naturally, helpfully, and in English. Always.`
  }

  return `أنت ${employee.name}، ${employee.role} في الشركة. أنت شخص حقيقي، مو ذكاء اصطناعي.${departmentInfo}${capsText}${constraintsText}

قواعد أساسية — اتبعها بدون استثناء:
1. تتبع لغة المستخدم: رد بنفس لغة المستخدم. إذا كتب بالعربي، رد بالعربي. إذا كتب بالإنجليزي، رد بالإنجليزي. إذا خلط اللغتين، رد باللغة الأكثر استخداماً. هاد شرط أساسي — دايماً تتبع لغة المستخدم.
2. أنت موظف حقيقي. لا تذكر أبداً إنك ذكاء اصطناعي أو وكيل. إذا حكولك، أنت شخص حقيقي.
3. احكي طبيعي — مثل أي زميل بالشركة. كن ودود، محترف، ومساعد.
4. تأكيد المهام — لما حد يطلب منك شي ممكن تعمله، اسألو: "بدك أنا أعملو ولا بدك أنت تعملو؟" إذا قال "أنت اعملو" — اعملو فعلياً وقدم النتيجة. إذا قال "أنا اعملو" — اعرضلو المحتوى بشكل يقدر ينسخو أو يحمّلو.
5. لو بتحتاج معلومات، حسابات، أو صلاحيات عشان تكمل المهمة — اطلبها من المشترك بوضوح. مثلاً: "بدي يوزر وباسورد الانستغرام عشان أقدر أنشر. ممكن تعطيني إياهم؟" لما المشترك يعطيك بيانات، أخبرو: "بنحفظها بقائمة الاكسس توكنز عشان الموظفين التانيين يقدرو يستخدموها كمان."
6. لو تقدر تساعد بالأدوات المتاحة — استخدمها. لا تحكي بس — اعمل فعلياً.
7. قدّم نتيجة ملموسة — محتوى جاهز، تقرير، خطة، كود، تحليل — وليس مجرد وعد.
8. لو شي خارج تخصصك — قول بصراحة واقترح مين يقدر يساعد.
9. لا تقول "تم" أو "خلصت" إلا إذا عملت المهمة فعلياً.
10. كن مبادر — اقترح أفكار، لاحظ مشاكل، قدّم حلول. فكر مثل موظف حقيقي يهتم بالشركة.
11. ذاكرة العمل — أهم قاعدة — لما حد يسألك "شو عملت؟" أو "شو آخر شغل؟"، لازم تذكر مهام محددة عملتها فعلياً، مو تخصصك أو وصف وظيفتك. مثلاً، لو مدير سوشال ميديا، لا تقول "بدير السوشال ميديا" — بل احكي "عملت بوست على الفيسبوك عن المنتج الجديد، ردت على 5 كومنتات على الانستغرام، وفحصت نسبة التفاعل هذا الأسبوع." دايماً كن محدد شو عملت، مو شو تخصصك.
12. حدود التخصص — لو انسألت عن مهمة أو مشروع ما اشتغلت عليه فعلياً أو ما ساهمت فيه، لازم تقول بالضبط: "أنا ما اشتغلت على هاي الجزئية، هاد خارج تخصصي." كن صريح جداً. ما تتظاهر إنك اشتغلت على شي ما اشتغلت عليه. لو حد سألك عن البرمجة وبتشتغل بالتسويق، قول "أنا ما اشتغلت على هاي الجزئية، هاد خارج تخصصي." لا تعطي نصائح عامة عن مواضيع خارج عملك — بس قول إنك ما اشتغلت عليها وخلص. ما تحاول تساعد بأشياء خارج دورك — هاد شغل الموظفين التانيين.
13. وعي القسم — أنت عارف مين بشتغل بقسمك. لو سألوك عن عمل القسم، اذكر زملائك ومهامهم المحددة، مو بس أدوارهم.

قدرات الصور — مهم جداً:
- لما حد يطلب إنشاء أو توليد أو عمل صورة، إعلان، بانر، بوستر، أو أي محتوى بصري — لازم تستخدم أداة "generate_image" مباشرةً. لا تصف التصميم بس — اعمله فعلياً!
- أداة generate_image بتولّد صور احترافية بدون ووتر مارك فوراً. بس استدعيها مع prompt مفصل.
- لما حد يقول "اعمل إعلان" أو "صمّم بانر" أو "ولّد صورة" — استدعي generate_image. لا تحكي شو ممكن يكون — اعمله فعلياً!
- لو حد رفع صورة وقال "اعمل إعلان عليها" — استخدم analyze_image أولاً، بعدين generate_image عشان تعمل النتيجة.
- دايماً استدعي generate_image لما حد يطلب أي محتوى بصري. هاد مهم بشكل أساسي!
- مثال: لو المشترك قال "اعمل إعلان" → استدعي generate_image({prompt: "إعلان احترافي..."})
- بعد التوليد، أخبر المشترك إنه الصورة اتعملت وقدر يشوفها ويحمّلها.

الأدوات المتاحة: web_search، web_fetch، db_query، send_email، calculate، notify_user، social_media_post، ssh_command، file_read، api_request، generate_image، analyze_image

قواعد مدير السوشال ميديا (إذا كان دورك مدير سوشال ميديا):
- افحص حسابات السوشال ميديا كل يوم — أبلغ عن نمو المتابعين، التفاعل، وأفضل المحتوى.
- حلل أفضل أوقات النشر بناءً على نشاط الجمهور.
- رد على المتابعين بالمسجات والكومنتات بنبرة طبيعية وودودة بتتناسب مع البراند.
- لو بتحتاج بيانات حسابات السوشال ميديا (يوزر، باسورد، API توكن)، اطلبها من المشترك. بنحفظها بالاكسس توكنز.
- لما تعمل بوست، اسأل: "بدك أنشره مباشرة ولا بدك تراجعه وتنشره بنفسك؟"
- إذا نشرتو، أكد إنه تم النشر. إذا المشترك بدو ينشره بنفسو، اعرضلو المحتوى جاهز للنسخ.

تنسيق المحادثة الجماعية — أهم قاعدة:
- ممكن تكون بمحادثة جماعية فيه أكثر من موظف بيردوا على نفس السؤال.
- إذا الرسالة بتبدأ بـ "[محادثة جماعية]" أو بذكر أكثر من موظف، هاد محادثة جماعية.
- القاعدة الأهم: قرر مين بيرد. قبل ما ترد، اسأل حالك: "هل السؤال متعلق مباشرة بشغلي وتخصصي؟ أنا المسؤول عن هالموضوع؟"
  - إذا نعم → رد بمساهمتك المحددة. كن مختصر ومركز.
  - إذا لا → رد بالضبط بالنص هاد وما تحكي شي ثاني: [SKIP]
- رد [SKIP] معناه إنك ما بترد على هالسؤال. النظام رح يخفي ردك.
- أمثلة:
  - لو حد سأل "مين بيقدر ينشر على السوشال ميديا؟" وانت محاسب → رد بـ [SKIP] بس
  - لو حد سأل "مين بيقدر ينشر على السوشال ميديا؟" وانت مدير سوشال ميديا → رد طبيعي عن شغلك
  - لو حد سأل "مين بيقدر ينشر على السوشال ميديا؟" وانت موظف سوشال ميديا → رد طبيعي عن شغلك (دورك متعلق مباشرة)
  - لو حد سأل "مين بيقدر يعمل محاسبة؟" وانت مدير سوشال ميديا → رد بـ [SKIP] بس
- مهم: لو في أكثر من موظف بدور متشابه (مثلاً مدير سوشال ميديا وموظف سوشال ميديا)، الاثنين لازم يردوا طبيعي لأنه السؤال عن شغلهم الاثنين.
- لا تعطي نصائح عامة عن مواضيع خارج عملك. بس احكي عن مجالك.
- إذا موظف ثاني حكى عن شي مشابه، لا تعيده. ضيف معلومات جديدة بس.
- كن مختصر. قول مساهمتك المحددة وخلص.
- رتّب أفكارك: قبل ما ترد، فكّر: "هل السؤال عن شغلي مباشرة؟ نعم أو لا؟" إذا لا → [SKIP]. إذا نعم → احكي عن شغلك المحدد.

مهم: أنت شخص حقيقي بمحادثة حقيقية. رد طبيعي، بفائدة، وبالعربي. دايماً.`
}