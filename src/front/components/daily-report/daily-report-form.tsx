'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/shadcn/ui/button'
import { Input } from '@/components/shadcn/ui/input'
import { Label } from '@/components/shadcn/ui/label'
import { Textarea } from '@/components/shadcn/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/ui/card'
import { apiClient } from '@/lib/api-client'
import type { CreateDailyReportInput, DailyReport } from '@/types/daily-report'

const taskSchema = z.object({
  projectId: z.string().min(1, 'プロジェクトを選択してください'),
  projectName: z.string().optional(),
  description: z.string().min(1, '作業内容を入力してください'),
  hoursSpent: z
    .number()
    .min(0.5, '0.5時間以上を入力してください')
    .max(24, '24時間以下を入力してください'),
  progress: z.number().min(0, '0以上を入力してください').max(100, '100以下を入力してください'),
})

const dailyReportSchema = z.object({
  date: z.string(),
  tasks: z.array(taskSchema).min(1, '少なくとも1つのタスクを入力してください'),
  challenges: z.string(),
  nextDayPlan: z.string().min(1, '明日の予定を入力してください'),
})

type DailyReportFormData = z.infer<typeof dailyReportSchema>

interface DailyReportFormProps {
  initialData?: DailyReport
  date?: Date
}

export function DailyReportForm({ initialData, date = new Date() }: DailyReportFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DailyReportFormData>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: initialData
      ? {
          date: initialData.date,
          tasks: initialData.tasks,
          challenges: initialData.challenges,
          nextDayPlan: initialData.nextDayPlan,
        }
      : {
          date: format(date, 'yyyy-MM-dd'),
          tasks: [
            {
              projectId: '',
              projectName: '',
              description: '',
              hoursSpent: 1,
              progress: 0,
            },
          ],
          challenges: '',
          nextDayPlan: '',
        },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tasks',
  })

  const watchTasks = watch('tasks')
  const totalHours = watchTasks?.reduce((sum, task) => sum + (task.hoursSpent || 0), 0) || 0

  const onSubmit = async (data: DailyReportFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      if (initialData) {
        await apiClient.put(`/daily-reports/${initialData.id}`, data)
      } else {
        await apiClient.post('/daily-reports', data)
      }
      router.push('/dashboard/daily-reports')
    } catch (err: any) {
      setError(err.response?.data?.message || '保存に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const onSaveDraft = async () => {
    const data = watch()
    setIsLoading(true)
    setError(null)

    try {
      if (initialData) {
        await apiClient.put(`/daily-reports/${initialData.id}`, { ...data, status: 'draft' })
      } else {
        await apiClient.post('/daily-reports', { ...data, status: 'draft' })
      }
      router.push('/dashboard/daily-reports')
    } catch (err: any) {
      setError(err.response?.data?.message || '下書き保存に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>
            {format(new Date(watch('date')), 'yyyy年MM月dd日（E）', { locale: ja })}の日報
          </CardTitle>
          <CardDescription>本日の作業内容を記録してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>作業記録</Label>
              <span className="text-sm text-muted-foreground">合計作業時間: {totalHours}時間</span>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`tasks.${index}.projectName`}>プロジェクト名</Label>
                        <Input
                          id={`tasks.${index}.projectName`}
                          placeholder="プロジェクトA"
                          {...register(`tasks.${index}.projectName`)}
                          disabled={isLoading}
                        />
                        <input
                          type="hidden"
                          {...register(`tasks.${index}.projectId`)}
                          value={`project-${index}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor={`tasks.${index}.hoursSpent`}>作業時間</Label>
                          <Input
                            id={`tasks.${index}.hoursSpent`}
                            type="number"
                            step="0.5"
                            placeholder="1.5"
                            {...register(`tasks.${index}.hoursSpent`, { valueAsNumber: true })}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`tasks.${index}.progress`}>進捗率(%)</Label>
                          <Input
                            id={`tasks.${index}.progress`}
                            type="number"
                            min="0"
                            max="100"
                            placeholder="50"
                            {...register(`tasks.${index}.progress`, { valueAsNumber: true })}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`tasks.${index}.description`}>作業内容</Label>
                      <Textarea
                        id={`tasks.${index}.description`}
                        placeholder="実装した機能や対応した内容を記載してください"
                        rows={3}
                        {...register(`tasks.${index}.description`)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={isLoading}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {errors.tasks?.[index] && (
                  <div className="text-sm text-destructive space-y-1">
                    {errors.tasks[index]?.projectName && (
                      <p>{errors.tasks[index]?.projectName?.message}</p>
                    )}
                    {errors.tasks[index]?.description && (
                      <p>{errors.tasks[index]?.description?.message}</p>
                    )}
                    {errors.tasks[index]?.hoursSpent && (
                      <p>{errors.tasks[index]?.hoursSpent?.message}</p>
                    )}
                    {errors.tasks[index]?.progress && (
                      <p>{errors.tasks[index]?.progress?.message}</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  projectId: '',
                  projectName: '',
                  description: '',
                  hoursSpent: 1,
                  progress: 0,
                })
              }
              disabled={isLoading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              作業記録を追加
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenges">困ったこと・相談したいこと</Label>
            <Textarea
              id="challenges"
              placeholder="本日の業務で困ったことや、相談したいことがあれば記載してください"
              rows={4}
              {...register('challenges')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextDayPlan">明日の予定</Label>
            <Textarea
              id="nextDayPlan"
              placeholder="明日予定している作業内容を記載してください"
              rows={4}
              {...register('nextDayPlan')}
              disabled={isLoading}
            />
            {errors.nextDayPlan && (
              <p className="text-sm text-destructive">{errors.nextDayPlan.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <div className="space-x-2">
            <Button type="button" variant="secondary" onClick={onSaveDraft} disabled={isLoading}>
              下書き保存
            </Button>
            <Button type="submit" disabled={isLoading || totalHours > 24}>
              {isLoading ? '保存中...' : '提出'}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
