export type DailyReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export type TaskProgress = {
  id?: string
  projectId: string
  projectName?: string
  description: string
  hoursSpent: number
  progress: number // 0-100の進捗率
}

export type DailyReport = {
  id: string
  userId: string
  date: string // ISO date string
  tasks: TaskProgress[]
  challenges: string
  nextDayPlan: string
  status: DailyReportStatus
  submittedAt?: string
  approvedAt?: string
  approvedBy?: string
  feedback?: string
  createdAt: string
  updatedAt: string
}

export type CreateDailyReportInput = {
  date: string
  tasks: TaskProgress[]
  challenges: string
  nextDayPlan: string
}

export type UpdateDailyReportInput = {
  id: string
  tasks?: TaskProgress[]
  challenges?: string
  nextDayPlan?: string
}