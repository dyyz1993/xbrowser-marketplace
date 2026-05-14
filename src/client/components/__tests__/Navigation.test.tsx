import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Navigation } from '../Navigation'

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Navigation', () => {
  it('should render navigation links', () => {
    renderWithRouter(<Navigation />)

    expect(screen.getByText('XBrowser Marketplace')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('should have correct styling classes', () => {
    const { container } = renderWithRouter(<Navigation />)

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('bg-white')
    expect(nav).toHaveClass('border-b')
  })
})
