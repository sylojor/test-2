// ============================================
// BlivoAI Email Service — Resend
// قوالب إيميل احترافية مستوحاة من تصميم سلامة
// ============================================

interface EmailPayload {
  to: string
  subject: string
  html: string
  replyTo?: string
}

interface TemplateData {
  userName: string
  companyName?: string
  lang?: "ar" | "en"
  // Invoice specific
  invoiceNumber?: string
  amount?: string
  currency?: string
  dueDate?: string
  planName?: string
  planFeatures?: string[]
  actionUrl?: string
  actionText?: string
  // Custom body
  bodyHtml?: string
  // Verification
  verificationUrl?: string
  // Reset password
  resetUrl?: string
  // Contact
  contactMessage?: string
  contactEmail?: string
  contactName?: string
}

// ============================================
// Base Email Template — تصميم احترافي
// ============================================
function baseTemplate(data: TemplateData, content: string): string {
  const isRTL = (data.lang || "ar") === "ar"
  const dir = isRTL ? "rtl" : "ltr"
  const title = isRTL ? "BlivoAI" : "BlivoAI"

  return `<!DOCTYPE html>
<html lang="${isRTL ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
    
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f8fafc; font-family: 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif; }
    
    .email-container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .email-card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    
    /* Wave decorations */
    .wave-top { position: relative; height: 8px; background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); }
    .wave-top::before { content: ''; position: absolute; top: 0; ${isRTL ? 'left' : 'right'}: 0; width: 120px; height: 120px; background: radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%); border-radius: 50%; }
    .wave-top::after { content: ''; position: absolute; top: -20px; ${isRTL ? 'right' : 'left'}: 40px; width: 80px; height: 80px; background: radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%); border-radius: 50%; }
    
    /* Header */
    .header { text-align: center; padding: 40px 40px 20px; }
    .logo-area { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .logo-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .logo-text { font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
    .logo-sub { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 3px; margin-top: 4px; }
    
    /* Divider */
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 0 40px; }
    
    /* Body */
    .body { padding: 32px 40px 40px; }
    .greeting { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px; }
    .body-text { font-size: 15px; line-height: 1.8; color: #475569; margin-bottom: 16px; }
    
    /* CTA Button */
    .cta-wrapper { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; padding: 14px 48px; background: linear-gradient(135deg, #059669, #10b981); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(5,150,105,0.3); }
    .cta-button:hover { opacity: 0.92; }
    
    /* Info Box */
    .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
    .info-box-title { font-size: 14px; font-weight: 700; color: #059669; margin-bottom: 8px; }
    .info-box-text { font-size: 14px; color: #166534; line-height: 1.7; }
    
    /* Invoice card */
    .invoice-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; margin: 24px 0; }
    .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .invoice-row:last-child { border-bottom: none; }
    .invoice-label { color: #64748b; font-weight: 500; }
    .invoice-value { color: #1e293b; font-weight: 600; }
    .invoice-total { margin-top: 16px; padding-top: 16px; border-top: 2px solid #059669; display: flex; justify-content: space-between; font-size: 18px; }
    .invoice-total-label { color: #0f172a; font-weight: 700; }
    .invoice-total-value { color: #059669; font-weight: 700; font-size: 22px; }
    
    /* Footer */
    .footer { background: #f8fafc; padding: 28px 40px; text-align: center; border-top: 1px solid #f1f5f9; }
    .footer-text { font-size: 13px; color: #94a3b8; line-height: 1.7; margin-bottom: 8px; }
    .footer-link { color: #059669; text-decoration: none; }
    .footer-social { margin-top: 16px; }
    .footer-social a { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #e2e8f0; border-radius: 10px; margin: 0 4px; text-decoration: none; color: #64748b; font-size: 14px; }
    
    /* Wave bottom */
    .wave-bottom { position: relative; height: 8px; background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%); }
    
    /* Decorative dots */
    .dots-top { text-align: ${isRTL ? 'left' : 'right'}; padding: 0 30px 0 0; margin-top: -4px; }
    .dots-bottom { text-align: ${isRTL ? 'right' : 'left'}; padding: 0 0 0 30px; margin-bottom: -4px; }
    .dot { display: inline-block; width: 5px; height: 5px; background: #d1fae5; border-radius: 50%; margin: 0 3px; }
    
    @media only screen and (max-width: 620px) {
      .email-container { padding: 20px 12px; }
      .header, .body, .footer { padding-${isRTL ? 'left' : 'right'}: 24px; padding-${isRTL ? 'right' : 'left'}: 24px; }
      .divider { margin: 0 24px; }
      .invoice-row { flex-direction: column; gap: 4px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-card">
      <div class="wave-top"></div>
      
      <div class="dots-top">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
      
      <div class="header">
        <div class="logo-area">
          <div class="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="rgba(255,255,255,0.9)"/>
              <path d="M2 17l10 5 10-5" stroke="rgba(255,255,255,0.7)" stroke-width="2" fill="none"/>
              <path d="M2 12l10 5 10-5" stroke="rgba(255,255,255,0.85)" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <span class="logo-text">BlivoAI</span>
        </div>
        <div class="logo-sub">${isRTL ? 'المنصة الأولى لتوظيف الذكاء الاصطناعي' : 'AI Employee Platform'}</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="body">
        ${content}
      </div>
      
      <div class="divider"></div>
      
      <div class="footer">
        <div class="footer-text">
          ${isRTL ? 'تم إرسال هذا الإيميل من قبل' : 'This email was sent by'}
          <strong>BlivoAI</strong>
          &mdash; ${isRTL ? 'المنصة الأولى لتوظيف موظفين اصطناعيين أذكياء' : 'The First AI Employee Platform'}
        </div>
        <div class="footer-text">
          <a href="https://blivoai.com" class="footer-link">blivoai.com</a>
          &nbsp;&bull;&nbsp;
          <a href="mailto:support@blivoai.com" class="footer-link">support@blivoai.com</a>
        </div>
        <div class="footer-text" style="margin-top:12px; font-size:11px; color:#cbd5e1;">
          ${isRTL ? 'إذا لم تكن أنشأت هذا الحساب، يمكنك تجاهل هذا الإيميل.' : 'If you didn\'t create an account, you can safely ignore this email.'}
        </div>
      </div>
      
      <div class="dots-bottom">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
      
      <div class="wave-bottom"></div>
    </div>
  </div>
</body>
</html>`
}

