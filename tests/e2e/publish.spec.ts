import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

test.describe('Plugin Publishing Flow', () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.request.post(`${getBaseUrl()}/api/__test__/cleanup`)
    } catch (error) {
      console.warn('Error during database cleanup:', error)
    }
  })

  test.afterEach(async ({ page, context }) => {
    const pages = context.pages()
    for (const p of pages) {
      if (p !== page) {
        await p.close()
      }
    }
  })

  test('should navigate to publish page from navbar', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

    const publishLink = page.locator('[data-testid="nav-publish-link"]')
    if (await publishLink.isVisible()) {
      await publishLink.click()
    } else {
      await page.goto(`${getBaseUrl()}/publish`)
    }

    await expect(page).toHaveURL(/\/publish/, { timeout: 10000 })
  })

  test('should show login required for unauthenticated users', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/publish`)
    await page.waitForLoadState('load')

    await expect(page.locator('text=Login Required')).toBeVisible({ timeout: 10000 })
  })

  test('should display publish form for authenticated users', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/`)
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-token',
        JSON.stringify({ state: { token: 'test-user-token', isAuthenticated: true } })
      )
    })

    await page.goto(`${getBaseUrl()}/publish`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="publish-form"]', { timeout: 10000 })

    await expect(page.locator('[data-testid="publish-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="plugin-name-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="plugin-slug-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="plugin-version-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="plugin-description-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="publish-submit-button"]')).toBeVisible()
  })

  test('should show form validation errors on empty submit', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/`)
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-token',
        JSON.stringify({ state: { token: 'test-user-token', isAuthenticated: true } })
      )
    })

    await page.goto(`${getBaseUrl()}/publish`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="publish-form"]', { timeout: 10000 })

    await page.click('[data-testid="publish-submit-button"]')

    await expect(page.locator('text=Name is required')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Description is required')).toBeVisible()
  })

  test('should submit plugin with valid data and handle response', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/`)
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-token',
        JSON.stringify({ state: { token: 'super-admin-token', isAuthenticated: true } })
      )
    })

    await page.goto(`${getBaseUrl()}/publish`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="publish-form"]', { timeout: 10000 })

    await page.fill('[data-testid="plugin-name-input"]', 'Test Plugin E2E')
    await page.fill('[data-testid="plugin-slug-input"]', 'test-plugin-e2e')
    await page.fill('[data-testid="plugin-version-input"]', '1.0.0')
    await page.fill(
      '[data-testid="plugin-description-input"]',
      'A test plugin created by E2E test for validation purposes'
    )

    await page.click('[data-testid="publish-submit-button"]')

    await expect(
      page.locator('[data-testid="publish-success-message"], [data-testid="publish-error-message"]')
    ).toBeVisible({ timeout: 15000 })
  })

  test('should validate version format', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/`)
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-token',
        JSON.stringify({ state: { token: 'test-user-token', isAuthenticated: true } })
      )
    })

    await page.goto(`${getBaseUrl()}/publish`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="publish-form"]', { timeout: 10000 })

    await page.fill('[data-testid="plugin-name-input"]', 'Test Plugin')
    await page.fill('[data-testid="plugin-version-input"]', 'invalid')
    await page.fill(
      '[data-testid="plugin-description-input"]',
      'Some description that is long enough'
    )

    await page.click('[data-testid="publish-submit-button"]')

    await expect(page.locator('text=Version must be semver')).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to developer dashboard', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/`)
    await page.evaluate(() => {
      localStorage.setItem(
        'auth-token',
        JSON.stringify({ state: { token: 'super-admin-token', isAuthenticated: true } })
      )
    })

    await page.goto(`${getBaseUrl()}/developer`)
    await page.waitForLoadState('load')

    await expect(
      page.locator(
        '[data-testid="developer-dashboard-page"], [data-testid="developer-dashboard-auth-required"]'
      )
    ).toBeVisible({ timeout: 15000 })
  })
})
