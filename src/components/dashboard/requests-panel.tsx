// ============================================
// لوحة طلبات الموظفين (Employee Requests)
// المدير يرد على طلبات الموظفين (معلومات، ملفات، موافقات)
// ============================================

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { getRequestTypeDisplay, getRequestStatusDisplay } from "@/lib/employee-generator"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"

interface RequestItem {
  id: string
  employeeId: string
  type: string
  title: string
  description: string
  priority: number
  status: string
  response?: string | null
  respondedAt?: string | null
  employee: { id: string; name: string; role: string; avatarColor?: string }
  createdAt: string
}

interface RequestsPanelProps {
  onRespond: (requestId: string, approved: boolean, response?: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
}

const TYPE_COLORS: Record<string, string> = {
  INFORMATION: "bg-blue-100 text-blue-800",
  FILE: "bg-purple-100 text-purple-800",
  APPROVAL: "bg-yellow-100 text-yellow-800",
  CLARIFICATION: "bg-cyan-100 text-cyan-800",
  RESOURCE: "bg-emerald-100 text-emerald-800",
}

export function RequestsPanel({ onRespond }: RequestsPanelProps) {
  const language = useLocale()
  
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    try {
      // بالـ MVP بنستخدم أول شركة
      const companyRes = await fetch("/api/companies/me")
      if (companyRes.ok) {
        const companyData = await companyRes.json()
        const res = await fetch(`/api/employee-requests?companyId=${companyData.company?.id}`)
        if (res.ok) {
          const data = await res.json()
          setRequests(data.requests || [])
        }
      }
    } catch {
      // مشكلة بالتحميل — مش مشكلة
    } finally {
      setLoading(false)
    }
  }

  const pendingRequests = requests.filter(r => r.status === "PENDING")
  const resolvedRequests = requests.filter(r => r.status !== "PENDING")

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl">
        <p className="text-muted-foreground">{t("common.loading", language)}</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("requests.title", language)}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("requests.subtitle", language)}
        </p>
      </div>

      {pendingRequests.length === 0 && resolvedRequests.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-lg mb-2">📩</p>
            <p className="text-muted-foreground">{t("requests.noRequests", language)}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* الطلبات المعلقة */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("requests.pending", language)} ({pendingRequests.length})
              </h2>
              {pendingRequests.map((req) => (
                <Card key={req.id} className="border-border border-r-4 border-r-orange-500">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-foreground font-medium">{req.title}</h3>
                          <Badge variant="secondary" className={`text-[10px] ${TYPE_COLORS[req.type] || ""}`}>
                            {getRequestTypeDisplay(req.type)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {req.employee.name} • {req.employee.role}
                        </p>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[req.status] || ""}`}>
                        {getRequestStatusDisplay(req.status)}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground text-sm">{req.description}</p>

                    {/* الرد */}
                    <div className="space-y-3 pt-2 border-t border-border">
                      <Textarea
                        value={responses[req.id] ?? ""}
                        onChange={(e) => setResponses(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="..."
                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[60px] text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => {
                            onRespond(req.id, true, responses[req.id])
                            toast.success(t("common.success", language))
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm min-h-[44px]"
                        >
                          {t("requests.sendResponse", language)}
                        </Button>
                        <Button
                          onClick={() => {
                            onRespond(req.id, false, responses[req.id])
                            toast.success(t("common.success", language))
                          }}
                          variant="outline"
                          className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm min-h-[44px]"
                        >
                          {t("requests.reject", language)}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* الطلبات المنتهية */}
          {resolvedRequests.length > 0 && (
            <div className="space-y-4 mt-8">
              <h2 className="text-lg font-semibold text-muted-foreground">
                {t("requests.responded", language)} ({resolvedRequests.length})
              </h2>
              {resolvedRequests.slice(0, 10).map((req) => (
                <Card key={req.id} className="border-border bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">{req.title}</p>
                        <p className="text-muted-foreground text-xs">{req.employee.name}</p>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[req.status] || ""}`}>
                        {getRequestStatusDisplay(req.status)}
                      </Badge>
                    </div>
                    {req.response && (
                      <p className="text-muted-foreground text-xs mt-2 bg-muted/50 p-2 rounded">
                        {req.response}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