// ============================================
// Template: Welcome Email — احترافي مع تفاصيل الشركة والخطط
// ============================================
export function welcomeTemplate(data: TemplateData & {
  companyName: string
  planName?: string
  tokenBudget?: string
}): string {
  const isRTL = (data.lang || "ar") === "ar"
  const greeting = isRTL ? `مرحباً ${data.userName}` : `Hello ${data.userName}`
  const body1 = isRTL
    ? `شكراً لانضمامك إلى عائلة <strong>BlivoAI</strong>! يسعدنا أنك معنا.`
    : `Thank you for joining the <strong>BlivoAI</strong> family! We're glad to have you.`
  const body2 = isRTL
    ? `تم إنشاء شركتك <strong>"${data.companyName}"</strong> بنجاح على المنصة. الآن يمكنك البدء بإنشاء موظفين اصطناعيين متخصصين لإدارة أعمالك بكفاءة أعلى.`
    : `Your company <strong>"${data.companyName}"</strong> has been successfully created on the platform. You can now start creating specialized AI employees to manage your business more efficiently.`

  const planLabel = isRTL ? 'خطتك الحالية' : 'Your Current Plan'
  const tokensLabel = isRTL ? 'ميزانية التوكنات' : 'Token Budget'
  const planVal = data.planName || (isRTL ? 'تجربة مجانية' : 'Free Trial')
  const tokensVal = data.tokenBudget || '500K'

  const upgradeText = isRTL ? 'ترقية الاشتراك' : 'Upgrade Plan'
  const buyTokensText = isRTL ? 'شراء توكنات إضافية' : 'Buy More Tokens'
  const plansText = isRTL ? 'مقارنة الخطط' : 'Compare Plans'

  const body3 = isRTL
    ? `من خلال لوحة التحكم، يمكنك إنشاء أقسام وتوظيف موظفين اصطناعيين في مجالات المحاسبة، التسويق، خدمة العملاء، البرمجة، والمزيد. كل موظف مدرب على فهم عملك وتقديم نتائج احترافية.`
    : `From the dashboard, you can create departments and hire AI employees in fields like accounting, marketing, customer service, programming, and more. Each employee is trained to understand your business and deliver professional results.`

  const body4 = isRTL
    ? `إذا كان لديك أي أسئلة أو تحتاج مساعدة، فريق الدعم جاهز لمساعدتك في أي وقت عبر <a href="mailto:support@blivoai.com" style="color:#059669;">support@blivoai.com</a>`
    : `If you have any questions or need assistance, our support team is ready to help you anytime at <a href="mailto:support@blivoai.com" style="color:#059669;">support@blivoai.com</a>`

  const content = `
    <p class="greeting">${greeting}</p>
    <p class="body-text">${body1}</p>
    <p class="body-text">${body2}</p>

    <!-- Current Plan Card -->
    <div class="invoice-card">
      <div class="invoice-row">
        <span class="invoice-label">${planLabel}</span>
        <span class="invoice-value">${planVal}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">${tokensLabel}</span>
        <span class="invoice-value">${tokensVal} ${isRTL ? 'توكن شهرياً' : 'tokens/month'}</span>
      </div>
    </div>

    <!-- Quick Links -->
    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:24px 0;">
      <a href="https://demo.blivoai.com/ar/pricing" style="display:inline-block; padding:12px 24px; background:linear-gradient(135deg, #059669, #10b981); color:#fff !important; text-decoration:none; border-radius:10px; font-size:14px; font-weight:600; box-shadow:0 4px 14px rgba(5,150,105,0.3);">${upgradeText}</a>
      <a href="https://demo.blivoai.com/ar/pricing" style="display:inline-block; padding:12px 24px; background:#f0fdf4; color:#059669 !important; text-decoration:none; border-radius:10px; font-size:14px; font-weight:600; border:1px solid #bbf7d0;">${plansText}</a>
      <a href="https://demo.blivoai.com" style="display:inline-block; padding:12px 24px; background:#f8fafc; color:#475569 !important; text-decoration:none; border-radius:10px; font-size:14px; font-weight:600; border:1px solid #e2e8f0;">${buyTokensText}</a>
    </div>

    <!-- Plan Comparison Table -->
    <div style="background:#f8fafc; border-radius:16px; padding:24px; margin:24px 0; border:1px solid #e2e8f0;">
      <p style="font-size:15px; font-weight:700; color:#1e293b; margin-bottom:16px; text-align:center;">${isRTL ? 'فروقات الخطط' : 'Plan Comparison'}</p>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#059669; color:#fff;">
            <th style="padding:10px 8px; border-radius:8px 0 0 0; text-align:${isRTL ? 'right' : 'left'};">${isRTL ? 'الخطة' : 'Plan'}</th>
            <th style="padding:10px 8px; text-align:center;">${isRTL ? 'السعر' : 'Price'}</th>
            <th style="padding:10px 8px; text-align:center;">${isRTL ? 'التوكنات' : 'Tokens'}</th>
            <th style="padding:10px 8px; text-align:center;">${isRTL ? 'الموظفين' : 'Employees'}</th>
            <th style="padding:10px 8px; border-radius:0 8px 0 0; text-align:center;">${isRTL ? 'الأقسام' : 'Depts'}</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#fff; border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px; font-weight:600; color:#1e293b;">${isRTL ? 'تجربة مجانية' : 'Free Trial'}</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">${isRTL ? 'مجاني' : 'Free'}</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">500K</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">2</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">1</td>
          </tr>
          <tr style="background:#f8fafc; border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px; font-weight:600; color:#1e293b;">Starter</td>
            <td style="padding:10px 8px; text-align:center; color:#059669; font-weight:600;">$29/${isRTL ? 'شهر' : 'mo'}</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">3M</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">5</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">3</td>
          </tr>
          <tr style="background:#fff; border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px; font-weight:600; color:#1e293b;">${isRTL ? 'احترافي' : 'Professional'}</td>
            <td style="padding:10px 8px; text-align:center; color:#059669; font-weight:600;">$79/${isRTL ? 'شهر' : 'mo'}</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">15M</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">15</td>
            <td style="padding:10px 8px; text-align:center; color:#64748b;">10</td>
          </tr>
          <tr style="background:#f0fdf4;">
            <td style="padding:10px 8px; font-weight:700; color:#059669;">${isRTL ? 'مؤسسي' : 'Enterprise'}</td>
            <td style="padding:10px 8px; text-align:center; color:#059669; font-weight:700;">$199/${isRTL ? 'شهر' : 'mo'}</td>
            <td style="padding:10px 8px; text-align:center; color:#059669; font-weight:600;">50M</td>
            <td style="padding:10px 8px; text-align:center; color:#059669; font-weight:600;">${isRTL ? 'غير محدود' : 'Unlimited'}</td>
            <td style="padding:10px 8px; text-align:center; color:#059669; font-weight:600;">${isRTL ? 'غير محدود' : 'Unlimited'}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="body-text">${body3}</p>
    <p class="body-text">${body4}</p>
  `
  return baseTemplate(data, content)
}

