import type { 
  ApproveDailyReportInput,
  CreateCommentInput,
  CreateDailyReportInput,
  DailyReport,
  DailyReportSearchCriteria,
  DailyReportSummary,
  RejectDailyReportInput,
  SubmitDailyReportInput,
  UpdateDailyReportInput,
  Comment
} from '../../domain/types/daily-report'
import type { Either, UserId } from '../../domain/types/base'
import type { DomainError } from '../../domain/errors'
import type { 
  DailyReportRepository,
  CommentRepository,
  UserRepository,
  ProjectRepository
} from '../../domain/workflows/daily-report-workflow'
import {
  approveDailyReportWorkflow,
  createCommentWorkflow,
  createDailyReportWorkflow,
  getDailyReportSummaryWorkflow,
  rejectDailyReportWorkflow,
  searchDailyReportsWorkflow,
  submitDailyReportWorkflow,
  updateDailyReportWorkflow
} from '../../domain/workflows/daily-report-workflow'

export class DailyReportService {
  constructor(
    private readonly reportRepo: DailyReportRepository,
    private readonly userRepo: UserRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly commentRepo: CommentRepository
  ) {}

  // 日報作成
  async createDailyReport(input: CreateDailyReportInput): Promise<Either<DomainError, DailyReport>> {
    return createDailyReportWorkflow(
      this.reportRepo,
      this.userRepo,
      this.projectRepo
    )(input)
  }

  // 日報更新
  async updateDailyReport(input: UpdateDailyReportInput): Promise<Either<DomainError, DailyReport>> {
    return updateDailyReportWorkflow(
      this.reportRepo,
      this.projectRepo
    )(input)
  }

  // 日報提出
  async submitDailyReport(input: SubmitDailyReportInput): Promise<Either<DomainError, DailyReport>> {
    return submitDailyReportWorkflow(this.reportRepo)(input)
  }

  // 日報承認
  async approveDailyReport(input: ApproveDailyReportInput): Promise<Either<DomainError, DailyReport>> {
    return approveDailyReportWorkflow(
      this.reportRepo,
      this.userRepo
    )(input)
  }

  // 日報差し戻し
  async rejectDailyReport(input: RejectDailyReportInput): Promise<Either<DomainError, DailyReport>> {
    return rejectDailyReportWorkflow(
      this.reportRepo,
      this.userRepo
    )(input)
  }

  // コメント作成
  async createComment(input: CreateCommentInput): Promise<Either<DomainError, Comment>> {
    return createCommentWorkflow(
      this.reportRepo,
      this.userRepo,
      this.commentRepo
    )(input)
  }

  // 日報検索
  async searchDailyReports(
    searcherId: UserId,
    criteria: DailyReportSearchCriteria
  ): Promise<Either<DomainError, DailyReport[]>> {
    return searchDailyReportsWorkflow(
      this.reportRepo,
      this.userRepo
    )(searcherId, criteria)
  }

  // 日報集計
  async getDailyReportSummary(
    requesterId: UserId,
    targetUserId: UserId,
    dateFrom: Date,
    dateTo: Date
  ): Promise<Either<DomainError, DailyReportSummary>> {
    return getDailyReportSummaryWorkflow(
      this.reportRepo,
      this.userRepo
    )(requesterId, targetUserId, dateFrom, dateTo)
  }

  // 日報取得（IDによる）
  async getDailyReport(id: string): Promise<DailyReport | null> {
    return this.reportRepo.findById(id)
  }

  // 日報のコメント取得
  async getDailyReportComments(dailyReportId: string): Promise<Comment[]> {
    return this.commentRepo.findByDailyReportId(dailyReportId)
  }

  // コメントを既読にする
  async markCommentAsRead(commentId: string): Promise<Comment> {
    return this.commentRepo.markAsRead(commentId)
  }
}