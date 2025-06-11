import { ulid } from 'ulid'
import type { 
  ApproveDailyReportInput,
  CreateCommentInput,
  CreateDailyReportInput,
  DailyReport,
  DailyReportSearchCriteria,
  DailyReportSummary,
  RejectDailyReportInput,
  SubmitDailyReportInput,
  TaskProgress,
  UpdateDailyReportInput,
  Comment
} from '../types/daily-report'
import type { User } from '../types/user'
import type { Project } from '../types/project'
import type { Either } from '../types/base'
import { 
  createCommentId,
  createDailyReportId, 
  createTaskId,
  left, 
  right,
  type UserId
} from '../types/base'
import { 
  businessRuleViolation,
  forbidden,
  notFound, 
  validationError,
  type DomainError 
} from '../errors'
import { 
  canApproveDailyReport as canApprove,
  canEditDailyReport,
  canRejectDailyReport as canReject,
  canSubmitDailyReport,
  isValidProgress,
  isValidTotalWorkHours,
  isValidWorkHours
} from '../types/daily-report'
import { canApproveDailyReport, canManageDailyReports } from '../types/user'

// リポジトリインターフェース
export type DailyReportRepository = {
  findById: (id: string) => Promise<DailyReport | null>
  findByUserAndDate: (userId: string, date: Date) => Promise<DailyReport | null>
  create: (report: DailyReport) => Promise<DailyReport>
  update: (report: DailyReport) => Promise<DailyReport>
  search: (criteria: DailyReportSearchCriteria) => Promise<DailyReport[]>
  calculateSummary: (userId: string, dateFrom: Date, dateTo: Date) => Promise<DailyReportSummary>
}

export type CommentRepository = {
  findById: (id: string) => Promise<Comment | null>
  findByDailyReportId: (dailyReportId: string) => Promise<Comment[]>
  create: (comment: Comment) => Promise<Comment>
  markAsRead: (id: string) => Promise<Comment>
}

export type UserRepository = {
  findById: (id: string) => Promise<User | null>
}

export type ProjectRepository = {
  findById: (id: string) => Promise<Project | null>
  findByIds: (ids: string[]) => Promise<Project[]>
}

// 日報作成ワークフロー
export const createDailyReportWorkflow = (
  reportRepo: DailyReportRepository,
  userRepo: UserRepository,
  projectRepo: ProjectRepository
) => async (
  input: CreateDailyReportInput
): Promise<Either<DomainError, DailyReport>> => {
  // 1. バリデーション
  const validationResult = await validateCreateInput(input, projectRepo)
  if (validationResult.tag === 'Left') {
    return validationResult
  }

  // 2. ユーザー存在確認
  const user = await userRepo.findById(input.userId)
  if (!user) {
    return left(notFound('ユーザーが見つかりません'))
  }

  // 3. 重複チェック
  const existingReport = await reportRepo.findByUserAndDate(input.userId, input.date)
  if (existingReport) {
    return left(businessRuleViolation('指定された日付の日報は既に存在します'))
  }

  // 4. タスクIDの生成
  const tasksWithIds: TaskProgress[] = input.tasks.map(task => ({
    ...task,
    id: createTaskId(ulid())
  }))

  // 5. エンティティ作成・保存
  const now = new Date()
  const report: DailyReport = {
    id: createDailyReportId(ulid()),
    userId: input.userId,
    date: input.date,
    tasks: tasksWithIds,
    challenges: input.challenges,
    nextDayPlan: input.nextDayPlan,
    status: 'draft',
    createdAt: now,
    updatedAt: now
  }

  const created = await reportRepo.create(report)
  return right(created)
}

// 日報更新ワークフロー
export const updateDailyReportWorkflow = (
  reportRepo: DailyReportRepository,
  projectRepo: ProjectRepository
) => async (
  input: UpdateDailyReportInput
): Promise<Either<DomainError, DailyReport>> => {
  // 1. 既存日報の取得
  const report = await reportRepo.findById(input.id)
  if (!report) {
    return left(notFound('日報が見つかりません'))
  }

  // 2. 編集権限チェック
  if (!canEditDailyReport(report, input.userId)) {
    return left(forbidden('この日報を編集する権限がありません'))
  }

  // 3. タスク更新時のバリデーション
  if (input.tasks) {
    const validationResult = await validateTasks(input.tasks, projectRepo)
    if (validationResult.tag === 'Left') {
      return validationResult
    }
  }

  // 4. タスクIDの生成
  const tasksWithIds: TaskProgress[] | undefined = input.tasks?.map(task => ({
    ...task,
    id: createTaskId(ulid())
  }))

  // 5. 更新データの作成
  const updatedReport: DailyReport = {
    ...report,
    tasks: tasksWithIds ?? report.tasks,
    challenges: input.challenges ?? report.challenges,
    nextDayPlan: input.nextDayPlan ?? report.nextDayPlan,
    updatedAt: new Date()
  }

  // 6. 保存
  const saved = await reportRepo.update(updatedReport)
  return right(saved)
}

