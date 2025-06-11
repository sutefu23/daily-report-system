# Integration Test Plan - 日報管理システム (更新版)

## エグゼクティブサマリー

本ドキュメントは、日報管理システムの統合テスト計画の更新版です。現在の実装状況を踏まえ、実装可能で優先度の高いテストケースに焦点を当てています。

### 現在の状況
- **ドメイン層**: ✅ 完全実装（ワークフロー、型定義、エラーハンドリング）
- **インフラ層**: ✅ リポジトリ実装、認証サービス実装
- **アプリケーション層**: ✅ サービス実装完了
- **API層**: ❌ RESTルートハンドラー未実装、gRPC未実装
- **テスト**: ❌ 統合テスト未実装（ドキュメントのみ存在）

## 1. 統合テストカテゴリー

### 1.1 ドメイン層統合テスト（優先度: 最高）
実装済みのワークフローとリポジトリの統合動作を検証

### 1.2 データベース統合テスト（優先度: 高）
Prismaとリポジトリ層の実際の動作検証

### 1.3 認証・認可統合テスト（優先度: 高）
JWT生成・検証とミドルウェアの動作確認

### 1.4 API統合テスト（優先度: 中）
RESTエンドポイントの実装後に実施

### 1.5 E2E統合テスト（優先度: 低）
フロントエンド・バックエンド間の完全な統合

## 2. テスト環境設定

### 2.1 必要な設定ファイル

#### `vitest.config.integration.ts`
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['**/*.integration.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/integration.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

#### `.env.test`
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/daily_report_test"
JWT_SECRET="test-jwt-secret-for-integration-tests"
NODE_ENV="test"
```

#### `docker-compose.test.yml`
```yaml
version: '3.8'

services:
  postgres-test:
    image: postgres:16-alpine
    container_name: daily-report-test-db
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: daily_report_test
    volumes:
      - postgres_test_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_test_data:
```

### 2.2 テストセットアップ

#### `tests/setup/integration.ts`
```typescript
import { PrismaClient } from '@prisma/client'
import { beforeAll, afterAll, beforeEach } from 'vitest'

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
})

beforeAll(async () => {
  // データベース接続確認
  await prisma.$connect()
})

afterAll(async () => {
  // クリーンアップ
  await prisma.$disconnect()
})

beforeEach(async () => {
  // テーブルクリア（順序重要）
  await prisma.$transaction([
    prisma.task.deleteMany(),
    prisma.dailyReport.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.user.deleteMany(),
    prisma.project.deleteMany(),
    prisma.department.deleteMany(),
  ])
})

export { prisma }
```

## 3. 詳細なテストケース

### 3.1 ドメイン層統合テスト

#### `src/backend/domain/workflows/__tests__/user-workflow.integration.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { createUserWorkflow, authenticateUserWorkflow } from '../user-workflow'
import { PrismaUserRepository } from '../../../infrastructure/repositories/user-repository'
import { BcryptPasswordHasher } from '../../../infrastructure/auth/password-hasher'
import { prisma } from '../../../../../tests/setup/integration'
import { createDepartmentId } from '../../types/department'

