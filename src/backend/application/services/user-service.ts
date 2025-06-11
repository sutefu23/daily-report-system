import type { 
  AuthenticateUserInput,
  ChangePasswordInput,
  CreateUserInput, 
  UpdateUserInput, 
  User,
  UserSearchCriteria
} from '../../domain/types/user'
import type { Either } from '../../domain/types/base'
import type { DomainError } from '../../domain/errors'
import type { UserRepository, PasswordHasher } from '../../domain/workflows/user-workflow'
import {
  authenticateUserWorkflow,
  changePasswordWorkflow,
  createUserWorkflow,
  getSubordinatesWorkflow,
  getUserWorkflow,
  updateUserWorkflow
} from '../../domain/workflows/user-workflow'

export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  // ユーザー作成
  async createUser(input: CreateUserInput): Promise<Either<DomainError, User>> {
    return createUserWorkflow(this.userRepo, this.passwordHasher)(input)
  }

  // ユーザー更新
  async updateUser(input: UpdateUserInput): Promise<Either<DomainError, User>> {
    return updateUserWorkflow(this.userRepo)(input)
  }

  // パスワード変更
  async changePassword(input: ChangePasswordInput): Promise<Either<DomainError, void>> {
    return changePasswordWorkflow(this.userRepo, this.passwordHasher)(input)
  }

  // ユーザー認証
  async authenticate(input: AuthenticateUserInput): Promise<Either<DomainError, User>> {
    return authenticateUserWorkflow(this.userRepo, this.passwordHasher)(input)
  }

  // ユーザー取得
  async getUser(userId: string): Promise<Either<DomainError, User>> {
    return getUserWorkflow(this.userRepo)(userId)
  }

  // ユーザー検索
  async searchUsers(criteria: UserSearchCriteria): Promise<User[]> {
    const users = await this.userRepo.search(criteria)
    // パスワードを除外
    return users.map(user => {
      const { password: _, ...userWithoutPassword } = user
      return userWithoutPassword as User
    })
  }

  // 部下一覧取得
  async getSubordinates(managerId: string): Promise<Either<DomainError, User[]>> {
    return getSubordinatesWorkflow(this.userRepo)(managerId)
  }
}