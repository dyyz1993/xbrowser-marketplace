import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
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
    await page.getByTestId('admin-login-username').fill('superadmin')
    await page.getByTestId('admin-login-password').fill('123456')
    await page.getByTestId('admin-login-submit').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 20000 })
    await page.waitForLoadState('networkidle')
    await page.goto(url)
  }

  await page.waitForSelector(waitForSelector, { timeout: 20000 })
}

test.describe('Admin Review', () => {
  async function loginAsAdmin(page: import('@playwright/test').Page) {
    await page.goto(`${getBaseUrl()}/admin/login`)
    await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 15000 })
    await page.getByTestId('admin-login-username').fill('superadmin')
    await page.getByTestId('admin-login-password').fill('123456')
    await page.getByTestId('admin-login-submit').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
  }

  async function seedPendingPlugins(page: import('@playwright/test').Page) {
    const plugins = [
      { name: 'Pending Plugin A', status: 'pending', category: 'tools' },
      { name: 'Pending Plugin B', status: 'pending', category: 'integration' },
      { name: 'Pending Plugin C', status: 'pending', category: 'ui-themes' },
    ]
    for (const plugin of plugins) {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-plugin`, { data: plugin })
    }
  }

  async function confirmPopconfirm(page: import('@playwright/test').Page) {
    await page.waitForSelector('.ant-popover .ant-btn-primary', { timeout: 10000 })
    await page.click('.ant-popover .ant-btn-primary')
  }

  async function waitForSuccessMessage(page: import('@playwright/test').Page) {
    await page.waitForSelector('.ant-message-success', { timeout: 15000 })
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

  test.describe('Pending List', () => {
    test('should display pending plugins in review list', async ({ page }) => {
      await seedPendingPlugins(page)
      await navigateToAdminPage(page, '/plugins/review', '[data-testid="review-list-container"]')

      await expect(page.locator('[data-testid="review-list-container"]')).toBeVisible()
      const rows = page.locator('[data-testid="review-item"]')
      await expect(rows).toHaveCount(3)
    })

    test('should show empty state when no pending plugins', async ({ page }) => {
      await navigateToAdminPage(page, '/plugins/review', '[data-testid="review-list-container"]')

      await expect(page.locator('[data-testid="review-empty-state"]')).toBeVisible()
    })

    test('should filter by review status', async ({ page }) => {
      await seedPendingPlugins(page)
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-plugin`, {
        data: { name: 'Approved Plugin', status: 'approved', category: 'tools' },
      })

      await navigateToAdminPage(page, '/plugins/review', '[data-testid="review-list-container"]')

      await page.click('[data-testid="status-filter-pending"]')
      await page.waitForTimeout(500)

      const pendingItems = page.locator('[data-testid="review-item"]')
      const count = await pendingItems.count()
      for (let i = 0; i < count; i++) {
        await expect(pendingItems.nth(i)).toContainText('pending')
      }
    })
  })

  test.describe('Approve Plugin', () => {
    test('should approve a pending plugin', async ({ page }) => {
      await seedPendingPlugins(page)
      await navigateToAdminPage(page, '/plugins/review', '[data-testid="review-list-container"]')

      await page
        .locator('[data-testid="review-item"]')
        .first()
        .locator('[data-testid="approve-button"]')
        .click()

      await confirmPopconfirm(page)

      await waitForSuccessMessage(page)

      const remaining = page.locator('[data-testid="review-item"]')
      await expect(remaining).toHaveCount(2)
    })
  })

  test.describe('Reject Plugin', () => {
    test('should reject a pending plugin with reason', async ({ page }) => {
      await seedPendingPlugins(page)
      await navigateToAdminPage(page, '/plugins/review', '[data-testid="review-list-container"]')

      await page
        .locator('[data-testid="review-item"]')
        .first()
        .locator('[data-testid="reject-button"]')
        .click()

      await page.waitForSelector('[data-testid="reject-reason-dialog"]', { timeout: 10000 })

      await page.fill('[data-testid="reject-reason-input"]', 'Does not meet quality standards')
      await page.click('[data-testid="confirm-reject-button"]')

      await waitForSuccessMessage(page)
      const remaining = page.locator('[data-testid="review-item"]')
      await expect(remaining).toHaveCount(2)
    })
  })

  test.describe('Batch Operations', () => {
    test('should batch approve selected plugins', async ({ page }) => {
      await seedPendingPlugins(page)
      await navigateToAdminPage(page, '/plugins/review', '[data-testid="review-list-container"]')

      await page
        .locator('[data-testid="review-item"]')
        .nth(0)
        .locator('[data-testid="select-checkbox"]')
        .check()
      await page
        .locator('[data-testid="review-item"]')
        .nth(1)
        .locator('[data-testid="select-checkbox"]')
        .check()

      await page.click('[data-testid="batch-approve-button"]')

      await waitForSuccessMessage(page)
      const remaining = page.locator('[data-testid="review-item"]')
      await expect(remaining).toHaveCount(1)
    })

    test('should batch reject selected plugins', async ({ page }) => {
      await seedPendingPlugins(page)
      await navigateToAdminPage(page, '/plugins/review', '[data-testid="review-list-container"]')

      await page
        .locator('[data-testid="review-item"]')
        .nth(0)
        .locator('[data-testid="select-checkbox"]')
        .check()
      await page
        .locator('[data-testid="review-item"]')
        .nth(1)
        .locator('[data-testid="select-checkbox"]')
        .check()

      await page.click('[data-testid="batch-reject-button"]')

      await page.waitForSelector('[data-testid="reject-reason-dialog"]', { timeout: 10000 })
      await page.fill(
        '[data-testid="reject-reason-input"]',
        'Batch rejection - duplicate submissions'
      )
      await page.click('[data-testid="confirm-reject-button"]')

      await waitForSuccessMessage(page)
      const remaining = page.locator('[data-testid="review-item"]')
      await expect(remaining).toHaveCount(1)
    })
  })

  test.describe('Featured Toggle', () => {
    test('should toggle featured flag on a plugin', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-plugin`, {
        data: {
          name: 'Featured Candidate',
          status: 'approved',
          category: 'tools',
          featured: false,
        },
      })

      await navigateToAdminPage(page, '/plugins/manage', '[data-testid="plugin-management-list"]')

      await page.locator('[data-testid="featured-toggle"]').first().click()

      await waitForSuccessMessage(page)
      const toggle = page.locator('[data-testid="featured-toggle"]').first()
      await expect(toggle).toHaveAttribute('data-active', 'true')
    })
  })

  test.describe('Delete Plugin', () => {
    test('should delete a plugin with confirmation', async ({ page }) => {
      await seedPendingPlugins(page)
      await navigateToAdminPage(page, '/plugins/review', '[data-testid="review-list-container"]')

      const initialCount = await page.locator('[data-testid="review-item"]').count()

      await page
        .locator('[data-testid="review-item"]')
        .first()
        .locator('[data-testid="delete-button"]')
        .click()

      await confirmPopconfirm(page)

      await waitForSuccessMessage(page)
      await expect(page.locator('[data-testid="review-item"]')).toHaveCount(initialCount - 1)
    })
  })
})
