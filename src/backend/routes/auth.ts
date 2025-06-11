import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { UserService } from '../application/services/user-service'
import type { JwtTokenGenerator } from '../infrastructure/auth/token-generator'
import { isRight } from '../domain/types/base'
import { domainErrorToHttpStatus, toErrorResponse } from '../domain/errors'

// リクエストスキーマ
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  departmentId: z.string().min(1)
})

export const createAuthRoutes = (
  userService: UserService,
  tokenGenerator: JwtTokenGenerator
) => {
  const app = new Hono()

  // ログイン
  app.post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json')

    const result = await userService.authenticate({ email, password })

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    const user = result.right
    const token = tokenGenerator.generateToken(user)
    const refreshToken = tokenGenerator.generateRefreshToken(user)

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId
      },
      token,
      refreshToken
    })
  })

  // ユーザー登録（初期実装では一般ユーザーのみ）
  app.post('/register', zValidator('json', registerSchema), async (c) => {
    const input = c.req.valid('json')

    const result = await userService.createUser({
      ...input,
      role: 'employee' // デフォルトは一般社員
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(
        toErrorResponse(error),
        domainErrorToHttpStatus(error)
      )
    }

    const user = result.right
    const token = tokenGenerator.generateToken(user)
    const refreshToken = tokenGenerator.generateRefreshToken(user)

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId
      },
      token,
      refreshToken
    }, 201)
  })

  // トークンリフレッシュ
  app.post('/refresh', async (c) => {
    const { refreshToken } = await c.req.json()

    if (!refreshToken) {
      return c.json({ error: { message: 'Refresh token is required' } }, 400)
    }

    try {
      const payload = tokenGenerator.verifyToken(refreshToken)
      const userResult = await userService.getUser(payload.sub)

      if (!isRight(userResult)) {
        return c.json({ error: { message: 'User not found' } }, 401)
      }

      const user = userResult.right
      if (!user.isActive) {
        return c.json({ error: { message: 'Account is deactivated' } }, 403)
      }

      const newToken = tokenGenerator.generateToken(user)
      const newRefreshToken = tokenGenerator.generateRefreshToken(user)

      return c.json({
        token: newToken,
        refreshToken: newRefreshToken
      })
    } catch (error) {
      return c.json({ error: { message: 'Invalid refresh token' } }, 401)
    }
  })

  return app
}