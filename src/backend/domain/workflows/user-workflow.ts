import { ulid } from 'ulid'
import type { 
  AuthenticateUserInput,
  ChangePasswordInput,
  CreateUserInput, 
  UpdateUserInput, 
  User,
  UserSearchCriteria
} from '../types/user'
import type { Either } from '../types/base'
import { createUserId, left, right } from '../types/base'
import { 
  alreadyExists, 
  businessRuleViolation,
  forbidden,
  notFound, 
  unauthorized, 
  validationError,
  type DomainError 
} from '../errors'
import { isStrongPassword, isValidEmail } from '../types/user'

// リポジトリインターフェース
export type UserRepository = {
  findById: (id: string) => Promise<User | null>
  findByEmail: (email: string) => Promise<User | null>
  create: (user: User) => Promise<User>
  update: (user: User) => Promise<User>
  search: (criteria: UserSearchCriteria) => Promise<User[]>
  findSubordinates: (managerId: string) => Promise<User[]>
}

// パスワード暗号化インターフェース
export type PasswordHasher = {
  hash: (password: string) => Promise<string>
  verify: (password: string, hash: string) => Promise<boolean>
}

// ユーザー作成ワークフロー
export const createUserWorkflow = (
  userRepo: UserRepository,
  passwordHasher: PasswordHasher
) => async (
  input: CreateUserInput
): Promise<Either<DomainError, User>> => {
  // 1. 入力バリデーション
  if (!isValidEmail(input.email)) {
    return left(validationError('無効なメールアドレス形式です'))
  }

  if (!isStrongPassword(input.password)) {
    return left(validationError('パスワードは8文字以上で、大文字・小文字・数字を含む必要があります'))
  }

  if (input.name.trim().length === 0) {
    return left(validationError('名前は必須です'))
  }

  // 2. メールアドレスの重複チェック
  const existingUser = await userRepo.findByEmail(input.email)
  if (existingUser) {
    return left(alreadyExists('このメールアドレスは既に使用されています'))
  }

  // 3. マネージャーの存在確認（指定された場合）
  if (input.managerId) {
    const manager = await userRepo.findById(input.managerId)
    if (!manager) {
      return left(notFound('指定されたマネージャーが見つかりません'))
    }
    if (manager.role !== 'manager' && manager.role !== 'admin') {
      return left(businessRuleViolation('指定されたユーザーはマネージャー権限を持っていません'))
    }
  }

  // 4. パスワードのハッシュ化
  const passwordHash = await passwordHasher.hash(input.password)

  // 5. ユーザーエンティティの作成
  const now = new Date()
  const user: User = {
    id: createUserId(ulid()),
    email: input.email,
    password: passwordHash,
    name: input.name,
    role: input.role,
    departmentId: input.departmentId,
    managerId: input.managerId,
    isActive: true,
    slackUserId: input.slackUserId,
    createdAt: now,
    updatedAt: now
  }

  // 6. 保存
  const created = await userRepo.create(user)
  
  // パスワードを除外して返す
  const { password: _, ...userWithoutPassword } = created
  return right(userWithoutPassword as User)
}

// ユーザー更新ワークフロー
export const updateUserWorkflow = (
  userRepo: UserRepository
) => async (
  input: UpdateUserInput
): Promise<Either<DomainError, User>> => {
  // 1. 既存ユーザーの取得
  const user = await userRepo.findById(input.id)
  if (!user) {
    return left(notFound('ユーザーが見つかりません'))
  }

  // 2. メールアドレス変更時の重複チェック
  if (input.email && input.email !== user.email) {
    if (!isValidEmail(input.email)) {
      return left(validationError('無効なメールアドレス形式です'))
    }
    
    const existingUser = await userRepo.findByEmail(input.email)
    if (existingUser) {
      return left(alreadyExists('このメールアドレスは既に使用されています'))
    }
  }

  // 3. マネージャー変更時の確認
  if (input.managerId && input.managerId !== user.managerId) {
    const manager = await userRepo.findById(input.managerId)
    if (!manager) {
      return left(notFound('指定されたマネージャーが見つかりません'))
    }
    if (manager.role !== 'manager' && manager.role !== 'admin') {
      return left(businessRuleViolation('指定されたユーザーはマネージャー権限を持っていません'))
    }
  }

  // 4. 更新データの作成
  const updatedUser: User = {
    ...user,
    email: input.email ?? user.email,
    name: input.name ?? user.name,
    role: input.role ?? user.role,
    departmentId: input.departmentId ?? user.departmentId,
    managerId: input.managerId !== undefined ? input.managerId : user.managerId,
    isActive: input.isActive ?? user.isActive,
    slackUserId: input.slackUserId ?? user.slackUserId,
    updatedAt: new Date()
  }

  // 5. 保存
  const saved = await userRepo.update(updatedUser)
  
  // パスワードを除外して返す
  const { password: _, ...userWithoutPassword } = saved
  return right(userWithoutPassword as User)
}

