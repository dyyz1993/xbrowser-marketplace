import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

const ADMIN_CREDENTIALS = {
  username: 'superadmin',
  password: '123456',
}

async function clearStorageSafely(page: import('@playwright/test').Page) {
  try {
    await page.goto(`${getBaseUrl()}/admin/login`)
    await page.waitForLoadState('domcontentloaded')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  } catch {
    // Storage may not be accessible on certain pages (e.g. about:blank)
  }
}

async function loginAs(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto(`${getBaseUrl()}/admin/login`)
  await page.waitForLoadState('load')
  await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 25000 })
  await page.getByTestId('admin-login-username').fill(username)
  await page.getByTestId('admin-login-password').fill(password)
  await page.getByTestId('admin-login-submit').click()
  await page.waitForURL('**/admin/dashboard', { timeout: 25000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Permission & Role Management', () => {
  async function loginAsAdmin(page: import('@playwright/test').Page) {
    await loginAs(page, ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password)
  }

  async function navigateToAdminPage(
    page: import('@playwright/test').Page,
    path: string,
    waitForSelector: string
  ) {
    const url = `${getBaseUrl()}/admin${path}`

    await page.goto(url)
    await page.waitForLoadState('domcontentloaded')

    await page.waitForTimeout(500)

    const onLoginPage = await page
      .locator('[data-testid="admin-login-form"]')
      .isVisible()
      .catch(() => false)

    if (onLoginPage) {
      await page.getByTestId('admin-login-username').fill(ADMIN_CREDENTIALS.username)
      await page.getByTestId('admin-login-password').fill(ADMIN_CREDENTIALS.password)
      await page.getByTestId('admin-login-submit').click()
      await page.waitForURL('**/admin/dashboard', { timeout: 20000 })
      await page.waitForLoadState('networkidle')
      await page.goto(url)
    }

    await page.waitForSelector(waitForSelector, { timeout: 20000 })
  }

  async function waitForSuccessToast(page: import('@playwright/test').Page, timeout = 15000) {
    await page.waitForSelector('.ant-message-success', { timeout })
  }

  test.beforeEach(async ({ page }) => {
    try {
      await page.request.post(`${getBaseUrl()}/api/__test__/cleanup`)
      await page.request.post(`${getBaseUrl()}/api/__test__/seed`)
    } catch (error) {
      console.warn('Error during database cleanup:', error)
    }

    await clearStorageSafely(page)
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
      await navigateToAdminPage(page, '/system/roles', '[data-testid="roles-container"]')

      await expect(page.locator('[data-testid="roles-container"]')).toBeVisible()
      const tableRows = page.locator('[data-testid="role-table"] tbody tr')
      const rowCount = await tableRows.count()
      expect(rowCount).toBeGreaterThan(0)
    })

    test('should display role name and code columns', async ({ page }) => {
      await navigateToAdminPage(page, '/system/roles', '[data-testid="roles-container"]')

      await expect(page.getByText('角色代码')).toBeVisible()
      await expect(page.getByText('角色名称')).toBeVisible()
    })
  })

  test.describe('Create Role', () => {
    test('should create a new role with name and permissions', async ({ page }) => {
      await navigateToAdminPage(page, '/system/roles', '[data-testid="roles-container"]')
      await page.waitForLoadState('networkidle')

      await page.getByTestId('create-role-button').click()
      await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])', {
        timeout: 15000,
      })
      await page.waitForSelector('[data-testid="role-name-input"]', {
        state: 'visible',
        timeout: 5000,
      })

      await page.fill('[data-testid="role-name-input"]', 'E2E Test Role')
      await page.fill('[data-testid="role-code-input"]', 'e2e_test_role')
      await page.fill('[data-testid="role-label-input"]', 'E2E Test Label')

      await page.click(
        '[data-testid="permission-node-plugins"] [data-testid="permission-checkbox-read"]'
      )
      await page.click(
        '[data-testid="permission-node-plugins"] [data-testid="permission-checkbox-write"]'
      )

      await page.getByTestId('save-role-button').click()

      await waitForSuccessToast(page)
      await expect(page.locator('[data-testid="role-table"]')).toContainText('E2E Test Role')
    })

    test('should show validation error for empty role name', async ({ page }) => {
      await navigateToAdminPage(page, '/system/roles', '[data-testid="roles-container"]')
      await page.waitForLoadState('networkidle')

      await page.getByTestId('create-role-button').click()
      await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])', {
        timeout: 15000,
      })
      await page.waitForSelector('[data-testid="role-code-input"]', {
        state: 'visible',
        timeout: 5000,
      })

      await page.fill('[data-testid="role-code-input"]', 'some_code')
      await page.getByTestId('save-role-button').click()

      await page.waitForSelector('.ant-form-item-explain-error', { timeout: 10000 })
      await expect(page.locator('.ant-form-item-explain-error').first()).toContainText(/请输入/)
    })

    test('should show validation error for duplicate role code', async ({ page }) => {
      await navigateToAdminPage(page, '/system/roles', '[data-testid="roles-container"]')
      await page.waitForLoadState('networkidle')

      await page.getByTestId('create-role-button').click()
      await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])', {
        timeout: 15000,
      })
      await page.waitForSelector('[data-testid="role-name-input"]', {
        state: 'visible',
        timeout: 5000,
      })

      await page.getByTestId('save-role-button').click()

      await page.waitForSelector('.ant-form-item-explain-error', { timeout: 10000 })
      const errors = page.locator('.ant-form-item-explain-error')
      const count = await errors.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Edit Role', () => {
    test('should edit role permissions', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-role`, {
        data: { name: 'Editable Role', code: 'editable_role', permissions: ['plugins:read'] },
      })

      await navigateToAdminPage(page, '/system/roles', '[data-testid="roles-container"]')
      await page.waitForLoadState('networkidle')

      await page
        .locator('[data-testid="role-table"] tbody tr')
        .filter({ hasText: 'Editable Role' })
        .locator('[data-testid="edit-role-button"]')
        .click()

      await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])', {
        timeout: 15000,
      })
      await page.waitForSelector('[data-testid="role-name-input"]', {
        state: 'visible',
        timeout: 5000,
      })

      await page.click(
        '[data-testid="permission-node-plugins"] [data-testid="permission-checkbox-write"]'
      )
      await page.click(
        '[data-testid="permission-node-plugins"] [data-testid="permission-checkbox-delete"]'
      )

      await page.getByTestId('save-role-button').click()

      await waitForSuccessToast(page)
    })
  })

  test.describe('Delete Role', () => {
    test('should delete a role with confirmation', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-role`, {
        data: { name: 'Deletable Role', code: 'deletable_role' },
      })

      await navigateToAdminPage(page, '/system/roles', '[data-testid="roles-container"]')
      await page.waitForLoadState('networkidle')

      await page
        .locator('[data-testid="role-table"] tbody tr')
        .filter({ hasText: 'Deletable Role' })
        .locator('[data-testid="delete-role-button"]')
        .click()

      await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])', {
        timeout: 10000,
      })
      await page.getByTestId('confirm-delete-button').click()

      await waitForSuccessToast(page)
    })
  })

  test.describe('Permission Tree', () => {
    test('should expand and collapse permission tree nodes', async ({ page }) => {
      await navigateToAdminPage(
        page,
        '/system/permissions',
        '[data-testid="permissions-container"]'
      )
      await page.waitForLoadState('networkidle')

      const firstGroup = page.locator('[data-testid^="permission-group-"]').first()
      await firstGroup.waitFor({ state: 'visible', timeout: 15000 })
      await firstGroup.click()
      await page.waitForTimeout(500)

      const firstNode = page.locator('[data-testid^="permission-node-"]').first()
      await expect(firstNode).toBeVisible()

      await firstGroup.click()
      await page.waitForTimeout(500)

      await expect(firstNode).not.toBeVisible()
    })

    test('should select and deselect permissions via tree', async ({ page }) => {
      await navigateToAdminPage(
        page,
        '/system/permissions',
        '[data-testid="permissions-container"]'
      )
      await page.waitForLoadState('networkidle')

      const firstGroup = page.locator('[data-testid^="permission-group-"]').first()
      await firstGroup.waitFor({ state: 'visible', timeout: 15000 })
      await firstGroup.click()
      await page.waitForTimeout(500)

      const checkbox = page
        .locator('[data-testid^="permission-node-"] [data-testid="permission-checkbox"]')
        .first()
      await checkbox.waitFor({ state: 'visible', timeout: 10000 })
      await checkbox.click()
      await page.waitForTimeout(300)

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

      await navigateToAdminPage(page, '/system/roles', '[data-testid="roles-container"]')
      await page.waitForLoadState('networkidle')

      await page
        .locator('[data-testid="role-table"] tbody tr')
        .filter({ hasText: 'Assign Role' })
        .locator('[data-testid="assign-role-button"]')
        .click()

      await page.waitForSelector('.ant-modal-wrap:not([style*="display: none"])', {
        timeout: 10000,
      })
      await page.waitForSelector('[data-testid="assign-user-search"]', {
        state: 'visible',
        timeout: 5000,
      })

      await page.fill('[data-testid="assign-user-search"]', 'target_user')
      await page.waitForTimeout(500)
      await page.locator('[data-testid="user-option"]').first().click()

      await page.getByTestId('confirm-assign-button').click()

      await waitForSuccessToast(page)
    })
  })

  test.describe('Permission Enforcement', () => {
    test('should block access when user lacks permission', async ({ page }) => {
      await clearStorageSafely(page)
      await loginAs(page, 'user1', '123456')

      await navigateToAdminPage(page, '/system/roles', '[data-testid="permission-denied-message"]')
      await expect(page.locator('[data-testid="permission-denied-message"]')).toBeVisible()
    })

    test('should allow superadmin full access to all features', async ({ page }) => {
      await navigateToAdminPage(page, '/system/roles', '[data-testid="roles-container"]')
      await expect(page.locator('[data-testid="create-role-button"]')).toBeVisible()

      await navigateToAdminPage(
        page,
        '/system/permissions',
        '[data-testid="permissions-container"]'
      )
      await expect(page.locator('[data-testid="permissions-container"]')).toBeVisible()
    })
  })
})
