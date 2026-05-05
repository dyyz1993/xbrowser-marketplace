import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StatsCard } from '../StatsCard'
import { UserOutlined } from '@ant-design/icons'

describe('StatsCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('should render title and value', () => {
    render(<StatsCard title="Total Users" value={42} />)

    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should render prefix icon when provided', () => {
    render(
      <StatsCard title="Users" value={100} prefix={<UserOutlined data-testid="prefix-icon" />} />
    )

    expect(screen.getByTestId('prefix-icon')).toBeInTheDocument()
  })

  it('should render trend when provided', () => {
    render(<StatsCard title="Users" value={100} trend={{ value: 12, isUp: true }} />)

    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('should render downward trend', () => {
    render(<StatsCard title="Users" value={100} trend={{ value: -5, isUp: false }} />)

    expect(screen.getByText('5%')).toBeInTheDocument()
  })

  it('should not render trend section when trend is undefined', () => {
    render(<StatsCard title="Users" value={100} />)

    expect(screen.queryByText('vs last month')).not.toBeInTheDocument()
  })
})
