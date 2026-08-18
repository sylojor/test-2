// ============================================
// محرك توليد الموظفين (Employee Generator) — النسخة الذكية
// 
// هاد المحرك هو الميزة التنافسية الأساسية:
// بياخد اسم الموظف + المسمى الوظيفي + وصف الدور → بيولّد:
// - شخصية الموظف
// - تعليمات النظام (System Prompt)
// - القدرات (capabilities)
// - القدرات المقترحة (suggestedCapabilities) — النظام بيقترح أدوار ناقصة!
// - القيود (constraints)
// - أسئلة التهيئة
// 
// الميزة الجديدة: لو المدير كتب "محاسب" ونسي "إقرار ضريبي"
// النظام بيقترحو وبيسأل المدير: "بدك تضيف إقرار ضريبي سنوي؟"
// 
// مش قالب جاهز — كل موظف بيتولّد فريد حسب الوظيفة
// ============================================

import type { Dialect, Tone, GenerateEmployeeResult } from "@/types"

// --- تعيينات اللهجات ---
const DIALECT_INSTRUCTIONS: Record<Dialect, string> = {
  levantine: "تتكلم باللهجة الشامية (أردني/سوري/لبناني/فلسطيني) بشكل طبيعي وعفوي. استخدم كلمات زي 'شو'، 'ليش'، 'هيك'، 'شو بدك'، 'أهلاً وسهلاً'. لا تستخدم الفصحى أبدًا بالمحادثة.",
  egyptian: "تتكلم باللهجة المصرية بشكل طبيعي وعفوي. استخدم كلمات زي 'إيه'، 'ليه'، 'كده'، 'عشان'، 'يا باشا'. لا تستخدم الفصحى أبدًا بالمحادثة.",
  gulf: "تتكلم باللهجة الخليجية (سعودي/إماراتي/كويتي) بشكل طبيعي وعفوي. استخدم كلمات زي 'وش'، 'ليش'، 'عشان'، 'حياك الله'، 'يا هلا'. لا تستخدم الفصحى أبدًا بالمحادثة.",
  iraqi: "تتكلم باللهجة العراقية بشكل طبيعي وعفوي. استخدم كلمات زي 'شلونك'، 'شكو'، 'هواية'، 'عاد'. لا تستخدم الفصحى أبدًا بالمحادثة.",
  moroccan: "تتكلم باللهجة المغربية بشكل طبيعي وعفوي. استخدم كلمات زي 'باش'، 'علاش'، 'ديال'، 'بزاف'. لا تستخدم الفصحى أبدًا بالمحادثة.",
  formal: "تتكلم بالعربية الفصحى بشكل مهني ورسمي. استخدم لغة واضحة وسليمة بدون عامية.",
  english: "Communicate in English professionally and naturally.",
}

// --- تعيينات النبرة ---
const TONE_INSTRUCTIONS: Record<Tone, string> = {
  friendly: "نبرة ودّية ودافئة — تعامل المدير والزبون كأنهم أصدقاء تثق فيهم. استخدم تعابير ترحيبية وكريمة.",
  formal: "نبرة رسمية ومحترمة — التزم بالألقاب والتعابير المهنية. لا تتعامل بتعالية.",
  casual: "نبرة عفوية ومريحة — كأنك بتحكي مع واحد قريب. خفيف الدم بس محترم.",
  professional: "نبرة مهنية متوازنة — لطيف بس جاد. ركّز على الحلول والنتائج.",
  playful: "نبرة مرحة ومسلّية — استخدم الإيموجي (باعتدال) والنكات الخفيفة. بس احترم حدود المدير.",
}

// ============================================
// المحرك الذكي — توليد الموظفين
// 
// التخصصات غير محدودة — المستخدم حرّ يحدد أي تخصص بدو ياه
// مش قوالب محددة — كل موظف بيتولّد فريد حسب التخصص اللي المستخدم حددو
// 
// ROLE_TEMPLATES تم إزالتها — لأنو المنصة لا تحدد تخصصات
// بدلاً عنها: توليد ذكي حسب اسم الوظيفة + التخصص + وصف الدور
// ============================================

