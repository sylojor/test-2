"use client"

import { useState, useEffect, useCallback } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  BarChart3,
  Clock,
  Zap,
  Shield,
  Globe,
  X,
} from "lucide-react"

// ============================================
// Types
// ============================================

interface ApiKeyInfo {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  rateLimitRpm: number
  rateLimitRpd: number
  totalRequests: number
  totalTokensUsed: number
  todayRequests: number
  todayTokens: number
  lastUsedAt: string | null
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

interface CreateKeyResponse {
  key: string
  apiKey: {
    id: string
    name: string
    keyPrefix: string
    scopes: string[]
    rateLimitRpm: number
    rateLimitRpd: number
    expiresAt: string | null
    createdAt: string
  }
  warning: string
}

// ============================================
// Main Component
// ============================================

export function ApiKeysPanel() {
  const { activeCompanyId, subscription } = useDashboardStore()
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "chat",
    "employees",
    "conversations",
  ])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreateKeyResponse | null>(null)
  const [showFullKey, setShowFullKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revealKey, setRevealKey] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)

  const isApiAvailable = subscription === "PROFESSIONAL" || subscription === "ENTERPRISE"
  const maxKeys = subscription === "ENTERPRISE" ? 20 : 5

  // ============================================
  // Fetch Keys
  // ============================================

  const fetchKeys = useCallback(async () => {
    if (!activeCompanyId) return
    setLoading(true)
    setPlanError(null)

    try {
      const res = await fetch(
        `/api/api-keys?companyId=${activeCompanyId}`
      )
      const data = await res.json()

      if (data.upgrade) {
        setPlanError(data.error)
        setKeys([])
        return
      }

      setKeys(data.keys || [])
    } catch (err) {
      console.error("[API_KEYS_FETCH_ERROR]", err)
    } finally {
      setLoading(false)
    }
  }, [activeCompanyId])

  useEffect(() => {
    if (isApiAvailable && activeCompanyId) {
      fetchKeys()
    }
  }, [isApiAvailable, activeCompanyId, fetchKeys])

  // ============================================
  // Create Key
  // ============================================

  const handleCreate = async () => {
    if (!newKeyName.trim() || !activeCompanyId) return
    setCreating(true)

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: activeCompanyId,
          name: newKeyName.trim(),
          scopes: selectedScopes,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setCreatedKey(data)
        setNewKeyName("")
        fetchKeys()
      } else if (data.upgrade) {
        setPlanError(data.error)
      } else {
        alert(data.error || "Failed to create API key")
      }
    } catch (err) {
      console.error("[API_KEYS_CREATE_ERROR]", err)
    } finally {
      setCreating(false)
    }
  }

  // ============================================
  // Revoke Key
  // ============================================

  const handleRevoke = async (keyId: string, name: string) => {
    if (!activeCompanyId) return
    if (!confirm(`Are you sure you want to revoke "${name}"? This action cannot be undone.`)) return

    try {
      const res = await fetch(
        `/api/api-keys?id=${keyId}&companyId=${activeCompanyId}`,
        { method: "DELETE" }
      )
      if (res.ok) {
        fetchKeys()
      }
    } catch (err) {
      console.error("[API_KEYS_REVOKE_ERROR]", err)
    }
  }

  // ============================================
  // Copy
  // ============================================

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ============================================
  // Scope Toggle
  // ============================================

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    )
  }

  // ============================================
  // Format helpers
  // ============================================

  const formatTokens = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const scopeLabels: Record<string, { label: string; color: string }> = {
    chat: { label: "Chat", color: "bg-green-500/10 text-green-600 border-green-500/20" },
    employees: { label: "Employees", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    conversations: { label: "Conversations", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    usage: { label: "Usage", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  }

  // ============================================
  // Render: Not Available
  // ============================================

  if (!isApiAvailable) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Developer API
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Access the BlivoAI Developer API to integrate AI employees into your
            own platforms and applications.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Requires Professional or Enterprise plan
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // Render: Main
  // ============================================

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center">
            <Key className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Developer API</h2>
            <p className="text-sm text-muted-foreground">
              {keys.length}/{maxKeys} keys used
            </p>
          </div>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Key Name
                </label>
                <Input
                  placeholder="e.g., Production App, Testing"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Permissions (Scopes)
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(scopeLabels).map(([scope, info]) => (
                    <button
                      key={scope}
                      onClick={() => toggleScope(scope)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selectedScopes.includes(scope)
                          ? `${info.color} border-current`
                          : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                      }`}
                    >
                      {selectedScopes.includes(scope) && (
                        <Check className="w-3 h-3 inline mr-1" />
                      )}
                      {info.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={!newKeyName.trim() || creating}
                className="w-full"
              >
                {creating ? "Creating..." : "Create API Key"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Created Key Dialog */}
      {createdKey && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Save your API key now!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This key will not be shown again. Copy it to a secure location.
            </p>
            <div className="relative">
              <div className="bg-background rounded-lg p-3 font-mono text-sm border">
                {showFullKey
                  ? createdKey.key
                  : createdKey.key.substring(0, 24) +
                    "••••••••••••••••••••••••••••••••••"}
              </div>
              <div className="absolute right-2 top-2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowFullKey(!showFullKey)}
                >
                  {showFullKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => copyToClipboard(createdKey.key)}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setCreatedKey(null)
                setShowFullKey(false)
              }}
            >
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading API keys...
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Create your first API key to start integrating with your platform
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card
              key={key.id}
              className={`transition-all ${
                key.isActive
                  ? "hover:border-brand/30"
                  : "opacity-60 border-muted"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name + Status */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {key.name}
                      </span>
                      <Badge
                        variant={key.isActive ? "default" : "secondary"}
                        className={`text-[10px] ${
                          key.isActive
                            ? "bg-green-500/10 text-green-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {key.isActive ? "Active" : "Revoked"}
                      </Badge>
                      {key.isActive && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-brand/5 text-brand border-brand/20"
                        >
                          {key.rateLimitRpm} RPM
                        </Badge>
                      )}
                    </div>

                    {/* Key Prefix */}
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                        {key.keyPrefix}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          copyToClipboard(
                            revealKey === key.id
                              ? key.keyPrefix.replace("...", "")
                              : key.keyPrefix
                          )
                        }
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Scopes */}
                    <div className="flex flex-wrap gap-1.5">
                      {key.scopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="outline"
                          className={`text-[10px] ${
                            scopeLabels[scope]?.color || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {scopeLabels[scope]?.label || scope}
                        </Badge>
                      ))}
                    </div>

                    {/* Stats Row */}
                    {key.isActive && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          {formatTokens(key.totalRequests)} requests
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {formatTokens(key.totalTokensUsed)} tokens
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {key.todayRequests} today
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(key.lastUsedAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {key.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-500/10 shrink-0"
                      onClick={() => handleRevoke(key.id, key.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Expiry */}
                {key.expiresAt && (
                  <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    Expires: {formatDate(key.expiresAt)}
                    {new Date(key.expiresAt) < new Date() && (
                      <Badge variant="destructive" className="ml-2 text-[10px]">
                        Expired
                      </Badge>
                    )}
                  </div>
                )}

                {/* Created */}
                <div className="mt-1 text-xs text-muted-foreground/60">
                  Created: {formatDate(key.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rate Limits Info */}
      {keys.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              API Rate Limits ({subscription === "ENTERPRISE" ? "Enterprise" : "Professional"})
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Requests/minute:</span>{" "}
                {subscription === "ENTERPRISE" ? "200" : "60"}
              </div>
              <div>
                <span className="font-medium">Requests/day:</span>{" "}
                {subscription === "ENTERPRISE" ? "50,000" : "10,000"}
              </div>
              <div>
                <span className="font-medium">Max keys:</span>{" "}
                {maxKeys}
              </div>
              <div>
                <span className="font-medium">Auth:</span> Bearer token
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}