describe('User Workflow Integration Tests', () => {
  let userRepository: PrismaUserRepository
  let passwordHasher: BcryptPasswordHasher
  let createUser: ReturnType<typeof createUserWorkflow>
  let authenticateUser: ReturnType<typeof authenticateUserWorkflow>

  beforeEach(async () => {
    // 実際のインフラストラクチャを使用
    userRepository = new PrismaUserRepository(prisma)
    passwordHasher = new BcryptPasswordHasher()
    createUser = createUserWorkflow(userRepository, passwordHasher)
    authenticateUser = authenticateUserWorkflow(userRepository, passwordHasher)

    // テスト用部署作成
    await prisma.department.create({
      data: {
        id: 'dept1',
        name: 'Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  })

  describe('createUserWorkflow', () => {
    it('新規ユーザーを作成し、パスワードをハッシュ化して保存する', async () => {
      // Given
      const input = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'employee' as const,
        departmentId: createDepartmentId('dept1')
      }

      // When
      const result = await createUser(input)

      // Then
      expect(result.tag).toBe('Right')
      if (result.tag === 'Right') {
        expect(result.right.email).toBe(input.email)
        expect(result.right.name).toBe(input.name)
        
        // データベースに保存されていることを確認
        const savedUser = await prisma.user.findUnique({
          where: { email: input.email }
        })
        expect(savedUser).toBeTruthy()
        expect(savedUser?.passwordHash).toBeTruthy()
        expect(savedUser?.passwordHash).not.toBe(input.password)
      }
    })

    it('既存のメールアドレスでユーザー作成を拒否する', async () => {
      // Given: 既存ユーザー
      await createUser({
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing User',
        role: 'employee',
        departmentId: createDepartmentId('dept1')
      })

      // When: 同じメールアドレスで作成試行
      const result = await createUser({
        email: 'existing@example.com',
        password: 'NewPassword123!',
        name: 'New User',
        role: 'employee',
        departmentId: createDepartmentId('dept1')
      })

      // Then
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left.type).toBe('ALREADY_EXISTS')
        expect(result.left.message).toContain('既に存在します')
      }
    })

    it('弱いパスワードを拒否する', async () => {
      // When
      const result = await createUser({
        email: 'weak@example.com',
        password: 'weak',
        name: 'Weak Password User',
        role: 'employee',
        departmentId: createDepartmentId('dept1')
      })

      // Then
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left.type).toBe('VALIDATION_ERROR')
        expect(result.left.message).toContain('8文字以上')
      }
    })
  })

  describe('authenticateUserWorkflow', () => {
    beforeEach(async () => {
      // テスト用ユーザーを作成
      await createUser({
        email: 'auth@example.com',
        password: 'CorrectPassword123!',
        name: 'Auth Test User',
        role: 'employee',
        departmentId: createDepartmentId('dept1')
      })
    })

    it('正しい認証情報でユーザーを認証する', async () => {
      // When
      const result = await authenticateUser({
        email: 'auth@example.com',
        password: 'CorrectPassword123!'
      })

      // Then
      expect(result.tag).toBe('Right')
      if (result.tag === 'Right') {
        expect(result.right.email).toBe('auth@example.com')
        expect(result.right.password).toBeUndefined() // パスワードは返さない
      }
    })

    it('間違ったパスワードで認証を拒否する', async () => {
      // When
      const result = await authenticateUser({
        email: 'auth@example.com',
        password: 'WrongPassword123!'
      })

      // Then
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left.type).toBe('UNAUTHORIZED')
        expect(result.left.message).toContain('認証に失敗しました')
      }
    })

    it('存在しないユーザーで認証を拒否する', async () => {
      // When
      const result = await authenticateUser({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!'
      })

      // Then
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left.type).toBe('UNAUTHORIZED')
        expect(result.left.message).toContain('認証に失敗しました')
      }
    })

    it('非アクティブユーザーの認証を拒否する', async () => {
      // Given: ユーザーを非アクティブに
      await prisma.user.update({
        where: { email: 'auth@example.com' },
        data: { isActive: false }
      })

      // When
      const result = await authenticateUser({
        email: 'auth@example.com',
        password: 'CorrectPassword123!'
      })

      // Then
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left.type).toBe('FORBIDDEN')
        expect(result.left.message).toContain('無効化されています')
      }
    })
  })
})
```

#### `src/backend/domain/workflows/__tests__/daily-report-workflow.integration.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { 
  createDailyReportWorkflow,
  submitDailyReportWorkflow,
  approveDailyReportWorkflow,
  rejectDailyReportWorkflow 
} from '../daily-report-workflow'
import { PrismaDailyReportRepository } from '../../../infrastructure/repositories/daily-report-repository'
import { PrismaUserRepository } from '../../../infrastructure/repositories/user-repository'
import { prisma } from '../../../../../tests/setup/integration'
import { createUserId } from '../../types/user'
import { createProjectId } from '../../types/project'
import { createDailyReportId } from '../../types/daily-report'

