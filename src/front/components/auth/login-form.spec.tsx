import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { LoginForm } from './login-form'
import { useAuthStore } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

const mockPush = vi.fn()
const mockLogin = vi.fn()

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
    ;(useAuthStore as any).mockReturnValue(mockLogin)
  })

  it('should render login form with all required fields', () => {
    render(<LoginForm />)
    
    expect(screen.getByText('ログイン')).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })

  it('should show validation errors for invalid input', async () => {
    render(<LoginForm />)
    
    const submitButton = screen.getByRole('button', { name: 'ログイン' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument()
      expect(screen.getByText('パスワードは6文字以上で入力してください')).toBeInTheDocument()
    })
  })

  it('should handle successful login', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    }
    const mockToken = 'mock-token'
    
    ;(apiClient.post as any).mockResolvedValue({
      user: mockUser,
      token: mockToken,
    })

    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockLogin).toHaveBeenCalledWith(mockUser, mockToken)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should handle login error', async () => {
    const errorMessage = 'ログインに失敗しました'
    ;(apiClient.post as any).mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    })

    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should disable form during submission', async () => {
    ;(apiClient.post as any).mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ログイン中...' })).toBeInTheDocument()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
    })
  })
})