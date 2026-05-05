import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PageHeader } from '../PageHeader'

describe('PageHeader', () => {
  afterEach(() => {
    cleanup()
  })

  it('should render title', () => {
    render(<PageHeader title="Dashboard" />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('should render subtitle when provided', () => {
    render(<PageHeader title="Users" subtitle="Manage user accounts" />)

    expect(screen.getByText('Manage user accounts')).toBeInTheDocument()
  })

  it('should not render subtitle when not provided', () => {
    const { container } = render(<PageHeader title="Users" />)

    const subtitle = container.querySelector('.text-gray-500')
    expect(subtitle).not.toBeInTheDocument()
  })

  it('should render extra action buttons when provided', () => {
    render(<PageHeader title="Users" extra={<button data-testid="action-btn">Add User</button>} />)

    expect(screen.getByTestId('action-btn')).toBeInTheDocument()
    expect(screen.getByText('Add User')).toBeInTheDocument()
  })

  it('should render breadcrumbs when provided', () => {
    render(<PageHeader title="Users" breadcrumbs={[{ title: 'Home' }, { title: 'Management' }]} />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Management')).toBeInTheDocument()
  })

  it('should not render breadcrumbs when empty array', () => {
    render(<PageHeader title="Users" breadcrumbs={[]} />)

    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })
})