describe('Daily Report Workflow Integration Tests', () => {
  let reportRepository: PrismaDailyReportRepository
  let userRepository: PrismaUserRepository
  let userId: string
  let managerId: string
  let projectId: string

  beforeEach(async () => {
    reportRepository = new PrismaDailyReportRepository(prisma)
    userRepository = new PrismaUserRepository(prisma)

    // テストデータセットアップ
    const dept = await prisma.department.create({
      data: { id: 'dept1', name: 'Engineering' }
    })

    const user = await prisma.user.create({
      data: {
        id: 'user1',
        email: 'employee@example.com',
        passwordHash: 'hash',
        name: 'Employee',
        role: 'employee',
        departmentId: dept.id,
        isActive: true
      }
    })
    userId = user.id

    const manager = await prisma.user.create({
      data: {
        id: 'manager1',
        email: 'manager@example.com',
        passwordHash: 'hash',
        name: 'Manager',
        role: 'manager',
        departmentId: dept.id,
        isActive: true
      }
    })
    managerId = manager.id

    const project = await prisma.project.create({
      data: {
        id: 'proj1',
        name: 'Test Project',
        departmentId: dept.id,
        isActive: true
      }
    })
    projectId = project.id
  })

  describe('日報作成ワークフロー', () => {
    it('有効な入力で日報を作成する', async () => {
      // Given
      const createReport = createDailyReportWorkflow(reportRepository, userRepository)
      const input = {
        userId: createUserId(userId),
        date: new Date('2024-01-15'),
        tasks: [{
          projectId: createProjectId(projectId),
          description: 'Feature implementation',
          hoursSpent: 4,
          progress: 80
        }],
        challenges: 'デバッグに時間がかかった',
        nextDayPlan: '残りの実装を完了'
      }

      // When
      const result = await createReport(input)

      // Then
      expect(result.tag).toBe('Right')
      if (result.tag === 'Right') {
        expect(result.right.userId).toBe(userId)
        expect(result.right.status).toBe('draft')
        
        // データベース確認
        const saved = await prisma.dailyReport.findFirst({
          where: { userId, date: input.date },
          include: { tasks: true }
        })
        expect(saved).toBeTruthy()
        expect(saved?.tasks).toHaveLength(1)
        expect(saved?.tasks[0].description).toBe('Feature implementation')
      }
    })

    it('24時間を超える作業時間を拒否する', async () => {
      // Given
      const createReport = createDailyReportWorkflow(reportRepository, userRepository)
      const input = {
        userId: createUserId(userId),
        date: new Date('2024-01-15'),
        tasks: [
          { projectId: createProjectId(projectId), description: 'Task 1', hoursSpent: 12, progress: 50 },
          { projectId: createProjectId(projectId), description: 'Task 2', hoursSpent: 13, progress: 50 }
        ],
        challenges: '',
        nextDayPlan: ''
      }

      // When
      const result = await createReport(input)

      // Then
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left.type).toBe('VALIDATION_ERROR')
        expect(result.left.message).toContain('24時間を超える')
      }
    })

    it('同じ日付の日報作成を拒否する', async () => {
      // Given: 既存の日報
      const createReport = createDailyReportWorkflow(reportRepository, userRepository)
      const date = new Date('2024-01-15')
      const input = {
        userId: createUserId(userId),
        date,
        tasks: [{ projectId: createProjectId(projectId), description: 'Task', hoursSpent: 8, progress: 100 }],
        challenges: '',
        nextDayPlan: ''
      }
      
      await createReport(input)

      // When: 同じ日付で再作成
      const result = await createReport(input)

      // Then
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left.type).toBe('BUSINESS_RULE_VIOLATION')
        expect(result.left.message).toContain('既に存在します')
      }
    })
  })

  describe('日報ステータス遷移ワークフロー', () => {
    let reportId: string

    beforeEach(async () => {
      // ドラフト日報を作成
      const report = await prisma.dailyReport.create({
        data: {
          id: 'report1',
          userId,
          date: new Date('2024-01-15'),
          status: 'draft',
          challenges: 'Test challenges',
          nextDayPlan: 'Test plan',
          tasks: {
            create: [{
              projectId,
              description: 'Test task',
              hoursSpent: 8,
              progressPercentage: 100
            }]
          }
        }
      })
      reportId = report.id
    })

    it('日報を提出する（draft → submitted）', async () => {
      // Given
      const submitReport = submitDailyReportWorkflow(reportRepository)

      // When
      const result = await submitReport({
        id: createDailyReportId(reportId),
        userId: createUserId(userId)
      })

      // Then
      expect(result.tag).toBe('Right')
      if (result.tag === 'Right') {
        expect(result.right.status).toBe('submitted')
        expect(result.right.submittedAt).toBeTruthy()
      }
    })

    it('提出された日報を承認する（submitted → approved）', async () => {
      // Given: 日報を提出状態に
      await prisma.dailyReport.update({
        where: { id: reportId },
        data: { status: 'submitted', submittedAt: new Date() }
      })

      const approveReport = approveDailyReportWorkflow(reportRepository, userRepository)

      // When
      const result = await approveReport({
        id: createDailyReportId(reportId),
        approverId: createUserId(managerId)
      })

      // Then
      expect(result.tag).toBe('Right')
      if (result.tag === 'Right') {
        expect(result.right.status).toBe('approved')
        expect(result.right.approvedAt).toBeTruthy()
        expect(result.right.approvedBy).toBe(managerId)
      }
    })

    it('提出された日報を差し戻す（submitted → rejected）', async () => {
      // Given: 日報を提出状態に
      await prisma.dailyReport.update({
        where: { id: reportId },
        data: { status: 'submitted', submittedAt: new Date() }
      })

      const rejectReport = rejectDailyReportWorkflow(reportRepository, userRepository)

      // When
      const result = await rejectReport({
        id: createDailyReportId(reportId),
        rejectorId: createUserId(managerId),
        feedback: '作業内容をもっと詳しく記載してください'
      })

      // Then
      expect(result.tag).toBe('Right')
      if (result.tag === 'Right') {
        expect(result.right.status).toBe('rejected')
        expect(result.right.feedback).toBe('作業内容をもっと詳しく記載してください')
      }
    })

    it('無効なステータス遷移を拒否する', async () => {
      // Given: 承認済み日報
      await prisma.dailyReport.update({
        where: { id: reportId },
        data: { 
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: managerId
        }
      })

      const submitReport = submitDailyReportWorkflow(reportRepository)

      // When: 承認済みを再提出しようとする
      const result = await submitReport({
        id: createDailyReportId(reportId),
        userId: createUserId(userId)
      })

      // Then
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left.type).toBe('BUSINESS_RULE_VIOLATION')
        expect(result.left.message).toContain('既に提出済みまたは承認済み')
      }
    })

    it('他のユーザーの日報操作を拒否する', async () => {
      // Given
      const submitReport = submitDailyReportWorkflow(reportRepository)

      // When: 別のユーザーが提出しようとする
      const result = await submitReport({
        id: createDailyReportId(reportId),
        userId: createUserId('other-user')
      })

      // Then
      expect(result.tag).toBe('Left')
      if (result.tag === 'Left') {
        expect(result.left.type).toBe('FORBIDDEN')
        expect(result.left.message).toContain('他のユーザーの日報')
      }
    })
  })
})
```

### 3.2 データベース統合テスト

#### `src/backend/infrastructure/repositories/__tests__/daily-report-repository.integration.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaDailyReportRepository } from '../daily-report-repository'
import { prisma } from '../../../../../tests/setup/integration'
import { createDailyReport } from '../../../domain/types/daily-report'
import { createUserId } from '../../../domain/types/user'
import { createProjectId } from '../../../domain/types/project'
import { ulid } from 'ulid'