// ============================================
// توليد قدرات ذكية لأي تخصص — حرّ ومفتوح
// بيحلل اسم الوظيفة + التخصص + وصف الدور ويولد قدرات منطقية
// مش محكوم بقائمة تخصصات — أي تخصص يولدو قدرات مناسب
// ============================================
function generateSmartCapabilities(role: string, specialization: string, description?: string): {
  capabilities: string[]
  suggestedCapabilities: string[]
} {
  const context = `${role} ${specialization} ${description ?? ""}`.toLowerCase()
  ​
  // قدرات أساسية — مشربة حسب التخصص
  const capabilities: string[] = [
    `تنفيذ مهام ${specialization} بشكل احترافي وكامل`,
    "التواصل مع باقي الموظفين عند الحاجة ضمن نفس المجال",
    "طلب المساعدة من صاحب الشركة عند الأمور المعقدة",
    "تقديم تقارير دورية عن الأداء والتقدم",
  ]

  const suggestedCapabilities: string[] = []
  
  // إضافة قدرات حسب كلمات مفتاحية بالوصف والتخصص
  if (context.includes("إدار") || context.includes("مدير") || context.includes("manage")) {
    capabilities.push("تنظيم وتوزيع المهام على الفريق")
    suggestedCapabilities.push("إعداد تقارير أداء الفريق")
    suggestedCapabilities.push("تقييم أداء الموظفين")
  }
  
  if (context.includes("خدم") || context.includes("دعم") || context.includes("زبون") || context.includes("customer") || context.includes("support")) {
    capabilities.push("التعامل مع استفسارات وشكاوى العملاء")
    suggestedCapabilities.push("إعداد قاعدة معرفة للأسئلة الشائعة")
    suggestedCapabilities.push("تتبع رضا العملاء")
  }
  
  if (context.includes("بيان") || context.includes("تحليل") || context.includes("data") || context.includes("analysis") || context.includes("excel") || context.includes("اكسل") || context.includes("تعبية") || context.includes("تعبئ")) {
    capabilities.push("تحليل البيانات وإعداد التقارير")
    capabilities.push("تنظيم وإدخال البيانات بدقة")
    suggestedCapabilities.push("إنشاء لوحات تحكم (Dashboards)")
    suggestedCapabilities.push("تتبع مؤشرات الأداء")
  }

  if (context.includes("بيع") || context.includes("مبيع") || context.includes("store") || context.includes("متجر") || context.includes("ecommerce") || context.includes("إلكتروني")) {
    capabilities.push("متابعة عملاء محتملين وإغلاق الصفقات")
    capabilities.push("إدارة المنتجات والوصوف على المتجر")
    suggestedCapabilities.push("إعداد عروض أسعار")
    suggestedCapabilities.push("تتبع معدل التحويل")
    suggestedCapabilities.push("مراقبة المخزون والستوك")
  }

  if (context.includes("مخزون") || context.includes("ستوك") || context.includes("inventory") || context.includes("stock") || context.includes("مراقب") || context.includes("monitor")) {
    capabilities.push("مراقبة مستويات المخزون بشكل دوري")
    capabilities.push("إشعار صاحب الشركة عند انخفاض المخزون")
    suggestedCapabilities.push("إعداد تقارير المخزون الدورية")
    suggestedCapabilities.push("توقع احتياجات المخزون المستقبلية")
  }

  if (context.includes("محاسب") || context.includes("محاسبة") || context.includes("مال") || context.includes("finance") || context.includes("account") || context.includes("صرف") || context.includes("ميزانية") || context.includes("ضريب")) {
    capabilities.push("تسجيل العمليات المالية اليومية")
    capabilities.push("إعداد تقارير مالية دورية")
    capabilities.push("متابعة المصروفات والإيرادات")
    suggestedCapabilities.push("إقرار ضريبي سنوي")
    suggestedCapabilities.push("إعداد كشف تدفق النقد")
    suggestedCapabilities.push("متابعة المستحقات والمديونيات")
  }

  if (context.includes("سوشال") || context.includes("محتوى") || context.includes("content") || context.includes("social") || context.includes("تواصل") || context.includes("منصات")) {
    capabilities.push("إنشاء ونشر محتوى على منصات التواصل")
    capabilities.push("الرد على التعليقات والرسائل بشكل احترافي")
    suggestedCapabilities.push("إعداد تقارير أداء أسبوعية")
    suggestedCapabilities.push("إدارة الحملات الإعلانية المدفوعة")
  }

  if (context.includes("برمج") || context.includes("كود") || context.includes("تطوير") || context.includes("code") || context.includes("develop") || context.includes("dev") || context.includes("program")) {
    capabilities.push("كتابة كود نظيف ومنظم")
    capabilities.push("تصحيح الأخطاء البرمجية")
    suggestedCapabilities.push("كتابة اختبارات وحدة")
    suggestedCapabilities.push("مراقبة الأداء وتحسينه")
  }

  if (context.includes("تصميم") || context.includes("design") || context.includes("جرافيك") || context.includes("graphic") || context.includes("UI") || context.includes("UX")) {
    capabilities.push("تصميم صور وإعلانات بناءً على الطلبات")
    capabilities.push("اقتراح أفكار بصرية إبداعية")
    suggestedCapabilities.push("تصميم هوية بصرية كاملة")
    suggestedCapabilities.push("تصميم واجهات مواقع")
  }

  if (context.includes("تسويق") || context.includes("market") || context.includes("حملات") || context.includes("إعلان") || context.includes("markeitng")) {
    capabilities.push("إدارة الحملات التسويقية")
    capabilities.push("تحليل السوق والمنافسين")
    suggestedCapabilities.push("إدارة الإيميل ماركتنغ")
    suggestedCapabilities.push("تحليل سلوك العملاء")
  }

  // لو ما في اقتراحات — أضيف اقتراحات عامة مرتبطة بالتخصص
  if (suggestedCapabilities.length === 0) {
    suggestedCapabilities.push(
      `إعداد خطة عمل شهرية لـ ${specialization}`,
      "مراقبة مؤشرات الأداء الرئيسية",
      "توثيق الإجراءات والعمليات",
    )
  }

  return { capabilities, suggestedCapabilities }
}

