// ============================================
// Seed Script — BlivoAI
// Creates: admin user, platform settings, blog posts
// Admin: admin@blivoai.com / BlivoAdmin2024!
// Blog: 5 bilingual (AR/EN) articles for SEO
// ============================================

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // === 1. Create admin user ===
  const adminEmail = "admin@blivoai.com"
  const adminPassword = "BlivoAdmin2024!"
  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  let adminUser: any

  if (existingAdmin) {
    console.log("✅ Admin user already exists — updating password...")
    adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        password: hashedPassword,
        role: "OWNER",
        name: "BlivoAI Admin",
      }
    })
  } else {
    console.log("✨ Creating admin user...")
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "BlivoAI Admin",
        password: hashedPassword,
        role: "OWNER",
      }
    })
  }

  console.log("✅ Admin credentials:")
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Password: ${adminPassword}`)
  console.log(`   Role: OWNER`)

  // === 2. Create Platform Settings defaults ===
  const existingSettings = await prisma.platformSettings.findFirst()
  if (!existingSettings) {
    await prisma.platformSettings.create({
      data: {
        platformName: "BlivoAI",
        primaryColor: "teal",
      }
    })
    console.log("✅ Platform settings created")
  } else {
    console.log("✅ Platform settings already exist")
  }

  // === 3. Create Blog Posts — SEO-rich bilingual content ===
  console.log("📝 Creating blog posts...")

  const blogPosts = [
    {
      slug: "ai-employees-transform-business",
      titleAr: "كيف يحوّل الموظفون الذكاء الاصطناعي إدارة الأعمال في 2026",
      titleEn: "How AI Employees Are Transforming Business Management in 2026",
      excerptAr: "اكتشف كيف يمكن لموظفين الذكاء الاصطناعي المتخصصين أن يُحوّلوا طريقة عمل شركتك — من البرمجة إلى خدمة الزبائن، من الموارد البشرية إلى إدارة المشاريع.",
      excerptEn: "Discover how specialized AI employees can transform your company operations — from programming to customer service, from HR to project management.",
      contentAr: `<h2>مقدمة: ثورة الموظفين الذكاء الاصطناعي</h2>
<p>في عالم يتطور بسرعة غير مسبوقة، تظهر الموظفون الذكاء الاصطناعي كقوة تغيير جذري في إدارة الأعمال.不再是 مجرد أدوات مساعدة، بل أصبحوا شركاء عمل حقيقيين يساهمون في كل مراحل العملية الإنتاجية. هذه المقالة تستكشف كيف يمكن لموظفين AI المتخصصين أن يُحوّلوا طريقة عمل شركتك بشكل كامل.</p>

<h2>ما هو الموظف الذكاء الاصطناعي؟</h2>
<p>الموظف الذكاء الاصطناعي هو كيان رقمي متخصص يمتلك شخصية مهنية فريدة، خبرة في مجال محدد، والقدرة على التعلم والتطور مع كل تفاعل. Unlike simple chatbots, AI employees have deep domain expertise, can make decisions within defined parameters, and maintain consistent professional identities that align with your company culture and values.</p>

<h2>المجالات التي يُغطيها الموظفون AI</h2>
<p><strong>البرمجة والتطوير:</strong> موظف AI مبرمج يمكنه كتابة كود، حل مشاكل تقنية، مراجعة pull requests، واقتراح تحسينات. يمتلك خبرة في لغات متعددة ويمكنه التكيف مع أي stack تقنية تستخدمها شركتك.</p>
<p><strong>خدمة الزبائن:</strong> موظف AI لخدمة الزبائن يستطيع الرد على الاستفسارات 24/7، حل المشاكل الشائعة، توجيه الزبائن المعقدين للفريق البشري، وتحليل أنماط الشكاوى لتحسين المنتج. يتعامل بالعربية والإنجليزية بسلاسة.</p>
<p><strong>الموارد البشرية:</strong> موظف AI في الموارد البشرية يمكنه إدارة شؤون التوظيف، تنظيم الاجتماعات، تتبع أداء الموظفين، وإنشاء تقارير HR تفصيلية. يفهم قوانين العمل المحلية ويتأكد من الامتثال.</p>
<p><strong>إدارة المشاريع:</strong> موظف AI مدير مشاريع ينسق بين الفرق، يتابع المواعيد النهائية، يُنشئ أوامر العمل، ويقدم تحديثات منتظمة. يتعامل مع كل مراحل المشروع من التخطيط إلى التنفيذ.</p>

