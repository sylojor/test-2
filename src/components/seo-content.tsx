// ============================================
// Server-rendered SEO content for crawlers
//
// The main app is client-side ("use client"),
// so search engine crawlers only see a loading spinner.
// This component adds proper H1, headings, and
// internal links that crawlers can index.
//
// The content is visually hidden (sr-only) so
// it doesn't affect the user-facing UI, but
// crawlers CAN read sr-only content.
// ============================================

import type { Locale } from "@/lib/i18n-config"

const SITE_URL = "https://blivoai.com"

interface SeoContentProps {
  lang: Locale
}

export function SeoContent({ lang }: SeoContentProps) {
  const isEn = lang === "en"

  return (
    <div className="sr-only">
      <nav aria-label="Main navigation">
        <a href={`/${lang}`}>{isEn ? "Home" : "الرئيسية"}</a>
        <a href={`/${lang}/pricing`}>{isEn ? "Pricing" : "الأسعار"}</a>
        <a href={`/${lang}/about`}>{isEn ? "About BlivoAI" : "عن بليفوAI"}</a>
        <a href={`/${lang}/blog`}>{isEn ? "Blog" : "المدونة"}</a>
        <a href={`/${lang}/api-docs`}>{isEn ? "API Documentation" : "توثيق API"}</a>
        <a href={`/${lang}/download`}>{isEn ? "Download" : "تحميل"}</a>
        <a href={`/${lang}/privacy`}>{isEn ? "Privacy Policy" : "سياسة الخصوصية"}</a>
        <a href={`/${lang}/terms`}>{isEn ? "Terms of Service" : "شروط الاستخدام"}</a>
        <a href={lang === "ar" ? "/en" : "/ar"}>
          {isEn ? "العربية" : "English"}
        </a>
      </nav>
      
      <p>{isEn ? "BlivoAI — AI Employees and Smart Business Management Platform" : "بليفوAI — منصة موظفي الذكاء الاصطناعي والإدارة الذكية للأعمال"}</p>
      
      <p>
        {isEn
          ? "BlivoAI is an AI-powered platform that combines intelligent chatbots with specialized AI employees for comprehensive business management. Create AI employees with specific specializations like programming, financial accounting, social media management, customer service, digital marketing, e-commerce management, project management, content writing, data analysis, and more. Each AI employee operates within their specialization to deliver accurate, professional results for your business."
          : "بليفوAI هي منصة مدعومة بالذكاء الاصطناعي تجمع بين روبوتات المحادثة الذكية وموظفي AI المتخصصين لإدارة أعمال شاملة. أنشئ موظفي AI بتخصصات محددة مثل البرمجة والمحاسبة المالية وإدارة وسائل التواصل الاجتماعي وخدمة العملاء والتسويق الرقمي وإدارة المتاجر الإلكترونية وإدارة المشاريع وكتابة المحتوى وتحليل البيانات والمزيد. كل موظف AI يعمل ضمن تخصصه لتقديم نتائج دقيقة واحترافية لأعمالك."}
      </p>

      <h2>{isEn ? "Smart Chat with AI Employees" : "محادثة ذكية مع موظفي AI"}</h2>
      <p>
        {isEn
          ? "Chat directly with your AI employees. Each employee is specialized in their field — from customer service representatives to financial analysts, from social media managers to software developers. Get instant, accurate responses tailored to your business needs."
          : "تحدث مباشرة مع موظفي AI لديك. كل موظف متخصص في مجاله — من ممثلي خدمة العملاء إلى المحللين الماليين، من مديري وسائل التواصل الاجتماعي إلى مطوري البرمجيات. احصل على استجابات فورية ودقيقة مخصصة لاحتياجات أعمالك."}
      </p>

      <h2>{isEn ? "Business Management Dashboard" : "لوحة إدارة الأعمال"}</h2>
      <p>
        {isEn
          ? "Comprehensive dashboard for managing your company departments, projects, and AI workforce. Track employee performance, manage approvals and decisions, monitor meetings and work orders, and handle HR operations — all from a single unified interface."
          : "لوحة تحكم شاملة لإدارة أقسام الشركة ومشاريعك وقوة عمل AI. تتبع أداء الموظفين، وإدارة الموافقات والقرارات، ومراقبة الاجتماعات وأوامر العمل، والتعامل مع عمليات الموارد البشرية — كل ذلك من واجهة موحدة واحدة."}
      </p>

      <h2>{isEn ? "Key Features" : "الميزات الرئيسية"}</h2>
      <ul>
        <li>{isEn ? "AI Employees with customizable specializations and capabilities" : "موظفو AI مع تخصصات وقدرات قابلة للتخصيص"}</li>
        <li>{isEn ? "Smart chat system with real-time conversation" : "نظام محادثة ذكي مع محادثة في الوقت الفعلي"}</li>
        <li>{isEn ? "Department and project management tools" : "أدوات إدارة الأقسام والمشاريع"}</li>
        <li>{isEn ? "HR management with leave requests and approvals" : "إدارة الموارد البشرية مع طلبات الإجازات والموافقات"}</li>
        <li>{isEn ? "Meeting scheduling and work order tracking" : "جدولة الاجتماعات وتتبع أوامر العمل"}</li>
        <li>{isEn ? "Multi-language support (Arabic and English)" : "دعم متعدد اللغات (العربية والإنجليزية)"}</li>
        <li>{isEn ? "Subscription plans for businesses of all sizes" : "خطط اشتراك للشركات من جميع الأحجام"}</li>
        <li>{isEn ? "Role-based access control and security" : "التحكم في الوصول المستند إلى الأدوار والأمان"}</li>
      </ul>

      <h2>{isEn ? "AI Employee Specializations" : "تخصصات موظفي AI"}</h2>
      <p>
        {isEn
          ? "Choose from a wide range of specializations for your AI employees: E-commerce Management, Excel Data Entry, Financial Accounting, Social Media Management, Inventory Control, Programming, Graphic Design, Digital Marketing, Customer Service, Project Management, Content Writing, and Data Analysis. Each employee stays within their specialization to ensure accurate and reliable responses."
          : "اختر من مجموعة واسعة من التخصصات لموظفي AI: إدارة المتاجر الإلكترونية، تعبئة بيانات Excel، المحاسبة المالية، إدارة وسائل التواصل الاجتماعي، مراقبة المخزون، البرمجة، التصميم الجرافيكي، التسويق الرقمي، خدمة العملاء، إدارة المشاريع، كتابة المحتوى، وتحليل البيانات. كل موظف يبقى ضمن تخصصه لضمان استجابات دقيقة وموثوقة."}
      </p>

      <h2><a href={`/${lang}/pricing`}>{isEn ? "Pricing and Plans" : "الأسعار والخطط"}</a></h2>
      <p>
        {isEn
          ? "BlivoAI offers flexible subscription plans for businesses of all sizes. Start with a free trial, then upgrade to Starter ($59/mo), Professional ($79/mo), or Enterprise ($199/mo) plans as your team grows. Each plan includes different numbers of AI employees, conversation limits, and premium features. View our <a href={`/en/pricing`}>full pricing page</a> for details."
          : "تقدم بليفوAI خطط اشتراك مرنة للشركات من جميع الأحجام. ابدأ بفترة تجريبية مجانية، ثم ترقية إلى خطط Starter (59$/شهر) أو Professional (79$/شهر) أو Enterprise (199$/شهر) مع نمو فريقك. كل خطة تتضمن أعداداً مختلفة من موظفي AI وحدود المحادثة وميزات premium. شاهد <a href={`/ar/pricing`}>صفحة الأسعار</a> للتفاصيل."}
      </p>

      <h2><a href={`/${lang}/about`}>{isEn ? "About BlivoAI" : "عن بليفوAI"}</a></h2>
      <p>
        {isEn
          ? "BlivoAI is built by a team of engineers and designers from around the world, working passionately to make AI more accessible and effective for businesses of all sizes. Learn more about our <a href={`/en/about`}>mission, vision, and values</a>."
          : "بليفوAI بناها فريق من المهندسين والمصممين من مختلف أنحاء العالم، يعملون بشغف لجعل الذكاء الاصطناعي أكثر سهولة وفعالية للشركات من جميع الأحجام. تعرف أكثر على <a href={`/ar/about`}>مهمتنا ورؤيتنا وقيمنا</a>."}
      </p>

      <h2>{isEn ? "Get Started with BlivoAI" : "ابدأ مع بليفوAI"}</h2>
      <p>
        {isEn
          ? "Transform your business operations with AI-powered employees. Sign up for a free trial today and experience the future of work management. No credit card required."
          : "حوّل عمليات أعمالك مع موظفين مدعومين بالذكاء الاصطناعي. سجل في التجربة المجانية اليوم واختبر مستقبل إدارة العمل. لا حاجة لبطاقة ائتمان."}
      </p>
    </div>
  )
}
