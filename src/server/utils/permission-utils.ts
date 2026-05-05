import { Permission } from '@shared/modules/permission'

export function validatePermissions(permissions: Permission[]): boolean {
  const allPermissions = Object.values(Permission)
  return permissions.every(p => allPermissions.includes(p))
}
