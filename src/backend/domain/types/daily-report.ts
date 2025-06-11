import type { CommentId, DailyReportId, ProjectId, TaskId, Timestamps, UserId } from './base'

// 日報ステータス
export type DailyReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

// タスク進捗
export type TaskProgress = {
  id: TaskId
  projectId: ProjectId
  description: string
  hoursSpent: number
  progress: number // 0-100の進捗率
}

// 日報
export type DailyReport = {
  id: DailyReportId
  userId: UserId
  date: Date
  tasks: TaskProgress[]
  challenges: string // 困ったこと・相談事項
  nextDayPlan: string // 明日の予定
  status: DailyReportStatus
  submittedAt?: Date
  approvedAt?: Date
  approvedBy?: UserId
  rejectedAt?: Date
  rejectedBy?: UserId
  feedback?: string // 承認者からのフィードバック
} & Timestamps

// コメント
export type Comment = {
  id: CommentId
  dailyReportId: DailyReportId
  userId: UserId
  content: string
  isRead: boolean
} & Timestamps

// 日報作成入力
export type CreateDailyReportInput = {
  userId: UserId
  date: Date
  tasks: Omit<TaskProgress, 'id'>[]
  challenges: string
  nextDayPlan: string
}

// 日報更新入力
export type UpdateDailyReportInput = {
  id: DailyReportId
  userId: UserId // 更新者（権限チェック用）
  tasks?: Omit<TaskProgress, 'id'>[]
  challenges?: string
  nextDayPlan?: string
}

// 日報提出入力
export type SubmitDailyReportInput = {
  id: DailyReportId
  userId: UserId // 提出者（権限チェック用）
}

// 日報承認入力
export type ApproveDailyReportInput = {
  id: DailyReportId
  approverId: UserId
  feedback?: string
}

// 日報差し戻し入力
export type RejectDailyReportInput = {
  id: DailyReportId
  rejectorId: UserId
  feedback: string // 差し戻し理由は必須
}

// コメント作成入力
export type CreateCommentInput = {
  dailyReportId: DailyReportId
  userId: UserId
  content: string
}

// 日報検索条件
export type DailyReportSearchCriteria = {
  userId?: UserId
  dateFrom?: Date
  dateTo?: Date
  status?: DailyReportStatus
  approverId?: UserId
  projectId?: ProjectId // タスクに含まれるプロジェクト
}

// 日報集計結果
export type DailyReportSummary = {
  userId: UserId
  dateFrom: Date
  dateTo: Date
  totalReports: number
  totalHours: number
  projectHours: Record<string, number> // ProjectId -> hours
  submittedCount: number
  approvedCount: number
  rejectedCount: number
  draftCount: number
}

// ビジネスルール: 作業時間の妥当性チェック
export const isValidWorkHours = (hours: number): boolean => {
  return hours >= 0 && hours <= 24
}

// ビジネスルール: 合計作業時間のチェック
export const isValidTotalWorkHours = (tasks: TaskProgress[]): boolean => {
  const totalHours = tasks.reduce((sum, task) => sum + task.hoursSpent, 0)
  return totalHours <= 24
}

// ビジネスルール: 進捗率の妥当性チェック
export const isValidProgress = (progress: number): boolean => {
  return progress >= 0 && progress <= 100
}

// ビジネスルール: 日報の編集可能チェック
export const canEditDailyReport = (report: DailyReport, userId: UserId): boolean => {
  // 本人のみ編集可能
  if (report.userId !== userId) return false
  // 承認済みは編集不可
  if (report.status === 'approved') return false
  return true
}

// ビジネスルール: 日報の提出可能チェック
export const canSubmitDailyReport = (report: DailyReport): boolean => {
  return report.status === 'draft' || report.status === 'rejected'
}

// ビジネスルール: 日報の承認可能チェック
export const canApproveDailyReport = (report: DailyReport): boolean => {
  return report.status === 'submitted'
}

// ビジネスルール: 日報の差し戻し可能チェック
export const canRejectDailyReport = (report: DailyReport): boolean => {
  return report.status === 'submitted'
}
