import bcrypt from 'bcrypt'
import type { PasswordHasher } from '../../domain/workflows/user-workflow'

// bcryptを使用したパスワードハッシュ化の実装
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds: number

  constructor(saltRounds = 10) {
    this.saltRounds = saltRounds
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds)
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}
