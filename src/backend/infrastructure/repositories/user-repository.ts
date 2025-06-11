import type { PrismaClient } from '@prisma/client'
import type { User, UserSearchCriteria } from '../../domain/types/user'
import type { UserRepository } from '../../domain/workflows/user-workflow'
import { createDepartmentId, createUserId } from '../../domain/types/base'

// PrismaのUser型からドメインのUser型への変換
const toDomainUser = (prismaUser: any): User => {
  return {
    id: createUserId(prismaUser.id),
    email: prismaUser.email,
    password: prismaUser.passwordHash,
    name: prismaUser.name,
    role: prismaUser.role as User['role'],
    departmentId: createDepartmentId(prismaUser.departmentId),
    managerId: prismaUser.managerId ? createUserId(prismaUser.managerId) : undefined,
    isActive: prismaUser.isActive,
    slackUserId: prismaUser.slackUserId || undefined,
    createdAt: prismaUser.createdAt,
    updatedAt: prismaUser.updatedAt
  }
}

// ドメインのUser型からPrismaのデータ型への変換
const toPrismaData = (user: User): any => {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.password || '',
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
    managerId: user.managerId || null,
    isActive: user.isActive,
    slackUserId: user.slackUserId || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id }
    })
    return user ? toDomainUser(user) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    })
    return user ? toDomainUser(user) : null
  }

  async create(user: User): Promise<User> {
    const created = await this.prisma.user.create({
      data: toPrismaData(user)
    })
    return toDomainUser(created)
  }

  async update(user: User): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: toPrismaData(user)
    })
    return toDomainUser(updated)
  }

  async search(criteria: UserSearchCriteria): Promise<User[]> {
    const where: any = {}

    if (criteria.email) {
      where.email = { contains: criteria.email }
    }
    if (criteria.name) {
      where.name = { contains: criteria.name }
    }
    if (criteria.role) {
      where.role = criteria.role
    }
    if (criteria.departmentId) {
      where.departmentId = criteria.departmentId
    }
    if (criteria.managerId) {
      where.managerId = criteria.managerId
    }
    if (criteria.isActive !== undefined) {
      where.isActive = criteria.isActive
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return users.map(toDomainUser)
  }

  async findSubordinates(managerId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { 
        managerId,
        isActive: true
      },
      orderBy: { name: 'asc' }
    })

    return users.map(toDomainUser)
  }
}