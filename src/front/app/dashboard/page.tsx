'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/ui/card'
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

type DashboardStats = {
  totalReports: number
  submittedReports: number
  approvedReports: number
  rejectedReports: number
  recentReports: Array<{
    id: string
    date: string
    status: string
  }>
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const data = await apiClient.get<DashboardStats>('/dashboard/stats')
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">こんにちは、{user?.name}さん</h2>
        <p className="text-muted-foreground">
          今日は{format(new Date(), 'yyyy年MM月dd日（E）', { locale: ja })}です
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総日報数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalReports || 0}</div>
              <p className="text-xs text-muted-foreground">作成した日報の総数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">提出済み</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.submittedReports || 0}</div>
              <p className="text-xs text-muted-foreground">承認待ちの日報</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">承認済み</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.approvedReports || 0}</div>
              <p className="text-xs text-muted-foreground">承認された日報</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">差し戻し</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.rejectedReports || 0}</div>
              <p className="text-xs text-muted-foreground">修正が必要な日報</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>最近の日報</CardTitle>
          <CardDescription>直近で作成・更新された日報</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentReports && stats.recentReports.length > 0 ? (
            <div className="space-y-2">
              {stats.recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(report.date), 'MM月dd日（E）', { locale: ja })}の日報
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">{report.status}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">まだ日報がありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