<h2>كيف تبدأ مع موظفين AI؟</h2>
<p>الخطوة الأولى هي تحديد المجالات التي تحتاج فيها شركتك لقوة عمل إضافية. في BlivoAI، يمكنك إنشاء موظف AI مخصص في دقائق — اختر التخصص، الشخصية المهنية، والنبرة المناسبة لشركتك. الموظف AI سيكون جاهزاً للعمل فوراً، ويتطور مع كل تفاعل ليصبح أكثر فعالية.</p>

<h2>الخلاصة</h2>
<p>الموظفون الذكاء الاصطناعي ليسوا مجرد trend عابر — هم جزء أساسي من مستقبل إدارة الأعمال. الشركات التي تعتمد عليهم الآن ستكون في مقدمة المنافسة. ابدأ اليوم مع BlivoAI واكتشف الفرق الذي يمكن أن يُحدثه موظف AI متخصص في شركتك.</p>`,
      contentEn: `<h2>Introduction: The AI Employee Revolution</h2>
<p>In a world evolving at unprecedented speed, AI employees are emerging as a transformative force in business management. No longer mere assistive tools, they have become genuine work partners contributing to every stage of the production process. This article explores how specialized AI employees can completely transform how your company operates.</p>

<h2>What is an AI Employee?</h2>
<p>An AI employee is a specialized digital entity that possesses a unique professional personality, expertise in a specific domain, and the ability to learn and evolve with every interaction. Unlike simple chatbots, AI employees have deep domain expertise, can make decisions within defined parameters, and maintain consistent professional identities that align with your company culture and values.</p>

<h2>Domains Covered by AI Employees</h2>
<p><strong>Programming & Development:</strong> An AI programmer employee can write code, solve technical problems, review pull requests, and suggest improvements. They possess expertise in multiple languages and can adapt to any tech stack your company uses.</p>
<p><strong>Customer Service:</strong> An AI customer service employee can respond to inquiries 24/7, resolve common issues, route complex customers to the human team, and analyze complaint patterns to improve the product. They handle Arabic and English seamlessly.</p>
<p><strong>Human Resources:</strong> An AI HR employee can manage recruitment affairs, organize meetings, track employee performance, and create detailed HR reports. They understand local labor laws and ensure compliance.</p>
<p><strong>Project Management:</strong> An AI project manager coordinates between teams, tracks deadlines, creates work orders, and provides regular updates. They handle all project phases from planning to execution.</p>

<h2>How to Start with AI Employees?</h2>
<p>The first step is identifying the areas where your company needs additional workforce. With BlivoAI, you can create a custom AI employee in minutes — choose the specialization, professional personality, and tone appropriate for your company. The AI employee will be ready to work immediately and evolves with every interaction to become more effective.</p>

<h2>Conclusion</h2>
<p>AI employees are not just a passing trend — they are an essential part of the future of business management. Companies that adopt them now will be at the forefront of competition. Start today with BlivoAI and discover the difference a specialized AI employee can make in your company.</p>`,
      category: "AI Employees",
      tags: JSON.stringify(["AI employees", "business management", "automation", "digital transformation"]),
      metaTitleAr: "موظفين الذكاء الاصطناعي: ثورة إدارة الأعمال في 2026 | BlivoAI",
      metaTitleEn: "AI Employees: The Business Management Revolution in 2026 | BlivoAI",
      metaDescAr: "اكتشف كيف يحوّل موظفين الذكاء الاصطناعي إدارة الأعمال — من البرمجة إلى خدمة الزبائن والموارد البشرية.",
      metaDescEn: "Discover how AI employees transform business management — from programming to customer service and HR.",
      status: "PUBLISHED",
      featured: true,
      views: 0,
    },
    {
      slug: "smart-chatbot-business-growth",
      titleAr: "الشات بوت الذكي: كيف يُساعد نمو أعمالك",
      titleEn: "Blivo Assistantbot: How It Helps Your Business Grow",
      excerptAr: "تعرف على كيف يمكن لشات بوت ذكي ومتخصص أن يزيد مبيعاتك، يحسن خدمة الزبائن، ويُوفر وقت فرق العمل.",
      excerptEn: "Learn how a smart, specialized chatbot can increase your sales, improve customer service, and save your team's time.",
      contentAr: `<h2>لماذا تحتاج شات بوت ذكي؟</h2>
