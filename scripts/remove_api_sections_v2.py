#!/usr/bin/env python3
"""
Properly remove LLM and Payment sections from settings-panel.tsx.
These belong in the platform owner's admin panel, NOT the subscriber dashboard.
"""

import paramiko
import re

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"
remote_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/settings-panel.tsx"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Read current file
stdin, stdout, stderr = client.exec_command(f"cat '{remote_path}'")
content = stdout.read().decode()
lines = content.split('\n')
print(f"Original: {len(lines)} lines")

# ============================================
# STEP 1: Remove {isOwner && (<>...</>)} blocks entirely
# ============================================

# Find LLM block: starts at "      {isOwner && (<>" and ends at "      </>)}"
# Find first isOwner block (LLM)
def find_isOwner_block(content, start_from=0):
    """Find {isOwner && (<>...</>)} block"""
    start_marker = "{isOwner && (<>"
    end_marker = "</>)}"
    
    start_idx = content.find(start_marker, start_from)
    if start_idx < 0:
        return None, None
    
    # Find the matching end marker
    # Need to count nested structures
    end_idx = content.find(end_marker, start_idx)
    if end_idx < 0:
        return None, None
    
    # Include whitespace before and after
    # Go back to include the full line
    line_start = content.rfind('\n', 0, start_idx) + 1
    
    # Go forward past the end marker
    end_pos = end_idx + len(end_marker)
    # Include newline after
    if content[end_pos:end_pos+1] == '\n':
        end_pos += 1
    
    return line_start, end_pos

# Remove first isOwner block (LLM section)
start1, end1 = find_isOwner_block(content)
if start1 and end1:
    removed = content[start1:end1]
    print(f"Removing LLM block: {len(removed)} chars (lines {content[:start1].count(chr(10))+1} to {content[:end1].count(chr(10))+1})")
    content = content[:start1] + content[end1:]

# Remove second isOwner block (Payment section)
start2, end2 = find_isOwner_block(content)
if start2 and end2:
    removed = content[start2:end2]
    print(f"Removing Payment block: {len(removed)} chars")
    content = content[:start2] + content[end2:]

# ============================================
# STEP 2: Clean up imports
# ============================================

# Remove unused imports: Brain, Plug, RefreshCw, ChevronDown, ChevronUp,
# CheckCircle2, XCircle, Loader2, Sparkles, CreditCard, Trash2, Eye, EyeOff
# ShieldAlert might still be needed? Let's check

# Actually, most of these are only used in LLM/Payment sections
# Let me check what's still referenced in the remaining content
remaining_icons = [
    'Settings', 'Plug', 'RefreshCw', 'ChevronDown', 'ChevronUp',
    'CheckCircle2', 'XCircle', 'Loader2', 'Sparkles', 'Brain',
    'CreditCard', 'Trash2', 'Eye', 'EyeOff', 'ShieldAlert',
]

for icon in remaining_icons:
    # Check if icon is used as JSX component (e.g., <Brain, <CreditCard)
    pattern = f'<{icon}'
    if pattern not in content:
        # Remove from imports
        # Pattern could be: "  Brain," or "Brain," or similar
        content = re.sub(rf',?\s*{icon}\s*,?', ',', content)

# Clean up double commas or trailing commas in imports
content = re.sub(r',,\s*', ', ', content)
content = re.sub(r',\s*\}', ' }', content)  # trailing comma before }

print("Cleaned up unused imports")

# ============================================
# STEP 3: Remove unused state variables and functions
# ============================================

# Remove LLM-related state variables (useState lines)
llm_state_patterns = [
    r'const \[llmStatus, setLlmStatus\] = useState<LLMStatus \| null>\(null\)\n',
    r'const \[testing, setTesting\] = useState\(false\)\n',
    r'const \[testResult, setTestResult\] = useState<\{ success: boolean; message: string \} \| null>\(null\)\n',
    r'const \[selectedProvider, setSelectedProvider\] = useState<LLMProvider>\("mock"\)\n',
    r'const \[testApiKey, setTestApiKey\] = useState\(""\)\n',
    r'const \[testBaseUrl, setTestBaseUrl\] = useState\(""\)\n',
    r'const \[showAllProviders, setShowAllProviders\] = useState\(false\)\n',
    r'const \[availableModels, setAvailableModels\] = useState<AvailableModel\[\]>\(\[\]\)\n',
    r'const \[fetchingModels, setFetchingModels\] = useState\(false\)\n',
    r'const \[selectedModels, setSelectedModels\] = useState<Record<ModelTier, string>>\(\{\n[^}]+\}\)\n',
    r'const \[saving, setSaving\] = useState\(false\)\n',
    r'const \[saveResult, setSaveResult\] = useState<\{ success: boolean; message: string \} \| null>\(null\)\n',
    r'const \[modelsFetched, setModelsFetched\] = useState\(false\)\n',
]

for pattern in llm_state_patterns:
    matches = re.findall(pattern, content)
    if matches:
        content = re.sub(pattern, '', content)
        print(f"Removed state pattern")

