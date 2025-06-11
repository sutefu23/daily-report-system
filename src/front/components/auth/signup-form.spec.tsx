import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { SignupForm } from './signup-form'
import { apiClient } from '@/lib/api-client'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

const mockPush = vi.fn()

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
  })

  it('should render signup form with all required fields', () => {
    render(<SignupForm />)
    
    expect(screen.getByText('新規登録')).toBeInTheDocument()
    expect(screen.getByLabelText('名前')).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード（確認）')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    render(<SignupForm />)
    
    const submitButton = screen.getByRole('button', { name: '登録' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('名前を入力してください')).toBeInTheDocument()
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument()
      expect(screen.getByText('パスワードは6文字以上で入力してください')).toBeInTheDocument()
    })
  })

  it('should show validation error for invalid email', async () => {
    render(<SignupForm />)
    
    const emailInput = screen.getByLabelText('メールアドレス')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    
    const submitButton = screen.getByRole('button', { name: '登録' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument()
    })
  })

  it('should show validation error for short password', async () => {
    render(<SignupForm />)
    
    const passwordInput = screen.getByLabelText('パスワード')
    fireEvent.change(passwordInput, { target: { value: '123' } })
    
    const submitButton = screen.getByRole('button', { name: '登録' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('パスワードは6文字以上で入力してください')).toBeInTheDocument()
    })
  })

  it('should show validation error for password mismatch', async () => {
    render(<SignupForm />)
    
    const passwordInput = screen.getByLabelText('パスワード')
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）')
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } })
    
    const submitButton = screen.getByRole('button', { name: '登録' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument()
    })
  })

  it('should handle successful signup', async () => {
    ;(apiClient.post as any).mockResolvedValue({})
    
    render(<SignupForm />)
    
    const nameInput = screen.getByLabelText('名前')
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）')
    const submitButton = screen.getByRole('button', { name: '登録' })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/signup', {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      expect(mockPush).toHaveBeenCalledWith('/login?registered=true')
    })
  })

  it('should handle signup error', async () => {
    const errorMessage = '登録に失敗しました'
    ;(apiClient.post as any).mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    })
    
    render(<SignupForm />)
    
    const nameInput = screen.getByLabelText('名前')
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）')
    const submitButton = screen.getByRole('button', { name: '登録' })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should disable form during submission', async () => {
    ;(apiClient.post as any).mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<SignupForm />)
    
    const nameInput = screen.getByLabelText('名前')
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）')
    const submitButton = screen.getByRole('button', { name: '登録' })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '登録中...' })).toBeInTheDocument()
      expect(nameInput).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(confirmPasswordInput).toBeDisabled()
    })
  })

  it('should have links to login page', () => {
    render(<SignupForm />)
    
    const loginLink = screen.getByText('ログイン')
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('should handle network error gracefully', async () => {
    ;(apiClient.post as any).mockRejectedValue(new Error('Network Error'))
    
    render(<SignupForm />)
    
    const nameInput = screen.getByLabelText('名前')
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）')
    const submitButton = screen.getByRole('button', { name: '登録' })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('登録に失敗しました')).toBeInTheDocument()
    })
  })
})