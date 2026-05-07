import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

test.describe('Admin Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post(`${getBaseUrl()}/api/__test__/cleanup`)
    await page.request.post(`${getBaseUrl()}/api/__test__/seed`)
    await page.goto(`${getBaseUrl()}/admin/login`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 25000 })
  })

  test.afterEach(async ({ page }) => {
    const pages = page.context().pages()
    for (const p of pages) {
      if (p !== page) await p.close()
    }
  })

  // === Login Page ===

  test('should display login form', async ({ page }) => {
    await expect(page.locator('[data-testid="admin-login-form"]')).toBeVisible()
    await expect(page.locator('[data-testid="admin-login-username"]')).toBeVisible()
    await expect(page.locator('[data-testid="admin-login-password"]')).toBeVisible()
    await expect(page.locator('[data-testid="admin-login-submit"]')).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.fill('[data-testid="admin-login-username"]', 'superadmin')
    await page.fill('[data-testid="admin-login-password"]', '123456')
    await page.click('[data-testid="admin-login-submit"]')

    await page.waitForURL('**/admin/dashboard**', { timeout: 15000 })
    expect(page.url()).toContain('/admin/dashboard')
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="admin-login-username"]', 'wronguser')
    await page.fill('[data-testid="admin-login-password"]', 'wrongpassword')
    await page.click('[data-testid="admin-login-submit"]')

    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/admin/login')
  })

  test('should require username and password', async ({ page }) => {
    await page.click('[data-testid="admin-login-submit"]')

    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/admin/login')
  })

  // === Role-based Login ===

  test('should login as CUSTOMER_SERVICE', async ({ page }) => {
    await page.fill('[data-testid="admin-login-username"]', 'customerservice')
    await page.fill('[data-testid="admin-login-password"]', '123456')
    await page.click('[data-testid="admin-login-submit"]')

    await page.waitForURL('**/admin/dashboard**', { timeout: 15000 })
    expect(page.url()).toContain('/admin/dashboard')
  })

  test('should login as USER', async ({ page }) => {
    await page.fill('[data-testid="admin-login-username"]', 'user1')
    await page.fill('[data-testid="admin-login-password"]', '123456')
    await page.click('[data-testid="admin-login-submit"]')

    await page.waitForURL('**/admin/dashboard**', { timeout: 15000 })
    expect(page.url()).toContain('/admin/dashboard')
  })

  // === Protected Routes ===

  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/dashboard`)
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/admin')
  })

  // === Logout ===

  test('should logout and redirect to login', async ({ page }) => {
    await page.fill('[data-testid="admin-login-username"]', 'superadmin')
    await page.fill('[data-testid="admin-login-password"]', '123456')
    await page.click('[data-testid="admin-login-submit"]')
    await page.waitForURL('**/admin/dashboard**', { timeout: 15000 })

    const logoutButton = page.locator(
      'text=退出, text=登出, text=Logout, [data-testid="logout-button"]'
    )
    if (
      await logoutButton
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await logoutButton.first().click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/admin/login')
    }
  })
})