// ============================================
// Template: Invoice Notification
// ============================================
export function invoiceTemplate(data: TemplateData): string {
  const isRTL = (data.lang || "ar") === "ar"
  const greeting = isRTL
    ? `مرحباً ${data.userName}`
    : `Hello ${data.userName}`
  const body1 = isRTL
    ? `نتمنى أن تكون بخير. نود إعلامكم بصدور فاتورة جديدة للاشتراك في منصة <strong>BlivoAI</strong>.`
    : `We hope this email finds you well. We would like to notify you about a new invoice for your BlivoAI subscription.`

  const planLabel = isRTL ? 'خطة الاشتراك' : 'Subscription Plan'
  const invoiceLabel = isRTL ? 'رقم الفاتورة' : 'Invoice Number'
  const dueLabel = isRTL ? 'تاريخ الاستحقاق' : 'Due Date'
  const amountLabel = isRTL ? 'المبلغ' : 'Amount'
  const totalLabel = isRTL ? 'الإجمالي' : 'Total'
  const ctaText = isRTL ? 'عرض الفاتورة' : 'View Invoice'
  const reminderNote = isRTL
    ? `<div class="info-box">
        <div class="info-box-title">${isRTL ? '⏰ تذكير' : '⏰ Reminder'}</div>
        <div class="info-box-text">${isRTL ? 'سيتم تجديد اشتراكك تلقائياً خلال 48 ساعة. يمكنك إدارة اشتراكك من لوحة التحكم.' : 'Your subscription will auto-renew in 48 hours. You can manage your subscription from the dashboard.'}</div>
      </div>`
    : `<div class="info-box">
        <div class="info-box-title">${isRTL ? '⏰ تذكير' : '⏰ Reminder'}</div>
        <div class="info-box-text">Your subscription will auto-renew in 48 hours. You can manage your subscription from the dashboard.</div>
      </div>`

  const content = `
    <p class="greeting">${greeting}</p>
    <p class="body-text">${body1}</p>
    
    <div class="invoice-card">
      <div class="invoice-row">
        <span class="invoice-label">${invoiceLabel}</span>
        <span class="invoice-value">${data.invoiceNumber || 'INV-001'}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">${planLabel}</span>
        <span class="invoice-value">${data.planName || 'Professional'}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">${dueLabel}</span>
        <span class="invoice-value">${data.dueDate || '-'}</span>
      </div>
      <div class="invoice-total">
        <span class="invoice-total-label">${totalLabel}</span>
        <span class="invoice-total-value">${data.amount || '$0'} ${data.currency || ''}</span>
      </div>
    </div>
    
    ${reminderNote}
    
    <div class="cta-wrapper">
      <a href="${data.actionUrl || 'https://blivoai.com'}" class="cta-button">${ctaText}</a>
    </div>
  `
  return baseTemplate(data, content)
}

