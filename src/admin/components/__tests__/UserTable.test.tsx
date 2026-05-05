import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { UserTable } from '../UserTable'
import { Role } from '@shared/modules/permission'
import type { User } from '@shared/modules/admin'

const mockUsers: User[] = [
  {
    id: '1',
    username: 'alice',
    email: 'alice@test.com',
    role: Role.SUPER_ADMIN,
    status: 'active',
    avatar: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '2',
    username: 'bob',
    email: 'bob@test.com',
    role: Role.USER,
    status: 'inactive',
    avatar: null,
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02',
  },
]

describe('UserTable', () => {
  afterEach(() => {
    cleanup()
  })

  it('should render table with user data', () => {
    render(<UserTable data={mockUsers} />)

    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
  })

  it('should render role tags', () => {
    render(<UserTable data={mockUsers} />)

    expect(screen.getByText(Role.SUPER_ADMIN)).toBeInTheDocument()
    expect(screen.getByText(Role.USER)).toBeInTheDocument()
  })

  it('should render status tags', () => {
    render(<UserTable data={mockUsers} />)

    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('inactive')).toBeInTheDocument()
  })

  it('should render action buttons', () => {
    render(<UserTable data={mockUsers} />)

    const editButtons = screen.getAllByText('Edit')
    const deleteButtons = screen.getAllByText('Delete')
    expect(editButtons.length).toBe(2)
    expect(deleteButtons.length).toBe(2)
  })

  it('should call onEdit when Edit button clicked', () => {
    const onEdit = vi.fn()
    render(<UserTable data={mockUsers} onEdit={onEdit} />)

    fireEvent.click(screen.getAllByText('Edit')[0])
    expect(onEdit).toHaveBeenCalledWith(mockUsers[0])
  })

  it('should call onDelete when Delete button clicked', () => {
    const onDelete = vi.fn()
    render(<UserTable data={mockUsers} onDelete={onDelete} />)

    fireEvent.click(screen.getAllByText('Delete')[0])
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('should render empty table when no data', () => {
    render(<UserTable data={[]} />)

    const noDataElements = screen.getAllByText('No data')
    expect(noDataElements.length).toBeGreaterThan(0)
  })
})
