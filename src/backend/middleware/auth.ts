import type { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { JwtTokenGenerator } from '../infrastructure/auth/token-generator'
import type { UserService } from '../application/services/user-service'
import { isRight } from '../domain/types/base'

// 認証情報の型
export type AuthUser = {
  userId: string
  email: string
  role: string
}

// Context変数の型定義
export type AuthVariables = {
  user: AuthUser
}

// JWT認証ミドルウェア
export const createAuthMiddleware = (
  tokenGenerator: JwtTokenGenerator,
  userService: UserService
) => createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: { message: 'Unauthorized' } }, 401)
    }

    const token = authHeader.substring(7)
    
    // トークンの検証
    const payload = tokenGenerator.verifyToken(token)
    
    // ユーザーの存在確認とアクティブチェック
    const userResult = await userService.getUser(payload.sub)
    if (!isRight(userResult)) {
      return c.json({ error: { message: 'Unauthorized' } }, 401)
    }

    const user = userResult.right
    if (!user.isActive) {
      return c.json({ error: { message: 'Account is deactivated' } }, 403)
    }

    // 認証情報をコンテキストに設定
    c.set('user', {
      userId: user.id,
      email: user.email,
      role: user.role
    })

    await next()
  } catch (error) {
    return c.json({ error: { message: 'Unauthorized' } }, 401)
  }
})

// ロールベースの認可ミドルウェア
export const requireRole = (allowedRoles: string[]) => 
  createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const user = c.get('user')
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json({ error: { message: 'Forbidden' } }, 403)
    }
    await next()
  })

// 管理者権限チェック
export const requireAdmin = () => requireRole(['admin'])

// マネージャー以上の権限チェック
export const requireManager = () => requireRole(['admin', 'manager'])