// ドメインエラー定義

// エラータイプ
export type DomainErrorType =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BUSINESS_RULE_VIOLATION'
  | 'EXTERNAL_SERVICE_ERROR'

// ドメインエラー
export type DomainError = {
  type: DomainErrorType
  message: string
  details?: unknown
}

// エラー生成関数
export const notFound = (message: string, details?: unknown): DomainError => ({
  type: 'NOT_FOUND',
  message,
  details,
})

export const alreadyExists = (message: string, details?: unknown): DomainError => ({
  type: 'ALREADY_EXISTS',
  message,
  details,
})

export const validationError = (message: string, details?: unknown): DomainError => ({
  type: 'VALIDATION_ERROR',
  message,
  details,
})

export const unauthorized = (message: string, details?: unknown): DomainError => ({
  type: 'UNAUTHORIZED',
  message,
  details,
})

export const forbidden = (message: string, details?: unknown): DomainError => ({
  type: 'FORBIDDEN',
  message,
  details,
})

export const businessRuleViolation = (message: string, details?: unknown): DomainError => ({
  type: 'BUSINESS_RULE_VIOLATION',
  message,
  details,
})

export const externalServiceError = (message: string, details?: unknown): DomainError => ({
  type: 'EXTERNAL_SERVICE_ERROR',
  message,
  details,
})

// HTTPステータスコードへのマッピング
export const domainErrorToHttpStatus = (error: DomainError): number => {
  switch (error.type) {
    case 'NOT_FOUND':
      return 404
    case 'ALREADY_EXISTS':
      return 409
    case 'VALIDATION_ERROR':
      return 400
    case 'UNAUTHORIZED':
      return 401
    case 'FORBIDDEN':
      return 403
    case 'BUSINESS_RULE_VIOLATION':
      return 422
    case 'EXTERNAL_SERVICE_ERROR':
      return 503
    default:
      return 500
  }
}

// エラーレスポンス型
export type ErrorResponse = {
  error: {
    type: DomainErrorType
    message: string
    details?: unknown
  }
}

// ドメインエラーをレスポンスに変換
export const toErrorResponse = (error: DomainError): ErrorResponse => ({
  error: {
    type: error.type,
    message: error.message,
    details: error.details,
  },
})