// パスワード変更ワークフロー
export const changePasswordWorkflow = (
  userRepo: UserRepository,
  passwordHasher: PasswordHasher
) => async (
  input: ChangePasswordInput
): Promise<Either<DomainError, void>> => {
  // 1. ユーザーの取得
  const user = await userRepo.findById(input.userId)
  if (!user || !user.password) {
    return left(notFound('ユーザーが見つかりません'))
  }

  // 2. 現在のパスワードの検証
  const isValidCurrentPassword = await passwordHasher.verify(input.currentPassword, user.password)
  if (!isValidCurrentPassword) {
    return left(unauthorized('現在のパスワードが正しくありません'))
  }

  // 3. 新しいパスワードのバリデーション
  if (!isStrongPassword(input.newPassword)) {
    return left(validationError('パスワードは8文字以上で、大文字・小文字・数字を含む必要があります'))
  }

  // 4. 新しいパスワードのハッシュ化
  const newPasswordHash = await passwordHasher.hash(input.newPassword)

  // 5. 更新
  const updatedUser: User = {
    ...user,
    password: newPasswordHash,
    updatedAt: new Date()
  }

  await userRepo.update(updatedUser)
  return right(undefined)
}

// ユーザー認証ワークフロー
export const authenticateUserWorkflow = (
  userRepo: UserRepository,
  passwordHasher: PasswordHasher
) => async (
  input: AuthenticateUserInput
): Promise<Either<DomainError, User>> => {
  // 1. メールアドレスでユーザーを検索
  const user = await userRepo.findByEmail(input.email)
  if (!user || !user.password) {
    return left(unauthorized('メールアドレスまたはパスワードが正しくありません'))
  }

  // 2. アクティブチェック
  if (!user.isActive) {
    return left(forbidden('このアカウントは無効化されています'))
  }

  // 3. パスワードの検証
  const isValidPassword = await passwordHasher.verify(input.password, user.password)
  if (!isValidPassword) {
    return left(unauthorized('メールアドレスまたはパスワードが正しくありません'))
  }

  // 4. パスワードを除外して返す
  const { password: _, ...userWithoutPassword } = user
  return right(userWithoutPassword as User)
}

// ユーザー取得ワークフロー
export const getUserWorkflow = (
  userRepo: UserRepository
) => async (
  userId: string
): Promise<Either<DomainError, User>> => {
  const user = await userRepo.findById(userId)
  if (!user) {
    return left(notFound('ユーザーが見つかりません'))
  }

  // パスワードを除外して返す
  const { password: _, ...userWithoutPassword } = user
  return right(userWithoutPassword as User)
}

// 部下一覧取得ワークフロー
export const getSubordinatesWorkflow = (
  userRepo: UserRepository
) => async (
  managerId: string
): Promise<Either<DomainError, User[]>> => {
  // 1. マネージャーの存在確認
  const manager = await userRepo.findById(managerId)
  if (!manager) {
    return left(notFound('マネージャーが見つかりません'))
  }

  // 2. 権限チェック
  if (manager.role !== 'manager' && manager.role !== 'admin') {
    return left(forbidden('部下の情報を取得する権限がありません'))
  }

  // 3. 部下一覧の取得
  const subordinates = await userRepo.findSubordinates(managerId)
  
  // パスワードを除外して返す
  const subordinatesWithoutPassword = subordinates.map(user => {
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword as User
  })

  return right(subordinatesWithoutPassword)
}