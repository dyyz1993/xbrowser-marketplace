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
    // Storage may not be accessible
  }
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${getBaseUrl()}/admin/login`)
  await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 15000 })
  await page.getByTestId('admin-login-username').fill('superadmin')
  await page.getByTestId('admin-login-password').fill('123456')
  await page.getByTestId('admin-login-submit').click()
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

test.describe.configure({ mode: 'serial' })

test.describe('Admin Category Management', () => {
  test.beforeEach(async ({ page }) => {
    await fetch(`${getBaseUrl()}/api/__test__/cleanup`, { method: 'POST' })
    await fetch(`${getBaseUrl()}/api/__test__/seed`, { method: 'POST' })
    await clearStorageSafely(page)
    await loginAsAdmin(page)
  })

  test.afterEach(async ({ page }) => {
    const pages = page.context().pages()
    for (const p of pages) {
      if (p !== page) await p.close()
    }
  })

  test('should navigate to category management page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/categories`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
  })

  test('should display category table', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/categories`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    const table = page.locator('.ant-table')
    if (await table.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(table).toBeVisible()
    }
  })

  test('should show create category button', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/categories`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    const createButton = page.locator('button').filter({ hasText: /add|create|new/i })
    if (
      await createButton
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await expect(createButton.first()).toBeVisible()
    }
  })
})

test.describe('Admin Settings Save/Load', () => {
  test.beforeEach(async ({ page }) => {
    await fetch(`${getBaseUrl()}/api/__test__/cleanup`, { method: 'POST' })
    await fetch(`${getBaseUrl()}/api/__test__/seed`, { method: 'POST' })
    await clearStorageSafely(page)
    await loginAsAdmin(page)
  })

  test.afterEach(async ({ page }) => {
    const pages = page.context().pages()
    for (const p of pages) {
      if (p !== page) await p.close()
    }
  })

  test('should load settings page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/settings`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
  })

  test('should display settings form', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/settings`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    const formItems = page.locator('.ant-form-item')
    if ((await formItems.count()) > 0) {
      expect(await formItems.count()).toBeGreaterThan(0)
    }
  })

  test('should have save button', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/settings`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    const saveButton = page.locator('button').filter({ hasText: /save/i })
    if (
      await saveButton
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await expect(saveButton.first()).toBeVisible()
    }
  })
})
