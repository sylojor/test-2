"use client"

import { useState, useEffect } from "react"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n-config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, Sparkles, RefreshCw } from "lucide-react"
import type { ICompany, IEmployee, IDepartment } from "@/types"

interface EmployeeRequest {
  id: string
  employeeId: string
  type: string
  title: string
  description?: string | null
  priority: number
  status: string
  response?: string | null
  respondedBy?: string | null
  createdAt: string
  employee?: {
    id: string
    name: string
    role: string
    avatarColor: string
    specialization?: string
  }
}

interface RequestsPanelProps {
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  onRespond?: (requestId: string, approved: boolean, response: string) => void
}

export function RequestsPanel({ company, employees, departments, onRespond }: RequestsPanelProps) {
  const { language } = useLocale()
  const [requests, setRequests] = useState<EmployeeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null)
  const [responseText, setResponseText] = useState<Record<string, string>>({})

  useEffect(() => {
    if (company?.id) fetchRequests()
  }, [company?.id])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employee-requests?companyId=${company?.id}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error)
    }
    setLoading(false)
  }

  const handleAutoAssign = async (requestId: string) => {
    setAutoAssigning(requestId)
    try {
      const res = await fetch("/api/employee-requests/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company?.id, requestId }),
      })
      if (res.ok) {
        const data = await res.json()
        await fetchRequests()
      }
    } catch (error) {
      console.error("Auto-assign failed:", error)
    }
    setAutoAssigning(null)
  }

  const handleRespond = async (requestId: string, approved: boolean) => {
    const response = responseText[requestId] || ""
    if (onRespond) {
      onRespond(requestId, approved, response)
    } else {
      try {
        await fetch(`/api/employee-requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: approved ? "APPROVED" : "REJECTED",
            response,
            respondedBy: "MANAGER",
          }),
        })
        await fetchRequests()
      } catch (error) {
        console.error("Failed to respond:", error)
      }
    }
    setResponseText(prev => ({ ...prev, [requestId]: "" }))
  }

  const pendingRequests = requests.filter(r => r.status === "PENDING")
  const resolvedRequests = requests.filter(r => r.status !== "PENDING").slice(0, 10)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-orange-100 text-orange-800 border-orange-200"
      case "APPROVED": return "bg-green-100 text-green-800 border-green-200"
      case "REJECTED": return "bg-red-100 text-red-800 border-red-200"
      case "CANCELLED": return "bg-gray-100 text-gray-800 border-gray-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "INFORMATION": return "bg-blue-100 text-blue-800"
      case "FILE": return "bg-purple-100 text-purple-800"
      case "APPROVAL": return "bg-yellow-100 text-yellow-800"
      case "CLARIFICATION": return "bg-cyan-100 text-cyan-800"
      case "RESOURCE": return "bg-emerald-100 text-emerald-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const isAutoProcessed = (r: EmployeeRequest) => 
    r.respondedBy === "AUTO_ASSIGNED" || (r.response && r.response.startsWith("[تلقائي"))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{language === "ar" ? "الطلبات" : "Requests"}</h2>
        <Button variant="outline" size="sm" onClick={fetchRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {language === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {/* Auto-Assignment Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{language === "ar" ? "التعيين التلقائي حسب التخصص" : "Auto-Assignment by Specialization"}</p>
              <p className="text-sm text-muted-foreground">{language === "ar" ? "كل طلب يتم توجيهه تلقائياً للموظف المناسب حسب تخصصه" : "Each request is automatically routed to the right employee based on their specialization"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            {language === "ar" ? "طلبات قيد الانتظار" : "Pending Requests"} ({pendingRequests.length})
          </h3>
          {pendingRequests.map(req => (
            <Card key={req.id} className="border-orange-200 bg-orange-5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: req.employee?.avatarColor || "#6366f1", color: "white" }}>
                      {req.employee?.name?.charAt(0) || "?"}
                    </div>
                    {req.employee?.name}
                    <Badge variant="outline" className={getTypeColor(req.type)}>
                      {req.type}
                    </Badge>
                  </CardTitle>
                  <Badge className={getStatusColor(req.status)}>
                    {req.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{req.title}</p>
                  {req.description && <p className="text-sm text-muted-foreground mt-1">{req.description}</p>}
                </div>
                
                {/* Matching employees info */}
                {req.employee?.specialization && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>{language === "ar" ? "التخصص" : "Specialization"}: {req.employee.specialization}</span>
                  </div>
                )}

                {/* Auto-Assign Button */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAutoAssign(req.id)}
                    disabled={autoAssigning === req.id}
                    className="flex items-center gap-1"
                  >
                    {autoAssigning === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {language === "ar" ? "تعيين تلقائي" : "Auto-Assign"}
                  </Button>
                </div>

                {/* Manual response area */}
                <textarea
                  value={responseText[req.id] || ""}
                  onChange={(e) => setResponseText(prev => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder={language === "ar" ? "اكتب ردك هنا..." : "Type your response here..."}
                  className="w-full bg-background border border-border rounded-lg p-3 text-sm resize-none h-20"
                  dir={language === "ar" ? "rtl" : "ltr"}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleRespond(req.id, true)} className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {language === "ar" ? "قبول" : "Approve"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRespond(req.id, false)}>
                    <XCircle className="h-4 w-4 mr-1" />
                    {language === "ar" ? "رفض" : "Reject"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pendingRequests.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{language === "ar" ? "لا توجد طلبات قيد الانتظار" : "No pending requests"}</p>
          </CardContent>
        </Card>
      )}

      {/* Resolved Requests */}
      {resolvedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {language === "ar" ? "طلبات تمت" : "Resolved"} ({resolvedRequests.length})
          </h3>
          {resolvedRequests.map(req => (
            <Card key={req.id} className="opacity-80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: req.employee?.avatarColor || "#6366f1", color: "white" }}>
                      {req.employee?.name?.charAt(0) || "?"}
                    </div>
                    <span className="font-medium">{req.employee?.name}</span>
                    <Badge variant="outline" className={getTypeColor(req.type)}>{req.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAutoProcessed(req) && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {language === "ar" ? "تلقائي" : "Auto"}
                      </Badge>
                    )}
                    <Badge className={getStatusColor(req.status)}>{req.status}</Badge>
                  </div>
                </div>
                <p className="text-sm">{req.title}</p>
                {req.response && (
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                    {req.response}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
