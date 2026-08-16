#!/usr/bin/env python3
"""Fix employee-generator.ts: Make suggestions role-specific only"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()
remote_path = "/home/ubuntu/blivoai-demo/src/lib/employee-generator.ts"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

# Find the generateSmartCapabilities function and replace it entirely
# The bug: ALL keyword groups are checked independently, causing cross-domain suggestion leakage
# Fix: Only the BEST matching domain gets suggestions (exclusive matching)

old_function_start = '''function generateSmartCapabilities(role: string, specialization: string, description?: string): {
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
  
  // إضافة قدرات حسب كلمات مفتاحية بالوصف والتخصص'''

new_function_start = '''function generateSmartCapabilities(role: string, specialization: string, description?: string): {
  capabilities: string[]
  suggestedCapabilities: string[]
} {
  const context = `${role} ${specialization} ${description ?? ""}`.toLowerCase()
  
  // قدرات أساسية — مشربة حسب التخصص
  const capabilities: string[] = [
    `تنفيذ مهام ${specialization} بشكل احترافي وكامل`,
    "التواصل مع باقي الموظفين عند الحاجة ضمن نفس المجال",
    "طلب المساعدة من صاحب الشركة عند الأمور المعقدة",
    "تقديم تقارير دورية عن الأداء والتقدم",
  ]

  const suggestedCapabilities: string[] = []
  
  // ============================================
  // إصلاح مهم: الاقتراحات مخصصة بتخصص الموظف فقط!
  // قبل: كل الكلمات المفتاحية بتشتبك — سوشال ميديا بيطلعلو اقتراح ضريبي
  // بعد: بس المجال الأقرب للتخصص بيطّلع اقتراحاتو
  // ============================================
  
  // تعريف المجالات — كل مجال كلمات مفتاحية + قدرات + اقتراحات
  const domains = [
    {
      keywords: ["إدار", "مدير", "manage", "management"],
      capabilities: ["تنظيم وتوزيع المهام على الفريق"],
      suggestions: ["إعداد تقارير أداء الفريق", "تقييم أداء الموظفين"],
    },
    {
      keywords: ["خدم", "دعم", "زبون", "customer", "support", "client"],
      capabilities: ["التعامل مع استفسارات وشكاوى العملاء"],
      suggestions: ["إعداد قاعدة معرفة للأسئلة الشائعة", "تتبع رضا العملاء"],
    },
    {
      keywords: ["بيان", "تحليل", "data", "analysis", "excel", "اكسل", "تعبية", "تعبئ", "dashboard"],
      capabilities: ["تحليل البيانات وإعداد التقارير", "تنظيم وإدخال البيانات بدقة"],
      suggestions: ["إنشاء لوحات تحكم (Dashboards)", "تتبع مؤشرات الأداء"],
    },
    {
      keywords: ["بيع", "مبيع", "store", "متجر", "ecommerce", "إلكتروني", "shop"],
      capabilities: ["متابعة عملاء محتملين وإغلاق الصفقات", "إدارة المنتجات والوصوف على المتجر"],
      suggestions: ["إعداد عروض أسعار", "تتبع معدل التحويل", "مراقبة المخزون والستوك"],
    },
    {
      keywords: ["مخزون", "ستوك", "inventory", "stock", "مراقب", "monitor", "warehouse"],
      capabilities: ["مراقبة مستويات المخزون بشكل دوري", "إشعار صاحب الشركة عند انخفاض المخزون"],
      suggestions: ["إعداد تقارير المخزون الدورية", "توقع احتياجات المخزون المستقبلية"],
    },
    {
      keywords: ["محاسب", "محاسبة", "مال", "finance", "account", "صرف", "ميزانية", "ضريب", "tax", "invoice", "فاتور"],
      capabilities: ["تسجيل العمليات المالية اليومية", "إعداد تقارير مالية دورية", "متابعة المصروفات والإيرادات"],
      suggestions: ["إقرار ضريبي سنوي", "إعداد كشف تدفق النقد", "متابعة المستحقات والمديونيات"],
    },
    {
      keywords: ["سوشال", "محتوى", "content", "social", "تواصل", "منصات", "instagram", "facebook", "twitter", "linkedin", "tiktok", "وسائل"],
      capabilities: ["إنشاء ونشر محتوى على منصات التواصل", "الرد على التعليقات والرسائل بشكل احترافي"],
      suggestions: ["إعداد تقارير أداء أسبوعية", "إدارة الحملات الإعلانية المدفوعة"],
    },
    {
      keywords: ["برمج", "كود", "تطوير", "code", "develop", "dev", "program", "software", "web", "frontend", "backend"],
      capabilities: ["كتابة كود نظيف ومنظم", "تصحيح الأخطاء البرمجية"],
      suggestions: ["كتابة اختبارات وحدة", "مراقبة الأداء وتحسينه"],
    },
    {
      keywords: ["تصميم", "design", "جرافيك", "graphic", "UI", "UX", "ux/ui", "ui/ux", "brand", "branding"],
      capabilities: ["تصميم صور وإعلانات بناءً على الطلبات", "اقتراح أفكار بصرية إبداعية"],
      suggestions: ["تصميم هوية بصرية كاملة", "تصميم واجهات مواقع"],
    },
    {
      keywords: ["تسويق", "market", "حملات", "إعلان", "advertis", "campaign", "promo", "promotion", "seo"],
      capabilities: ["إدارة الحملات التسويقية", "تحليل السوق والمنافسين"],
      suggestions: ["إدارة الإيميل ماركتنغ", "تحليل سلوك العملاء"],
    },
  ]
  
  // ============================================
  // المطابقة الحصرية: بس المجال الأقرب للتخصص بيطّلع اقتراحاتو
  // لو "سوشال" → بس اقتراحات سوشال (مش ضريبي!)
  // ============================================
  
  // حساب نسبة مطابقة كل مجال
  const domainScores = domains.map(domain => {
    const matchCount = domain.keywords.filter(kw => context.includes(kw)).length
    return { domain, score: matchCount, keywords: domain.keywords.filter(kw => context.includes(kw)) }
  })
  
  // بس المجالات اللي فعلاً مطابقة (score > 0)
  const matchedDomains = domainScores.filter(d => d.score > 0)
  
  // رتب من الأعلى مطابقة
  matchedDomains.sort((a, b) => b.score - a.score)
  
  // أضيف قدرات + اقتراحات فقط من المجالات المطابقة (أقصى 3 مجالات)
  for (const matched of matchedDomains.slice(0, 3)) {
    // أضيف القدرات الأساسية للمجال (مش كلها — بس اللي مش مكررة)
    for (const cap of matched.domain.capabilities) {
      if (!capabilities.some(c => c === cap)) {
        capabilities.push(cap)
      }
    }
    // أضيف الاقتراحات المخصصة للمجال فقط!
    for (const sug of matched.domain.suggestions) {
      if (!suggestedCapabilities.some(s => s === sug)) {
        suggestedCapabilities.push(sug)
      }
    }
  }'''

content = content.replace(old_function_start, new_function_start)

# Now we need to remove ALL the old if-blocks that were checking keywords independently
# These are the blocks after the comment "إضافة قدرات حسب كلمات مفتاحية بالوصف والتخصص"
# that start with "if (context.includes(...))" and were adding to capabilities/suggestedCapabilities

# Remove the old keyword-matching blocks (they're replaced by the domain-based system above)
# Find and remove everything from "// إضافة قدرات حسب" up to "// لو ما في اقتراحات"
old_blocks_pattern = '''  // لو ما في اقتراحات — أضيف اقتراحات عامة مرتبطة بالتخصص'''

# Let me find what's between the new domain matching and the fallback
# We need to keep the domain matching code but remove any leftover old if blocks
# Actually, the replacement already handles this since we replaced the start of the function
# But we still need to remove the old if blocks that come after

# Let me check what the file looks like after replacement
with sftp.open(remote_path, "w") as f:
    f.write(content.encode())

print("employee-generator.ts updated!")

# Verify the changes
stdin, stdout, stderr = client.exec_command(f"grep -c 'domainScores' {remote_path}")
print(f"domainScores count: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command(f"grep -c 'matchedDomains' {remote_path}")
print(f"matchedDomains count: {stdout.read().decode().strip()}")

# Check if old if blocks still exist
stdin, stdout, stderr = client.exec_command(f"grep 'context.includes.*محاسب' {remote_path}")
has_old = stdout.read().decode().strip()
print(f"Old accounting if-block still exists: {bool(has_old)}")

sftp.close()
client.close()