// 日報提出ワークフロー
export const submitDailyReportWorkflow = (
  reportRepo: DailyReportRepository
) => async (
  input: SubmitDailyReportInput
): Promise<Either<DomainError, DailyReport>> => {
  // 1. 既存日報の取得
  const report = await reportRepo.findById(input.id)
  if (!report) {
    return left(notFound('日報が見つかりません'))
  }

  // 2. 権限チェック
  if (report.userId !== input.userId) {
    return left(forbidden('他のユーザーの日報を提出することはできません'))
  }

  // 3. ステータスチェック
  if (!canSubmitDailyReport(report)) {
    return left(businessRuleViolation('この日報は提出できない状態です'))
  }

  // 4. 提出処理
  const submittedReport: DailyReport = {
    ...report,
    status: 'submitted',
    submittedAt: new Date(),
    updatedAt: new Date()
  }

  const saved = await reportRepo.update(submittedReport)
  return right(saved)
}

// 日報承認ワークフロー
export const approveDailyReportWorkflow = (
  reportRepo: DailyReportRepository,
  userRepo: UserRepository
) => async (
  input: ApproveDailyReportInput
): Promise<Either<DomainError, DailyReport>> => {
  // 1. 既存日報の取得
  const report = await reportRepo.findById(input.id)
  if (!report) {
    return left(notFound('日報が見つかりません'))
  }

  // 2. 承認者の権限チェック
  const approver = await userRepo.findById(input.approverId)
  if (!approver) {
    return left(notFound('承認者が見つかりません'))
  }

  if (!canApproveDailyReport(approver, report.userId)) {
    return left(forbidden('この日報を承認する権限がありません'))
  }

  // 3. ステータスチェック
  if (!canApprove(report)) {
    return left(businessRuleViolation('この日報は承認できない状態です'))
  }

  // 4. 承認処理
  const approvedReport: DailyReport = {
    ...report,
    status: 'approved',
    approvedAt: new Date(),
    approvedBy: input.approverId,
    feedback: input.feedback,
    updatedAt: new Date()
  }

  const saved = await reportRepo.update(approvedReport)
  return right(saved)
}

// 日報差し戻しワークフロー
export const rejectDailyReportWorkflow = (
  reportRepo: DailyReportRepository,
  userRepo: UserRepository
) => async (
  input: RejectDailyReportInput
): Promise<Either<DomainError, DailyReport>> => {
  // 1. 既存日報の取得
  const report = await reportRepo.findById(input.id)
  if (!report) {
    return left(notFound('日報が見つかりません'))
  }

  // 2. 差し戻し者の権限チェック
  const rejector = await userRepo.findById(input.rejectorId)
  if (!rejector) {
    return left(notFound('差し戻し者が見つかりません'))
  }

  if (!canApproveDailyReport(rejector, report.userId)) {
    return left(forbidden('この日報を差し戻す権限がありません'))
  }

  // 3. ステータスチェック
  if (!canReject(report)) {
    return left(businessRuleViolation('この日報は差し戻しできない状態です'))
  }

  // 4. フィードバックの必須チェック
  if (!input.feedback || input.feedback.trim().length === 0) {
    return left(validationError('差し戻し理由は必須です'))
  }

  // 5. 差し戻し処理
  const rejectedReport: DailyReport = {
    ...report,
    status: 'rejected',
    rejectedAt: new Date(),
    rejectedBy: input.rejectorId,
    feedback: input.feedback,
    updatedAt: new Date()
  }

  const saved = await reportRepo.update(rejectedReport)
  return right(saved)
}

// コメント作成ワークフロー
export const createCommentWorkflow = (
  reportRepo: DailyReportRepository,
  userRepo: UserRepository,
  commentRepo: CommentRepository
) => async (
  input: CreateCommentInput
): Promise<Either<DomainError, Comment>> => {
  // 1. 日報の存在確認
  const report = await reportRepo.findById(input.dailyReportId)
  if (!report) {
    return left(notFound('日報が見つかりません'))
  }

  // 2. コメント投稿者の存在確認
  const user = await userRepo.findById(input.userId)
  if (!user) {
    return left(notFound('ユーザーが見つかりません'))
  }

  // 3. 権限チェック（本人または管理者のみコメント可能）
  const canComment = report.userId === input.userId || canManageDailyReports(user)
  if (!canComment) {
    return left(forbidden('この日報にコメントする権限がありません'))
  }

  // 4. コメント内容のバリデーション
  if (!input.content || input.content.trim().length === 0) {
    return left(validationError('コメント内容は必須です'))
  }

  // 5. コメントの作成
  const now = new Date()
  const comment: Comment = {
    id: createCommentId(ulid()),
    dailyReportId: input.dailyReportId,
    userId: input.userId,
    content: input.content,
    isRead: false,
    createdAt: now,
    updatedAt: now
  }

  const created = await commentRepo.create(comment)
  return right(created)
}

