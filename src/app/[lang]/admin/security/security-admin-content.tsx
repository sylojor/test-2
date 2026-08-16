"use client"

// ============================================
// Security Admin Panel — IP Management
// View blocked IPs, security logs, manual block/unblock
// ============================================

import { useState, useEffect, useCallback } from "react"
import { useLocale } from "@/hooks/use-locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Shield, Ban, Unlock, Search, RefreshCw, AlertTriangle, Eye, Clock,
  Globe, MapPin, FileText, Activity, Loader2, Trash2, Plus
} from "lucide-react"

interface BlockedIPItem {
  id: string
  ip: string
  reason: string
  blockedBy: string | null
  country: string | null
  path: string | null
  attemptDetail: string | null
  requestCount: number
  autoBlocked: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  unblockedAt: string | null
}

interface SecurityLogItem {
  id: string
  ip: string
  path: string
  method: string
  statusCode: number
  userAgent: string | null
  referer: string | null
  isSuspicious: boolean
  reason: string | null
  country: string | null
  blocked: boolean
  createdAt: string
}

interface SecurityStats {
  activeBlocks: number
  autoBlocks: number
  manualBlocks: number
  totalSuspicious: number
  todaySuspicious: number
  totalBlocked: number
}

export function SecurityAdmin({ lang }: { lang: string }) {
  const [blockedIps, setBlockedIps] = useState<BlockedIPItem[]>([])
  const [logs, setLogs] = useState<SecurityLogItem[]>([])
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [blockIp, setBlockIp] = useState("")
  const [blockReason, setBlockReason] = useState("")
  const [activeView, setActiveView] = useState<"blocked" | "logs">("blocked")

  const l = (ar: string, en: string) => lang === "ar" ? ar : en

  const loadData = useCallback(async () => {
    try {
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => { const [key, ...v] = c.split("="); return [key, v.join("=")] }))
      const token = cookies.oec_token || ""

      const res = await fetch(`/api/admin/security?filter=${filter}&search=${search}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setBlockedIps(data.blockedIps || [])
        setLogs(data.suspiciousLogs || [])
        setStats(data.stats || null)
      } else {
        toast.error(l("فشل تحميل البيانات", "Failed to load data"))
      }
    } catch {
      toast.error(l("خطأ في الاتصال", "Connection error"))
    }
    setLoading(false)
  }, [filter, search, lang])

  useEffect(() => { loadData() }, [loadData])

  const handleBlock = async () => {
    if (!blockIp) {
      toast.error(l("اكتب IP address", "Enter an IP address"))
      return
    }
    try {
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => { const [key, ...v] = c.split("="); return [key, v.join("=")] }))
      const token = cookies.oec_token || ""

      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ip: blockIp, reason: blockReason || l("حظر يدوي", "Manual block") }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(l("تم حظر IP بنجاح!", "IP blocked successfully!"))
        setBlockIp("")
        setBlockReason("")
        loadData()
      } else {
        toast.error(l(data.error || "فشل حظر IP", data.error || "Failed to block IP"))
      }
    } catch {
      toast.error(l("خطأ في الاتصال", "Connection error"))
    }
  }

  const handleUnblock = async (ip: string) => {
    try {
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => { const [key, ...v] = c.split("="); return [key, v.join("=")] }))
      const token = cookies.oec_token || ""

      const res = await fetch("/api/admin/security", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ip }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(l("تم فك حظر IP!", "IP unblocked!"))
        loadData()
      } else {
        toast.error(l(data.error || "فشل فك الحظر", data.error || "Failed to unblock"))
      }
    } catch {
      toast.error(l("خطأ في الاتصال", "Connection error"))
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <Shield className="w-4 h-4 text-brand mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{l("حظر فعال", "Active Blocks")}</p>
              <p className="text-lg font-bold">{stats.activeBlocks}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-4 h-4 text-orange-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{l("حظر تلقائي", "Auto Blocks")}</p>
              <p className="text-lg font-bold">{stats.autoBlocks}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <Ban className="w-4 h-4 text-red-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{l("حظر يدوي", "Manual Blocks")}</p>
              <p className="text-lg font-bold">{stats.manualBlocks}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <Eye className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{l("ريكويستات مشبوهة", "Suspicious Requests")}</p>
              <p className="text-lg font-bold">{stats.totalSuspicious}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <Activity className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{l("مشبوهة اليوم", "Today Suspicious")}</p>
              <p className="text-lg font-bold">{stats.todaySuspicious}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Block */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-500" />
            {l("حظر IP يدوي", "Manual IP Block")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                placeholder={l("IP address (مثال: 192.168.1.1)", "IP address (e.g. 192.168.1.1)")}
                value={blockIp}
                onChange={e => setBlockIp(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder={l("سبب الحظر (اختياري)", "Reason (optional)")}
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleBlock} className="bg-red-500 hover:bg-red-600 text-white">
              <Plus className="w-3 h-3 mr-1" />
              {l("حظر", "Block")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter & Search */}
      <div className="flex gap-2 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px] bg-muted/30 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{l("الكل", "All")}</SelectItem>
            <SelectItem value="active">{l("حظر فعال", "Active Blocks")}</SelectItem>
            <SelectItem value="auto">{l("حظر تلقائي", "Auto Blocks")}</SelectItem>
            <SelectItem value="manual">{l("حظر يدوي", "Manual Blocks")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 relative">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={l("بحث IP أو سبب...", "Search IP or reason...")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 bg-muted/30 border-border"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="w-3 h-3" />
        </Button>
        <Button
          variant={activeView === "blocked" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("blocked")}
        >
          <Shield className="w-3 h-3 mr-1" />
          {l("محظورات", "Blocked")}
        </Button>
        <Button
          variant={activeView === "logs" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("logs")}
        >
          <FileText className="w-3 h-3 mr-1" />
          {l("سجل", "Logs")}
        </Button>
      </div>

      {/* Blocked IPs Table */}
      {activeView === "blocked" && (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2 text-left text-muted-foreground">{l("IP", "IP")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("السبب", "Reason")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("النوع", "Type")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("المسار", "Path")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("التفاصيل", "Details")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("العدد", "Count")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("التاريخ", "Date")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("حظر بواسطة", "Blocked By")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("إجراء", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedIps.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-muted-foreground">
                        {l("لا IPs محظورة", "No blocked IPs")}
                      </td>
                    </tr>
                  )}
                  {blockedIps.map(item => (
                    <tr key={item.id} className="border-b border-border hover:bg-muted/10">
                      <td className="p-2 font-mono font-semibold">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-muted-foreground" />
                          {item.ip}
                        </div>
                      </td>
                      <td className="p-2 max-w-[200px] truncate">
                        <span className={item.isActive ? "text-red-500" : "text-muted-foreground"}>
                          {item.reason}
                        </span>
                      </td>
                      <td className="p-2">
                        {item.autoBlocked ? (
                          <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-[10px]">
                            {l("تلقائي", "Auto")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-[10px]">
                            {l("يدوي", "Manual")}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 font-mono text-muted-foreground max-w-[150px] truncate">
                        {item.path || "—"}
                      </td>
                      <td className="p-2 text-muted-foreground max-w-[250px] truncate">
                        {item.attemptDetail || "—"}
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant="secondary" className="text-[10px]">{item.requestCount}</Badge>
                      </td>
                      <td className="p-2 text-muted-foreground whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {item.blockedBy || (item.autoBlocked ? l("النظام", "System") : "—")}
                      </td>
                      <td className="p-2">
                        {item.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 hover:text-green-600 text-[10px] h-6"
                            onClick={() => handleUnblock(item.ip)}
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            {l("فك", "Unblock")}
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            {l("فك الحظر", "Unblocked")}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Logs */}
      {activeView === "logs" && (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2 text-left text-muted-foreground">{l("IP", "IP")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("المسار", "Path")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("الطريقة", "Method")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("الحالة", "Status")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("السبب", "Reason")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("Browser", "UA")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("مصدر", "Referer")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("محظور؟", "Blocked?")}</th>
                    <th className="p-2 text-left text-muted-foreground">{l("التاريخ", "Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-muted-foreground">
                        {l("لا سجلات مشبوهة", "No suspicious logs")}
                      </td>
                    </tr>
                  )}
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/10">
                      <td className="p-2 font-mono font-semibold">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {log.ip}
                        </div>
                      </td>
                      <td className="p-2 font-mono max-w-[200px] truncate">
                        <span className={log.isSuspicious ? "text-red-500" : ""}>{log.path}</span>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">{log.method}</Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant={log.statusCode >= 400 ? "destructive" : "secondary"} className="text-[10px]">
                          {log.statusCode}
                        </Badge>
                      </td>
                      <td className="p-2 max-w-[250px] truncate">
                        {log.reason || "—"}
                      </td>
                      <td className="p-2 text-muted-foreground max-w-[150px] truncate">
                        {log.userAgent ? log.userAgent.slice(0, 50) : "—"}
                      </td>
                      <td className="p-2 text-muted-foreground max-w-[120px] truncate">
                        {log.referer || "—"}
                      </td>
                      <td className="p-2 text-center">
                        {log.blocked ? (
                          <Badge className="text-red-500 bg-red-500/10 text-[10px]">{l("محظور", "Blocked")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">{l("مراقب", "Watched")}</Badge>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
