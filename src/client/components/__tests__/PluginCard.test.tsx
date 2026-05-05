import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PluginCard } from '../PluginCard'
import type { PluginListItem } from '../../services/plugin-api'

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) =>
    <a href={to} {...props}>{children}</a>,
}))

const mockPlugin: PluginListItem = {
  id: '1',
  name: 'Test Plugin',
  slug: 'test-plugin',
  description: 'A helpful test plugin for browser automation tasks',
  authorName: 'testauthor',
  version: '1.0.0',
  status: 'approved',
  downloadCount: 42,
  viewCount: 100,
  featured: false,
  screenshotUrl: null,
  tags: ['automation', 'testing'],
  siteUrls: ['https://example.com'],
  commands: ['scrape'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  avgRating: 4.5,
  reviewCount: 10,
}

describe('PluginCard', () => {
  it('should render plugin name and author', () => {
    render(<PluginCard plugin={mockPlugin} />)
    expect(screen.getByText('Test Plugin')).toBeInTheDocument()
    expect(screen.getByText(/testauthor/)).toBeInTheDocument()
  })

  it('should render version', () => {
    render(<PluginCard plugin={mockPlugin} />)
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument()
  })

  it('should render description', () => {
    render(<PluginCard plugin={mockPlugin} />)
    expect(screen.getByText(/helpful test plugin/)).toBeInTheDocument()
  })

  it('should render tags', () => {
    render(<PluginCard plugin={mockPlugin} />)
    expect(screen.getByText('automation')).toBeInTheDocument()
    expect(screen.getByText('testing')).toBeInTheDocument()
  })

  it('should render download count', () => {
    render(<PluginCard plugin={mockPlugin} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should render rating when present', () => {
    render(<PluginCard plugin={mockPlugin} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('should link to plugin detail page', () => {
    render(<PluginCard plugin={mockPlugin} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/plugin/test-plugin')
  })

  it('should not render screenshot when null', () => {
    render(<PluginCard plugin={mockPlugin} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('should render screenshot when provided', () => {
    const withScreenshot = { ...mockPlugin, screenshotUrl: 'https://img.example.com/screenshot.png' }
    render(<PluginCard plugin={withScreenshot} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://img.example.com/screenshot.png')
  })
})
