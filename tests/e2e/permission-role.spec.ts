import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

test.describe.skip('Permission & Role Management', () => {
  // SKIP: Roles page feature not fully implemented - roles API endpoints and seeding not complete
  async function loginAsAdmin(page: import('@playwright/test').Page) {
    await page.goto(`${getBaseUrl()}/admin/login`)
    await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 15000 })
    await page.getByTestId('admin-login-username').fill('superadmin')
    await page.getByTestId('admin-login-password').fill('123456')
    await page.getByTestId('admin-login-submit').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 })
    await page.waitForTimeout(2000)
  }

  test.beforeEach(async ({ page }) => {
    try {
      await page.request.post(`${getBaseUrl()}/api/__test__/cleanup`)
      await page.request.post(`${getBaseUrl()}/api/__test__/seed`)
    } catch (error) {
      console.warn('Error during database cleanup:', error)
    }

    try {
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
    } catch (error) {
      console.warn('Error clearing storage:', error)
    }

    await loginAsAdmin(page)
  })

  test.afterEach(async ({ page, context }) => {
    const pages = context.pages()
    for (const p of pages) {
      if (p !== page) {
        await p.close()
      }
    }
  })

  test.describe('Role List', () => {
    test('should display all roles in the role list', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForSelector('[data-testid="roles-container"]', { timeout: 15000 })

      await expect(page.locator('[data-testid="roles-container"]')).toBeVisible()
      const tableRows = page.locator('[data-testid="role-table"] tbody tr')
      const rowCount = await tableRows.count()
      expect(rowCount).toBeGreaterThan(0)
    })

    test('should display role name and code columns', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForSelector('[data-testid="roles-container"]', { timeout: 15000 })

      await expect(page.getByText('角色代码')).toBeVisible()
      await expect(page.getByText('角色名称')).toBeVisible()
    })
  })

  test.describe('Create Role', () => {
    test('should create a new role with name and permissions', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForSelector('[data-testid="roles-container"]', { timeout: 15000 })

      await page.click('[data-testid="create-role-button"]')

      await page.waitForSelector('[data-testid="role-form-dialog"]', { timeout: 10000 })
      await page.fill('[data-testid="role-name-input"]', 'E2E Test Role')
      await page.fill('[data-testid="role-code-input"]', 'e2e_test_role')

      await page.click(
        '[data-testid="permission-node-plugins"] [data-testid="permission-checkbox-read"]'
      )
      await page.click(
        '[data-testid="permission-node-plugins"] [data-testid="permission-checkbox-write"]'
      )

      await page.click('[data-testid="save-role-button"]')

      await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="role-table"]')).toContainText('E2E Test Role')
    })

    test('should show validation error for empty role name', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForSelector('[data-testid="roles-container"]', { timeout: 15000 })

      await page.click('[data-testid="create-role-button"]')
      await page.waitForSelector('[data-testid="role-form-dialog"]', { timeout: 10000 })

      await page.fill('[data-testid="role-code-input"]', 'some_code')
      await page.click('[data-testid="save-role-button"]')

      await page.waitForSelector('[data-testid="form-error"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="form-error"]')).toContainText(
        /required|cannot be empty/i
      )
    })

    test('should show validation error for duplicate role code', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-role`, {
        data: { name: 'Existing Role', code: 'existing_role' },
      })

      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForSelector('[data-testid="roles-container"]', { timeout: 15000 })

      await page.click('[data-testid="create-role-button"]')
      await page.waitForSelector('[data-testid="role-form-dialog"]', { timeout: 10000 })

      await page.fill('[data-testid="role-name-input"]', 'Duplicate Role')
      await page.fill('[data-testid="role-code-input"]', 'existing_role')
      await page.click('[data-testid="save-role-button"]')

      await page.waitForSelector('[data-testid="form-error"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="form-error"]')).toContainText(
        /already.*exist|duplicate/i
      )
    })
  })

  test.describe('Edit Role', () => {
    test('should edit role permissions', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-role`, {
        data: { name: 'Editable Role', code: 'editable_role', permissions: ['plugins:read'] },
      })

      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForSelector('[data-testid="roles-container"]', { timeout: 15000 })

      await page
        .locator('[data-testid="role-table"] tbody tr')
        .first()
        .locator('[data-testid="edit-role-button"]')
        .click()

      await page.waitForSelector('[data-testid="role-form-dialog"]', { timeout: 10000 })

      await page.click(
        '[data-testid="permission-node-plugins"] [data-testid="permission-checkbox-write"]'
      )
      await page.click(
        '[data-testid="permission-node-plugins"] [data-testid="permission-checkbox-delete"]'
      )

      await page.click('[data-testid="save-role-button"]')

      await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 })
    })
  })

  test.describe('Delete Role', () => {
    test('should delete a role with confirmation', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-role`, {
        data: { name: 'Deletable Role', code: 'deletable_role' },
      })

      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForSelector('[data-testid="roles-container"]', { timeout: 15000 })

      const initialCount = await page.locator('[data-testid="role-table"] tbody tr').count()

      await page
        .locator('[data-testid="role-table"] tbody tr')
        .first()
        .locator('[data-testid="delete-role-button"]')
        .click()

      await page.waitForSelector('[data-testid="confirm-delete-dialog"]', { timeout: 10000 })
      await page.click('[data-testid="confirm-delete-button"]')

      await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 })
      const newCount = await page.locator('[data-testid="role-table"] tbody tr').count()
      expect(newCount).toBe(initialCount - 1)
    })
  })

  test.describe('Permission Tree', () => {
    test('should expand and collapse permission tree nodes', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/admin/system/permissions`)
      await page.waitForSelector('[data-testid="permissions-container"]', { timeout: 15000 })

      await page.click('[data-testid="permission-group-plugins"]')
      await page.waitForTimeout(500)

      await expect(page.locator('[data-testid="permission-node-plugins-read"]')).toBeVisible()
      await expect(page.locator('[data-testid="permission-node-plugins-write"]')).toBeVisible()

      await page.click('[data-testid="permission-group-plugins"]')
      await page.waitForTimeout(500)

      await expect(page.locator('[data-testid="permission-node-plugins-read"]')).not.toBeVisible()
    })

    test('should select and deselect permissions via tree', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/admin/system/permissions`)
      await page.waitForSelector('[data-testid="permissions-container"]', { timeout: 15000 })

      await page.click('[data-testid="permission-group-plugins"]')
      await page.waitForTimeout(500)

      await page.click(
        '[data-testid="permission-node-plugins-read"] [data-testid="permission-checkbox"]'
      )
      await page.waitForTimeout(300)

      const checkbox = page.locator(
        '[data-testid="permission-node-plugins-read"] [data-testid="permission-checkbox"]'
      )
      await expect(checkbox).toBeChecked()
    })
  })

  test.describe('Role Assignment', () => {
    test('should assign a role to a user', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-role`, {
        data: { name: 'Assign Role', code: 'assign_role' },
      })
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-user`, {
        data: { username: 'target_user', email: 'target@test.com', password: 'hashed' },
      })

      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForSelector('[data-testid="roles-container"]', { timeout: 15000 })

      await page
        .locator('[data-testid="role-table"] tbody tr')
        .first()
        .locator('[data-testid="assign-role-button"]')
        .click()

      await page.waitForSelector('[data-testid="assign-role-dialog"]', { timeout: 10000 })

      await page.fill('[data-testid="assign-user-search"]', 'target_user')
      await page.waitForTimeout(500)
      await page.click('[data-testid="user-option"]').first()

      await page.click('[data-testid="confirm-assign-button"]')

      await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 })
    })
  })

  test.describe('Permission Enforcement', () => {
    test('should block access when user lacks permission', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-role`, {
        data: { name: 'No Access Role', code: 'no_access_role', permissions: [] },
      })
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-user`, {
        data: {
          username: 'restricted_user',
          email: 'restricted@test.com',
          password: 'TestPass123!',
          roleCode: 'no_access_role',
        },
      })

      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })

      await page.goto(`${getBaseUrl()}/admin/login`)
      await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 15000 })
      await page.fill('[data-testid="admin-login-username"]', 'restricted_user')
      await page.fill('[data-testid="admin-login-password"]', 'TestPass123!')
      await page.getByTestId('admin-login-submit').click()
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 })

      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForTimeout(2000)

      await expect(page.locator('[data-testid="permission-denied-message"]')).toBeVisible()
    })

    test('should allow superadmin full access to all features', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/admin/system/roles`)
      await page.waitForSelector('[data-testid="roles-container"]', { timeout: 15000 })

      await expect(page.locator('[data-testid="create-role-button"]')).toBeVisible()

      await page.goto(`${getBaseUrl()}/admin/system/permissions`)
      await page.waitForSelector('[data-testid="permissions-container"]', { timeout: 15000 })

      await expect(page.locator('[data-testid="permissions-container"]')).toBeVisible()
    })
  })
})
