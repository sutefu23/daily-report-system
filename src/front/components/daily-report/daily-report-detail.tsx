'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Edit, Send, Check, X, MessageSquare, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/shadcn/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/ui/card'
import { Badge } from '@/components/shadcn/ui/badge'
import { Textarea } from '@/components/shadcn/ui/textarea'
import { Label } from '@/components/shadcn/ui/label'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth'
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

interface DailyReportDetailProps {
  reportId: string
}

export function DailyReportDetail({ reportId }: DailyReportDetailProps) {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const [report, setReport] = useState<DailyReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [reportId])

  const fetchReport = async () => {
    try {
      const data = await apiClient.get<DailyReport>(`/daily-reports/${reportId}`)
      setReport(data)
      setFeedback(data.feedback || '')
    } catch (err: any) {
      setError(err.response?.data?.message || '日報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`/dashboard/daily-reports/${reportId}/edit`)
  }

  const handleSubmit = async () => {
    setIsProcessing(true)
    try {
      await apiClient.post(`/daily-reports/${reportId}/submit`)
      await fetchReport()
    } catch (err: any) {
      setError(err.response?.data?.message || '提出に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      await apiClient.post(`/daily-reports/${reportId}/approve`, { feedback })
      await fetchReport()
    } catch (err: any) {
      setError(err.response?.data?.message || '承認に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!feedback.trim()) {
      setError('差し戻し理由を入力してください')
      return
    }

    setIsProcessing(true)
    try {
      await apiClient.post(`/daily-reports/${reportId}/reject`, { feedback })
      await fetchReport()
    } catch (err: any) {
      setError(err.response?.data?.message || '差し戻しに失敗しました')
    } finally {
      setIsProcessing(false)
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
        <div className="text-destructive">{error || '日報が見つかりません'}</div>
      </div>
    )
  }

  const totalHours = report.tasks.reduce((sum, task) => sum + task.hoursSpent, 0)
  const statusInfo = statusConfig[report.status]
  const isOwner = user?.id === report.userId
  const isManager = user?.role === 'manager' || user?.role === 'admin'
  const canEdit = isOwner && (report.status === 'draft' || report.status === 'rejected')
  const canSubmit = isOwner && report.status === 'draft'
  const canApprove = isManager && report.status === 'submitted'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {format(new Date(report.date), 'yyyy年MM月dd日（E）', { locale: ja })}の日報
            </h2>
            <p className="text-muted-foreground">
              作成日時: {format(new Date(report.createdAt), 'yyyy/MM/dd HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant} className="text-base px-3 py-1">
            {statusInfo.label}
          </Badge>
          {canEdit && (
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              編集
            </Button>
          )}
        </div>
      </div>

      {report.status === 'rejected' && report.feedback && (
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">差し戻し理由</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{report.feedback}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>作業記録</CardTitle>
          <CardDescription>合計作業時間: {totalHours}時間</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.tasks.map((task, index) => (
            <div key={index} className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{task.projectName || `プロジェクト${index + 1}`}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium">{task.hoursSpent}時間</p>
                  <p className="text-sm text-muted-foreground">進捗: {task.progress}%</p>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>困ったこと・相談したいこと</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{report.challenges || '特になし'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>明日の予定</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{report.nextDayPlan}</p>
        </CardContent>
      </Card>

      {canSubmit && (
        <Card>
          <CardFooter className="justify-end pt-6">
            <Button onClick={handleSubmit} disabled={isProcessing}>
              <Send className="mr-2 h-4 w-4" />
              {isProcessing ? '提出中...' : '提出する'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {canApprove && (
        <Card>
          <CardHeader>
            <CardTitle>承認・差し戻し</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">フィードバック（任意）</Label>
              <Textarea
                id="feedback"
                placeholder="よくできています。この調子で頑張ってください。"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              <X className="mr-2 h-4 w-4" />
              差し戻し
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              <Check className="mr-2 h-4 w-4" />
              承認
            </Button>
          </CardFooter>
        </Card>
      )}

      {report.status === 'approved' && report.feedback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              フィードバック
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{report.feedback}</p>
            <p className="text-sm text-muted-foreground mt-2">
              承認日時:{' '}
              {report.approvedAt && format(new Date(report.approvedAt), 'yyyy/MM/dd HH:mm')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
