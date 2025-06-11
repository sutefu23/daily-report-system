import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { DailyReportService } from '../application/services/daily-report-service'
import { requireManager, type AuthVariables } from '../middleware/auth'
import { createUserId, isRight } from '../domain/types/base'
import { domainErrorToHttpStatus, toErrorResponse } from '../domain/errors'

// リクエストスキーマ
const taskProgressSchema = z.object({
  projectId: z.string(),
  description: z.string().min(1),
  hoursSpent: z.number().min(0).max(24),
  progress: z.number().min(0).max(100)
})

const createDailyReportSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  tasks: z.array(taskProgressSchema).min(1),
  challenges: z.string().min(1),
  nextDayPlan: z.string().min(1)
})

const updateDailyReportSchema = z.object({
  tasks: z.array(taskProgressSchema).min(1).optional(),
  challenges: z.string().min(1).optional(),
  nextDayPlan: z.string().min(1).optional()
})

const approveDailyReportSchema = z.object({
  feedback: z.string().optional()
})

const rejectDailyReportSchema = z.object({
  feedback: z.string().min(1)
})

const createCommentSchema = z.object({
  content: z.string().min(1)
})

const searchDailyReportsSchema = z.object({
  userId: z.string().optional(),
  dateFrom: z.string().transform(str => new Date(str)).optional(),
  dateTo: z.string().transform(str => new Date(str)).optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  approverId: z.string().optional(),
  projectId: z.string().optional()
})

export const createDailyReportRoutes = (dailyReportService: DailyReportService) => {
  const app = new Hono<{ Variables: AuthVariables }>()

  // 日報作成
  app.post('/', zValidator('json', createDailyReportSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    const result = await dailyReportService.createDailyReport({
      userId: createUserId(user.userId),
      ...input
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    return c.json({ dailyReport: result.right }, 201)
  })

  // 日報一覧取得
  app.get('/', zValidator('query', searchDailyReportsSchema), async (c) => {
    const user = c.get('user')
    const criteria = c.req.valid('query')

    const result = await dailyReportService.searchDailyReports(
      createUserId(user.userId),
      criteria
    )

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    return c.json({ dailyReports: result.right })
  })

  // 特定の日報取得
  app.get('/:id', async (c) => {
    const user = c.get('user')
    const reportId = c.req.param('id')

    const report = await dailyReportService.getDailyReport(reportId)
    if (!report) {
      return c.json({ error: { message: 'Daily report not found' } }, 404)
    }

    // 権限チェック（本人または管理者）
    if (report.userId !== user.userId && user.role === 'employee') {
      return c.json({ error: { message: 'Forbidden' } }, 403)
    }

    return c.json({ dailyReport: report })
  })

  // 日報更新
  app.put('/:id', zValidator('json', updateDailyReportSchema), async (c) => {
    const user = c.get('user')
    const reportId = c.req.param('id')
    const input = c.req.valid('json')

    const result = await dailyReportService.updateDailyReport({
      id: createUserId(reportId),
      userId: createUserId(user.userId),
      ...input
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    return c.json({ dailyReport: result.right })
  })

  // 日報提出
  app.post('/:id/submit', async (c) => {
    const user = c.get('user')
    const reportId = c.req.param('id')

    const result = await dailyReportService.submitDailyReport({
      id: createUserId(reportId),
      userId: createUserId(user.userId)
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    return c.json({ dailyReport: result.right })
  })

  // 日報承認（マネージャー以上）
  app.post('/:id/approve', requireManager(), zValidator('json', approveDailyReportSchema), async (c) => {
    const user = c.get('user')
    const reportId = c.req.param('id')
    const { feedback } = c.req.valid('json')

    const result = await dailyReportService.approveDailyReport({
      id: createUserId(reportId),
      approverId: createUserId(user.userId),
      feedback
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    return c.json({ dailyReport: result.right })
  })

  // 日報差し戻し（マネージャー以上）
  app.post('/:id/reject', requireManager(), zValidator('json', rejectDailyReportSchema), async (c) => {
    const user = c.get('user')
    const reportId = c.req.param('id')
    const { feedback } = c.req.valid('json')

    const result = await dailyReportService.rejectDailyReport({
      id: createUserId(reportId),
      rejectorId: createUserId(user.userId),
      feedback
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    return c.json({ dailyReport: result.right })
  })

  // コメント一覧取得
  app.get('/:id/comments', async (c) => {
    const user = c.get('user')
    const reportId = c.req.param('id')

    // 日報の存在確認と権限チェック
    const report = await dailyReportService.getDailyReport(reportId)
    if (!report) {
      return c.json({ error: { message: 'Daily report not found' } }, 404)
    }

    if (report.userId !== user.userId && user.role === 'employee') {
      return c.json({ error: { message: 'Forbidden' } }, 403)
    }

    const comments = await dailyReportService.getDailyReportComments(reportId)
    return c.json({ comments })
  })

  // コメント作成
  app.post('/:id/comments', zValidator('json', createCommentSchema), async (c) => {
    const user = c.get('user')
    const reportId = c.req.param('id')
    const { content } = c.req.valid('json')

    const result = await dailyReportService.createComment({
      dailyReportId: createUserId(reportId),
      userId: createUserId(user.userId),
      content
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    return c.json({ comment: result.right }, 201)
  })

  // コメント既読化
  app.put('/comments/:commentId/read', async (c) => {
    const commentId = c.req.param('commentId')
    const comment = await dailyReportService.markCommentAsRead(commentId)
    return c.json({ comment })
  })

  // 日報集計
  app.get('/summary/:userId', async (c) => {
    const user = c.get('user')
    const targetUserId = c.req.param('userId')
    const { dateFrom, dateTo } = c.req.query()

    if (!dateFrom || !dateTo) {
      return c.json({ error: { message: 'dateFrom and dateTo are required' } }, 400)
    }

    const result = await dailyReportService.getDailyReportSummary(
      createUserId(user.userId),
      createUserId(targetUserId),
      new Date(dateFrom),
      new Date(dateTo)
    )

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    return c.json({ summary: result.right })
  })

  return app
}