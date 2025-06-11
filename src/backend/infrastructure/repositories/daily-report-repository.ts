import type { PrismaClient } from '@prisma/client'
import type {
  DailyReport,
  DailyReportSearchCriteria,
  DailyReportSummary,
  TaskProgress,
} from '../../domain/types/daily-report'
import type { DailyReportRepository } from '../../domain/workflows/daily-report-workflow'
import {
  createDailyReportId,
  createProjectId,
  createTaskId,
  createUserId,
} from '../../domain/types/base'

// PrismaのDailyReport型からドメインのDailyReport型への変換
const toDomainDailyReport = (prismaReport: any, tasks: any[]): DailyReport => {
  const domainTasks: TaskProgress[] = tasks.map((task) => ({
    id: createTaskId(task.id),
    projectId: createProjectId(task.projectId),
    description: task.description,
    hoursSpent: task.hoursSpent,
    progress: task.progress,
  }))

  return {
    id: createDailyReportId(prismaReport.id),
    userId: createUserId(prismaReport.userId),
    date: prismaReport.date,
    tasks: domainTasks,
    challenges: prismaReport.challenges,
    nextDayPlan: prismaReport.nextDayPlan,
    status: prismaReport.status as DailyReport['status'],
    submittedAt: prismaReport.submittedAt || undefined,
    approvedAt: prismaReport.approvedAt || undefined,
    approvedBy: prismaReport.approvedBy ? createUserId(prismaReport.approvedBy) : undefined,
    rejectedAt: prismaReport.rejectedAt || undefined,
    rejectedBy: prismaReport.rejectedBy ? createUserId(prismaReport.rejectedBy) : undefined,
    feedback: prismaReport.feedback || undefined,
    createdAt: prismaReport.createdAt,
    updatedAt: prismaReport.updatedAt,
  }
}

export class PrismaDailyReportRepository implements DailyReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<DailyReport | null> {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: { tasks: true },
    })

    if (!report) return null
    return toDomainDailyReport(report, report.tasks)
  }

  async findByUserAndDate(userId: string, date: Date): Promise<DailyReport | null> {
    // 日付の開始と終了を計算（その日の0:00:00から23:59:59）
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const report = await this.prisma.dailyReport.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: { tasks: true },
    })

    if (!report) return null
    return toDomainDailyReport(report, report.tasks)
  }

  async create(report: DailyReport): Promise<DailyReport> {
    const created = await this.prisma.dailyReport.create({
      data: {
        id: report.id,
        userId: report.userId,
        date: report.date,
        challenges: report.challenges,
        nextDayPlan: report.nextDayPlan,
        status: report.status,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        tasks: {
          create: report.tasks.map((task) => ({
            id: task.id,
            projectId: task.projectId,
            description: task.description,
            hoursSpent: task.hoursSpent,
            progress: task.progress,
          })),
        },
      },
      include: { tasks: true },
    })

    return toDomainDailyReport(created, created.tasks)
  }

  async update(report: DailyReport): Promise<DailyReport> {
    // トランザクションで既存タスクの削除と新規タスクの作成を行う
    const updated = await this.prisma.$transaction(async (tx) => {
      // 既存タスクを削除
      await tx.task.deleteMany({
        where: { dailyReportId: report.id },
      })

      // 日報を更新し、新しいタスクを作成
      return await tx.dailyReport.update({
        where: { id: report.id },
        data: {
          challenges: report.challenges,
          nextDayPlan: report.nextDayPlan,
          status: report.status,
          submittedAt: report.submittedAt || null,
          approvedAt: report.approvedAt || null,
          approvedBy: report.approvedBy || null,
          rejectedAt: report.rejectedAt || null,
          rejectedBy: report.rejectedBy || null,
          feedback: report.feedback || null,
          updatedAt: report.updatedAt,
          tasks: {
            create: report.tasks.map((task) => ({
              id: task.id,
              projectId: task.projectId,
              description: task.description,
              hoursSpent: task.hoursSpent,
              progress: task.progress,
            })),
          },
        },
        include: { tasks: true },
      })
    })

    return toDomainDailyReport(updated, updated.tasks)
  }

  async search(criteria: DailyReportSearchCriteria): Promise<DailyReport[]> {
    const where: any = {}

    if (criteria.userId) {
      where.userId = criteria.userId
    }

    if (criteria.dateFrom || criteria.dateTo) {
      where.date = {}
      if (criteria.dateFrom) {
        where.date.gte = criteria.dateFrom
      }
      if (criteria.dateTo) {
        where.date.lte = criteria.dateTo
      }
    }

    if (criteria.status) {
      where.status = criteria.status
    }

    if (criteria.approverId) {
      where.approvedBy = criteria.approverId
    }

    if (criteria.projectId) {
      where.tasks = {
        some: {
          projectId: criteria.projectId,
        },
      }
    }

    const reports = await this.prisma.dailyReport.findMany({
      where,
      include: { tasks: true },
      orderBy: { date: 'desc' },
    })

    return reports.map((report) => toDomainDailyReport(report, report.tasks))
  }

  async calculateSummary(
    userId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<DailyReportSummary> {
    const reports = await this.prisma.dailyReport.findMany({
      where: {
        userId,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      include: { tasks: true },
    })

    // 集計処理
    let totalHours = 0
    const projectHours: Record<string, number> = {}
    let submittedCount = 0
    let approvedCount = 0
    let rejectedCount = 0
    let draftCount = 0

    for (const report of reports) {
      // ステータス別カウント
      switch (report.status) {
        case 'submitted':
          submittedCount++
          break
        case 'approved':
          approvedCount++
          break
        case 'rejected':
          rejectedCount++
          break
        case 'draft':
          draftCount++
          break
      }

      // タスクの集計
      for (const task of report.tasks) {
        totalHours += task.hoursSpent

        if (!projectHours[task.projectId]) {
          projectHours[task.projectId] = 0
        }
        projectHours[task.projectId] += task.hoursSpent
      }
    }

    return {
      userId: createUserId(userId),
      dateFrom,
      dateTo,
      totalReports: reports.length,
      totalHours,
      projectHours,
      submittedCount,
      approvedCount,
      rejectedCount,
      draftCount,
    }
  }
}
