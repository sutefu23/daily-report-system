import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createAuthRoutes } from './routes/auth'
import { createUserRoutes } from './routes/users'
import { createDailyReportRoutes } from './routes/daily-reports'
import { getPrismaClient } from './infrastructure/database/prisma'
import { BcryptPasswordHasher } from './infrastructure/auth/password-hasher'
import { JwtTokenGenerator } from './infrastructure/auth/token-generator'
import { PrismaUserRepository } from './infrastructure/repositories/user-repository'
import { PrismaDailyReportRepository } from './infrastructure/repositories/daily-report-repository'
import { PrismaProjectRepository } from './infrastructure/repositories/project-repository'
import { PrismaCommentRepository } from './infrastructure/repositories/comment-repository'
import { UserService } from './application/services/user-service'
import { DailyReportService } from './application/services/daily-report-service'

// 環境変数
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// アプリケーション初期化
const app = new Hono()

// ミドルウェア
app.use('*', logger())
app.use('*', cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'http://localhost:3000'
    : 'http://localhost:3000',
  credentials: true,
}))

// 依存関係の初期化
const prisma = getPrismaClient()
const passwordHasher = new BcryptPasswordHasher()
const tokenGenerator = new JwtTokenGenerator(JWT_SECRET)

// リポジトリの初期化
const userRepository = new PrismaUserRepository(prisma)
const dailyReportRepository = new PrismaDailyReportRepository(prisma)
const projectRepository = new PrismaProjectRepository(prisma)
const commentRepository = new PrismaCommentRepository(prisma)

// サービスの初期化
const userService = new UserService(userRepository, passwordHasher)
const dailyReportService = new DailyReportService(
  dailyReportRepository,
  userRepository,
  projectRepository,
  commentRepository
)

// ルートハンドラー
app.get('/', (c) => c.json({ message: '日報管理システム API' }))

// APIルート
app.route('/api/auth', createAuthRoutes(userService, tokenGenerator))
app.route('/api/users', createUserRoutes(userService))
app.route('/api/daily-reports', createDailyReportRoutes(dailyReportService))

// エラーハンドリング
app.onError((err, c) => {
  console.error(`${err}`)
  return c.json(
    { error: { message: 'Internal Server Error' } },
    500
  )
})

// 404ハンドリング
app.notFound((c) => {
  return c.json(
    { error: { message: 'Not Found' } },
    404
  )
})

// サーバー起動
console.log(`Server is running on http://localhost:${PORT}`)
serve({
  fetch: app.fetch,
  port: Number(PORT),
})