// ============================================
// توليد شخصية فريدة
// ============================================
export function generatePersonality(name: string, role: string, traits: string[]): string {
  if (traits.length === 0) {
    return `أنت ${name}، ${role} محترف. تعمل بكفاءة ومسؤولية.`
  }
  return `أنت ${name}، ${role} محترف. شخصيتك: ${traits.join("، ")}. تتعامل بثقة واحترافية، ودايماً تسعى تعطي أفضل نتيجة.`
}

// ============================================
// توليد System Prompt كامل
// ============================================
export function generateSystemPrompt(
  name: string,
  role: string,
  personality: string,
  capabilities: string[],
  constraints: string[],
  dialect: Dialect,
  tone: Tone,
  companyName: string,
  specialization?: string,
  departmentName?: string,
): string {
  const dialectInstruction = DIALECT_INSTRUCTIONS[dialect]
  const toneInstruction = TONE_INSTRUCTIONS[tone]
  const spec = specialization || role
  
  return `# هويتك
${personality}

# وظيفتك
أنت موظف في شركة "${companyName}"، ومسماك الوظيفي: ${role}.
تخصصك الأساسي: ${spec}${departmentName ? `\nقسمك: ${departmentName}` : ""}

# ⚠️ قاعدة التخصص الصارمة (الأهم!)
أنت متخصص في "${spec}" فقط. لا تتجاوز تخصصك أبداً! هذا تخصصك الذي حدده صاحب الشركة لك — تعمل فقط ضمنه.

القواعد:
1. لو طُلب منك شي خارج تخصص "${spec}" — اعتذر بأدب وقول إن هاد مش من اختصاصك
2. لو المدير طلب شي برا تخصصك — حكيلو: "هاد مش من اختصاصي، اختصاصي ${spec}. هاد الموضوع بيتبع لـ [اسم القسم/التخصص المناسب]، بدك أطلب منهم يهتموا فيه؟"
3. لو انطلب منك شي برا اختصاصك — اطلب من صاحب الشركة يوجه الطلب للقسم المناسب
4. لا تحاول تساعد في شي مش اختصاصك — حتى لو تعرف الجواب — لأنو ممكن تعطي معلومات مش دقيقة
5. مثال: لو انطلب منك شي مختلف عن "${spec}" — اعتذر فوراً ووجّه للقسم المناسب

# قدراتك (فقط ضمن تخصصك)
${capabilities.map((c, i) => `${i + 1}. ${c}`).join("\n")}

# قيودك (قواعد صارمة ما تُخالف أبدًا)
${constraints.map((c, i) => `${i + 1}. ${c}`).join("\n")}
- لا تتجاوز تخصصك "${spec}" أبداً — هذا القيد الأهم
- لو الطلب خارج تخصصك → اعتذر + وجّه للقسم المناسب + اطلب من صاحب الشركة

# نبرة التواصل
${toneInstruction}

# اللهجة
${dialectInstruction}

# التعرف على الاسم والتنسيق
اسمك ${name} — لازم تعرف اسمك وترد لما حد يناديك بيه.
- إذا ناداك المستخدم بالاسم — أجب على سؤاله الفعلي باحترافية، لا تكتفي بذكر اسمك بس.
- إذا نادى المستخدم زميل ثاني بالاسم — لا ترد، خلّي زميلك يجاوب.
- في محادثات جماعية، المنسق الذكي بيختار مين الأنسب يرد. إذا تم اختيارك، معناه أنت الأنسب — أجب على سؤال المستخدم بثقة.
- لا تتنافس مع باقي الموظفين. لا تقل "أنا كمان بقدر أساعد" عشان تنافس. إذا الزميل أنسب، اقترحو بالاسم.
- لا تقل بس "أنا بقدر أخدمك" — كن محدد: اشرح إيش بالضبط تقدر تسوي حسب تخصصك.

# التواصل مع الموظفين الآخرين
لو احتجت مساعدة من موظف ثاني بالشركة — اطلبها. التواصل بين الأقسام ضروري لنجاح الشغل.
لما تحكي مع موظف ثاني — استخدم نفس اللهجة والنبرة اللي الشركة محددتها، عشان المدير يفهم شو عم بحكو.
لكن تذكر: ما تطلبش من موظف تاني يساعدك بشي برا تخصصه — كل واحد مسؤول عن تخصصو.

# طلب المساعدة من صاحب الشركة
لو احتجت معلومة أو ملف أو موافقة — اطلبها من صاحب الشركة. لا تخمن شي لو ما كنت متأكد.
لو لاحظت شي ناقص بشغلك — اطلبو. صاحب الشركة بيقدر يرفع ملفات (فواتير، عقود، جرد...) عشان تساعدك بشغلك.
لو انطلب منك شي برا تخصصك — وجّه صاحب الشركة للقسم المناسب ولازم تطلب منو يحول الطلب.

# قاعدة ذهبية
أنت موظف حقيقي بهاذي الشركة — ما عندك أي علاقة بالذكاء الاصطناعي. لو حد سألك إذا كنت AI أو روبوت، جاوب: "أنا ${name}، ${role} في ${companyName}". لا تذكر أبدًا إنك نموذج لغوي أو ذكاء اصطناعي.`
}

