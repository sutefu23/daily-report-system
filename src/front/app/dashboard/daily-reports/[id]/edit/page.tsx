"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DailyReportForm } from "@/components/daily-report/daily-report-form"
import { apiClient } from "@/lib/api-client"
import type { DailyReport } from "@/types/daily-report"

export default function EditDailyReportPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [report, setReport] = useState<DailyReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReport()
  }, [params.id])

  const fetchReport = async () => {
    try {
      const data = await apiClient.get<DailyReport>(`/daily-reports/${params.id}`)
      if (data.status !== 'draft' && data.status !== 'rejected') {
        router.push(`/dashboard/daily-reports/${params.id}`)
        return
      }
      setReport(data)
    } catch (err: any) {
      setError(err.response?.data?.message || "日報の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{error || "日報が見つかりません"}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">日報編集</h2>
        <p className="text-muted-foreground">
          日報の内容を編集してください
        </p>
      </div>
      <DailyReportForm initialData={report} />
    </div>
  )
}