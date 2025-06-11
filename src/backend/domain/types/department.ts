import type { DepartmentId, Timestamps } from './base'

// 部門
export type Department = {
  id: DepartmentId
  name: string
  description?: string
  isActive: boolean
} & Timestamps

// 部門作成入力
export type CreateDepartmentInput = {
  name: string
  description?: string
}

// 部門更新入力
export type UpdateDepartmentInput = {
  id: DepartmentId
  name?: string
  description?: string
  isActive?: boolean
}