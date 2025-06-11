import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './auth'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  })

  it('should have initial state', () => {
    const state = useAuthStore.getState()
    
    expect(state.user).toBe(null)
    expect(state.token).toBe(null)
    expect(state.isAuthenticated).toBe(false)
  })

  it('should login user successfully', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'employee' as const,
      departmentId: 'dept-1',
    }
    const mockToken = 'mock-jwt-token'

    const { login } = useAuthStore.getState()
    login(mockUser, mockToken)

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.token).toBe(mockToken)
    expect(state.isAuthenticated).toBe(true)
  })

  it('should logout user successfully', () => {
    // First login
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'employee' as const,
      departmentId: 'dept-1',
    }
    const mockToken = 'mock-jwt-token'

    const { login, logout } = useAuthStore.getState()
    login(mockUser, mockToken)

    // Verify user is logged in
    let state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)

    // Logout
    logout()

    // Verify user is logged out
    state = useAuthStore.getState()
    expect(state.user).toBe(null)
    expect(state.token).toBe(null)
    expect(state.isAuthenticated).toBe(false)
  })

  it('should update user information', () => {
    // First login
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'employee' as const,
      departmentId: 'dept-1',
    }
    const mockToken = 'mock-jwt-token'

    const { login, updateUser } = useAuthStore.getState()
    login(mockUser, mockToken)

    // Update user name
    updateUser({ name: 'Updated Name' })

    const state = useAuthStore.getState()
    expect(state.user?.name).toBe('Updated Name')
    expect(state.user?.email).toBe('test@example.com') // Other fields should remain
    expect(state.isAuthenticated).toBe(true) // Should remain authenticated
  })

  it('should not update user when user is null', () => {
    const { updateUser } = useAuthStore.getState()
    
    // Try to update when no user is logged in
    updateUser({ name: 'Should Not Update' })

    const state = useAuthStore.getState()
    expect(state.user).toBe(null)
  })

  it('should handle different user roles', () => {
    const roles = ['admin', 'manager', 'employee'] as const

    roles.forEach((role) => {
      const mockUser = {
        id: `${role}-id`,
        email: `${role}@example.com`,
        name: `${role} User`,
        role,
        departmentId: 'dept-1',
      }

      const { login } = useAuthStore.getState()
      login(mockUser, 'token')

      const state = useAuthStore.getState()
      expect(state.user?.role).toBe(role)
    })
  })

  it('should handle partial user updates', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'employee' as const,
      departmentId: 'dept-1',
    }

    const { login, updateUser } = useAuthStore.getState()
    login(mockUser, 'token')

    // Update only email
    updateUser({ email: 'newemail@example.com' })

    const state = useAuthStore.getState()
    expect(state.user?.email).toBe('newemail@example.com')
    expect(state.user?.name).toBe('Test User') // Should remain unchanged
    expect(state.user?.role).toBe('employee') // Should remain unchanged
  })

  it('should handle department changes', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'employee' as const,
      departmentId: 'dept-1',
    }

    const { login, updateUser } = useAuthStore.getState()
    login(mockUser, 'token')

    // Update department
    updateUser({ departmentId: 'dept-2' })

    const state = useAuthStore.getState()
    expect(state.user?.departmentId).toBe('dept-2')
  })

  it('should maintain token during user updates', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'employee' as const,
      departmentId: 'dept-1',
    }
    const mockToken = 'mock-jwt-token'

    const { login, updateUser } = useAuthStore.getState()
    login(mockUser, mockToken)

    updateUser({ name: 'New Name' })

    const state = useAuthStore.getState()
    expect(state.token).toBe(mockToken) // Token should not change
    expect(state.isAuthenticated).toBe(true)
  })
})