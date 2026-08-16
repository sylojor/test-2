// ============================================
// لوحة إدارة المستخدمين
// عرض جميع المستخدمين + حذف
// ============================================

"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  UserCog,
  Trash2,
  RefreshCw,
  Users,
  Shield,
  Mail,
  Building2,
  AlertTriangle,
  Search,
} from "lucide-react"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  companyId: string | null
  createdAt: string
  updatedAt: string
  company: { id: string; name: string; subscription: string } | null
  ownedCompany: { id: string; name: string; subscription: string } | null
}

export function UsersPanel() {
  const language = useLocale()
  const isArabic = language === "ar"

  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/users")
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError(isArabic ? "ليس لديك صلاحية للوصول" : "Access denied")
          return
        }
        throw new Error("Failed to fetch")
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      setError(isArabic ? "حدث خطأ أثناء جلب المستخدمين" : "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }, [isArabic])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDelete = async (userId: string) => {
    setDeleting(userId)
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || (isArabic ? "حدث خطأ" : "An error occurred"))
        return
      }
      setSuccess(data.message || (isArabic ? "تم الحذف بنجاح" : "User deleted successfully"))
      setConfirmDelete(null)
      fetchUsers()
    } catch {
      setError(isArabic ? "حدث خطأ أثناء الحذف" : "Failed to delete user")
    } finally {
      setDeleting(null)
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "OWNER": return "bg-purple-100 text-purple-700 dark:bg-purple-600/20 dark:text-purple-400 border-purple-300 dark:border-purple-800/30"
      case "ADMIN": return "bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-400 border-blue-300 dark:border-blue-800/30"
      case "VIEWER": return "bg-gray-100 text-gray-700 dark:bg-gray-600/20 dark:text-gray-400 border-gray-300 dark:border-gray-800/30"
      default: return ""
    }
  }

  const subscriptionColor = (sub: string) => {
    switch (sub) {
      case "ENTERPRISE": return "text-yellow-600 dark:text-yellow-400"
      case "PROFESSIONAL": return "text-emerald-600 dark:text-emerald-400"
      case "STARTER": return "text-blue-600 dark:text-blue-400"
      default: return "text-muted-foreground"
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(
        isArabic ? "ar-EG" : "en-US",
        { year: "numeric", month: "short", day: "numeric" }
      )
    } catch {
      return dateStr
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto overflow-x-hidden">
      {/* === Header === */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            {isArabic ? "إدارة المستخدمين" : "User Management"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isArabic ? "عرض وإدارة جميع حسابات المستخدمين" : "View and manage all user accounts"}
          </p>
        </div>
        <Button
          onClick={fetchUsers}
          disabled={loading}
          variant="outline"
          className="min-h-[44px] border-border"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="text-xs">{isArabic ? "تحديث" : "Refresh"}</span>
        </Button>
      </div>

      {/* === Stats === */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? "مستخدمين" : "Users"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <Shield className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold text-foreground">{users.filter(u => u.role === "OWNER").length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? "مالكين" : "Owners"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <Building2 className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold text-foreground">{users.filter(u => u.companyId || u.ownedCompany).length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? "لديهم شركة" : "Has Company"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <Mail className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold text-foreground">{new Set(users.map(u => u.email.split("@")[1])).size}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? "نطاقات" : "Domains"}</p>
          </CardContent>
        </Card>
      </div>

      {/* === Alerts === */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 text-red-600 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 text-emerald-600 dark:text-emerald-400 text-sm">
          <Shield className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* === Search === */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={isArabic ? "ابحث بالاسم أو الإيميل..." : "Search by name or email..."}
          className="w-full h-11 pr-10 pl-4 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* === Users List === */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            {isArabic ? "قائمة المستخدمين" : "Users List"}
            <Badge variant="secondary" className="text-xs mr-auto">{filteredUsers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? (isArabic ? "لا يوجد نتائج للبحث" : "No search results")
                  : (isArabic ? "لا يوجد مستخدمين" : "No users found")
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                <div className="col-span-3">{isArabic ? "المستخدم" : "User"}</div>
                <div className="col-span-3">{isArabic ? "الإيميل" : "Email"}</div>
                <div className="col-span-1">{isArabic ? "الدور" : "Role"}</div>
                <div className="col-span-2">{isArabic ? "الشركة" : "Company"}</div>
                <div className="col-span-1">{isArabic ? "الخطة" : "Plan"}</div>
                <div className="col-span-1">{isArabic ? "التاريخ" : "Date"}</div>
                <div className="col-span-1"></div>
              </div>

              {filteredUsers.map(user => {
                const companyInfo = user.ownedCompany || user.company
                const isConfirming = confirmDelete === user.id

                return (
                  <div
                    key={user.id}
                    className={`rounded-lg border transition-all ${
                      isConfirming
                        ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10"
                        : "border-border bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    {/* Desktop Row */}
                    <div className="hidden sm:grid grid-cols-12 gap-2 items-center px-3 py-3">
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3F4A69] to-emerald-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground text-sm font-medium truncate">{user.name}</p>
                          <p className="text-muted-foreground text-[10px]">{user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="text-foreground text-sm truncate">{user.email}</p>
                      </div>
                      <div className="col-span-1">
                        <Badge variant="secondary" className={`text-[10px] ${roleBadgeColor(user.role)}`}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="col-span-2 min-w-0">
                        {companyInfo ? (
                          <p className="text-foreground text-sm truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            {companyInfo.name}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {isArabic ? "—" : "—"}
                          </span>
                        )}
                      </div>
                      <div className="col-span-1">
                        {companyInfo && (
                          <span className={`text-xs font-medium ${subscriptionColor(companyInfo.subscription)}`}>
                            {companyInfo.subscription}
                          </span>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span className="text-muted-foreground text-xs">{formatDate(user.createdAt)}</span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-[10px] px-2"
                              onClick={() => handleDelete(user.id)}
                              disabled={deleting === user.id}
                            >
                              {deleting === user.id
                                ? (isArabic ? "جاري..." : "...")
                                : (isArabic ? "تأكيد" : "Confirm")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 border-border"
                              onClick={() => setConfirmDelete(null)}
                            >
                              {isArabic ? "إلغاء" : "Cancel"}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setConfirmDelete(user.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="sm:hidden p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3F4A69] to-emerald-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground text-sm font-medium truncate">{user.name}</p>
                            <p className="text-muted-foreground text-xs truncate">{user.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={`text-[10px] flex-shrink-0 ${roleBadgeColor(user.role)}`}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          {companyInfo && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{companyInfo.name}
                            </span>
                          )}
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-[10px] px-2"
                              onClick={() => handleDelete(user.id)}
                              disabled={deleting === user.id}
                            >
                              {isArabic ? "تأكيد" : "Confirm"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 border-border"
                              onClick={() => setConfirmDelete(null)}
                            >
                              {isArabic ? "إلغاء" : "Cancel"}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setConfirmDelete(user.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
