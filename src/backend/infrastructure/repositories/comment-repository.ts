import type { PrismaClient } from '@prisma/client'
import type { Comment } from '../../domain/types/daily-report'
import type { CommentRepository } from '../../domain/workflows/daily-report-workflow'
import { createCommentId, createDailyReportId, createUserId } from '../../domain/types/base'

// PrismaのComment型からドメインのComment型への変換
const toDomainComment = (prismaComment: any): Comment => {
  return {
    id: createCommentId(prismaComment.id),
    dailyReportId: createDailyReportId(prismaComment.dailyReportId),
    userId: createUserId(prismaComment.userId),
    content: prismaComment.content,
    isRead: prismaComment.isRead,
    createdAt: prismaComment.createdAt,
    updatedAt: prismaComment.updatedAt,
  }
}

export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Comment | null> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    })
    return comment ? toDomainComment(comment) : null
  }

  async findByDailyReportId(dailyReportId: string): Promise<Comment[]> {
    const comments = await this.prisma.comment.findMany({
      where: { dailyReportId },
      orderBy: { createdAt: 'asc' },
    })
    return comments.map(toDomainComment)
  }

  async create(comment: Comment): Promise<Comment> {
    const created = await this.prisma.comment.create({
      data: {
        id: comment.id,
        dailyReportId: comment.dailyReportId,
        userId: comment.userId,
        content: comment.content,
        isRead: comment.isRead,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      },
    })
    return toDomainComment(created)
  }

  async markAsRead(id: string): Promise<Comment> {
    const updated = await this.prisma.comment.update({
      where: { id },
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    })
    return toDomainComment(updated)
  }
}
