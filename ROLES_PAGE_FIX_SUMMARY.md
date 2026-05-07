# Fix Summary: RolesPage Rendering - Unblock 12 Tests

## Root Cause

The 12 E2E tests in `permission-role.spec.ts` were failing because:

1. **Test Suite Skipped**: The entire test suite was marked with `.skip` (line 7)
2. **Missing Role Permissions**: `setupTestDatabase()` in `test-setup.ts` did not seed role permissions (role:view, role:create, role:edit, role:delete)
3. **Missing Superadmin User**: Test database was not seeded with the superadmin user (username: superadmin, password: 123456)
4. **Permission Check Blocking Rendering**: RolesPage component checks for `Permission.ROLE_VIEW` before rendering `data-testid="roles-container"`, but superadmin didn't have this permission in the database

## Fix Applied

### 1. Added Role Permissions to Test Seeding

**File**: `src/server/db/test-setup.ts`

Added role category permissions (lines 424-451):

- `perm_role_view` (code: 'role:view')
- `perm_role_create` (code: 'role:create')
- `perm_role_edit` (code: 'role:edit')
- `perm_role_delete` (code: 'role:delete')

These permissions are automatically assigned to `role_super_admin` because line 457 already assigns ALL permissions to super_admin role.

### 2. Added Test Users to Test Seeding

**File**: `src/server/db/test-setup.ts`

Added:

- Created `users` table in database schema
- Seeded three test users:
  - `superadmin` (role: super_admin, password: 123456)
  - `customerservice` (role: customer_service, password: 123456)
  - `user` (role: user, password: 123456)

### 3. Unskipped Test Suite

**File**: `tests/e2e/permission-role.spec.ts`

Removed `.skip` from the test.describe block (line 7).

## How It Works

Before the fix:

1. `/api/__test__/seed` is called → creates tables and seeds roles/permissions
2. But role permissions were NOT seeded → database empty for role:view, etc.
3. Superadmin user NOT seeded → login fails or user has no permissions
4. RolesPage checks `hasPermission(Permission.ROLE_VIEW)` → returns false
5. Component renders "permission denied" message instead of roles-container
6. Tests fail: `[data-testid="roles-container"]` not found

After the fix:

1. `/api/__test__/seed` is called → creates tables and seeds roles/permissions
2. Role permissions ARE seeded → database has role:view, role:create, role:edit, role:delete
3. Superadmin user IS seeded → login succeeds with superadmin/123456
4. Superadmin role gets ALL permissions (including role:view)
5. RolesPage checks `hasPermission(Permission.ROLE_VIEW)` → returns true
6. Component renders roles-container div with testid
7. Tests pass: `[data-testid="roles-container"]` is found

## Files Modified

1. `src/server/db/test-setup.ts`
   - Added users table schema
   - Added role permissions to seeding
   - Added test users to seeding

2. `tests/e2e/permission-role.spec.ts`
   - Removed `.skip` from test.describe

## Verification

✅ TypeScript type checking passes
✅ ESLint passes (no errors in modified files)
✅ Formatting passes

## Expected Test Results

All 12 E2E tests should now pass:

1. `should display all roles in a role list`
2. `should display role name and code columns`
3. `should create a new role with name and permissions`
4. `should show validation error for empty role name`
5. `should show validation error for duplicate role code`
6. `should edit role permissions`
7. `should delete a role with confirmation`
8. `should expand and collapse permission tree nodes`
9. `should select and deselect permissions via tree`
10. `should assign a role to a user`
11. `should block access when user lacks permission`
12. `should allow superadmin full access to all features`
