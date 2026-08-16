"use client"

// ============================================
// Platform Logs Admin Panel
// Shows ALL platform activity: login, uploads, errors, 
// blog actions, security events, settings changes, etc.
// ============================================

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  ScrollText, Activity, AlertTriangle, Loader2, Search, RefreshCw,
  Eye, Clock, User, Globe, CheckCircle, XCircle, Filter, Download
} from "lucide-react"

interface ActivityLog {
  id: string
  action: string
  userId: string | null
  userEmail: string | null
  userRole: string | null
  ip: string | null
  details: string | null
  statusCode: number
  path: string | null
  method: string | null
  userAgent: string | null
  success: boolean
  error: string | null
  createdAt: string
}

interface LogStats {
  todayLogs: number
  todayErrors: number
  loginCount: number
  uploadCount: number
}

export function PlatformLogs({ lang }: { lang: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState("all")
  const [filterSuccess, setFilterSuccess] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const l = (ar: string, en: string) => lang === "ar" ? ar : en

  const loadData = useCallback(async () => {
    try {
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => { const [key, ...v] = c.split("="); return [key, v.join("=")] }))
      const token = cookies.oec_token || ""

      const params = new URLSearchParams({
        action: filterAction !== "all" ? filterAction : "",
        success: filterSuccess !== "all" ? filterSuccess : "",
        search,
        limit: "100",
        page: page.toString(),
      })

      const res = await fetch(`/api/admin/activity?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotal(data.total || 0)
        setStats(data.stats || null)
      } else {
        toast.error(l("فشل تحميل السجلات", "Failed to load logs"))
      }
    } catch {
      toast.error(l("خطأ في الاتصال", "Connection error"))
    }
    setLoading(false)
  }, [filterAction, filterSuccess, search, page, lang])

  useEffect(() => { loadData() }, [loadData])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
  }

  // Action type translations and icons
  const getActionInfo = (action: string) => {
    const actionMap: Record<string, { ar: string; en: string; color: string }> = {
      login: { ar: "تسجيل دخول", en: "Login", color: "text-green-500" },
      login_failed: { ar: "فشل دخول", en: "Login Failed", color: "text-red-500" },
      logout: { ar: "تسجيل خروج", en: "Logout", color: "text-muted-foreground" },
      register: { ar: "تسجيل جديد", en: "Register", color: "text-blue-500" },
      upload_logo: { ar: "رفع لوجو", en: "Upload Logo", color: "text-purple-500" },
      upload_favicon: { ar: "رفع فايفكون", en: "Upload Favicon", color: "text-purple-500" },
      upload_blog_image: { ar: "رفع صورة مدونة", en: "Upload Blog Image", color: "text-purple-500" },
      create_blog: { ar: "إنشاء مقال", en: "Create Blog", color: "text-blue-500" },
      update_blog: { ar: "تحديث مقال", en: "Update Blog", color: "text-orange-500" },
      delete_blog: { ar: "حذف مقال", en: "Delete Blog", color: "text-red-500" },
      create_company: { ar: "إنشاء شركة", en: "Create Company", color: "text-blue-500" },
      create_employee: { ar: "إنشاء موظف", en: "Create Employee", color: "text-blue-500" },
      update_settings: { ar: "تحديث إعدادات", en: "Update Settings", color: "text-orange-500" },
      update_llm: { ar: "تحديث LLM", en: "Update LLM", color: "text-orange-500" },
      rebuild: { ar: "إعادة بناء", en: "Rebuild", color: "text-yellow-500" },
      block_ip: { ar: "حظر IP", en: "Block IP", color: "text-red-500" },
      unblock_ip: { ar: "فك حظر IP", en: "Unblock IP", color: "text-green-500" },
      auto_block_ip: { ar: "حظر تلقائي IP", en: "Auto-block IP", color: "text-red-500" },
      create_department: { ar: "إنشاء قسم", en: "Create Department", color: "text-blue-500" },
      create_project: { ar: "إنشاء مشروع", en: "Create Project", color: "text-blue-500" },
      api_error: { ar: "خطأ API", en: "API Error", color: "text-red-500" },
    }
    return actionMap[action] || { ar: action, en: action, color: "text-muted-foreground" }
  }

  const exportLogs = () => {
    const csv = [
      ["Date", "Action", "User", "IP", "Path", "Method", "Status", "Success", "Details", "Error"].join(","),
      ...logs.map(log => [
        log.createdAt,
        log.action,
        log.userEmail || "",
        log.ip || "",
        log.path || "",
        log.method || "",
        log.statusCode,
        log.success ? "Yes" : "No",
        log.details || "",
        log.error || "",
      ].map(v => `"${v}"`).join(","))
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `blivoai-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <Activity className="w-4 h-4 text-brand mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{l("سجلات اليوم", "Today Logs")}</p>
              <p className="text-lg font-bold">{stats.todayLogs}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{l("أخطاء اليوم", "Today Errors")}</p>
              <p className="text-lg font-bold">{stats.todayErrors}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <User className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{l("دخول اليوم", "Today Logins")}</p>
              <p className="text-lg font-bold">{stats.loginCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <Download className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{l("رفع اليوم", "Today Uploads")}</p>
              <p className="text-lg font-bold">{stats.uploadCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[160px] bg-muted/30 border-border">
            <SelectValue placeholder={l("نوع الإجراء", "Action Type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{l("الكل", "All")}</SelectItem>
            <SelectItem value="login">{l("دخول", "Login")}</SelectItem>
            <SelectItem value="login_failed">{l("فشل دخول", "Login Failed")}</SelectItem>
            <SelectItem value="register">{l("تسجيل", "Register")}</SelectItem>
            <SelectItem value="upload_logo">{l("رفع لوجو", "Upload Logo")}</SelectItem>
            <SelectItem value="upload_favicon">{l("رفع فايفكون", "Upload Favicon")}</SelectItem>
            <SelectItem value="create_blog">{l("إنشاء مقال", "Create Blog")}</SelectItem>
            <SelectItem value="update_blog">{l("تحديث مقال", "Update Blog")}</SelectItem>
            <SelectItem value="delete_blog">{l("حذف مقال", "Delete Blog")}</SelectItem>
            <SelectItem value="update_settings">{l("إعدادات", "Settings")}</SelectItem>
            <SelectItem value="update_llm">{l("LLM", "LLM")}</SelectItem>
            <SelectItem value="rebuild">{l("إعادة بناء", "Rebuild")}</SelectItem>
            <SelectItem value="block_ip">{l("حظر IP", "Block IP")}</SelectItem>
            <SelectItem value="unblock_ip">{l("فك حظر", "Unblock")}</SelectItem>
            <SelectItem value="auto_block_ip">{l("حظر تلقائي", "Auto-block")}</SelectItem>
            <SelectItem value="api_error">{l("خطأ API", "API Error")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSuccess} onValueChange={setFilterSuccess}>
          <SelectTrigger className="w-[120px] bg-muted/30 border-border">
            <SelectValue placeholder={l("الحالة", "Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{l("الكل", "All")}</SelectItem>
            <SelectItem value="true">{l("نجاح", "Success")}</SelectItem>
            <SelectItem value="false">{l("فشل", "Failed")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 relative">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={l("بحث في السجلات...", "Search logs...")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 bg-muted/30 border-border"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="sm" onClick={exportLogs}>
          <Download className="w-3 h-3 mr-1" />
          {l("تصدير CSV", "Export CSV")}
        </Button>
      </div>

      {/* Total count */}
      <p className="text-xs text-muted-foreground">
        {l(`${total} سجل — صفحة ${page}`, `${total} logs — page ${page}`)}
      </p>

      {/* Logs Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left text-muted-foreground">{l("التاريخ", "Date")}</th>
                  <th className="p-2 text-left text-muted-foreground">{l("الإجراء", "Action")}</th>
                  <th className="p-2 text-left text-muted-foreground">{l("المستخدم", "User")}</th>
                  <th className="p-2 text-left text-muted-foreground">{l("IP", "IP")}</th>
                  <th className="p-2 text-left text-muted-foreground">{l("المسار", "Path")}</th>
                  <th className="p-2 text-left text-muted-foreground">{l("الطريقة", "Method")}</th>
                  <th className="p-2 text-left text-muted-foreground">{l("الحالة", "Status")}</th>
                  <th className="p-2 text-left text-muted-foreground">{l("نجاح؟", "Success?")}</th>
                  <th className="p-2 text-left text-muted-foreground">{l("التفاصيل", "Details")}</th>
                  <th className="p-2 text-left text-muted-foreground">{l("خطأ", "Error")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-4 text-center text-muted-foreground">
                      {l("لا سجلات", "No logs found")}
                    </td>
                  </tr>
                )}
                {logs.map(log => {
                  const actionInfo = getActionInfo(log.action)
                  return (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/10">
                      <td className="p-2 text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-2">
                        <span className={`font-semibold ${actionInfo.color}`}>
                          {l(actionInfo.ar, actionInfo.en)}
                        </span>
                      </td>
                      <td className="p-2 text-muted-foreground max-w-[150px] truncate">
                        {log.userEmail || (log.userRole || "—")}
                      </td>
                      <td className="p-2 font-mono">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-muted-foreground" />
                          {log.ip || "—"}
                        </div>
                      </td>
                      <td className="p-2 font-mono text-muted-foreground max-w-[150px] truncate">
                        {log.path || "—"}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">{log.method || "—"}</Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant={log.statusCode >= 400 ? "destructive" : "secondary"} className="text-[10px]">
                          {log.statusCode}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        {log.success ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground max-w-[200px] truncate">
                        {log.details || "—"}
                      </td>
                      <td className="p-2 text-red-500 max-w-[200px] truncate">
                        {log.error || "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 100 && (
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
            {l("السابق", "Previous")}
          </Button>
          <span className="text-xs text-muted-foreground py-1">
            {l(`صفحة ${page}`, `Page ${page}`)}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page * 100 >= total}>
            {l("التالي", "Next")}
          </Button>
        </div>
      )}
    </div>
  )
}
