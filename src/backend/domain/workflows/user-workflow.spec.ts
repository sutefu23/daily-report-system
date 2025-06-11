import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createUserWorkflow,
  updateUserWorkflow,
  changePasswordWorkflow,
  authenticateUserWorkflow,
  type UserRepository,
  type PasswordHasher,
} from './user-workflow'
import type { User, CreateUserInput } from '../types/user'
import { createDepartmentId, createUserId, isRight, isLeft } from '../types/base'

// モックリポジトリとハッシャーの作成
const createMockUserRepository = (): UserRepository => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  search: vi.fn(),
  findSubordinates: vi.fn(),
})

const createMockPasswordHasher = (): PasswordHasher => ({
  hash: vi.fn(),
  verify: vi.fn(),
})

describe('User Workflows', () => {
  let mockUserRepo: UserRepository
  let mockPasswordHasher: PasswordHasher

  beforeEach(() => {
    mockUserRepo = createMockUserRepository()
    mockPasswordHasher = createMockPasswordHasher()
  })

  describe('createUserWorkflow', () => {
    it('should create a new user with valid input', async () => {
      // Arrange
      const input: CreateUserInput = {
        email: 'test@example.com',
        password: 'StrongPass123',
        name: 'Test User',
        role: 'employee',
        departmentId: createDepartmentId('dept-123'),
      }

      const hashedPassword = 'hashed-password'
      const createdUser: User = {
        id: createUserId('user-123'),
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: input.role,
        departmentId: input.departmentId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue(hashedPassword)
      vi.mocked(mockUserRepo.create).mockResolvedValue(createdUser)

      // Act
      const workflow = createUserWorkflow(mockUserRepo, mockPasswordHasher)
      const result = await workflow(input)

      // Assert
      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.right.email).toBe(input.email)
        expect(result.right.name).toBe(input.name)
        expect(result.right.password).toBeUndefined() // パスワードは除外される
      }

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(input.email)
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith(input.password)
      expect(mockUserRepo.create).toHaveBeenCalled()
    })

    it('should fail when email is invalid', async () => {
      // Arrange
      const input: CreateUserInput = {
        email: 'invalid-email',
        password: 'StrongPass123',
        name: 'Test User',
        role: 'employee',
        departmentId: createDepartmentId('dept-123'),
      }

      // Act
      const workflow = createUserWorkflow(mockUserRepo, mockPasswordHasher)
      const result = await workflow(input)

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('VALIDATION_ERROR')
        expect(result.left.message).toContain('無効なメールアドレス')
      }
    })

    it('should fail when password is weak', async () => {
      // Arrange
      const input: CreateUserInput = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        role: 'employee',
        departmentId: createDepartmentId('dept-123'),
      }

      // Act
      const workflow = createUserWorkflow(mockUserRepo, mockPasswordHasher)
      const result = await workflow(input)

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('VALIDATION_ERROR')
        expect(result.left.message).toContain('パスワードは8文字以上')
      }
    })

    it('should fail when email already exists', async () => {
      // Arrange
      const input: CreateUserInput = {
        email: 'existing@example.com',
        password: 'StrongPass123',
        name: 'Test User',
        role: 'employee',
        departmentId: createDepartmentId('dept-123'),
      }

      const existingUser: User = {
        id: createUserId('existing-user'),
        email: input.email,
        name: 'Existing User',
        role: 'employee',
        departmentId: input.departmentId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(existingUser)

      // Act
      const workflow = createUserWorkflow(mockUserRepo, mockPasswordHasher)
      const result = await workflow(input)

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('ALREADY_EXISTS')
        expect(result.left.message).toContain('既に使用されています')
      }
    })
  })

  describe('authenticateUserWorkflow', () => {
    it('should authenticate user with valid credentials', async () => {
      // Arrange
      const email = 'test@example.com'
      const password = 'StrongPass123'
      const hashedPassword = 'hashed-password'

      const user: User = {
        id: createUserId('user-123'),
        email,
        password: hashedPassword,
        name: 'Test User',
        role: 'employee',
        departmentId: createDepartmentId('dept-123'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user)
      vi.mocked(mockPasswordHasher.verify).mockResolvedValue(true)

      // Act
      const workflow = authenticateUserWorkflow(mockUserRepo, mockPasswordHasher)
      const result = await workflow({ email, password })

      // Assert
      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.right.email).toBe(email)
        expect(result.right.password).toBeUndefined() // パスワードは除外される
      }
    })

    it('should fail with incorrect password', async () => {
      // Arrange
      const email = 'test@example.com'
      const password = 'WrongPassword'
      const hashedPassword = 'hashed-password'

      const user: User = {
        id: createUserId('user-123'),
        email,
        password: hashedPassword,
        name: 'Test User',
        role: 'employee',
        departmentId: createDepartmentId('dept-123'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user)
      vi.mocked(mockPasswordHasher.verify).mockResolvedValue(false)

      // Act
      const workflow = authenticateUserWorkflow(mockUserRepo, mockPasswordHasher)
      const result = await workflow({ email, password })

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('UNAUTHORIZED')
      }
    })

    it('should fail when user is inactive', async () => {
      // Arrange
      const email = 'test@example.com'
      const password = 'StrongPass123'
      const hashedPassword = 'hashed-password'

      const user: User = {
        id: createUserId('user-123'),
        email,
        password: hashedPassword,
        name: 'Test User',
        role: 'employee',
        departmentId: createDepartmentId('dept-123'),
        isActive: false, // 無効化されたユーザー
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(user)
      vi.mocked(mockPasswordHasher.verify).mockResolvedValue(true)

      // Act
      const workflow = authenticateUserWorkflow(mockUserRepo, mockPasswordHasher)
      const result = await workflow({ email, password })

      // Assert
      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left.type).toBe('FORBIDDEN')
        expect(result.left.message).toContain('無効化されています')
      }
    })
  })
})
