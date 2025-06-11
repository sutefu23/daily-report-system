import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { UserService } from '../application/services/user-service'
import { createAuthMiddleware, requireAdmin, type AuthVariables } from '../middleware/auth'
import { isRight } from '../domain/types/base'
import { domainErrorToHttpStatus, toErrorResponse } from '../domain/errors'

// リクエストスキーマ
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'manager', 'employee']).optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

const searchUsersSchema = z.object({
  email: z.string().optional(),
  name: z.string().optional(),
  role: z.enum(['admin', 'manager', 'employee']).optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const createUserRoutes = (userService: UserService) => {
  const app = new Hono<{ Variables: AuthVariables }>()

  // 現在のユーザー情報取得
  app.get('/me', async (c) => {
    const user = c.get('user')
    const result = await userService.getUser(user.userId)

    if (!isRight(result)) {
      const error = result.left
      return c.json(toErrorResponse(error), domainErrorToHttpStatus(error))
    }

    const userData = result.right
    return c.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        departmentId: userData.departmentId,
        managerId: userData.managerId,
        isActive: userData.isActive,
        slackUserId: userData.slackUserId,
      },
    })
  })

  // ユーザー情報更新（自分の情報のみ）
  app.put('/me', zValidator('json', updateUserSchema), async (c) => {
    const user = c.get('user')
    const input = c.req.valid('json')

    // 自分の情報のみ更新可能（roleとisActiveは変更不可）
    const { role, isActive, ...allowedUpdates } = input

    const result = await userService.updateUser({
      id: user.userId,
      ...allowedUpdates,
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(toErrorResponse(error), domainErrorToHttpStatus(error))
    }

    const updatedUser = result.right
    return c.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        departmentId: updatedUser.departmentId,
        managerId: updatedUser.managerId,
        isActive: updatedUser.isActive,
        slackUserId: updatedUser.slackUserId,
      },
    })
  })

  // パスワード変更
  app.put('/me/password', zValidator('json', changePasswordSchema), async (c) => {
    const user = c.get('user')
    const { currentPassword, newPassword } = c.req.valid('json')

    const result = await userService.changePassword({
      userId: user.userId,
      currentPassword,
      newPassword,
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(toErrorResponse(error), domainErrorToHttpStatus(error))
    }

    return c.json({ message: 'Password changed successfully' })
  })

  // ユーザー一覧取得（管理者のみ）
  app.get('/', requireAdmin(), zValidator('query', searchUsersSchema), async (c) => {
    const criteria = c.req.valid('query')
    const users = await userService.searchUsers(criteria)

    return c.json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        managerId: user.managerId,
        isActive: user.isActive,
        slackUserId: user.slackUserId,
      })),
    })
  })

  // 特定ユーザー取得（管理者のみ）
  app.get('/:id', requireAdmin(), async (c) => {
    const userId = c.req.param('id')
    const result = await userService.getUser(userId)

    if (!isRight(result)) {
      const error = result.left
      return c.json(toErrorResponse(error), domainErrorToHttpStatus(error))
    }

    const userData = result.right
    return c.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        departmentId: userData.departmentId,
        managerId: userData.managerId,
        isActive: userData.isActive,
        slackUserId: userData.slackUserId,
      },
    })
  })

  // ユーザー更新（管理者のみ）
  app.put('/:id', requireAdmin(), zValidator('json', updateUserSchema), async (c) => {
    const userId = c.req.param('id')
    const input = c.req.valid('json')

    const result = await userService.updateUser({
      id: userId,
      ...input,
    })

    if (!isRight(result)) {
      const error = result.left
      return c.json(toErrorResponse(error), domainErrorToHttpStatus(error))
    }

    const updatedUser = result.right
    return c.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        departmentId: updatedUser.departmentId,
        managerId: updatedUser.managerId,
        isActive: updatedUser.isActive,
        slackUserId: updatedUser.slackUserId,
      },
    })
  })

  // 部下一覧取得（マネージャー以上）
  app.get('/me/subordinates', async (c) => {
    const user = c.get('user')

    if (user.role !== 'manager' && user.role !== 'admin') {
      return c.json({ error: { message: 'Forbidden' } }, 403)
    }

    const result = await userService.getSubordinates(user.userId)

    if (!isRight(result)) {
      const error = result.left
      return c.json(toErrorResponse(error), domainErrorToHttpStatus(error))
    }

    const subordinates = result.right
    return c.json({
      users: subordinates.map((sub) => ({
        id: sub.id,
        email: sub.email,
        name: sub.name,
        role: sub.role,
        departmentId: sub.departmentId,
        isActive: sub.isActive,
      })),
    })
  })

  return app
}
