import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDailyReportWorkflow,
  submitDailyReportWorkflow,
  approveDailyReportWorkflow,
  rejectDailyReportWorkflow,
  type DailyReportRepository,
  type UserRepository,
  type ProjectRepository,
  type CommentRepository,
} from './daily-report-workflow'
import type { DailyReport, CreateDailyReportInput } from '../types/daily-report'
import type { User } from '../types/user'
import type { Project } from '../types/project'
import {
  createDailyReportId,
  createProjectId,
  createUserId,
  createDepartmentId,
  isRight,
  isLeft,
} from '../types/base'

// モックリポジトリの作成
const createMockDailyReportRepository = (): DailyReportRepository => ({
  findById: vi.fn(),
  findByUserAndDate: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  search: vi.fn(),
  calculateSummary: vi.fn(),
})

const createMockUserRepository = (): UserRepository => ({
  findById: vi.fn(),
})

const createMockProjectRepository = (): ProjectRepository => ({
  findById: vi.fn(),
  findByIds: vi.fn(),
})

const createMockCommentRepository = (): CommentRepository => ({
  findById: vi.fn(),
  findByDailyReportId: vi.fn(),
  create: vi.fn(),
  markAsRead: vi.fn(),
})

// テスト用のユーザー作成
const createTestUser = (role: 'admin' | 'manager' | 'employee' = 'employee'): User => ({
  id: createUserId('user-123'),
  email: 'test@example.com',
  name: 'Test User',
  role,
  departmentId: createDepartmentId('dept-123'),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

// テスト用のプロジェクト作成
const createTestProject = (): Project => ({
  id: createProjectId('project-123'),
  name: 'Test Project',
  departmentId: createDepartmentId('dept-123'),
  status: 'active',
  startDate: new Date('2024-01-01'),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('DailyReport Workflows', () => {
  let mockReportRepo: DailyReportRepository
  let mockUserRepo: UserRepository
  let mockProjectRepo: ProjectRepository
  let _mockCommentRepo: CommentRepository

  beforeEach(() => {
    mockReportRepo = createMockDailyReportRepository()
    mockUserRepo = createMockUserRepository()
    mockProjectRepo = createMockProjectRepository()
    _mockCommentRepo = createMockCommentRepository()
  })

  describe('createDailyReportWorkflow', () => {
    it('should create a daily report with valid input', async () => {
      // Arrange
      const userId = createUserId('user-123')
      const projectId = createProjectId('project-123')
      const input: CreateDailyReportInput = {
        userId,
        date: new Date('2024-01-15'),
        tasks: [
          {
            projectId,
            description: 'Implemented user authentication',
            hoursSpent: 4,
            progress: 80,
          },
        ],
        challenges: 'JWT token expiration handling',
        nextDayPlan: 'Complete authentication tests',
      }

      const user = createTestUser()
      const project = createTestProject()

      vi.mocked(mockUserRepo.findById).mockResolvedValue(user)
      vi.mocked(mockReportRepo.findByUserAndDate).mockResolvedValue(null)
      vi.mocked(mockProjectRepo.findByIds).mockResolvedValue([project])
      vi.mocked(mockReportRepo.create).mockImplementation(async (report) => report)

      // Act
      const workflow = createDailyReportWorkflow(mockReportRepo, mockUserRepo, mockProjectRepo)
      const result = await workflow(input)

      // Assert
      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.right.userId).toBe(userId)
        expect(result.right.date).toEqual(input.date)
        expect(result.right.tasks).toHaveLength(1)
        expect(result.right.status).toBe('draft')
        expect(result.right.challenges).toBe(input.challenges)
        expect(result.right.nextDayPlan).toBe(input.nextDayPlan)
      }

      expect(mockUserRepo.findById).toHaveBeenCalledWith(userId)
      expect(mockReportRepo.findByUserAndDate).toHaveBeenCalledWith(userId, input.date)
      expect(mockProjectRepo.findByIds).toHaveBeenCalledWith([projectId])
      expect(mockReportRepo.create).toHaveBeenCalled()
    })

    it('should fail when no tasks are provided', async () => {
      // Arrange
      const input: CreateDailyReportInput = {
        userId: createUserId('user-123'),
        date: new Date('2024-01-15'),
        tasks: [], // 空のタスク
        challenges: 'No challenges',
        nextDayPlan: 'Start new tasks',
      }

      // Act
      const workflow = createDailyReportWorkflow(mockReportRepo, mockUserRepo, mockProjectRepo)
      const result = await workflow(input)

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('VALIDATION_ERROR')
        expect(result.left.message).toContain('少なくとも1つのタスク')
      }
    })

    it('should fail when total work hours exceed 24', async () => {
      // Arrange
      const projectId = createProjectId('project-123')
      const input: CreateDailyReportInput = {
        userId: createUserId('user-123'),
        date: new Date('2024-01-15'),
        tasks: [
          {
            projectId,
            description: 'Task 1',
            hoursSpent: 15,
            progress: 50,
          },
          {
            projectId,
            description: 'Task 2',
            hoursSpent: 10, // 合計25時間
            progress: 50,
          },
        ],
        challenges: 'Too much work',
        nextDayPlan: 'Rest',
      }

      vi.mocked(mockProjectRepo.findByIds).mockResolvedValue([createTestProject()])

      // Act
      const workflow = createDailyReportWorkflow(mockReportRepo, mockUserRepo, mockProjectRepo)
      const result = await workflow(input)

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('VALIDATION_ERROR')
        expect(result.left.message).toContain('24時間を超える')
      }
    })

    it('should fail when report already exists for the date', async () => {
      // Arrange
      const userId = createUserId('user-123')
      const date = new Date('2024-01-15')
      const input: CreateDailyReportInput = {
        userId,
        date,
        tasks: [
          {
            projectId: createProjectId('project-123'),
            description: 'Task',
            hoursSpent: 8,
            progress: 100,
          },
        ],
        challenges: 'None',
        nextDayPlan: 'Continue',
      }

      const existingReport: DailyReport = {
        id: createDailyReportId('report-existing'),
        userId,
        date,
        tasks: [],
        challenges: 'Existing',
        nextDayPlan: 'Existing',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockUserRepo.findById).mockResolvedValue(createTestUser())
      vi.mocked(mockReportRepo.findByUserAndDate).mockResolvedValue(existingReport)
      vi.mocked(mockProjectRepo.findByIds).mockResolvedValue([createTestProject()])

      // Act
      const workflow = createDailyReportWorkflow(mockReportRepo, mockUserRepo, mockProjectRepo)
      const result = await workflow(input)

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('BUSINESS_RULE_VIOLATION')
        expect(result.left.message).toContain('既に存在します')
      }
    })
  })

  describe('submitDailyReportWorkflow', () => {
    it('should submit a draft report', async () => {
      // Arrange
      const reportId = createDailyReportId('report-123')
      const userId = createUserId('user-123')
      const draftReport: DailyReport = {
        id: reportId,
        userId,
        date: new Date('2024-01-15'),
        tasks: [],
        challenges: 'None',
        nextDayPlan: 'Continue',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockReportRepo.findById).mockResolvedValue(draftReport)
      vi.mocked(mockReportRepo.update).mockImplementation(async (report) => report)

      // Act
      const workflow = submitDailyReportWorkflow(mockReportRepo)
      const result = await workflow({ id: reportId, userId })

      // Assert
      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.right.status).toBe('submitted')
        expect(result.right.submittedAt).toBeDefined()
      }
    })

    it('should fail when report is already submitted', async () => {
      // Arrange
      const reportId = createDailyReportId('report-123')
      const userId = createUserId('user-123')
      const submittedReport: DailyReport = {
        id: reportId,
        userId,
        date: new Date('2024-01-15'),
        tasks: [],
        challenges: 'None',
        nextDayPlan: 'Continue',
        status: 'submitted', // 既に提出済み
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockReportRepo.findById).mockResolvedValue(submittedReport)

      // Act
      const workflow = submitDailyReportWorkflow(mockReportRepo)
      const result = await workflow({ id: reportId, userId })

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('BUSINESS_RULE_VIOLATION')
        expect(result.left.message).toContain('提出できない状態')
      }
    })
  })

  describe('approveDailyReportWorkflow', () => {
    it('should approve a submitted report by manager', async () => {
      // Arrange
      const reportId = createDailyReportId('report-123')
      const userId = createUserId('user-123')
      const managerId = createUserId('manager-123')
      const submittedReport: DailyReport = {
        id: reportId,
        userId,
        date: new Date('2024-01-15'),
        tasks: [],
        challenges: 'None',
        nextDayPlan: 'Continue',
        status: 'submitted',
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const manager = createTestUser('manager')
      manager.id = managerId

      vi.mocked(mockReportRepo.findById).mockResolvedValue(submittedReport)
      vi.mocked(mockUserRepo.findById).mockResolvedValue(manager)
      vi.mocked(mockReportRepo.update).mockImplementation(async (report) => report)

      // Act
      const workflow = approveDailyReportWorkflow(mockReportRepo, mockUserRepo)
      const result = await workflow({
        id: reportId,
        approverId: managerId,
        feedback: 'Good work!',
      })

      // Assert
      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.right.status).toBe('approved')
        expect(result.right.approvedAt).toBeDefined()
        expect(result.right.approvedBy).toBe(managerId)
        expect(result.right.feedback).toBe('Good work!')
      }
    })

    it('should fail when approver lacks permission', async () => {
      // Arrange
      const reportId = createDailyReportId('report-123')
      const employeeId = createUserId('employee-123')
      const submittedReport: DailyReport = {
        id: reportId,
        userId: createUserId('user-123'),
        date: new Date('2024-01-15'),
        tasks: [],
        challenges: 'None',
        nextDayPlan: 'Continue',
        status: 'submitted',
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const employee = createTestUser('employee') // 一般社員
      employee.id = employeeId

      vi.mocked(mockReportRepo.findById).mockResolvedValue(submittedReport)
      vi.mocked(mockUserRepo.findById).mockResolvedValue(employee)

      // Act
      const workflow = approveDailyReportWorkflow(mockReportRepo, mockUserRepo)
      const result = await workflow({
        id: reportId,
        approverId: employeeId,
      })

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('FORBIDDEN')
        expect(result.left.message).toContain('承認する権限がありません')
      }
    })
  })
})
