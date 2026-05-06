import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

test.describe('Plugin Marketplace', () => {
  async function seedPlugins(page: import('@playwright/test').Page) {
    const plugins = [
      { name: 'Awesome Logger', category: 'developer-tools', description: 'A powerful logging plugin' },
      { name: 'Theme Pack Pro', category: 'ui-themes', description: 'Beautiful theme collection' },
      { name: 'Data Sync', category: 'integration', description: 'Sync data across platforms' },
    ]
    for (const plugin of plugins) {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-plugin`, { data: plugin })
    }
  }

  test.beforeEach(async ({ page }) => {
    try {
      await page.request.post(`${getBaseUrl()}/api/__test__/cleanup`)
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
  })

  test.afterEach(async ({ page, context }) => {
    const pages = context.pages()
    for (const p of pages) {
      if (p !== page) {
        await p.close()
      }
    }
  })

  test.describe('Page Load', () => {
    test('should load marketplace homepage and display plugin list', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForLoadState('load')
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await expect(page.locator('[data-testid="marketplace-container"]')).toBeVisible()
      await expect(page.locator('[data-testid="plugin-list"]')).toBeVisible()

      const items = page.locator('[data-testid="plugin-card"]')
      await expect(items).toHaveCount(3)
    })

    test('should display empty state when no plugins exist', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForLoadState('load')
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible()
    })
  })

  test.describe('Search Plugins', () => {
    test('should search plugins by keyword', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await page.fill('[data-testid="plugin-search-input"]', 'Logger')
      await page.waitForTimeout(500)

      const results = page.locator('[data-testid="plugin-card"]')
      await expect(results).toHaveCount(1)
      await expect(results.first()).toContainText('Awesome Logger')
    })

    test('should show empty result for non-existent plugin', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await page.fill('[data-testid="plugin-search-input"]', 'NonExistentPlugin12345')
      await page.waitForTimeout(500)

      await expect(page.locator('[data-testid="plugin-card"]')).toHaveCount(0)
      await expect(page.locator('[data-testid="search-empty-state"]')).toBeVisible()
    })
  })

  test.describe('Category Filter', () => {
    test('should filter plugins by category', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await page.click('[data-testid="category-filter-developer-tools"]')
      await page.waitForTimeout(500)

      const results = page.locator('[data-testid="plugin-card"]')
      await expect(results).toHaveCount(1)
      await expect(results.first()).toContainText('Awesome Logger')
    })

    test('should reset category filter when clicking all', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await page.click('[data-testid="category-filter-developer-tools"]')
      await page.waitForTimeout(500)
      await expect(page.locator('[data-testid="plugin-card"]')).toHaveCount(1)

      await page.click('[data-testid="category-filter-all"]')
      await page.waitForTimeout(500)
      await expect(page.locator('[data-testid="plugin-card"]')).toHaveCount(3)
    })
  })

  test.describe('Plugin Detail', () => {
    test('should navigate to plugin detail page', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await page.locator('[data-testid="plugin-card"]').first().click()
      await page.waitForURL('**/marketplace/**', { timeout: 10000 })

      await expect(page.locator('[data-testid="plugin-detail-container"]')).toBeVisible()
      await expect(page.locator('[data-testid="plugin-detail-name"]')).toBeVisible()
      await expect(page.locator('[data-testid="plugin-detail-description"]')).toBeVisible()
    })

    test('should display install command on detail page', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await page.locator('[data-testid="plugin-card"]').first().click()
      await page.waitForURL('**/marketplace/**', { timeout: 10000 })

      await expect(page.locator('[data-testid="install-command"]')).toBeVisible()
      await expect(page.locator('[data-testid="copy-install-command-button"]')).toBeVisible()
    })

    test('should display ratings and reviews on detail page', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await page.locator('[data-testid="plugin-card"]').first().click()
      await page.waitForURL('**/marketplace/**', { timeout: 10000 })

      await expect(page.locator('[data-testid="plugin-rating"]')).toBeVisible()
      await expect(page.locator('[data-testid="plugin-reviews-section"]')).toBeVisible()
    })
  })

  test.describe('Sorting', () => {
    test('should sort plugins by download count', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await page.click('[data-testid="sort-select"]')
      await page.click('[data-testid="sort-option-downloads"]')
      await page.waitForTimeout(500)

      const cards = page.locator('[data-testid="plugin-card"]')
      const count = await cards.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should sort plugins by rating', async ({ page }) => {
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await page.click('[data-testid="sort-select"]')
      await page.click('[data-testid="sort-option-rating"]')
      await page.waitForTimeout(500)

      const cards = page.locator('[data-testid="plugin-card"]')
      const count = await cards.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Pagination', () => {
    test('should load more plugins via pagination', async ({ page }) => {
      for (let i = 0; i < 12; i++) {
        await page.request.post(`${getBaseUrl()}/api/__test__/seed-plugin`, {
          data: { name: `Plugin ${i}`, category: 'general', description: `Desc ${i}` },
        })
      }
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      const firstPageCount = await page.locator('[data-testid="plugin-card"]').count()

      await page.click('[data-testid="load-more-button"]')
      await page.waitForTimeout(1000)

      const totalCount = await page.locator('[data-testid="plugin-card"]').count()
      expect(totalCount).toBeGreaterThan(firstPageCount)
    })
  })

  test.describe('Responsive Layout', () => {
    test('should adapt layout for mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await seedPlugins(page)
      await page.goto(`${getBaseUrl()}/marketplace`)
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

      await expect(page.locator('[data-testid="marketplace-container"]')).toBeVisible()
      await expect(page.locator('[data-testid="plugin-card"]').first()).toBeVisible()
    })
  })
})
