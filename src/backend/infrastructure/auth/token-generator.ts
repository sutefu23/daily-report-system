import jwt from 'jsonwebtoken'
import type { User } from '../../domain/types/user'

// JWTペイロード型
export type JwtPayload = {
  sub: string // userId
  email: string
  role: string
  iat?: number
  exp?: number
}

// JWTトークン生成・検証
export class JwtTokenGenerator {
  private readonly secret: string
  private readonly expiresIn: string

  constructor(secret: string, expiresIn: string = '7d') {
    if (!secret) {
      throw new Error('JWT secret is required')
    }
    this.secret = secret
    this.expiresIn = expiresIn
  }

  // トークン生成
  generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    }

    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn
    })
  }

  // トークン検証
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.secret) as JwtPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      throw error
    }
  }

  // リフレッシュトークン生成（長期有効）
  generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    }

    return jwt.sign(payload, this.secret, {
      expiresIn: '30d'
    })
  }
}