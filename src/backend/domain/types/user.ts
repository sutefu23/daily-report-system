import type { Brand, DepartmentId, Timestamps, UserId } from './base'

// ユーザーロール
export type UserRole = 'admin' | 'manager' | 'employee'

// ユーザー基本情報
export type User = {
  id: UserId
  email: string
  password?: string // パスワードハッシュ（取得時は含まない）
  name: string
  role: UserRole
  departmentId: DepartmentId
  managerId?: UserId // 上司のID（マネージャーの場合）
  isActive: boolean
  slackUserId?: string // Slack連携用
} & Timestamps

// ユーザー作成入力
export type CreateUserInput = {
  email: string
  password: string
  name: string
  role: UserRole
  departmentId: DepartmentId
  managerId?: UserId
  slackUserId?: string
}

// ユーザー更新入力
export type UpdateUserInput = {
  id: UserId
  email?: string
  name?: string
  role?: UserRole
  departmentId?: DepartmentId
  managerId?: UserId
  isActive?: boolean
  slackUserId?: string
}

// パスワード変更入力
export type ChangePasswordInput = {
  userId: UserId
  currentPassword: string
  newPassword: string
}

// ユーザー認証入力
export type AuthenticateUserInput = {
  email: string
  password: string
}

// ユーザー検索条件
export type UserSearchCriteria = {
  email?: string
  name?: string
  role?: UserRole
  departmentId?: DepartmentId
  managerId?: UserId
  isActive?: boolean
}

// ユーザー権限チェック
export const canManageDailyReports = (user: User): boolean => {
  return user.role === 'admin' || user.role === 'manager'
}

export const canManageUsers = (user: User): boolean => {
  return user.role === 'admin'
}

export const canApproveDailyReport = (user: User, reportUserId: UserId): boolean => {
  if (user.role === 'admin') return true
  if (user.role === 'manager') {
    // TODO: 部下の日報のみ承認可能にする場合はここでチェック
    return true
  }
  return false
}

// パスワード強度チェック
export const isStrongPassword = (password: string): boolean => {
  // 8文字以上、大文字・小文字・数字を含む
  const minLength = password.length >= 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  
  return minLength && hasUpperCase && hasLowerCase && hasNumber
}

// メールアドレスバリデーション
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}