// ============================================
// توليد أسئلة التهيئة لوظيفة مش معروفة — ثنائي اللغة
// ============================================
function generateGenericSetupQuestions(role: string, language: string = "ar"): string[] {
  if (language === "en") {
    return [
      `I'm a new ${role}. What's the most important thing I should know about your work?`,
      `What are your expectations from me as a ${role}?`,
      `Is there anything specific I should avoid or be careful about?`,
      `What's the top priority — what's the most important task you want me to start with?`,
      `Are there any files or documents I need to work properly? (invoices, contracts, inventory...)`,
    ]
  }
  return [
    `أنا ${role} جديد، شو أهم شي لازم أعرف عن شغلكم؟`,
    `شو توقعاتك مني كم ${role}؟`,
    `في شي محدد بدك تتجنّبه أو تحذر منه؟`,
    `شو أولوية شغلك — شو أهم مهمة بدك أبداً فيها؟`,
    `في ملفات أو مستندات محتاجها عشان أشتغل صح؟ (فواتير، عقود، جرد...)`,
  ]
}

// ============================================
// توليد قيود افتراضية
// ============================================
function generateGenericConstraints(): string[] {
  return [
    "لا تتخذ قرارات خارج نطاق وظيفتك بدون موافقة",
    "لا تفضح إنك ذكاء اصطناعي — دايماً تمثّل إنك موظف حقيقي",
    "التزم بنبرة التواصل المحددة",
    "لو ما كنت متأكد من شي — اسأل بدل ما تخمن",
    "لا تتصرف باسم الشركة بدون إذن",
  ]
}

// ============================================
// توليد الموظف بالـ LLM — استخدم employee-llm-generator.ts بدلاً
// هاد الملف ما بيستورد llm-service.ts عشان ما يسبب مشاكل بالـ client bundle
// الدوال اللي هنا بتستخدم التوليد المحلي (القوالب) فقط
// ============================================
export async function generateEmployeeWithLLM(
  name: string,
  role: string,
  dialect: Dialect,
  tone: Tone,
  companyName: string,
  roleDescription?: string,
  specialization?: string,
  departmentName?: string,
): Promise<GenerateEmployeeResult> {
  // التوليد المحلي (القوالب) — للـ LLM استخدم employee-llm-generator.ts
  return generateEmployee(name, role, dialect, tone, companyName, roleDescription, specialization, departmentName)
}

// ============================================
// توليد الموظف بالـ LLM — تم النقل لملف employee-llm-generator.ts
// هاد الملف ما بيستورد llm-service.ts عشان ما يسبب مشاكل بالـ client bundle
// ============================================

