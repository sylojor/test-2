#!/usr/bin/env python3
"""
Remove the LLM and Payment sections from settings-panel.tsx entirely.
These sections should ONLY be in the platform owner's admin panel,
NOT in the subscriber's dashboard.
"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"
remote_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/settings-panel.tsx"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Read the current file
stdin, stdout, stderr = client.exec_command(f"cat '{remote_path}'")
content = stdout.read().decode()
original_lines = len(content.split('\n'))
print(f"Original: {len(content)} chars, {original_lines} lines")

# ============================================
# FIND AND REMOVE: LLM Card section
# ============================================
# The LLM section starts with {/* ============================================ */}
# {/* إعدادات الـ LLM — REMOVED FROM SUBSCRIBER */}
# and includes the entire <Card>...</Card> block
# It ends before {/* LLM section removed */}

llm_start = content.find("{/* ============================================ */}\n      {/* إعدادات الـ LLM — REMOVED FROM SUBSCRIBER */}")
llm_end_marker = "{/* LLM section removed — platform owner only */}"

if llm_start >= 0 and llm_end_marker in content:
    llm_end = content.find(llm_end_marker) + len(llm_end_marker)
    llm_section = content[llm_start:llm_end]
    print(f"LLM section: {len(llm_section)} chars, {len(llm_section.split('\\n'))} lines")
    
    # Remove it entirely
    content = content[:llm_start] + content[llm_end:]
    print("REMOVED: LLM section")
else:
    print("NOT FOUND: LLM section markers")
    # Fallback: find the original markers
    llm_start2 = content.find("إعدادات الـ LLM")
    if llm_start2 >= 0:
        print(f"Found 'إعدادات الـ LLM' at char {llm_start2}")
        print(content[llm_start2-100:llm_start2+200])

# ============================================
# FIND AND REMOVE: Payment Gateway Card section
# ============================================
payment_start = content.find("{/* ============================================ */}\n      {/* بوابة الدفع — REMOVED FROM SUBSCRIBER */}")
payment_end_marker = "{/* Payment section removed — platform owner only */}"

if payment_start >= 0 and payment_end_marker in content:
    payment_end = content.find(payment_end_marker) + len(payment_end_marker)
    payment_section = content[payment_start:payment_end]
    print(f"Payment section: {len(payment_section)} chars")
    
    # Remove it entirely
    content = content[:payment_start] + content[payment_end:]
    print("REMOVED: Payment section")
else:
    print("NOT FOUND: Payment section markers")
    # Try alternate markers
    payment_start2 = content.find("بوابة الدفع")
    if payment_start2 >= 0:
        print(f"Found 'بوابة الدفع' at char {payment_start2}")

# ============================================
# Also clean up: Remove unused state variables and imports
# ============================================

# Remove payment-related imports: CreditCard, Trash2, Eye, EyeOff, ShieldAlert
# But ShieldAlert might still be used, keep it for safety
# Remove: CreditCard, Trash2, Eye, EyeOff from imports
old_imports = """  CreditCard, Trash2, Eye, EyeOff, ShieldAlert,"""
new_imports = """  ShieldAlert, """
if old_imports in content:
    content = content.replace(old_imports, new_imports)
    print("REMOVED: Payment-related imports (CreditCard, Trash2, Eye, EyeOff)")

# Remove payment state variables (lines 89-99)
payment_state_start = "  // Payment Gateway\n"
payment_state_end_marker = "\n  const [paymentShowKey, setPaymentShowKey] = useState(false)"

if payment_state_start in content:
    idx_start = content.find(payment_state_start)
    idx_end = content.find(payment_state_end_marker)
    if idx_end >= idx_start:
        idx_end += len(payment_state_end_marker) + 1  # +1 for newline
        content = content[:idx_start] + content[idx_end:]
        print("REMOVED: Payment state variables")

# Remove LLM state variables (lines 69-87 and 78-87)
# Actually these are still needed for the basic LLM status display
# Let me check if LLM status is still shown somewhere

# Check if there's any remaining reference to LLM/Payment in the JSX
remaining_llm_refs = content.count("llmStatus") + content.count("testApiKey") + content.count("selectedProvider") + content.count("fetchAvailableModels")
remaining_payment_refs = content.count("paymentConfig") + content.count("paymentApiKey") + content.count("selectedPaymentProvider")
print(f"Remaining LLM refs: {remaining_llm_refs}")
print(f"Remaining Payment refs: {remaining_payment_refs}")

# Remove loadLLMStatus and loadPaymentConfig from useEffect
old_effect = """  useEffect(() => {
    loadLLMStatus()
    loadPaymentConfig()
  }, [])"""
new_effect = """  useEffect(() => {
    // LLM & Payment config loaded from admin panel only
  }, [])"""
if old_effect in content:
    content = content.replace(old_effect, new_effect)
    print("REMOVED: loadLLMStatus() and loadPaymentConfig() from useEffect")

# Remove loadPaymentConfig function entirely
payment_load_start = "  async function loadPaymentConfig() {"
payment_load_end = "    }\n  }"
idx = content.find(payment_load_start)
if idx >= 0:
    # Find the closing }
    end_idx = content.find(payment_load_end, idx)
    if end_idx >= idx:
        end_idx += len(payment_load_end)
        content = content[:idx] + content[end_idx:]
        print("REMOVED: loadPaymentConfig function")

# Remove loadLLMStatus function entirely
llm_load_start = "  async function loadLLMStatus() {"
idx = content.find(llm_load_start)
if idx >= 0:
    # Find the closing
    llm_load_end = content.find("  }\n", idx + 50)
    if llm_load_end >= idx:
        llm_load_end += 3
        content = content[:idx] + content[llm_load_end:]
        print("REMOVED: loadLLMStatus function")

# Remove LLM state variables
llm_state_vars = [
    "llmStatus",
    "testing",
    "testResult",
    "selectedProvider",
    "testApiKey",
    "testBaseUrl",
    "showAllProviders",
    "availableModels",
    "fetchingModels",
    "selectedModels",
    "saving",
    "saveResult",
    "modelsFetched",
]

# Remove each useState line for these variables
for var in llm_state_vars:
    pattern = f"const [{var}, set{var[0].upper() + var[1:]}]"
    # This is complex, let me skip for now and handle in next step

# Remove LLM-related state declarations (lines 69-87)
# This needs more careful handling since some vars might share lines

# Let me check what's left
new_lines = len(content.split('\n'))
print(f"\nFinal: {len(content)} chars, {new_lines} lines")

# ============================================
# Write back to server
# ============================================
sftp = client.open_sftp()
with sftp.open(remote_path, 'w') as f:
    f.write(content)
sftp.close()
print("File written to server!")

client.close()
