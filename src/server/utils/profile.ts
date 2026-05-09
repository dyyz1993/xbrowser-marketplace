import type { DeveloperTable } from '../db/schema'

export function toProfile(row: DeveloperTable) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt.getTime(),
  }
}