// ============================================
// Template: Email Verification (Code-based — 6 digits)
// ============================================
export function verificationCodeTemplate(data: TemplateData & { code: string }): string {
  const isRTL = (data.lang || "ar") === "ar"
  const greeting = isRTL ? `مرحباً ${data.userName}` : `Hello ${data.userName}`
  const body1 = isRTL
    ? `شكراً لتسجيلك في <strong>BlivoAI</strong>. أدخل الكود أدناه لتفعيل حسابك.`
    : `Thank you for signing up for <strong>BlivoAI</strong>. Enter the code below to verify your account.`
  const body2 = isRTL
    ? `إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذا الإيميل بأمان.`
    : `If you didn't create this account, you can safely ignore this email.`
  const expiresIn = isRTL ? '⏱ صالح لمدة 10 دقائق' : '⏱ Valid for 10 minutes'
  const codeLabel = isRTL ? 'كود التفعيل' : 'Verification Code'

  const content = `
    <p class="greeting">${greeting}</p>
    <p class="body-text">${body1}</p>
    <div style="text-align:center; margin:32px 0;">
      <p style="font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:2px; margin-bottom:12px;">${codeLabel}</p>
      <div style="display:inline-block; background:#f0fdf4; border:2px dashed #bbf7d0; border-radius:16px; padding:20px 40px; letter-spacing:12px; font-size:36px; font-weight:700; color:#059669; font-family:monospace,'Courier New',monospace;">${data.code}</div>
      <p style="font-size:13px; color:#94a3b8; margin-top:12px;">${expiresIn}</p>
    </div>
    <p class="body-text">${body2}</p>
  `
  return baseTemplate(data, content)
}

