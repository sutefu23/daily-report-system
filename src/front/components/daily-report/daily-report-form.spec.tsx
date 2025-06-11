import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { DailyReportForm } from './daily-report-form'
import { apiClient } from '@/lib/api-client'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
    put: vi.fn(),
  },
}))

const mockPush = vi.fn()
const mockBack = vi.fn()

describe('DailyReportForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
  })

  it('should render daily report form with default values', () => {
    render(<DailyReportForm />)
    
    expect(screen.getByText(/の日報$/)).toBeInTheDocument()
    expect(screen.getByText('本日の作業内容を記録してください')).toBeInTheDocument()
    expect(screen.getByLabelText('作業記録')).toBeInTheDocument()
    expect(screen.getByLabelText('困ったこと・相談したいこと')).toBeInTheDocument()
    expect(screen.getByLabelText('明日の予定')).toBeInTheDocument()
  })

  it('should render with initial task', () => {
    render(<DailyReportForm />)
    
    expect(screen.getByPlaceholderText('プロジェクトA')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('1.5')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('50')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('実装した機能や対応した内容を記載してください')).toBeInTheDocument()
  })

  it('should add new task when clicking add button', async () => {
    render(<DailyReportForm />)
    
    const addButton = screen.getByText('作業記録を追加')
    fireEvent.click(addButton)
    
    await waitFor(() => {
      const projectInputs = screen.getAllByPlaceholderText('プロジェクトA')
      expect(projectInputs).toHaveLength(2)
    })
  })

  it('should remove task when clicking delete button', async () => {
    render(<DailyReportForm />)
    
    // Add a second task first
    const addButton = screen.getByText('作業記録を追加')
    fireEvent.click(addButton)
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: '' }) // Trash icon buttons
      expect(deleteButtons).toHaveLength(1) // Only one delete button for the second task
    })
    
    const deleteButton = screen.getAllByRole('button', { name: '' })[0]
    fireEvent.click(deleteButton)
    
    await waitFor(() => {
      const projectInputs = screen.getAllByPlaceholderText('プロジェクトA')
      expect(projectInputs).toHaveLength(1)
    })
  })

  it('should calculate total hours correctly', async () => {
    render(<DailyReportForm />)
    
    const hoursInput = screen.getByPlaceholderText('1.5')
    fireEvent.change(hoursInput, { target: { value: '3' } })
    
    await waitFor(() => {
      expect(screen.getByText('合計作業時間: 3時間')).toBeInTheDocument()
    })
  })

  it('should show validation errors for empty required fields', async () => {
    render(<DailyReportForm />)
    
    const submitButton = screen.getByText('提出')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('明日の予定を入力してください')).toBeInTheDocument()
    })
  })

  it('should submit form successfully', async () => {
    ;(apiClient.post as any).mockResolvedValue({})
    
    render(<DailyReportForm />)
    
    // Fill in required fields
    const projectInput = screen.getByPlaceholderText('プロジェクトA')
    const workContentInput = screen.getByPlaceholderText('実装した機能や対応した内容を記載してください')
    const nextDayPlanInput = screen.getByPlaceholderText('明日予定している作業内容を記載してください')
    
    fireEvent.change(projectInput, { target: { value: 'Test Project' } })
    fireEvent.change(workContentInput, { target: { value: 'Test work content' } })
    fireEvent.change(nextDayPlanInput, { target: { value: 'Test next day plan' } })
    
    const submitButton = screen.getByText('提出')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/daily-reports', expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({
            projectName: 'Test Project',
            description: 'Test work content',
          })
        ]),
        nextDayPlan: 'Test next day plan',
      }))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/daily-reports')
    })
  })

  it('should save as draft', async () => {
    ;(apiClient.post as any).mockResolvedValue({})
    
    render(<DailyReportForm />)
    
    const projectInput = screen.getByPlaceholderText('プロジェクトA')
    fireEvent.change(projectInput, { target: { value: 'Test Project' } })
    
    const draftButton = screen.getByText('下書き保存')
    fireEvent.click(draftButton)
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/daily-reports', expect.objectContaining({
        status: 'draft',
      }))
      expect(mockPush).toHaveBeenCalledWith('/dashboard/daily-reports')
    })
  })

  it('should disable submit button when total hours exceed 24', async () => {
    render(<DailyReportForm />)
    
    const hoursInput = screen.getByPlaceholderText('1.5')
    fireEvent.change(hoursInput, { target: { value: '25' } })
    
    await waitFor(() => {
      const submitButton = screen.getByText('提出')
      expect(submitButton).toBeDisabled()
    })
  })

  it('should handle API errors', async () => {
    const errorMessage = '保存に失敗しました'
    ;(apiClient.post as any).mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    })
    
    render(<DailyReportForm />)
    
    const nextDayPlanInput = screen.getByPlaceholderText('明日予定している作業内容を記載してください')
    fireEvent.change(nextDayPlanInput, { target: { value: 'Test plan' } })
    
    const submitButton = screen.getByText('提出')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should navigate back on cancel', () => {
    render(<DailyReportForm />)
    
    const cancelButton = screen.getByText('キャンセル')
    fireEvent.click(cancelButton)
    
    expect(mockBack).toHaveBeenCalled()
  })
})