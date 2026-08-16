#!/usr/bin/env python3
"""
Add API Keys & Payment Gateway section to the admin panel SystemTab.
When the platform owner saves API keys, they get written to .env file
AND process.env for immediate effect.
"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"
remote_path = "/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Read current file
stdin, stdout, stderr = client.exec_command(f"cat '{remote_path}'")
content = stdout.read().decode()
original_lines = len(content.split('\n'))
print(f"Original: {len(content)} chars, {original_lines} lines")

# ============================================
# CHANGE 1: Add CreditCard import
# ============================================
old_import = "import { Tabs, TabsContent, TabsList, TabsTrigger } from \"@/components/ui/tabs\""
new_import = """import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard } from "lucide-react""""

if old_import in content:
    content = content.replace(old_import, new_import)
    print("Added CreditCard import")

# ============================================
# CHANGE 2: Add envKeys state to SystemTab
# ============================================
# Find the llmForm state and add envKeys state after it
old_llm_form_end = """  const [savingLlm, setSavingLlm] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)"""
new_state = """  const [savingLlm, setSavingLlm] = useState(false)
  const [envKeys, setEnvKeys] = useState({
    dodoApiKey: "", dodoWebhookSecret: "", dodoBaseUrl: "",
  })
  const [savingEnvKeys, setSavingEnvKeys] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)"""

if old_llm_form_end in content:
    content = content.replace(old_llm_form_end, new_state)
    print("Added envKeys state")

# ============================================
# CHANGE 3: Add envKeys form data from settings in loadSettings
# ============================================
# After setLlmForm, add envKeys data
old_llm_form_set = """        setLlmForm({
          provider: data.llm?.provider || "",
          apiKey: "", // Don't populate actual key
          apiUrl: "", // Don't populate actual URL
          modelLight: "",
          modelMedium: "",
          modelHeavy: "",
        })"""
new_llm_form_set = """        setLlmForm({
          provider: data.llm?.provider || "",
          apiKey: "", // Don't populate actual key
          apiUrl: "", // Don't populate actual URL
          modelLight: "",
          modelMedium: "",
          modelHeavy: "",
        })
        setEnvKeys({
          dodoApiKey: "", // Don't populate actual key
          dodoWebhookSecret: "", // Don't populate actual secret
          dodoBaseUrl: data.envKeys?.dodoBaseUrl || "",
        })"""

if old_llm_form_set in content:
    content = content.replace(old_llm_form_set, new_llm_form_set)
    print("Added envKeys data in loadSettings")

# ============================================
# CHANGE 4: Add saveEnvKeys function after saveLlm function
# ============================================
old_after_save_llm = """  function formatUptime(seconds: number): string {"""
new_save_env = """  async function saveEnvKeys() {
    setSavingEnvKeys(true)
    try {
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=")
          return [key, v.join("=")]
        })
      )
      const token = cookies.oec_token || ""

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ envKeys }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(lang === "ar" ? "تم حفظ API Keys وبيئة الدفع!" : "API Keys & Payment saved!")
        loadSettings()
      } else {
        toast.error(data.error || "Failed")
      }
    } catch { toast.error(lang === "ar" ? "خطأ في الاتصال" : "Network error") }
    setSavingEnvKeys(false)
  }

  function formatUptime(seconds: number): string {"""

if old_after_save_llm in content:
    content = content.replace(old_after_save_llm, new_save_env)
    print("Added saveEnvKeys function")

# ============================================
# CHANGE 5: Add API Keys & Payment card after LLM card
# ============================================
# Insert after the LLM card closing and before Database Stats
old_marker = """      </Card>

      {/* Database Stats */}"""
new_card = """      </Card>

      {/* ============================================ */}
      {/* API Keys & Payment Gateway — Platform Owner */}
      {/* Written to .env file + process.env on save   */}
      {/* ============================================ */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand" />
            {lang === "ar" ? "API Keys و بوابة الدفع" : "API Keys & Payment Gateway"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Dodo Payments Status */}
          {settings.envStatus?.DODO_API_KEY_SET && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {lang === "ar" ? "Dodo Payments مفعّلة ✓" : "Dodo Payments active ✓"}
                </span>
              </div>
            </div>
          )}
          {!settings.envStatus?.DODO_API_KEY_SET && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {lang === "ar" ? "Dodo Payments غير مفعّلة — حط API Key" : "Dodo Payments inactive — add API Key"}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Dodo API Key */}
            <div>
              <Label className="text-xs text-muted-foreground">
                {lang === "ar" ? "Dodo API Key" : "Dodo API Key"}
              </Label>
              <Input
                value={envKeys.dodoApiKey}
                onChange={e => setEnvKeys(p => ({ ...p, dodoApiKey: e.target.value }))}
                type="password"
                placeholder={settings.envKeys?.dodoApiKeyMasked || "dp_live_..."}
                className="bg-muted/30 border-border"
              />
            </div>
            {/* Dodo Webhook Secret */}
            <div>
              <Label className="text-xs text-muted-foreground">
                {lang === "ar" ? "Webhook Secret" : "Webhook Secret"}
              </Label>
              <Input
                value={envKeys.dodoWebhookSecret}
                onChange={e => setEnvKeys(p => ({ ...p, dodoWebhookSecret: e.target.value }))}
                type="password"
                placeholder={settings.envKeys?.dodoWebhookSecretMasked || "whsec_..."}
                className="bg-muted/30 border-border"
              />
            </div>
            {/* Dodo Base URL */}
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground">
                {lang === "ar" ? "Dodo API URL" : "Dodo API URL"}
              </Label>
              <Input
                value={envKeys.dodoBaseUrl}
                onChange={e => setEnvKeys(p => ({ ...p, dodoBaseUrl: e.target.value }))}
                placeholder="https://api.dodopayments.com/v1"
                className="bg-muted/30 border-border"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "ar"
              ? "حط API Key لحط Dodo Payments → ينكتب على .env بالسيرفر → الدفع يتفعل مباشرة للمشتركين"
              : "Add API Key to set up Dodo Payments → written to .env on server → payment activates immediately for subscribers"
            }
          </p>
          <Button onClick={saveEnvKeys} size="sm" disabled={savingEnvKeys} className="bg-brand hover:bg-brand-dark text-brand-foreground">
            {savingEnvKeys ? <Loader2 className="w-4 w-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {lang === "ar" ? "حفظ وتفعيل" : "Save & Activate"}
          </Button>
        </CardContent>
      </Card>

      {/* Database Stats */}"""

if old_marker in content:
    content = content.replace(old_marker, new_card, 1)  # Only first occurrence
    print("Added API Keys & Payment card")

# ============================================
# Final: Write to server
# ============================================
final_lines = len(content.split('\n'))
print(f"\nFinal: {len(content)} chars, {final_lines} lines")

sftp = client.open_sftp()
with sftp.open(remote_path, 'w') as f:
    f.write(content)
sftp.close()
print("File written to server!")

client.close()