describe('DailyReportRepository Integration Tests', () => {
  let repository: PrismaDailyReportRepository
  let userId: string
  let projectId: string

  beforeEach(async () => {
    repository = new PrismaDailyReportRepository(prisma)

    // テストデータ作成
    const dept = await prisma.department.create({
      data: { id: 'dept1', name: 'Engineering' }
    })

    const user = await prisma.user.create({
      data: {
        id: 'user1',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        role: 'employee',
        departmentId: dept.id,
        isActive: true
      }
    })
    userId = user.id

    const project = await prisma.project.create({
      data: {
        id: 'proj1',
        name: 'Test Project',
        departmentId: dept.id,
        isActive: true
      }
    })
    projectId = project.id
  })

  describe('create', () => {
    it('日報とタスクを同時に作成する', async () => {
      // Given
      const report = createDailyReport({
        id: ulid(),
        userId: createUserId(userId),
        date: new Date('2024-01-15'),
        tasks: [
          {
            projectId: createProjectId(projectId),
            description: 'Implement feature',
            hoursSpent: 4,
            progress: 80
          },
          {
            projectId: createProjectId(projectId),
            description: 'Write tests',
            hoursSpent: 2,
            progress: 50
          }
        ],
        challenges: 'Technical challenges',
        nextDayPlan: 'Continue implementation',
        status: 'draft'
      })

      // When
      const created = await repository.create(report)

      // Then
      expect(created.id).toBe(report.id)
      expect(created.tasks).toHaveLength(2)
      
      // データベース確認
      const dbReport = await prisma.dailyReport.findUnique({
        where: { id: report.id },
        include: { tasks: true }
      })
      expect(dbReport).toBeTruthy()
      expect(dbReport?.tasks).toHaveLength(2)
      expect(dbReport?.tasks[0].description).toBe('Implement feature')
      expect(dbReport?.tasks[1].description).toBe('Write tests')
    })

    it('トランザクション内で失敗した場合はロールバックする', async () => {
      // Given: 無効なプロジェクトIDを含む日報
      const report = createDailyReport({
        id: ulid(),
        userId: createUserId(userId),
        date: new Date('2024-01-15'),
        tasks: [
          {
            projectId: createProjectId('invalid-project'),
            description: 'Task',
            hoursSpent: 8,
            progress: 100
          }
        ],
        challenges: '',
        nextDayPlan: '',
        status: 'draft'
      })

      // When/Then
      await expect(repository.create(report)).rejects.toThrow()
      
      // 日報が作成されていないことを確認
      const count = await prisma.dailyReport.count()
      expect(count).toBe(0)
    })
  })

  describe('update', () => {
    it('日報更新時にタスクを削除して再作成する', async () => {
      // Given: 既存の日報
      const report = await prisma.dailyReport.create({
        data: {
          id: 'report1',
          userId,
          date: new Date('2024-01-15'),
          status: 'draft',
          challenges: 'Old challenges',
          nextDayPlan: 'Old plan',
          tasks: {
            create: [
              { projectId, description: 'Old task 1', hoursSpent: 4, progressPercentage: 50 },
              { projectId, description: 'Old task 2', hoursSpent: 4, progressPercentage: 50 }
            ]
          }
        },
        include: { tasks: true }
      })

      // When: 新しいタスクで更新
      const updated = await repository.update(
        createDailyReport({
          ...report,
          tasks: [{
            projectId: createProjectId(projectId),
            description: 'New task',
            hoursSpent: 8,
            progress: 100
          }],
          challenges: 'New challenges'
        })
      )

      // Then
      expect(updated.challenges).toBe('New challenges')
      expect(updated.tasks).toHaveLength(1)
      expect(updated.tasks[0].description).toBe('New task')

      // 古いタスクが削除されていることを確認
      const oldTasks = await prisma.task.findMany({
        where: { description: { in: ['Old task 1', 'Old task 2'] } }
      })
      expect(oldTasks).toHaveLength(0)
    })
  })

  describe('findByUserAndDateRange', () => {
    beforeEach(async () => {
      // 複数の日報を作成
      const dates = [
        new Date('2024-01-10'),
        new Date('2024-01-15'),
        new Date('2024-01-20'),
        new Date('2024-01-25')
      ]

      for (const date of dates) {
        await prisma.dailyReport.create({
          data: {
            id: `report-${date.toISOString()}`,
            userId,
            date,
            status: 'approved',
            challenges: 'Test',
            nextDayPlan: 'Test',
            tasks: {
              create: [{ projectId, description: 'Task', hoursSpent: 8, progressPercentage: 100 }]
            }
          }
        })
      }
    })

    it('指定された日付範囲の日報を取得する', async () => {
      // When
      const reports = await repository.findByUserAndDateRange(
        createUserId(userId),
        new Date('2024-01-14'),
        new Date('2024-01-21')
      )

      // Then
      expect(reports).toHaveLength(2)
      expect(reports[0].date.toISOString().split('T')[0]).toBe('2024-01-15')
      expect(reports[1].date.toISOString().split('T')[0]).toBe('2024-01-20')
    })

    it('タスクを含めて取得する', async () => {
      // When
      const reports = await repository.findByUserAndDateRange(
        createUserId(userId),
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      // Then
      expect(reports).toHaveLength(4)
      reports.forEach(report => {
        expect(report.tasks).toBeDefined()
        expect(report.tasks.length).toBeGreaterThan(0)
      })
    })
  })

  describe('同時実行制御', () => {
    it('楽観的ロックで同時更新を検出する', async () => {
      // Given: 日報を作成
      const report = await prisma.dailyReport.create({
        data: {
          id: 'report1',
          userId,
          date: new Date('2024-01-15'),
          status: 'draft',
          challenges: 'Original',
          nextDayPlan: 'Original',
          version: 1,
          tasks: {
            create: [{ projectId, description: 'Task', hoursSpent: 8, progressPercentage: 100 }]
          }
        }
      })

      // When: 2つの同時更新
      const repo1 = new PrismaDailyReportRepository(prisma)
      const repo2 = new PrismaDailyReportRepository(prisma)

      const fetched1 = await repo1.findById('report1')
      const fetched2 = await repo2.findById('report1')

      if (!fetched1 || !fetched2) throw new Error('Report not found')

      // 最初の更新は成功
      const update1 = await repo1.update(
        createDailyReport({ ...fetched1, challenges: 'Updated by 1' })
      )
      expect(update1.challenges).toBe('Updated by 1')

      // 2番目の更新は失敗（古いバージョンを持っているため）
      await expect(
        repo2.update(createDailyReport({ ...fetched2, challenges: 'Updated by 2' }))
      ).rejects.toThrow()
    })
  })
})
```

### 3.3 認証・認可統合テスト

#### `src/backend/infrastructure/auth/__tests__/auth.integration.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { JwtTokenGenerator } from '../token-generator'
import { BcryptPasswordHasher } from '../password-hasher'
import { authMiddleware } from '../../../middleware/auth'
import { Hono } from 'hono'
import type { Context } from 'hono'

describe('Authentication Integration Tests', () => {
  let tokenGenerator: JwtTokenGenerator
  let passwordHasher: BcryptPasswordHasher
  let app: Hono

  beforeEach(() => {
    tokenGenerator = new JwtTokenGenerator()
    passwordHasher = new BcryptPasswordHasher()
    app = new Hono()
  })

  describe('Password Hashing', () => {
    it('パスワードをハッシュ化して検証する', async () => {
      // Given
      const plainPassword = 'SecurePassword123!'

      // When
      const hash = await passwordHasher.hash(plainPassword)
      const isValid = await passwordHasher.verify(plainPassword, hash)
      const isInvalid = await passwordHasher.verify('WrongPassword', hash)

      // Then
      expect(hash).not.toBe(plainPassword)
      expect(hash.length).toBeGreaterThan(50)
      expect(isValid).toBe(true)
      expect(isInvalid).toBe(false)
    })

    it('同じパスワードでも異なるハッシュを生成する', async () => {
      // Given
      const password = 'TestPassword123!'

      // When
      const hash1 = await passwordHasher.hash(password)
      const hash2 = await passwordHasher.hash(password)

      // Then
      expect(hash1).not.toBe(hash2)
      expect(await passwordHasher.verify(password, hash1)).toBe(true)
      expect(await passwordHasher.verify(password, hash2)).toBe(true)
    })
  })

  describe('JWT Token', () => {
    it('トークンを生成して検証する', async () => {
      // Given
      const userId = 'user123'
      const role = 'employee'

      // When
      const token = await tokenGenerator.generate(userId, role)
      const payload = await tokenGenerator.verify(token)

      // Then
      expect(token).toBeTruthy()
      expect(payload.userId).toBe(userId)
      expect(payload.role).toBe(role)
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000)
    })

    it('無効なトークンを拒否する', async () => {
      // When/Then
      await expect(
        tokenGenerator.verify('invalid.token.here')
      ).rejects.toThrow()
    })

    it('期限切れトークンを拒否する', async () => {
      // Given: 1秒で期限切れになるトークン
      const shortLivedToken = await tokenGenerator.generate('user123', 'employee', '1s')

      // When: 2秒待つ
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Then
      await expect(
        tokenGenerator.verify(shortLivedToken)
      ).rejects.toThrow()
    })
  })

  describe('Auth Middleware', () => {
    beforeEach(() => {
      // テストエンドポイント設定
      app.use('/api/*', authMiddleware)
      app.get('/api/protected', (c) => c.json({ message: 'Protected resource' }))
      app.get('/api/admin-only', authMiddleware(['admin']), (c) => 
        c.json({ message: 'Admin only resource' })
      )
    })

    it('有効なトークンでアクセスを許可する', async () => {
      // Given
      const token = await tokenGenerator.generate('user123', 'employee')

      // When
      const res = await app.request('/api/protected', {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Then
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.message).toBe('Protected resource')
    })

    it('トークンなしでアクセスを拒否する', async () => {
      // When
      const res = await app.request('/api/protected')

      // Then
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toContain('認証が必要です')
    })

    it('無効なトークンでアクセスを拒否する', async () => {
      // When
      const res = await app.request('/api/protected', {
        headers: { Authorization: 'Bearer invalid.token' }
      })

      // Then
      expect(res.status).toBe(401)
    })

    it('ロールベースアクセス制御を実施する', async () => {
      // Given
      const employeeToken = await tokenGenerator.generate('user123', 'employee')
      const adminToken = await tokenGenerator.generate('admin123', 'admin')

      // When: 従業員が管理者専用リソースにアクセス
      const employeeRes = await app.request('/api/admin-only', {
        headers: { Authorization: `Bearer ${employeeToken}` }
      })

      // Then
      expect(employeeRes.status).toBe(403)

      // When: 管理者がアクセス
      const adminRes = await app.request('/api/admin-only', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })

      // Then
      expect(adminRes.status).toBe(200)
    })
  })
})
```

## 4. テストユーティリティ

### 4.1 テストデータファクトリー

#### `tests/factories/user.factory.ts`
```typescript
import { User, createUserId } from '@/backend/domain/types/user'
import { createDepartmentId } from '@/backend/domain/types/department'
import { ulid } from 'ulid'