<p>في عالم الأعمال اليوم، الزبون يريد رد فوري على استفساراته. الدراسات تُظهر أن 67% من الزبائن يتوقعون رد خلال 5 دقائق. شات بوت ذكي مثل BlivoAI يقدم رد فوري 24/7 بالعربية والإنجليزية، مما يحسن تجربة الزبون بشكل جذري.</p>

<h2>فوائد الشات بوت الذكي للأعمال</h2>
<p><strong>زيادة المبيعات:</strong> الشات بوت الذكي يمكنه توجيه الزبائن للمنتج المناسب، اقتراح إضافات، وإكمال عملية الشراء. الدراسات تُظهر أن الشات بوت يزيد التحويل بـ 30% على الأقل.</p>
<p><strong>خدمة زبائن متواصلة:</strong> لا حاجة لفريق عمل 24 ساعة — الشات بوت يرد فورياً على الاستفسارات الشائعة ويتعامل بمهنية عالية. يفهم الأسئلة بالعربية والإنجليزية ويقدم إجابات دقيقة.</p>
<p><strong>توفير الوقت والموارد:</strong> فريق العمل البشري يركز على الحالات المعقدة فقط، مما يُوفر 40% من وقت العمل. الشات بوت يتعامل مع الحالات الشائعة والبسيطة تلقائياً.</p>
<p><strong>تحليل البيانات:</strong> الشات بوت يُجمّع بيانات عن أسئلة الزبائن، أنماط الشراء، والمشاكل الشائعة — مما يُساعد في تحسين المنتجات والخدمات.</p>

<h2>شات بوت BlivoAI: مختلف عن البقية</h2>
<p>شات بوت BlivoAI ليس مجرد chatbot عادي — هو موظف ذكاء اصطناعي متخصص يمتلك شخصية مهنية فريدة. يمكنك اختيار النبرة (رسمية، صديقة، تقنية)، التخصص (مبيعات، دعم، استشارات)، واللغات. هذا يجعله جزءاً حقيقياً من فريق عملك.</p>

<h2>الخلاصة</h2>
<p>شات بوت ذكي هو استثمار مباشر في نمو أعمالك. مع BlivoAI، لا تحصل فقط على شات بوت — تحصل على موظف AI متخصص يفهم شركتك ويتطور معها.</p>`,
      contentEn: `<h2>Why Do You Need a Blivo Assistantbot?</h2>
<p>In today's business world, customers expect instant responses to their inquiries. Studies show that 67% of customers expect a response within 5 minutes. A smart chatbot like BlivoAI provides instant 24/7 responses in Arabic and English, dramatically improving the customer experience.</p>

<h2>Benefits of a Blivo Assistantbot for Business</h2>
<p><strong>Increased Sales:</strong> A smart chatbot can guide customers to the right product, suggest add-ons, and complete the purchase process. Studies show chatbots increase conversion by at least 30%.</p>
<p><strong>Continuous Customer Service:</strong> No need for a 24-hour team — the chatbot responds instantly to common inquiries with high professionalism. It understands Arabic and English questions and provides accurate answers.</p>
<p><strong>Time and Resource Savings:</strong> The human team focuses only on complex cases, saving 40% of work time. The chatbot handles common and simple cases automatically.</p>
<p><strong>Data Analysis:</strong> The chatbot collects data about customer questions, purchase patterns, and common issues — helping improve products and services.</p>

<h2>BlivoAI Chatbot: Different from the Rest</h2>
<p>BlivoAI's chatbot is not just an ordinary chatbot — it's a specialized AI employee with a unique professional personality. You can choose the tone (formal, friendly, technical), specialization (sales, support, consulting), and languages. This makes it a genuine part of your team.</p>

