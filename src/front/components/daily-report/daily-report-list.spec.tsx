import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { DailyReportList } from './daily-report-list'
import { apiClient } from '@/lib/api-client'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

const mockPush = vi.fn()

const mockReports = [
  {
    id: '1',
    date: '2024-01-01',
    status: 'submitted' as const,
    tasks: [
      {
        projectName: 'Project A',
        description: 'Implemented feature X',
        hoursSpent: 4,
        progress: 80,
      },
      {
        projectName: 'Project B',
        description: 'Fixed bug Y',
        hoursSpent: 2,
        progress: 100,
      },
    ],
    challenges: 'Some challenges',
    nextDayPlan: 'Tomorrow plan',
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-01T09:00:00Z',
  },
  {
    id: '2',
    date: '2024-01-02',
    status: 'approved' as const,
    tasks: [
      {
        projectName: 'Project C',
        description: 'Code review',
        hoursSpent: 3,
        progress: 100,
      },
    ],
    challenges: '',
    nextDayPlan: 'Continue work',
    createdAt: '2024-01-02T09:00:00Z',
    updatedAt: '2024-01-02T09:00:00Z',
  },
  {
    id: '3',
    date: '2024-01-03',
    status: 'rejected' as const,
    tasks: [
      {
        projectName: 'Project D',
        description: 'Research task',
        hoursSpent: 5,
        progress: 50,
      },
    ],
    challenges: 'Need more info',
    nextDayPlan: 'Continue research',
    feedback: 'Please provide more details on the implementation',
    createdAt: '2024-01-03T09:00:00Z',
    updatedAt: '2024-01-03T09:00:00Z',
  },
]

describe('DailyReportList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
  })

  it('should show loading state initially', () => {
    ;(apiClient.get as any).mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<DailyReportList />)
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should render report list when data is loaded', async () => {
    ;(apiClient.get as any).mockResolvedValue(mockReports)
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      expect(screen.getByText('日報一覧')).toBeInTheDocument()
      expect(screen.getByText('これまでに作成した日報を確認できます')).toBeInTheDocument()
    })
    
    // Check if reports are rendered
    await waitFor(() => {
      expect(screen.getByText('2024年01月01日（月）')).toBeInTheDocument()
      expect(screen.getByText('2024年01月02日（火）')).toBeInTheDocument()
      expect(screen.getByText('2024年01月03日（水）')).toBeInTheDocument()
    })
  })

  it('should display correct status badges', async () => {
    ;(apiClient.get as any).mockResolvedValue(mockReports)
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      expect(screen.getByText('提出済み')).toBeInTheDocument()
      expect(screen.getByText('承認済み')).toBeInTheDocument()
      expect(screen.getByText('差し戻し')).toBeInTheDocument()
    })
  })

  it('should calculate and display total hours correctly', async () => {
    ;(apiClient.get as any).mockResolvedValue(mockReports)
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      expect(screen.getByText('6時間')).toBeInTheDocument() // 4 + 2 hours
      expect(screen.getByText('3時間')).toBeInTheDocument()
      expect(screen.getByText('5時間')).toBeInTheDocument()
    })
  })

  it('should display task descriptions', async () => {
    ;(apiClient.get as any).mockResolvedValue(mockReports)
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      expect(screen.getByText('Project A: Implemented feature X')).toBeInTheDocument()
      expect(screen.getByText('Project B: Fixed bug Y')).toBeInTheDocument()
      expect(screen.getByText('Project C: Code review')).toBeInTheDocument()
    })
  })

  it('should show feedback for rejected reports', async () => {
    ;(apiClient.get as any).mockResolvedValue(mockReports)
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      expect(screen.getByText('フィードバック:')).toBeInTheDocument()
      expect(screen.getByText('Please provide more details on the implementation')).toBeInTheDocument()
    })
  })

  it('should navigate to new report page when create button is clicked', async () => {
    ;(apiClient.get as any).mockResolvedValue(mockReports)
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      const createButton = screen.getByText('新規作成')
      fireEvent.click(createButton)
    })
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard/daily-reports/new')
  })

  it('should navigate to report detail when report card is clicked', async () => {
    ;(apiClient.get as any).mockResolvedValue(mockReports)
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      const reportCard = screen.getByText('2024年01月01日（月）').closest('div[role="button"], div[onClick], [data-testid]') || 
                         screen.getByText('2024年01月01日（月）').closest('.cursor-pointer')
      
      if (reportCard) {
        fireEvent.click(reportCard)
      }
    })
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard/daily-reports/1')
  })

  it('should show empty state when no reports exist', async () => {
    ;(apiClient.get as any).mockResolvedValue([])
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      expect(screen.getByText('日報がありません')).toBeInTheDocument()
      expect(screen.getByText('最初の日報を作成してみましょう')).toBeInTheDocument()
      expect(screen.getByText('日報を作成')).toBeInTheDocument()
    })
  })

  it('should navigate to new report from empty state button', async () => {
    ;(apiClient.get as any).mockResolvedValue([])
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      const createButton = screen.getByText('日報を作成')
      fireEvent.click(createButton)
    })
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard/daily-reports/new')
  })

  it('should show error state when API call fails', async () => {
    const errorMessage = '日報の取得に失敗しました'
    ;(apiClient.get as any).mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    })
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should show default error message when API call fails without specific message', async () => {
    ;(apiClient.get as any).mockRejectedValue(new Error('Network Error'))
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      expect(screen.getByText('日報の取得に失敗しました')).toBeInTheDocument()
    })
  })

  it('should show limited number of tasks with "other" indicator', async () => {
    const reportWithManyTasks = [
      {
        ...mockReports[0],
        tasks: [
          ...mockReports[0].tasks,
          {
            projectName: 'Project D',
            description: 'Task 3',
            hoursSpent: 1,
            progress: 50,
          },
          {
            projectName: 'Project E',
            description: 'Task 4',
            hoursSpent: 1,
            progress: 75,
          },
        ],
      },
    ]
    
    ;(apiClient.get as any).mockResolvedValue(reportWithManyTasks)
    
    render(<DailyReportList />)
    
    await waitFor(() => {
      expect(screen.getByText('他2件')).toBeInTheDocument()
    })
  })

  it('should call API to fetch reports on component mount', async () => {
    ;(apiClient.get as any).mockResolvedValue(mockReports)
    
    render(<DailyReportList />)
    
    expect(apiClient.get).toHaveBeenCalledWith('/daily-reports')
  })
})