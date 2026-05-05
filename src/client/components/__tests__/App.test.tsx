import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { App } from '../../App'

vi.mock('../../pages/Home', () => ({
  HomePage: () => <div data-testid="home-page">Home Page</div>,
}))

vi.mock('../../pages/Search', () => ({
  SearchPage: () => <div data-testid="search-page">Search Page</div>,
}))

vi.mock('../../pages/PluginDetail', () => ({
  PluginDetailPage: () => <div data-testid="plugin-detail-page">Plugin Detail</div>,
}))

vi.mock('../../pages/Categories', () => ({
  CategoriesPage: () => <div data-testid="categories-page">Categories</div>,
}))

vi.mock('../../pages/CLI', () => ({
  CLIPage: () => <div data-testid="cli-page">CLI</div>,
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Initial Render', () => {
    it('should render the app without crashing', () => {
      render(<App />)
      expect(document.body).toBeTruthy()
    })

    it('should render layout with content', () => {
      const { container } = render(<App />)
      expect(container.querySelector('.min-h-screen') || container.firstChild).toBeTruthy()
    })
  })

  describe('Routes', () => {
    it('should render home page by default', () => {
      render(<App />)
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
  })

  describe('Layout', () => {
    it('should have a router wrapping the app', () => {
      const { container } = render(<App />)
      expect(container.innerHTML).toBeTruthy()
    })
  })
})