<h2>Conclusion</h2>
<p>A smart chatbot is a direct investment in your business growth. With BlivoAI, you don't just get a chatbot — you get a specialized AI employee who understands your company and evolves with it.</p>`,
      category: "Chatbot",
      tags: JSON.stringify(["chatbot", "customer service", "business growth", "AI automation"]),
      metaTitleAr: "الشات بوت الذكي لنمو الأعمال | BlivoAI",
      metaTitleEn: "Blivo Assistantbot for Business Growth | BlivoAI",
      metaDescAr: "تعرف على فوائد الشات بوت الذكي لزيادة المبيعات وتحسين خدمة الزبائن.",
      metaDescEn: "Learn the benefits of a smart chatbot for increasing sales and improving customer service.",
      status: "PUBLISHED",
      featured: true,
      views: 0,
    },
    {
      slug: "ai-hr-management-future",
      titleAr: "إدارة الموارد البشرية بالذكاء الاصطناعي: مستقبل HR",
      titleEn: "AI HR Management: The Future of Human Resources",
      excerptAr: "كيف يُغيّر الذكاء الاصطناعي إدارة الموارد البشرية — من التوظيف إلى تقييم الأداء والامتثال القانوني.",
      excerptEn: "How AI is changing HR management — from recruitment to performance evaluation and legal compliance.",
      contentAr: `<h2>ثورة الذكاء الاصطناعي في HR</h2>
<p>إدارة الموارد البشرية كانت واحدة من أكثر الأقسام التي تحتاج وقت وجهد بشري كبير. مع الذكاء الاصطناعي، يتغير كل شيء. موظف AI في HR يمكنه التعامل مع 80% من المهام الروتينية — ترك المسؤولين البشريين يركزون على الاستراتيجية والتطوير.</p>

<h2>مجالات تطبيق AI في HR</h2>
<p><strong>التوظيف والاختيار:</strong> موظف AI يمكنه فرز CVs تلقائياً، إجراء مقابلات أولية، تقييم المرشحين، وتقديم توصيات. يفهم متطلبات الوظيفة ويتطابق مع أفضل المرشحين.</p>
<p><strong>تقييم الأداء:</strong> موظف AI يتابع أداء الموظفين بشكل مستمر، يُنشئ تقارير دورية، ويُحدد نقاط القوة والضعف. يقدم توصيات للتطوير والتدريب.</p>
<p><strong>الامتثال القانوني:</strong> موظف AI في HR يفهم قوانين العمل المحلية ويتأكد من الامتثال — من ساعات العمل إلى حقوق الموظفين. يُنبه عند أي مخالفات محتملة.</p>
<p><strong>تنظيم الاجتماعات:</strong> موظف AI ينسق الاجتماعات، يُرسل تذكيرات، يُعد محاضر، ويتابع التنفيذ. يتعامل مع المواعيد والجدول بشكل ذكي.</p>

<h2>تجربة BlivoAI في HR</h2>
<p>في BlivoAI، موظف AI في HR ليس مجرد أداة — هو موظف متخصص يمتلك شخصية مهنية في HR. يتعامل بالعربية والإنجليزية، يفهم ثقافة شركتك، ويحافظ على سرية البيانات. يمكنك اختيار النبرة (رسمية، صديقة) والتخصص (توظيف، أداء، امتثال).</p>

<h2>الخلاصة</h2>
<p>الذكاء الاصطناعي في HR ليس بديلاً عن الموظفين البشريين — هو شريك يُعزز كفاءتهم. مع BlivoAI، يمكنك إنشاء موظف AI HR متخصص في دقائق.</p>`,
      contentEn: `<h2>The AI Revolution in HR</h2>
<p>Human resources management has been one of the departments requiring the most human time and effort. With AI, everything changes. An AI HR employee can handle 80% of routine tasks — leaving human professionals to focus on strategy and development.</p>

<h2>Areas of AI Application in HR</h2>
<p><strong>Recruitment & Selection:</strong> An AI employee can automatically screen CVs, conduct initial interviews, evaluate candidates, and provide recommendations. They understand job requirements and match with the best candidates.</p>
<p><strong>Performance Evaluation:</strong> An AI employee continuously monitors employee performance, creates periodic reports, and identifies strengths and weaknesses. They provide recommendations for development and training.</p>
<p><strong>Legal Compliance:</strong> An AI HR employee understands local labor laws and ensures compliance — from working hours to employee rights. They alert on any potential violations.</p>
<p><strong>Meeting Organization:</strong> An AI employee coordinates meetings, sends reminders, prepares minutes, and tracks follow-up. They handle schedules intelligently.</p>

<h2>BlivoAI's HR Experience</h2>
<p>At BlivoAI, an AI HR employee is not just a tool — it's a specialized employee with a professional HR personality. They handle Arabic and English, understand your company culture, and maintain data confidentiality. You can choose the tone (formal, friendly) and specialization (recruitment, performance, compliance).</p>

<h2>Conclusion</h2>
<p>AI in HR is not a replacement for human employees — it's a partner that enhances their efficiency. With BlivoAI, you can create a specialized AI HR employee in minutes.</p>`,
      category: "HR",
      tags: JSON.stringify(["HR", "human resources", "AI management", "recruitment", "performance evaluation"]),
      metaTitleAr: "إدارة الموارد البشرية بالذكاء الاصطناعي | BlivoAI",
      metaTitleEn: "AI HR Management: The Future of Human Resources | BlivoAI",
      metaDescAr: "كيف يُغيّر الذكاء الاصطناعي HR — من التوظيف إلى تقييم الأداء والامتثال.",
      metaDescEn: "How AI changes HR — from recruitment to performance evaluation and compliance.",
      status: "PUBLISHED",
      featured: false,
      views: 0,
    },
    {
      slug: "ai-project-management-tools",
      titleAr: "إدارة المشاريع بأدوات الذكاء الاصطناعي: دليل شامل",
      titleEn: "AI Project Management Tools: A Comprehensive Guide",
      excerptAr: "دليل شامل لأدوات إدارة المشاريع بالذكاء الاصطناعي — من التخطيط الذكي إلى التنفيذ الآلي والمراقبة المتواصلة.",
      excerptEn: "A comprehensive guide to AI project management tools — from smart planning to automated execution and continuous monitoring.",
      contentAr: `<h2>تحديات إدارة المشاريع التقليدية</h2>
<p>إدارة المشاريع كانت دائماً تحدياً — 70% من المشاريع تتأخر عن المواعيد النهائية أو تتجاوز الميزانية. المشاكل الشائعة: ضعف التنسيق بين الفرق، غياب المراقبة المتواصلة، وعدم القدرة على التكيف مع التغييرات السريعة. هنا يأتي دور الذكاء الاصطناعي.</p>

<h2>كيف يحل AI مشاكل إدارة المشاريع</h2>
<p><strong>التخطيط الذكي:</strong> موظف AI مدير مشاريع يُنشئ خطط مخصصة بناءً على حجم المشروع، الموارد المتاحة، والمواعيد النهائية. يحسب الجدول الزمني بشكل ذكي ويُحدد المخاطر المحتملة قبل حدوثها.</p>
<p><strong>التنفيذ الآلي:</strong> موظف AI ينسق بين الفرق تلقائياً، يُرسل تحديثات، يتابع المواعيد، ويُنبه عند أي تأخير. يُنشئ أوامر العمل ويُعيد توزيع الموارد عند الحاجة.</p>
<p><strong>المراقبة المتواصلة:</strong> موظف AI يراقب كل مراحل المشروع 24/7، يُنشئ تقارير دورية، ويُحدد المشاكل قبل أن تتفاقم. يتعامل مع البيانات بشكل ذكي ويقدم insights actionable.</p>

<h2>أدوات إدارة المشاريع في BlivoAI</h2>
<p>BlivoAI يقدم موظف AI مدير مشاريع متخصص يمتلك خبرة في methodologies متعددة (Agile, Waterfall, Scrum). يمكنك إنشاء موظف AI مخصص لإدارة مشروعك — يتعامل بالعربية والإنجليزية، يفهم متطلبات شركتك، ويتكيف مع أي تغييرات.</p>

<p>الموظف AI يتعامل مع:</p>
<ul>
<li>إنشاء وتتبع أوامر العمل (Work Orders)</li>
<li>إدارة المهام والاعتمادات</li>
<li>التنسيق بين الأقسام والفرق</li>
<li>إعداد تقارير الحالة والتقدم</li>
<li>تحليل المخاطر واقتراح حلول</li>
</ul>

<h2>الخلاصة</h2>
<p>إدارة المشاريع بالذكاء الاصطناعي هي المستقبل — أكثر كفاءة، أكثر دقة، وأقل تكلفة. ابدأ مع BlivoAI اليوم.</p>`,
      contentEn: `<h2>Challenges of Traditional Project Management</h2>
<p>Project management has always been a challenge — 70% of projects miss deadlines or exceed budgets. Common problems: poor team coordination, lack of continuous monitoring, and inability to adapt to rapid changes. This is where AI comes in.</p>

<h2>How AI Solves Project Management Problems</h2>
<p><strong>Smart Planning:</strong> An AI project manager employee creates customized plans based on project scope, available resources, and deadlines. They calculate timelines intelligently and identify potential risks before they occur.</p>
<p><strong>Automated Execution:</strong> An AI employee coordinates between teams automatically, sends updates, tracks deadlines, and alerts on any delays. They create work orders and redistribute resources when needed.</p>
<p><strong>Continuous Monitoring:</strong> An AI employee monitors all project phases 24/7, creates periodic reports, and identifies problems before they escalate. They handle data intelligently and provide actionable insights.</p>

<h2>Project Management Tools in BlivoAI</h2>
<p>BlivoAI offers a specialized AI project manager employee with expertise in multiple methodologies (Agile, Waterfall, Scrum). You can create a custom AI employee for managing your project — they handle Arabic and English, understand your company requirements, and adapt to any changes.</p>

<p>The AI employee handles:</p>
<ul>
<li>Creating and tracking Work Orders</li>
<li>Managing tasks and approvals</li>
<li>Coordinating between departments and teams</li>
<li>Preparing status and progress reports</li>
<li>Risk analysis and solution suggestions</li>
</ul>

<h2>Conclusion</h2>
<p>AI project management is the future — more efficient, more accurate, and less costly. Start with BlivoAI today.</p>`,
      category: "Project Management",
      tags: JSON.stringify(["project management", "AI tools", "work orders", "Agile", "business automation"]),
      metaTitleAr: "أدوات إدارة المشاريع بالذكاء الاصطناعي | BlivoAI",
      metaTitleEn: "AI Project Management Tools: Comprehensive Guide | BlivoAI",
      metaDescAr: "دليل شامل لأدوات إدارة المشاريع بالذكاء الاصطناعي — التخطيط والتنفيذ والمراقبة.",
      metaDescEn: "Comprehensive guide to AI project management tools — planning, execution, and monitoring.",
      status: "PUBLISHED",
      featured: false,
      views: 0,
    },
    {
      slug: "arabic-ai-platform-business",
      titleAr: "منصة ذكاء اصطناعي بالعربية: لماذا BlivoAI؟",
      titleEn: "Arabic AI Platform for Business: Why BlivoAI?",
      excerptAr: "لماذا تحتاج منصة ذكاء اصطناعي تدعم العربية بشكل كامل — وكيف يقدم BlivoAI حل شامل للأعمال العربية.",
      excerptEn: "Why you need a fully Arabic-supporting AI platform — and how BlivoAI provides a comprehensive solution for Arab businesses.",
      contentAr: `<h2>تحدي الذكاء الاصطناعي بالعربية</h2>
<p>أكثر من 400 مليون شخص يتحدث العربية حول العالم. لكن أغلب منصات الذكاء الاصطناعي لا تدعم العربية بشكل كامل — الترجمة ركيكة، RTL غير مدعوم، والمحتوى لا يفهم السياق العربي. هذا يُخلق فجوة كبيرة بين الأعمال العربية والتقنية الحديثة.</p>

<h2>كيف يحل BlivoAI هذه الفجوة</h2>
<p>BlivoAI منصة ذكاء اصطناعي مبنية خصيصاً لتدعم العربية بشكل كامل:</p>
<p><strong>واجهة RTL كاملة:</strong> كل الواجهة تعمل من اليمين لاليسار بشكل طبيعي — لا نص مقلوب أو عناصر خارج محلها. التصميم يتكيف تلقائياً حسب اللغة.</p>
<p><strong>محتوى بلساني:</strong> كل شيء بلغتين — العربية والإنجليزية. يمكنك التبديل بضغط واحدة. الموظفون AI يتعاملون بلغتين بسلاسة.</p>
<p><strong>شخصية عربية:</strong> موظف AI يمكنه التحدث بالعربية الفصحى أو العامية حسب متطلبات شركتك. يفهم السياق العربي والثقافة المحلية.</p>
<p><strong>نبرة مهنية:</strong> يمكنك اختيار نبرة المحادثة — رسمية، صديقة، أو تقنية. كل نبرة مصممة لتكون طبيعية بالعربية.</p>

<h2>مميزات BlivoAI للأعمال العربية</h2>
<ul>
<li>شات بوت ذكي بالعربية والإنجليزية</li>
<li>موظفون AI متخصصون (مبرمج، خدمة زبائن، HR، مدير مشاريع)</li>
<li>إدارة أعمال شاملة (أقسام، مشاريع، أوامر عمل)</li>
<li>محادثات متواصلة مع ذاكرة</li>
<li>تقارير واتخاذ قرارات ذكية</li>
<li>نظام budget للtokens</li>
</ul>

<h2>الخلاصة</h2>
<p>BlivoAI ليس مجرد منصة AI — هو حل شامل مخصص للأعمال العربية. من واجهة RTL إلى موظفين AI يفهمون العربية، كل شيء مصمم ليكمل احتياجاتك. ابدأ مجاناً اليوم.</p>`,
      contentEn: `<h2>The Arabic AI Challenge</h2>
<p>Over 400 million people speak Arabic worldwide. Yet most AI platforms don't fully support Arabic — translation is clunky, RTL isn't supported, and content doesn't understand Arabic context. This creates a significant gap between Arab businesses and modern technology.</p>

<h2>How BlivoAI Fills This Gap</h2>
<p>BlivoAI is an AI platform built specifically to fully support Arabic:</p>
<p><strong>Complete RTL Interface:</strong> The entire interface works right-to-left naturally — no reversed text or misplaced elements. Design adapts automatically based on language.</p>
<p><strong>Bilingual Content:</strong> Everything in two languages — Arabic and English. You can switch with one click. AI employees handle both languages seamlessly.</p>
<p><strong>Arabic Personality:</strong> An AI employee can speak in formal Arabic or colloquial dialect depending on your company requirements. They understand Arabic context and local culture.</p>
<p><strong>Professional Tone:</strong> You can choose the conversation tone — formal, friendly, or technical. Each tone is designed to be natural in Arabic.</p>

<h2>BlivoAI Features for Arab Businesses</h2>
<ul>
<li>Smart chatbot in Arabic and English</li>
<li>Specialized AI employees (programmer, customer service, HR, project manager)</li>
<li>Complete business management (departments, projects, work orders)</li>
<li>Continuous conversations with memory</li>
<li>Smart reports and decision making</li>
<li>Token budget system</li>
</ul>

<h2>Conclusion</h2>
<p>BlivoAI is not just an AI platform — it's a comprehensive solution tailored for Arab businesses. From RTL interface to Arabic-understanding AI employees, everything is designed to complement your needs. Start free today.</p>`,
      category: "Arabic AI",
      tags: JSON.stringify(["Arabic AI", "RTL", "bilingual", "Arab business", "Arabic platform"]),
      metaTitleAr: "منصة ذكاء اصطناعي بالعربية | BlivoAI",
      metaTitleEn: "Arabic AI Platform for Business | BlivoAI",
      metaDescAr: "منصة AI تدعم العربية بشكل كامل — RTL، بلسانية، موظفون AI يفهمون العربية.",
      metaDescEn: "AI platform fully supporting Arabic — RTL, bilingual, Arabic-understanding AI employees.",
      status: "PUBLISHED",
      featured: true,
      views: 0,
    },
  ]

  for (const postData of blogPosts) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug: postData.slug }
    })

    if (existing) {
      console.log(`✅ Blog post "${postData.slug}" already exists — updating...`)
      await prisma.blogPost.update({
        where: { slug: postData.slug },
        data: {
          titleAr: postData.titleAr,
          titleEn: postData.titleEn,
          contentAr: postData.contentAr,
          contentEn: postData.contentEn,
          excerptAr: postData.excerptAr,
          excerptEn: postData.excerptEn,
          category: postData.category,
          tags: postData.tags,
          metaTitleAr: postData.metaTitleAr,
          metaTitleEn: postData.metaTitleEn,
          metaDescAr: postData.metaDescAr,
          metaDescEn: postData.metaDescEn,
          status: postData.status,
          featured: postData.featured,
          views: postData.views,
          authorId: adminUser.id,
        }
      })
    } else {
      console.log(`✨ Creating blog post "${postData.slug}"...`)
      await prisma.blogPost.create({
        data: {
          slug: postData.slug,
          titleAr: postData.titleAr,
          titleEn: postData.titleEn,
          contentAr: postData.contentAr,
          contentEn: postData.contentEn,
          excerptAr: postData.excerptAr,
          excerptEn: postData.excerptEn,
          category: postData.category,
          tags: postData.tags,
          metaTitleAr: postData.metaTitleAr,
          metaTitleEn: postData.metaTitleEn,
          metaDescAr: postData.metaDescAr,
          metaDescEn: postData.metaDescEn,
          status: postData.status,
          featured: postData.featured,
          views: postData.views,
          authorId: adminUser.id,
          publishedAt: new Date(),
        }
      })
    }
  }

  console.log("✅ Blog posts seeded!")
  console.log("🎉 Seed complete!")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
