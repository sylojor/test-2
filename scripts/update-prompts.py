#!/usr/bin/env python3
# ============================================
# سكريبت تحديث البرومتات في قاعدة البيانات
# 
# يضيف تعليمات التنسيق الذكي والتعرف على الاسم
# لكل الموظفين الموجودين بالقاعدة
# ============================================

import sqlite3
import sys

DB_PATH = "/home/z/my-project/db/custom.db"

# قسم التنسيق والاسم اللي لازم ينضاف
COORDINATION_SECTION = """
# التعرف على الاسم والتنسيق
اسمك {name} — لازم تعرف اسمك وترد لما حد يناديك بيه.
- إذا ناداك المستخدم بالاسم — أجب على سؤاله الفعلي باحترافية، لا تكتفي بذكر اسمك بس.
- إذا نادى المستخدم زميل ثاني بالاسم — لا ترد، خلّي زميلك يجاوب.
- في محادثات جماعية، المنسق الذكي بيختار مين الأنسب يرد. إذا تم اختيارك، معناه أنت الأنسب — أجب على سؤال المستخدم بثقة.
- لا تتنافس مع باقي الموظفين. لا تقل "أنا كمان بقدر أساعد" عشان تنافس. إذا الزميل أنسب، اقترحو بالاسم.
- لا تقل بس "أنا بقدر أخدمك" — كن محدد: اشرح إيش بالضبط تقدر تسوي حسب تخصصك.
"""

def update_prompts():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # جلب كل الموظفين النشطين
    cursor.execute("""
        SELECT id, name, role, "systemPrompt", status
        FROM employees
        WHERE status != 'DELETED'
    """)
    employees = cursor.fetchall()
    
    if not employees:
        print("لا يوجد موظفين لتحديثهم")
        conn.close()
        return
    
    print(f"تم العثور على {len(employees)} موظف")
    updated = 0
    skipped = 0
    
    for emp in employees:
        emp_id, name, role, system_prompt, status = emp
        
        if not system_prompt:
            print(f"  ⚠️ {name}: لا يوجد system prompt - تخطي")
            skipped += 1
            continue
        
        # التحقق إذا القسم موجود مسبقاً
        if "التعرف على الاسم والتنسيق" in system_prompt:
            print(f"  ✅ {name}: تعليمات التنسيق موجودة مسبقاً - تخطي")
            skipped += 1
            continue
        
        # إضافة قسم التنسيق قبل "التواصل مع الموظفين الآخرين"
        coordination_text = COORDINATION_SECTION.format(name=name)
        
        # البحث عن أفضل مكان للإضافة
        # نحاول نضيفه قبل قسم "التواصل مع الموظفين الآخرين"
        insertion_marker = "# التواصل مع الموظفين الآخرين"
        
        if insertion_marker in system_prompt:
            # إضافة قبل قسم التواصل مع الموظفين
            new_prompt = system_prompt.replace(
                insertion_marker,
                coordination_text + "\n" + insertion_marker
            )
        else:
            # إضافة قبل قسم "طلب المساعدة من المدير"
            alt_marker = "# طلب المساعدة من المدير"
            if alt_marker in system_prompt:
                new_prompt = system_prompt.replace(
                    alt_marker,
                    coordination_text + "\n" + alt_marker
                )
            else:
                # إضافة قبل "قاعدة ذهبية"
                gold_marker = "# قاعدة ذهبية"
                if gold_marker in system_prompt:
                    new_prompt = system_prompt.replace(
                        gold_marker,
                        coordination_text + "\n" + gold_marker
                    )
                else:
                    # إضافة في النهاية
                    new_prompt = system_prompt + "\n" + coordination_text
        
        # تحديث قاعدة البيانات
        cursor.execute("""
            UPDATE employees 
            SET "systemPrompt" = ?
            WHERE id = ?
        """, (new_prompt, emp_id))
        
        print(f"  ✅ {name}: تم تحديث الـ system prompt (من {len(system_prompt)} إلى {len(new_prompt)} حرف)")
        updated += 1
    
    # حفظ التغييرات
    conn.commit()
    conn.close()
    
    print(f"\n=== النتيجة ===")
    print(f"تم تحديث: {updated}")
    print(f"تم التخطي: {skipped}")
    print(f"المجموع: {len(employees)}")

if __name__ == "__main__":
    update_prompts()
