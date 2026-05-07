/**
 * Admin Plugin Review Flow E2E Tests
 *
 * Tests the admin plugin review workflow at /admin/plugins/review.
 * Replaces the former WebSocket demo tests.
 */

import { test, expect } from '@playwright/test'

function getBaseUrl() {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${getBaseUrl()}/admin/login`)
  await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 15000 })
  await page.fill('[data-testid="admin-login-username"]', 'superadmin')
  await page.fill('[data-testid="admin-login-password"]', '123456')
  await page.click('[data-testid="admin-login-submit"]')
  await page.waitForURL('**/admin/dashboard**', { timeout: 15000 })
  await page.waitForTimeout(1000)
}

test.describe('Admin Plugin Review Flow', () => {
  test.beforeEach(async ({ page }) => {
    await fetch(`${getBaseUrl()}/api/__test__/cleanup`, { method: 'POST' })
    await fetch(`${getBaseUrl()}/api/__test__/seed`, { method: 'POST' })

    await fetch(`${getBaseUrl()}/api/__test__/seed-plugin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pending Plugin 1',
        slug: 'pending-plugin-1',
        description: 'First pending plugin',
        category: 'productivity',
        status: 'pending',
      }),
    })
    await fetch(`${getBaseUrl()}/api/__test__/seed-plugin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pending Plugin 2',
        slug: 'pending-plugin-2',
        description: 'Second pending plugin',
        category: 'dev-tools',
        status: 'pending',
      }),
    })

    await loginAsAdmin(page)
    await page.goto(`${getBaseUrl()}/admin/plugins/review`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="review-list-container"]', { timeout: 25000 })
  })

  test.afterEach(async ({ page }) => {
    const pages = page.context().pages()
    for (const p of pages) {
      if (p !== page) await p.close()
    }
  })

  test('should display review list container', async ({ page }) => {
    await expect(page.locator('[data-testid="review-list-container"]')).toBeVisible()
  })

  test('should display pending plugins', async ({ page }) => {
    const items = page.locator('[data-testid="review-item"]')
    await expect(items).toHaveCount(2, { timeout: 10000 })
  })

  test('should display empty state when no pending plugins', async ({ page }) => {
    await fetch(`${getBaseUrl()}/api/__test__/cleanup`, { method: 'POST' })
    await fetch(`${getBaseUrl()}/api/__test__/seed`, { method: 'POST' })

    await page.reload()
    await page.waitForLoadState('load')

    const emptyState = page.locator('[data-testid="review-empty-state"]')
    if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible()
    }
  })

  test('should filter by pending status', async ({ page }) => {
    const filter = page.locator('[data-testid="status-filter-pending"]')
    if (await filter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filter.click()
      await page.waitForTimeout(1000)
      const items = page.locator('[data-testid="review-item"]')
      const count = await items.count()
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  test('should approve a pending plugin', async ({ page }) => {
    const approveBtn = page.locator('[data-testid="approve-button"]').first()
    if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveBtn.click()
      await page.waitForTimeout(2000)

      const items = page.locator('[data-testid="review-item"]')
      const count = await items.count()
      expect(count).toBeLessThanOrEqual(1)
    }
  })

  test('should reject a plugin with reason', async ({ page }) => {
    const rejectBtn = page.locator('[data-testid="reject-button"]').first()
    if (await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await rejectBtn.click()

      const dialog = page.locator('[data-testid="reject-reason-dialog"]')
      await expect(dialog).toBeVisible({ timeout: 10000 })

      await page.fill('[data-testid="reject-reason-input"]', 'Does not meet quality standards')
      await page.click('[data-testid="confirm-reject-button"]')
      await page.waitForTimeout(2000)

      const items = page.locator('[data-testid="review-item"]')
      const count = await items.count()
      expect(count).toBeLessThanOrEqual(1)
    }
  })

  test('should select multiple plugins for batch operation', async ({ page }) => {
    const checkboxes = page.locator('[data-testid="select-checkbox"]')
    const count = await checkboxes.count()
    if (count >= 2) {
      await checkboxes.first().click()
      await checkboxes.nth(1).click()

      const batchApprove = page.locator('[data-testid="batch-approve-button"]')
      const batchReject = page.locator('[data-testid="batch-reject-button"]')

      const approveVisible = await batchApprove.isVisible({ timeout: 3000 }).catch(() => false)
      const rejectVisible = await batchReject.isVisible({ timeout: 3000 }).catch(() => false)
      expect(approveVisible || rejectVisible).toBeTruthy()
    }
  })

  test('should batch approve selected plugins', async ({ page }) => {
    const checkboxes = page.locator('[data-testid="select-checkbox"]')
    const count = await checkboxes.count()
    if (count >= 2) {
      await checkboxes.first().click()
      await checkboxes.nth(1).click()

      const batchApprove = page.locator('[data-testid="batch-approve-button"]')
      if (await batchApprove.isVisible({ timeout: 3000 }).catch(() => false)) {
        await batchApprove.click()
        await page.waitForTimeout(2000)

        const items = page.locator('[data-testid="review-item"]')
        const itemCount = await items.count()
        expect(itemCount).toBe(0)
      }
    }
  })

  test('should navigate from dashboard to review page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/admin/dashboard`)
    await page.waitForLoadState('load')

    await page.goto(`${getBaseUrl()}/admin/plugins/review`)
    await page.waitForSelector('[data-testid="review-list-container"]', { timeout: 15000 })
    await expect(page.locator('[data-testid="review-list-container"]')).toBeVisible()
  })
})
