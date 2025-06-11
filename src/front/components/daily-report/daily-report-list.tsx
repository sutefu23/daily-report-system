'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Plus, ChevronRight, Calendar, Clock, FileText } from 'lucide-react'
import { Button } from '@/components/shadcn/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/ui/card'
import { Badge } from '@/components/shadcn/ui/badge'
import { apiClient } from '@/lib/api-client'
import type { DailyReport, DailyReportStatus } from '@/types/daily-report'

const statusConfig: Record<
  DailyReportStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: '下書き', variant: 'secondary' },
  submitted: { label: '提出済み', variant: 'default' },
  approved: { label: '承認済み', variant: 'outline' },
  rejected: { label: '差し戻し', variant: 'destructive' },
}

export function DailyReportList() {
  const router = useRouter()
  const [reports, setReports] = useState<DailyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const data = await apiClient.get<DailyReport[]>('/daily-reports')
      setReports(data)
    } catch (err: any) {
      setError(err.response?.data?.message || '日報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNew = () => {
    router.push('/dashboard/daily-reports/new')
  }

  const handleReportClick = (reportId: string) => {
    router.push(`/dashboard/daily-reports/${reportId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">日報一覧</h2>
          <p className="text-muted-foreground">これまでに作成した日報を確認できます</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card className="flex flex-col items-center justify-center h-64">
          <CardContent className="text-center space-y-4 pt-6">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium">日報がありません</p>
              <p className="text-sm text-muted-foreground">最初の日報を作成してみましょう</p>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              日報を作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => {
            const totalHours = report.tasks.reduce((sum, task) => sum + task.hoursSpent, 0)
            const statusInfo = statusConfig[report.status]

            return (
              <Card
                key={report.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleReportClick(report.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {format(new Date(report.date), 'yyyy年MM月dd日（E）', { locale: ja })}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.createdAt), 'MM/dd HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {totalHours}時間
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <p className="font-medium text-muted-foreground">作業内容:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {report.tasks.slice(0, 2).map((task, index) => (
                          <li key={index} className="text-sm line-clamp-1">
                            {task.projectName || 'プロジェクト'}: {task.description}
                          </li>
                        ))}
                        {report.tasks.length > 2 && (
                          <li className="text-sm text-muted-foreground">
                            他{report.tasks.length - 2}件
                          </li>
                        )}
                      </ul>
                    </div>
                    {report.feedback && report.status === 'rejected' && (
                      <div className="text-sm border-l-2 border-destructive pl-3 mt-3">
                        <p className="font-medium text-destructive">フィードバック:</p>
                        <p className="text-muted-foreground line-clamp-2">{report.feedback}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