// 日報検索ワークフロー
export const searchDailyReportsWorkflow = (
  reportRepo: DailyReportRepository,
  userRepo: UserRepository
) => async (
  searcherId: UserId,
  criteria: DailyReportSearchCriteria
): Promise<Either<DomainError, DailyReport[]>> => {
  // 1. 検索者の権限確認
  const searcher = await userRepo.findById(searcherId)
  if (!searcher) {
    return left(notFound('ユーザーが見つかりません'))
  }

  // 2. 権限に基づく検索条件の調整
  let adjustedCriteria = { ...criteria }
  if (searcher.role === 'employee') {
    // 一般社員は自分の日報のみ検索可能
    adjustedCriteria.userId = searcherId
  } else if (searcher.role === 'manager') {
    // マネージャーは自分と部下の日報のみ検索可能
    // TODO: 部下のIDリストを取得して検索条件に追加
  }
  // adminは全ての日報を検索可能

  // 3. 検索実行
  const reports = await reportRepo.search(adjustedCriteria)
  return right(reports)
}

// 日報集計ワークフロー
export const getDailyReportSummaryWorkflow = (
  reportRepo: DailyReportRepository,
  userRepo: UserRepository
) => async (
  requesterId: UserId,
  targetUserId: UserId,
  dateFrom: Date,
  dateTo: Date
): Promise<Either<DomainError, DailyReportSummary>> => {
  // 1. 権限確認
  const requester = await userRepo.findById(requesterId)
  if (!requester) {
    return left(notFound('ユーザーが見つかりません'))
  }

  // 自分の集計または管理者権限が必要
  if (requesterId !== targetUserId && !canManageDailyReports(requester)) {
    return left(forbidden('他のユーザーの日報集計を取得する権限がありません'))
  }

  // 2. 対象ユーザーの存在確認
  const targetUser = await userRepo.findById(targetUserId)
  if (!targetUser) {
    return left(notFound('対象ユーザーが見つかりません'))
  }

  // 3. 集計実行
  const summary = await reportRepo.calculateSummary(targetUserId, dateFrom, dateTo)
  return right(summary)
}

// バリデーション関数
const validateCreateInput = async (
  input: CreateDailyReportInput,
  projectRepo: ProjectRepository
): Promise<Either<DomainError, void>> => {
  // タスクのバリデーション
  const taskValidation = await validateTasks(input.tasks, projectRepo)
  if (taskValidation.tag === 'Left') {
    return taskValidation
  }

  // その他のバリデーション
  if (input.challenges.trim().length === 0) {
    return left(validationError('困ったこと・相談事項は必須です'))
  }

  if (input.nextDayPlan.trim().length === 0) {
    return left(validationError('明日の予定は必須です'))
  }

  return right(undefined)
}

const validateTasks = async (
  tasks: Omit<TaskProgress, 'id'>[],
  projectRepo: ProjectRepository
): Promise<Either<DomainError, void>> => {
  if (tasks.length === 0) {
    return left(validationError('少なくとも1つのタスクを入力してください'))
  }

  // 作業時間のバリデーション
  for (const task of tasks) {
    if (!isValidWorkHours(task.hoursSpent)) {
      return left(validationError('作業時間は0〜24時間の範囲で入力してください'))
    }
    if (!isValidProgress(task.progress)) {
      return left(validationError('進捗率は0〜100の範囲で入力してください'))
    }
    if (task.description.trim().length === 0) {
      return left(validationError('作業内容は必須です'))
    }
  }

  if (!isValidTotalWorkHours(tasks as TaskProgress[])) {
    return left(validationError('1日の合計作業時間は24時間を超えることはできません'))
  }

  // プロジェクトの存在確認
  const projectIds = tasks.map(task => task.projectId)
  const projects = await projectRepo.findByIds(projectIds)
  const foundProjectIds = new Set(projects.map(p => p.id))
  
  for (const projectId of projectIds) {
    if (!foundProjectIds.has(projectId)) {
      return left(notFound(`プロジェクトID: ${projectId} が見つかりません`))
    }
  }

  return right(undefined)
}