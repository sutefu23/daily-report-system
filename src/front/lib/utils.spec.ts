import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('class1', 'class2')
    expect(result).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    const result = cn('base-class', true && 'conditional-class', false && 'hidden-class')
    expect(result).toBe('base-class conditional-class')
  })

  it('should merge Tailwind classes correctly', () => {
    // This tests the twMerge functionality - later classes should override earlier ones
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('should handle objects with conditional classes', () => {
    const result = cn({
      'base-class': true,
      'conditional-class': true,
      'hidden-class': false,
    })
    expect(result).toBe('base-class conditional-class')
  })

  it('should handle undefined and null values', () => {
    const result = cn('class1', undefined, null, 'class2')
    expect(result).toBe('class1 class2')
  })

  it('should handle empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle mixed input types', () => {
    const result = cn(
      'base',
      ['array1', 'array2'],
      {
        'object-class': true,
        'hidden': false,
      },
      undefined,
      'final'
    )
    expect(result).toBe('base array1 array2 object-class final')
  })

  it('should deduplicate identical classes', () => {
    const result = cn('duplicate', 'other', 'duplicate')
    expect(result).toBe('duplicate other')
  })

  it('should handle Tailwind conflicting classes', () => {
    // Test that twMerge properly handles conflicting Tailwind utilities
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toBe('bg-blue-500')
  })

  it('should handle complex Tailwind conflicts', () => {
    // Test more complex Tailwind merging scenarios
    const result = cn('px-2 py-1', 'p-3')
    expect(result).toBe('p-3')
  })

  it('should preserve non-conflicting classes', () => {
    const result = cn('text-white', 'bg-blue-500', 'hover:bg-blue-600')
    expect(result).toBe('text-white bg-blue-500 hover:bg-blue-600')
  })

  it('should handle responsive modifiers correctly', () => {
    const result = cn('w-full', 'md:w-1/2', 'lg:w-1/3')
    expect(result).toBe('w-full md:w-1/2 lg:w-1/3')
  })

  it('should handle state modifiers correctly', () => {
    const result = cn('bg-blue-500', 'hover:bg-blue-600', 'active:bg-blue-700')
    expect(result).toBe('bg-blue-500 hover:bg-blue-600 active:bg-blue-700')
  })
})