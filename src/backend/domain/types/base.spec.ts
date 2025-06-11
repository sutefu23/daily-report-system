import { describe, it, expect } from 'vitest'
import {
  createUserId,
  createDailyReportId,
  createDepartmentId,
  createProjectId,
  left,
  right,
  isLeft,
  isRight,
  map,
  flatMap,
  none,
  some,
  isNone,
  isSome,
  isValidDate,
  type Either,
  type Option,
} from './base'

describe('Base Types', () => {
  describe('Branded Types', () => {
    it('should create branded types', () => {
      const userId = createUserId('user-123')
      const reportId = createDailyReportId('report-123')
      const deptId = createDepartmentId('dept-123')
      const projectId = createProjectId('project-123')

      expect(userId).toBe('user-123')
      expect(reportId).toBe('report-123')
      expect(deptId).toBe('dept-123')
      expect(projectId).toBe('project-123')

      // TypeScriptの型システムにより、以下はコンパイルエラーになる
      // const wrongAssignment: UserId = reportId
    })
  })

  describe('Either Type', () => {
    it('should create Left and Right values', () => {
      const leftValue = left<string, number>('error')
      const rightValue = right<string, number>(42)

      expect(isLeft(leftValue)).toBe(true)
      expect(isRight(leftValue)).toBe(false)
      expect(leftValue.left).toBe('error')

      expect(isRight(rightValue)).toBe(true)
      expect(isLeft(rightValue)).toBe(false)
      expect(rightValue.right).toBe(42)
    })

    it('should map over Right values', () => {
      const rightValue = right<string, number>(10)
      const mapped = map(rightValue, (n) => n * 2)

      expect(isRight(mapped)).toBe(true)
      if (isRight(mapped)) {
        expect(mapped.right).toBe(20)
      }
    })

    it('should not map over Left values', () => {
      const leftValue = left<string, number>('error')
      const mapped = map(leftValue, (n) => n * 2)

      expect(isLeft(mapped)).toBe(true)
      if (isLeft(mapped)) {
        expect(mapped.left).toBe('error')
      }
    })

    it('should flatMap over Right values', () => {
      const rightValue = right<string, number>(10)
      const result = flatMap(rightValue, (n) => (n > 5 ? right(n * 2) : left('too small')))

      expect(isRight(result)).toBe(true)
      if (isRight(result)) {
        expect(result.right).toBe(20)
      }
    })

    it('should handle flatMap with Left result', () => {
      const rightValue = right<string, number>(3)
      const result = flatMap(rightValue, (n) => (n > 5 ? right(n * 2) : left('too small')))

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left).toBe('too small')
      }
    })

    it('should not flatMap over Left values', () => {
      const leftValue = left<string, number>('initial error')
      const result = flatMap(leftValue, (n) => right(n * 2))

      expect(isLeft(result)).toBe(true)
      if (isLeft(result)) {
        expect(result.left).toBe('initial error')
      }
    })
  })

  describe('Option Type', () => {
    it('should create None and Some values', () => {
      const noneValue = none<number>()
      const someValue = some(42)

      expect(isNone(noneValue)).toBe(true)
      expect(isSome(noneValue)).toBe(false)

      expect(isSome(someValue)).toBe(true)
      expect(isNone(someValue)).toBe(false)
      if (isSome(someValue)) {
        expect(someValue.value).toBe(42)
      }
    })

    it('should handle null/undefined with Option', () => {
      const getValue = (key: string): Option<string> => {
        const value = { foo: 'bar' }[key]
        return value ? some(value) : none()
      }

      const existing = getValue('foo')
      const missing = getValue('baz')

      expect(isSome(existing)).toBe(true)
      if (isSome(existing)) {
        expect(existing.value).toBe('bar')
      }

      expect(isNone(missing)).toBe(true)
    })
  })

  describe('Date Validation', () => {
    it('should validate valid dates', () => {
      expect(isValidDate(new Date())).toBe(true)
      expect(isValidDate(new Date('2024-01-15'))).toBe(true)
      expect(isValidDate(new Date(2024, 0, 15))).toBe(true)
    })

    it('should reject invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false)
      expect(isValidDate(new Date('2024-13-45'))).toBe(false)
    })
  })
})
