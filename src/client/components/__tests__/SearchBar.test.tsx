import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchBar } from '../SearchBar'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render input with placeholder', () => {
    render(<SearchBar />)
    expect(screen.getByPlaceholderText('Search plugins, tags, sites...')).toBeInTheDocument()
  })

  it('should use initial query value', () => {
    render(<SearchBar initialQuery="test query" />)
    const input = screen.getByPlaceholderText('Search plugins, tags, sites...') as HTMLInputElement
    expect(input.value).toBe('test query')
  })

  it('should navigate on form submit with non-empty query', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search plugins, tags, sites...')
    fireEvent.change(input, { target: { value: 'my search' } })
    fireEvent.submit(input.closest('form')!)
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=my%20search')
  })

  it('should not navigate on empty query', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search plugins, tags, sites...')
    fireEvent.submit(input.closest('form')!)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should not navigate on whitespace-only query', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText('Search plugins, tags, sites...')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(input.closest('form')!)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should call onSearch callback when provided', () => {
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Search plugins, tags, sites...')
    fireEvent.change(input, { target: { value: 'callback search' } })
    fireEvent.submit(input.closest('form')!)
    expect(onSearch).toHaveBeenCalledWith('callback search')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should apply large size class', () => {
    render(<SearchBar size="large" />)
    const input = screen.getByPlaceholderText('Search plugins, tags, sites...')
    expect(input.className).toContain('py-3.5')
  })

  it('should apply default size class', () => {
    render(<SearchBar size="default" />)
    const input = screen.getByPlaceholderText('Search plugins, tags, sites...')
    expect(input.className).toContain('py-2.5')
  })
})