export const createTestUser = (overrides?: Partial<User>): User => {
  const id = ulid()
  return {
    id: createUserId(id),
    email: `test-${id}@example.com`,
    name: `Test User ${id}`,
    role: 'employee',
    departmentId: createDepartmentId('dept1'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

export const createTestManager = (overrides?: Partial<User>): User => 
  createTestUser({ role: 'manager', ...overrides })

export const createTestAdmin = (overrides?: Partial<User>): User => 
  createTestUser({ role: 'admin', ...overrides })
```

#### `tests/factories/daily-report.factory.ts`
```typescript
import { DailyReport, createDailyReportId } from '@/backend/domain/types/daily-report'
import { createUserId } from '@/backend/domain/types/user'
import { createProjectId } from '@/backend/domain/types/project'
import { ulid } from 'ulid'

export const createTestDailyReport = (overrides?: Partial<DailyReport>): DailyReport => {
  const id = ulid()
  return {
    id: createDailyReportId(id),
    userId: createUserId('user1'),
    date: new Date(),
    tasks: [{
      projectId: createProjectId('proj1'),
      description: 'Test task',
      hoursSpent: 8,
      progress: 100
    }],
    challenges: 'Test challenges',
    nextDayPlan: 'Test plan',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}
```

### 4.2 テストヘルパー

#### `tests/helpers/database.ts`
```typescript
import { PrismaClient } from '@prisma/client'

export async function cleanDatabase(prisma: PrismaClient) {
  const tables = ['task', 'dailyReport', 'notification', 'user', 'project', 'department']
  
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
  }
}

export async function seedTestData(prisma: PrismaClient) {
  // 基本的なテストデータを作成
  const dept = await prisma.department.create({
    data: {
      id: 'test-dept',
      name: 'Test Department'
    }
  })

  const admin = await prisma.user.create({
    data: {
      id: 'test-admin',
      email: 'admin@test.com',
      passwordHash: '$2b$10$...',  // bcrypt hash of 'password'
      name: 'Test Admin',
      role: 'admin',
      departmentId: dept.id,
      isActive: true
    }
  })

  const project = await prisma.project.create({
    data: {
      id: 'test-project',
      name: 'Test Project',
      departmentId: dept.id,
      isActive: true
    }
  })

  return { dept, admin, project }
}
```

## 5. 実行コマンドとCI/CD設定

### 5.1 package.json スクリプト

```json
{
  "scripts": {
    "test:integration": "vitest run --config vitest.config.integration.ts",
    "test:integration:watch": "vitest --config vitest.config.integration.ts",
    "test:integration:coverage": "vitest run --config vitest.config.integration.ts --coverage",
    "test:integration:ui": "vitest --config vitest.config.integration.ts --ui",
    "docker:test:up": "docker-compose -f docker-compose.test.yml up -d",
    "docker:test:down": "docker-compose -f docker-compose.test.yml down",
    "docker:test:clean": "docker-compose -f docker-compose.test.yml down -v",
    "db:migrate:test": "DATABASE_URL=$DATABASE_URL_TEST prisma migrate deploy",
    "db:reset:test": "DATABASE_URL=$DATABASE_URL_TEST prisma migrate reset --force"
  }
}
```

### 5.2 GitHub Actions設定

#### `.github/workflows/integration-tests.yml`
```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: daily_report_test
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5433/daily_report_test
        run: |
          npm run db:migrate:test
      
      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5433/daily_report_test
          JWT_SECRET: test-jwt-secret
        run: npm run test:integration:coverage
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
          flags: integration
```

## 6. 実装優先順位とロードマップ

### Phase 1: 基盤構築（1週目）
1. テスト環境設定（Docker, 環境変数, Vitest設定）
2. テストヘルパー・ファクトリーの実装
3. データベースセットアップ・クリーンアップユーティリティ

### Phase 2: コア機能テスト（2-3週目）
1. ユーザー認証ワークフロー統合テスト
2. 日報CRUD統合テスト
3. ステータス遷移統合テスト

### Phase 3: インフラ層テスト（4週目）
1. リポジトリ層統合テスト
2. 認証・認可ミドルウェアテスト
3. トランザクション・同時実行制御テスト

### Phase 4: API層テスト（5-6週目）
1. REST APIルートハンドラーの実装
2. APIエンドポイント統合テスト
3. エラーハンドリング統合テスト

### Phase 5: E2Eテスト（7-8週目）
1. Playwright E2E環境構築
2. 主要ユーザーフロー E2Eテスト
3. クロスブラウザテスト

## 7. 成功指標

### カバレッジ目標
- 統合テストカバレッジ: 80%以上
- 重要ビジネスロジック: 95%以上
- エラーケース: 90%以上

### パフォーマンス目標
- 各統合テスト実行時間: 5秒以内
- 全統合テスト実行時間: 5分以内
- データベース接続プール: 適切な管理

### 品質指標
- フレーキーテスト: 0%
- テスト分離度: 100%（各テスト独立実行可能）
- CI/CD成功率: 95%以上

## 8. 注意事項とベストプラクティス

### テスト設計原則
1. **AAA パターン**: Arrange（準備）、Act（実行）、Assert（検証）
2. **独立性**: 各テストは他のテストに依存しない
3. **決定性**: 同じ条件で常に同じ結果
4. **高速性**: 必要最小限のデータとセットアップ

### データ管理
1. **テストごとのクリーンアップ**: beforeEachでデータリセット
2. **トランザクション利用**: 可能な限りトランザクション内でテスト
3. **固定データ回避**: 動的なテストデータ生成

### エラーハンドリング
1. **期待するエラーの明示**: エラーの型とメッセージを検証
2. **境界値テスト**: 限界値での動作確認
3. **異常系の網羅**: 全てのエラーパスをカバー

### 保守性
1. **DRY原則**: テストコードの重複を避ける
2. **可読性**: テスト名で何をテストしているか明確に
3. **ドキュメント**: 複雑なテストにはコメントを追加

## まとめ

この統合テスト計画は、現在の実装状況を踏まえた実践的なアプローチを提供します。ドメイン層の完全な実装を活かし、段階的にテストカバレッジを向上させることで、システムの品質と信頼性を確保します。

優先順位に従って実装を進めることで、最も重要なビジネスロジックから保護し、徐々に包括的なテストスイートを構築できます。