// ============================================
// Template: Password Reset
// ============================================
export function resetPasswordTemplate(data: TemplateData): string {
  const isRTL = (data.lang || "ar") === "ar"
  const greeting = isRTL ? `مرحباً ${data.userName}` : `Hello ${data.userName}`
  const body1 = isRTL
    ? `تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في <strong>BlivoAI</strong>. اضغط على الزر أدناه لتعيين كلمة مرور جديدة.`
    : `We received a request to reset the password for your <strong>BlivoAI</strong> account. Click the button below to set a new password.`
  const ctaText = isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'
  const body2 = isRTL
    ? `إذا لم تطلب هذا، يمكنك تجاهل هذا الإيميل. كلمة مرورك لن تتغير.`
    : `If you didn't request this, you can safely ignore this email. Your password won't change.`
  const expiresIn = isRTL ? '⏱ هذا الرابط صالح لمدة ساعة واحدة' : '⏱ This link expires in 1 hour'

  const content = `
    <p class="greeting">${greeting}</p>
    <p class="body-text">${body1}</p>
    <div class="cta-wrapper">
      <a href="${data.resetUrl || '#'}" class="cta-button">${ctaText}</a>
    </div>
    <p class="body-text" style="text-align:center; font-size:13px; color:#94a3b8;">${expiresIn}</p>
    <p class="body-text">${body2}</p>
  `
  return baseTemplate(data, content)
}

// ============================================
// Template: Contact Form Submission
// ============================================
export function contactTemplate(data: TemplateData): string {
  const isRTL = (data.lang || "ar") === "ar"
  const subject = isRTL ? 'رسالة جديدة من نموذج التواصل' : 'New message from contact form'
  const fromLabel = isRTL ? 'من' : 'From'
  const emailLabel = isRTL ? 'البريد الإلكتروني' : 'Email'
  const messageLabel = isRTL ? 'الرسالة' : 'Message'

  const content = `
    <p class="greeting">${subject}</p>
    
    <div class="invoice-card">
      <div class="invoice-row">
        <span class="invoice-label">${fromLabel}</span>
        <span class="invoice-value">${data.contactName || '-'}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">${emailLabel}</span>
        <span class="invoice-value">${data.contactEmail || '-'}</span>
      </div>
    </div>
    
    <p class="body-text" style="background:#f8fafc; padding:20px; border-radius:12px; border-left:3px solid #059669;">${data.contactMessage || ''}</p>
  `
  return baseTemplate(data, content)
}

// ============================================
// Template: Subscription Expiring Soon
// ============================================
export function subscriptionExpiringTemplate(data: TemplateData): string {
  const isRTL = (data.lang || "ar") === "ar"
  const greeting = isRTL ? `مرحباً ${data.userName}` : `Hello ${data.userName}`
  const body1 = isRTL
    ? `نود تذكيركم بأن اشتراككم في خطة <strong>${data.planName || 'Professional'}</strong> على منصة BlivoAI سينتهي قريباً.`
    : `We'd like to remind you that your <strong>${data.planName || 'Professional'}</strong> subscription on BlivoAI will expire soon.`
  const ctaText = isRTL ? 'تجديد الاشتراك' : 'Renew Subscription'
  const body2 = isRTL
    ? `للحفاظ على وصولكم لموظفيكم الاصطناعيين وكل بياناتكم، ننصح بتجديد الاشتراك قبل تاريخ الانتهاء.`
    : `To maintain access to your AI employees and all your data, we recommend renewing before the expiration date.`

  const content = `
    <p class="greeting">${greeting}</p>
    <p class="body-text">${body1}</p>
    
    <div class="info-box">
      <div class="info-box-title">${isRTL ? '📅 تاريخ الانتهاء' : '📅 Expiration Date'}</div>
      <div class="info-box-text" style="font-size:18px; font-weight:700; color:#0f172a;">${data.dueDate || '-'}</div>
    </div>
    
    <p class="body-text">${body2}</p>
    
    <div class="cta-wrapper">
      <a href="${data.actionUrl || 'https://blivoai.com'}" class="cta-button">${ctaText}</a>
    </div>
  `
  return baseTemplate(data, content)
}

