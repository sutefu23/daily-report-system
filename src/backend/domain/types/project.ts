import type { DepartmentId, ProjectId, Timestamps } from './base'

// プロジェクトステータス
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'suspended' | 'cancelled'

// プロジェクト
export type Project = {
  id: ProjectId
  name: string
  description?: string
  departmentId: DepartmentId
  status: ProjectStatus
  startDate: Date
  endDate?: Date
  isActive: boolean
} & Timestamps

// プロジェクト作成入力
export type CreateProjectInput = {
  name: string
  description?: string
  departmentId: DepartmentId
  startDate: Date
  endDate?: Date
}

// プロジェクト更新入力
export type UpdateProjectInput = {
  id: ProjectId
  name?: string
  description?: string
  departmentId?: DepartmentId
  status?: ProjectStatus
  startDate?: Date
  endDate?: Date
  isActive?: boolean
}

// プロジェクト検索条件
export type ProjectSearchCriteria = {
  name?: string
  departmentId?: DepartmentId
  status?: ProjectStatus
  isActive?: boolean
  startDateFrom?: Date
  startDateTo?: Date
  endDateFrom?: Date
  endDateTo?: Date
}

// プロジェクト期間チェック
export const isProjectActive = (project: Project, date: Date = new Date()): boolean => {
  if (!project.isActive || project.status !== 'active') return false
  
  const isAfterStart = date >= project.startDate
  const isBeforeEnd = !project.endDate || date <= project.endDate
  
  return isAfterStart && isBeforeEnd
}

// プロジェクト期間バリデーション
export const isValidProjectPeriod = (startDate: Date, endDate?: Date): boolean => {
  if (!endDate) return true
  return startDate <= endDate
}