import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { CaptchaModal } from '../CaptchaModal'

const mockResolve = vi.fn()
const mockUseCaptchaStore = {
  isOpen: false,
  resolve: mockResolve,
}

vi.mock('../../stores/captchaStore', () => ({
  useCaptchaStore: () => mockUseCaptchaStore,
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  }
})

const mockFetch = vi.fn()
const originalFetch = window.fetch

describe('CaptchaModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCaptchaStore.isOpen = false
    mockUseCaptchaStore.resolve = mockResolve
    ;(window as unknown as Record<string, unknown>).fetch = mockFetch
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { id: 'cap-1', image: 'data:image/png;base64,test' } }),
    })
  })

  afterAll(() => {
    ;(window as unknown as Record<string, unknown>).fetch = originalFetch
  })

  it('should not render modal when closed', () => {
    mockUseCaptchaStore.isOpen = false
    render(<CaptchaModal />)
    expect(screen.queryByText('请完成安全验证')).not.toBeInTheDocument()
  })

  it('should render modal when open', () => {
    mockUseCaptchaStore.isOpen = true
    render(<CaptchaModal />)
    expect(screen.getByText('请完成安全验证')).toBeInTheDocument()
  })

  it('should fetch captcha on open', async () => {
    mockUseCaptchaStore.isOpen = true
    render(<CaptchaModal />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/captcha')
    })
  })

  it('should show captcha image when loaded', async () => {
    mockUseCaptchaStore.isOpen = true
    render(<CaptchaModal />)

    await waitFor(() => {
      expect(screen.getByAltText('验证码')).toBeInTheDocument()
    })
  })

  it('should show loading state when fetching', () => {
    mockUseCaptchaStore.isOpen = true
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<CaptchaModal />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('should call resolve(false) on cancel', async () => {
    mockUseCaptchaStore.isOpen = true
    render(<CaptchaModal />)

    await waitFor(() => {
      expect(screen.getByAltText('验证码')).toBeInTheDocument()
    })

    const cancelBtn = screen.getByRole('button', { name: /取消/ })
    fireEvent.click(cancelBtn)

    expect(mockResolve).toHaveBeenCalledWith(false)
  })

  it('should submit captcha code and resolve(true) on success', async () => {
    mockUseCaptchaStore.isOpen = true
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { id: 'cap-1', image: 'data:image/png;base64,test' } }),
    })
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    render(<CaptchaModal />)

    await waitFor(() => {
      expect(screen.getByAltText('验证码')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('请输入验证码')
    fireEvent.change(input, { target: { value: '1234' } })
    const submitBtn = screen.getByRole('button', { name: /提交/ })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockResolve).toHaveBeenCalledWith(true)
    })
  })

  it('should refresh captcha on verification failure', async () => {
    mockUseCaptchaStore.isOpen = true
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { id: 'cap-1', image: 'data:image/png;base64,test' } }),
    })
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: '验证码错误' }),
    })
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { id: 'cap-2', image: 'data:image/png;base64,new' } }),
    })

    render(<CaptchaModal />)

    await waitFor(() => {
      expect(screen.getByAltText('验证码')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('请输入验证码')
    fireEvent.change(input, { target: { value: 'wrong' } })
    const submitBtn = screen.getByRole('button', { name: /提交/ })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  it('should have refresh button', async () => {
    mockUseCaptchaStore.isOpen = true
    render(<CaptchaModal />)

    await waitFor(() => {
      expect(screen.getByTitle('刷新验证码')).toBeInTheDocument()
    })
  })
})