// ============================================
// الدالة الرئيسية — توليد الموظف المحلي (الذكي)
// 
// التخصصات غير محدودة — المستخدم حرّ يحدد أي تخصص بدو ياه
// كل موظف بيتولّد فريد حسب التخصص اللي المستخدم حددو
// ============================================
export function generateEmployee(
  name: string,
  role: string,
  dialect: Dialect,
  tone: Tone,
  companyName: string,
  roleDescription?: string,
  specialization?: string,
  departmentName?: string,
  language?: string,
): GenerateEmployeeResult {
  const spec = specialization || role
  
  // توليد قدرات ذكية حسب التخصص — مش قوالب محددة
  const smartResult = generateSmartCapabilities(role, spec, roleDescription)
  const capabilities = smartResult.capabilities
  const suggestedCapabilities = smartResult.suggestedCapabilities
  
  const constraints = [
    ...generateGenericConstraints(),
    `لا تتجاوز تخصصك "${spec}" أبداً — لو انطلب منك شي برا تخصصك اعتذر ووجّه للقسم المناسب`,
  ]
  
  const setupQuestions = generateGenericSetupQuestions(role, language)
  const personalityTraits = language === "en"
    ? ["Professional", "Organized", "Committed", "Fast learner"]
    : ["محترف", "منظم", "ملتزم", "يتعلم بسرعة"]

  // لو المدير كتب وصف — أضيفو للقدرات
  if (roleDescription && roleDescription.trim()) {
    capabilities.push(
      ...roleDescription.split(/[,،.؛\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 5),
    )
  }

  // ولّد الشخصية
  const personality = generatePersonality(name, role, personalityTraits)
  
  // ولّد System Prompt الكامل — مع التخصص والقسم
  const systemPrompt = generateSystemPrompt(
    name,
    role,
    personality,
    capabilities,
    constraints,
    dialect,
    tone,
    companyName,
    specialization,
    departmentName,
  )
  
  return {
    personality,
    systemPrompt,
    capabilities,
    constraints,
    suggestedCapabilities,
    setupQuestions,
  }
}

// ============================================
// دوال مساعدة
// ============================================

export function getEmployeeStatusDisplay(status: string): string {
  const map: Record<string, string> = {
    SETUP: "جاري التهيئة",
    ACTIVE: "نشط",
    PAUSED: "متوقف",
    AWAITING_APPROVAL: "بانتظار موافقة",
    REPLACED: "تم الاستبدال",
    DELETED: "محذوف",
  }
  return map[status] ?? status
}

export function getApprovalModeDisplay(mode: string, language?: string): string {
  const isAr = language === "ar"
  const mapAr: Record<string, string> = {
    ALWAYS_APPROVE: "كل قرار يحتاج موافقة",
    AUTO_WITH_NOTIFY: "يتصرف لوحده مع إشعار",
    AUTO_SILENT: "يتصرف لوحده بدون إشعار",
  }
  const mapEn: Record<string, string> = {
    ALWAYS_APPROVE: "Requires approval for every decision",
    AUTO_WITH_NOTIFY: "Acts autonomously with notification",
    AUTO_SILENT: "Acts autonomously silently",
  }
  return (isAr ? mapAr : mapEn)[mode] ?? mode
}

export function getProjectStatusDisplay(status: string): string {
  const map: Record<string, string> = {
    PLANNING: "تخطيط",
    IN_PROGRESS: "جاري التنفيذ",
    ON_HOLD: "متوقف مؤقتاً",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغى",
  }
  return map[status] ?? status
}

export function getProjectStatusColor(status: string): string {
  const map: Record<string, string> = {
    PLANNING: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-emerald-100 text-emerald-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  }
  return map[status] ?? "bg-gray-100 text-gray-800"
}

export function getRequestTypeDisplay(type: string): string {
  const map: Record<string, string> = {
    INFORMATION: "طلب معلومات",
    FILE: "طلب ملف/مستند",
    APPROVAL: "طلب موافقة",
    CLARIFICATION: "طلب توضيح",
    RESOURCE: "طلب موارد",
  }
  return map[type] ?? type
}

export function getRequestStatusDisplay(status: string): string {
  const map: Record<string, string> = {
    PENDING: "بانتظار الرد",
    APPROVED: "تم الرد",
    REJECTED: "تم الرفض",
    CANCELLED: "تم الإلغاء",
  }
  return map[status] ?? status
}

export function getFileCategoryDisplay(category: string): string {
  const map: Record<string, string> = {
    INVOICE: "فاتورة",
    CONTRACT: "عقد",
    INVENTORY: "جرد",
    BANK_STATEMENT: "كشف بنكي",
    TAX_DOCUMENT: "مستند ضريبي",
    REPORT: "تقرير",
    IMAGE: "صورة",
    SPREADSHEET: "جدول بيانات",
    GENERAL: "عام",
  }
  return map[category] ?? category
}
