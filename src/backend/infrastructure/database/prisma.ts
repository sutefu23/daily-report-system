import { PrismaClient } from '@prisma/client'

// Singleton パターンでPrismaClientのインスタンスを管理
let prisma: PrismaClient | undefined

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    })
  }
  return prisma
}

// アプリケーション終了時のクリーンアップ
export const disconnectPrisma = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect()
    prisma = undefined
  }
}

// Prismaのエラーハンドリングユーティリティ
export const isPrismaError = (
  error: unknown
): error is { code: string; meta?: { target?: string[] } } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string'
  )
}

// Prismaエラーコード定義
export const PrismaErrorCode = {
  UNIQUE_CONSTRAINT_FAILED: 'P2002',
  FOREIGN_KEY_CONSTRAINT_FAILED: 'P2003',
  RECORD_NOT_FOUND: 'P2025',
} as const