// ============================================
// Send Email via Resend
// ============================================
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[EMAIL] RESEND_API_KEY not set")
    return false
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BlivoAI <noreply@blivoai.com>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo || "support@blivoai.com",
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[EMAIL] Send failed:", err)
      return false
    }

    const data = await res.json()
    console.log("[EMAIL] Sent successfully:", data.id)
    return true
  } catch (error) {
    console.error("[EMAIL] Error:", error)
    return false
  }
}

// ============================================
// Template: Token Usage Alert (80%+)
// ============================================
export function tokenUsageAlertTemplate(data: TemplateData & {
  companyName: string
  percentUsed: number
  tokensUsed: string
  tokensTotal: string
  tokensRemaining: string
  planName?: string
}): string {
  const isRTL = (data.lang || "ar") === "ar"
  const greeting = isRTL ? `مرحباً ${data.userName}` : `Hello ${data.userName}`
  const body1 = isRTL
    ? `نود إعلامكم بأن شركة <strong>"${data.companyName}"</strong> استهلكت <strong>${Math.round(data.percentUsed * 100)}%</strong> من ميزانية التوكنات الشهرية.`
    : `We'd like to inform you that <strong>"${data.companyName}"</strong> has consumed <strong>${Math.round(data.percentUsed * 100)}%</strong> of the monthly token budget.`

  const body2 = isRTL
    ? `للحفاظ على استمرارية عمل موظفيكم الاصطناعيين، ننصحكم بشحن توكنات إضافية أو ترقية الاشتراك للحصول على ميزانية أكبر.`
    : `To keep your AI employees running smoothly, we recommend purchasing additional tokens or upgrading your subscription for a larger budget.`

  const usedLabel = isRTL ? 'المستخدم' : 'Used'
  const totalLabel = isRTL ? 'الإجمالي' : 'Total'
  const remainingLabel = isRTL ? 'المتبقي' : 'Remaining'
  const planLabel = isRTL ? 'الخطة' : 'Plan'
  const planVal = data.planName || (isRTL ? 'تجربة مجانية' : 'Free Trial')

  const upgradeText = isRTL ? 'ترقية الاشتراك' : 'Upgrade Plan'
  const buyText = isRTL ? 'شراء توكنات' : 'Buy Tokens'

  const barColor = data.percentUsed >= 0.95 ? '#dc2626' : data.percentUsed >= 0.85 ? '#f59e0b' : '#059669'
  const barWidth = Math.min(Math.round(data.percentUsed * 100), 100)

  const content = `
    <p class="greeting">${greeting}</p>
    <p class="body-text">${body1}</p>

    <!-- Usage Card -->
    <div class="invoice-card">
      <div class="invoice-row">
        <span class="invoice-label">${planLabel}</span>
        <span class="invoice-value">${planVal}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">${usedLabel}</span>
        <span class="invoice-value">${data.tokensUsed} ${isRTL ? 'توكن' : 'tokens'}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">${totalLabel}</span>
        <span class="invoice-value">${data.tokensTotal} ${isRTL ? 'توكن' : 'tokens'}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">${remainingLabel}</span>
        <span class="invoice-value" style="color:${barColor}; font-weight:700;">${data.tokensRemaining} ${isRTL ? 'توكن' : 'tokens'}</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div style="margin:24px 0;">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; color:#64748b;">
        <span>${isRTL ? 'استهلاك التوكنات' : 'Token Usage'}</span>
        <span style="font-weight:700; color:${barColor};">${barWidth}%</span>
      </div>
      <div style="background:#e2e8f0; border-radius:8px; height:12px; overflow:hidden;">
        <div style="background:${barColor}; height:100%; width:${barWidth}%; border-radius:8px; transition:width 0.3s;"></div>
      </div>
    </div>

    <p class="body-text">${body2}</p>

    <!-- Action Buttons -->
    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:24px 0;">
      <a href="https://demo.blivoai.com/ar/pricing" style="display:inline-block; padding:12px 24px; background:linear-gradient(135deg, #059669, #10b981); color:#fff !important; text-decoration:none; border-radius:10px; font-size:14px; font-weight:600; box-shadow:0 4px 14px rgba(5,150,105,0.3);">${upgradeText}</a>
      <a href="https://demo.blivoai.com" style="display:inline-block; padding:12px 24px; background:#f8fafc; color:#475569 !important; text-decoration:none; border-radius:10px; font-size:14px; font-weight:600; border:1px solid #e2e8f0;">${buyText}</a>
    </div>

    <div class="info-box">
      <div class="info-box-title">${isRTL ? 'نصيحة' : 'Tip'}</div>
      <div class="info-box-text">${isRTL
        ? 'التوكنات الإضافية المشتراة لا تنتهي بنهاية الشهر — تبقى متاحة حتى تُستنفد بالكامل.'
        : 'Purchased additional tokens don\'t expire at month-end — they remain available until fully consumed.'
      }</div>
    </div>
  `
  return baseTemplate(data, content)
}

