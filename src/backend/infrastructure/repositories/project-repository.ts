import type { PrismaClient } from '@prisma/client'
import type { Project } from '../../domain/types/project'
import type { ProjectRepository } from '../../domain/workflows/daily-report-workflow'
import { createDepartmentId, createProjectId } from '../../domain/types/base'

// PrismaのProject型からドメインのProject型への変換
const toDomainProject = (prismaProject: any): Project => {
  return {
    id: createProjectId(prismaProject.id),
    name: prismaProject.name,
    description: prismaProject.description || undefined,
    departmentId: createDepartmentId(prismaProject.departmentId),
    status: prismaProject.status as Project['status'],
    startDate: prismaProject.startDate,
    endDate: prismaProject.endDate || undefined,
    isActive: prismaProject.isActive,
    createdAt: prismaProject.createdAt,
    updatedAt: prismaProject.updatedAt,
  }
}

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Project | null> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    })
    return project ? toDomainProject(project) : null
  }

  async findByIds(ids: string[]): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        id: { in: ids },
      },
    })
    return projects.map(toDomainProject)
  }
}