# Remove Payment state variables (already removed some, check what's left)
payment_state_patterns = [
    r'const \[paymentConfig.*?\n',
    r'const \[paymentProviders.*?\n',
    r'const \[selectedPaymentProvider.*?\n',
    r'const \[paymentApiKey.*?\n',
    r'const \[paymentWebhookSecret.*?\n',
    r'const \[paymentBaseUrl.*?\n',
    r'const \[paymentSaving.*?\n',
    r'const \[paymentTesting.*?\n',
    r'const \[paymentResult.*?\n',
    r'const \[paymentShowKey.*?\n',
]

for pattern in payment_state_patterns:
    matches = re.findall(pattern, content)
    if matches:
        content = re.sub(pattern, '', content)

# Remove tierLabels and tierDescriptions (only used in LLM section)
tier_labels_pattern = r'const tierLabels: Record<string, string> = \{[^}]+\}\n'
tier_desc_pattern = r'const tierDescriptions: Record<string, string> = \{[^}]+\}\n'
content = re.sub(tier_labels_pattern, '', content)
content = re.sub(tier_desc_pattern, '', content)

# Remove loadLLMStatus and fetchAvailableModels functions if still present
# Also remove saveModelConfig function
func_patterns = [
    r'async function loadLLMStatus\(\).*?\n  \}\n',
    r'async function fetchAvailableModels\(\).*?\n  \}\n',
    r'async function saveModelConfig\(\).*?\n  \}\n',
]

# These are harder to match with regex since they can span many lines
# Let me use a simpler approach - just search for function starts and remove manually

# Remove useEffect with empty body
old_useeffect = """  useEffect(() => {
    // LLM & Payment config loaded from admin panel only
  }, [])"""
new_useeffect = """  // LLM & Payment config are managed by platform owner via admin panel"""
if old_useeffect in content:
    content = content.replace(old_useeffect, new_useeffect)
    print("Simplified useEffect")

# Remove PROVIDER_OPTIONS constant (only used in LLM section)
provider_pattern = r'const PROVIDER_OPTIONS.*?\n\]\n'
# This is multi-line, need different approach
prov_start = content.find("const PROVIDER_OPTIONS")
if prov_start >= 0:
    # Find the end of the array
    prov_end = content.find("]\n", prov_start)
    if prov_end >= 0:
        prov_end += 2
        content = content[:prov_start] + content[prov_end:]
        print("Removed PROVIDER_OPTIONS constant")

# Remove AvailableModel interface (only used in LLM section)
model_iface_start = content.find("interface AvailableModel")
if model_iface_start >= 0:
    model_iface_end = content.find("}\n", model_iface_start)
    if model_iface_end >= 0:
        model_iface_end += 2
        content = content[:model_iface_start] + content[model_iface_end:]
        print("Removed AvailableModel interface")

# Remove LLMStatus interface (only used in LLM section)  
llm_iface_start = content.find("interface LLMStatus")
if llm_iface_start >= 0:
    # Find end
    llm_iface_end = content.find("}\n", llm_iface_start)
    if llm_iface_end >= 0:
        llm_iface_end += 2
        content = content[:llm_iface_start] + content[llm_iface_end:]
        print("Removed LLMStatus interface")

# ============================================
# STEP 4: Update subtitle - subscribers don't see AI settings
# ============================================
# Change from conditional subtitle to simple "Company Settings" for all
old_subtitle = '{isOwner ? (isArabic ? "إعدادات الذكاء الاصطناعي والشركة" : "AI & Company Settings") : (isArabic ? "إعدادات الشركة والاشتراك" : "Company & Subscription Settings")}'
new_subtitle = '{isArabic ? "إعدادات الشركة والاشتراك" : "Company & Subscription Settings"}'

if old_subtitle in content:
    content = content.replace(old_subtitle, new_subtitle)
    print("Updated subtitle to simple version")

# ============================================
# STEP 5: Remove isOwner from function signature since it's no longer used
# ============================================
# Check if isOwner is still referenced anywhere in the content
isOwner_refs = content.count("isOwner")
print(f"isOwner references remaining: {isOwner_refs}")

# If only in the interface and function signature, remove it
if isOwner_refs <= 3:  # Only in interface definition and function signature
    # Remove from interface
    content = re.sub(r'\n  isOwner\?: boolean', '', content)
    # Remove from function signature
    content = re.sub(r', isOwner = true', '', content)
    content = re.sub(r', isOwner\?: boolean', '', content)
    print("Removed isOwner from interface and function signature")

# ============================================
# STEP 6: Clean up any remaining LLM/Payment references
# ============================================

# Remove any remaining references to removed state/functions
# Check for loadPaymentConfig references
content = content.replace("loadPaymentConfig()", "")

# Remove any double blank lines
content = re.sub(r'\n\n\n+', '\n\n', content)

# ============================================
# Final: Write to server
# ============================================
final_lines = len(content.split('\n'))
print(f"\nFinal: {len(content)} chars, {final_lines} lines (removed {len(lines) - final_lines} lines)")

sftp = client.open_sftp()
with sftp.open(remote_path, 'w') as f:
    f.write(content)
sftp.close()
print("File written to server!")

client.close()