// ============================================
// Helper: Send specific email types
// ============================================
export async function sendWelcomeEmail(
  to: string,
  userName: string,
  companyName: string,
  lang: "ar" | "en" = "ar",
  planName?: string,
  tokenBudget?: string,
) {
  return sendEmail({
    to,
    subject: lang === "ar" ? `مرحباً ${userName} في BlivoAI` : `Welcome ${userName} to BlivoAI`,
    html: welcomeTemplate({ userName, companyName, lang, planName, tokenBudget }),
  })
}

export async function sendTokenUsageAlertEmail(
  to: string,
  userName: string,
  data: {
    companyName: string
    percentUsed: number
    tokensUsed: string
    tokensTotal: string
    tokensRemaining: string
    planName?: string
  },
  lang: "ar" | "en" = "ar",
) {
  return sendEmail({
    to,
    subject: lang === "ar"
      ? `تنبيه: استهلاك ${Math.round(data.percentUsed * 100)}% من التوكنات — ${data.companyName}`
      : `Alert: ${Math.round(data.percentUsed * 100)}% token usage — ${data.companyName}`,
    html: tokenUsageAlertTemplate({ userName, lang, ...data }),
  })
}

export async function sendInvoiceEmail(to: string, data: TemplateData) {
  return sendEmail({
    to,
    subject: data.lang === "ar"
      ? `فاتورة جديدة — ${data.invoiceNumber}`
      : `New Invoice — ${data.invoiceNumber}`,
    html: invoiceTemplate(data),
  })
}

export async function sendVerificationCodeEmail(to: string, userName: string, code: string, lang: "ar" | "en" = "ar") {
  return sendEmail({
    to,
    subject: lang === "ar" ? `كود تفعيل حسابك — BlivoAI [${code}]` : `Your verification code — BlivoAI [${code}]`,
    html: verificationCodeTemplate({ userName, lang, code }),
  })
}

export async function sendResetPasswordEmail(to: string, userName: string, resetUrl: string, lang: "ar" | "en" = "ar") {
  return sendEmail({
    to,
    subject: lang === "ar" ? "إعادة تعيين كلمة المرور — BlivoAI" : "Reset your password — BlivoAI",
    html: resetPasswordTemplate({ userName, lang, resetUrl }),
  })
}

export async function sendContactNotification(data: TemplateData) {
  return sendEmail({
    to: "support@blivoai.com",
    subject: `New contact message from ${data.contactName || 'unknown'}`,
    html: contactTemplate(data),
    replyTo: data.contactEmail,
  })
}

export async function sendSubscriptionExpiringEmail(to: string, data: TemplateData) {
  return sendEmail({
    to,
    subject: data.lang === "ar"
      ? `اشتراكك في BlivoAI سينتهي قريباً`
      : `Your BlivoAI subscription is expiring soon`,
    html: subscriptionExpiringTemplate(data),
  })
}
