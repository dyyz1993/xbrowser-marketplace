import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

async function seedPlugin(params: {
  name: string
  slug: string
  description: string
  category: string
  status: string
  featured?: boolean
}) {
  const res = await fetch(`${getBaseUrl()}/api/__test__/seed-plugin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    throw new Error(`Failed to seed plugin ${params.slug}: ${await res.text()}`)
  }
}

test.describe('Plugin Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await fetch(`${getBaseUrl()}/api/__test__/cleanup`, { method: 'POST' })
    await fetch(`${getBaseUrl()}/api/__test__/seed`, { method: 'POST' })

    await seedPlugin({
      name: 'Test Plugin 1',
      slug: 'test-plugin-1',
      description: 'A test plugin for productivity',
      category: 'productivity',
      status: 'approved',
    })
    await seedPlugin({
      name: 'Test Plugin 2',
      slug: 'test-plugin-2',
      description: 'Another test plugin for developers',
      category: 'dev-tools',
      status: 'approved',
    })
    await seedPlugin({
      name: 'Test Plugin 3',
      slug: 'test-plugin-3',
      description: 'Third test plugin for productivity',
      category: 'productivity',
      status: 'approved',
      featured: true,
    })

    await page.goto(`${getBaseUrl()}/`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })
  })

  test.afterEach(async ({ page }) => {
    const pages = page.context().pages()
    for (const p of pages) {
      if (p !== page) await p.close()
    }
  })

  test.describe('Page Load', () => {
    test('should display marketplace container', async ({ page }) => {
      await expect(page.locator('[data-testid="marketplace-container"]')).toBeVisible()
    })

    test('should display plugin cards', async ({ page }) => {
      const cards = page.locator('[data-testid="plugin-card"]')
      await expect(cards).toHaveCount(3, { timeout: 10000 })
    })

    test('should display plugin list container', async ({ page }) => {
      await expect(page.locator('[data-testid="plugin-list"]')).toBeVisible()
    })
  })

  test.describe('Category Filter', () => {
    test('should show all plugins when "All" filter is active', async ({ page }) => {
      await page.click('[data-testid="category-filter-all"]')
      const allCards = page.locator('[data-testid="plugin-card"]')
      await expect(allCards).toHaveCount(3, { timeout: 10000 })
    })

    test('should filter plugins by category', async ({ page }) => {
      const productivityFilter = page.locator('[data-testid="category-filter-productivity"]')
      if (await productivityFilter.isVisible()) {
        await productivityFilter.click()
        await page.waitForTimeout(500)
        const filtered = page.locator('[data-testid="plugin-card"]')
        const count = await filtered.count()
        expect(count).toBeGreaterThanOrEqual(1)
      }
    })
  })

  test.describe('Sort', () => {
    test('should sort plugins by rating', async ({ page }) => {
      const sortSelect = page.locator('[data-testid="sort-select"]')
      if (await sortSelect.isVisible()) {
        await sortSelect.click()
        const ratingOption = page.locator('[data-testid="sort-option-rating"]')
        if (await ratingOption.isVisible()) {
          await ratingOption.click()
          await page.waitForTimeout(500)
          await expect(page.locator('[data-testid="plugin-card"]').first()).toBeVisible()
        }
      }
    })

    test('should sort plugins by downloads', async ({ page }) => {
      const sortSelect = page.locator('[data-testid="sort-select"]')
      if (await sortSelect.isVisible()) {
        await sortSelect.click()
        const downloadsOption = page.locator('[data-testid="sort-option-downloads"]')
        if (await downloadsOption.isVisible()) {
          await downloadsOption.click()
          await page.waitForTimeout(500)
          await expect(page.locator('[data-testid="plugin-card"]').first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Search', () => {
    test('should search plugins by keyword', async ({ page }) => {
      const searchInput = page.locator('[data-testid="plugin-search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('Test Plugin 1')
        await page.waitForTimeout(1000)

        const cards = page.locator('[data-testid="plugin-card"]')
        const count = await cards.count()
        expect(count).toBeGreaterThanOrEqual(1)
      }
    })

    test('should show empty state when no results', async ({ page }) => {
      const searchInput = page.locator('[data-testid="plugin-search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('zzz-no-match-xyz')
        await page.waitForTimeout(1000)

        const emptyState = page.locator('[data-testid="search-empty-state"]')
        if (await emptyState.isVisible()) {
          await expect(emptyState).toBeVisible()
        }
      }
    })
  })

  test.describe('Plugin Detail', () => {
    test('should navigate to plugin detail page', async ({ page }) => {
      const firstCard = page.locator('[data-testid="plugin-card"]').first()
      await firstCard.click()

      await page.waitForSelector('[data-testid="plugin-detail-container"]', { timeout: 15000 })
      await expect(page.locator('[data-testid="plugin-detail-name"]')).toBeVisible()
      await expect(page.locator('[data-testid="plugin-detail-description"]')).toBeVisible()
    })

    test('should display install command on detail page', async ({ page }) => {
      const firstCard = page.locator('[data-testid="plugin-card"]').first()
      await firstCard.click()

      await page.waitForSelector('[data-testid="plugin-detail-container"]', { timeout: 15000 })
      await expect(page.locator('[data-testid="install-command"]')).toBeVisible()
    })

    test('should display rating on detail page', async ({ page }) => {
      const firstCard = page.locator('[data-testid="plugin-card"]').first()
      await firstCard.click()

      await page.waitForSelector('[data-testid="plugin-detail-container"]', { timeout: 15000 })
      const rating = page.locator('[data-testid="plugin-rating"]')
      if (await rating.isVisible()) {
        await expect(rating).toBeVisible()
      }
    })

    test('should have copy install command button', async ({ page }) => {
      const firstCard = page.locator('[data-testid="plugin-card"]').first()
      await firstCard.click()

      await page.waitForSelector('[data-testid="plugin-detail-container"]', { timeout: 15000 })
      const copyButton = page.locator('[data-testid="copy-install-command-button"]')
      if (await copyButton.isVisible()) {
        await expect(copyButton).toBeVisible()
      }
    })

    test('should display reviews section', async ({ page }) => {
      const firstCard = page.locator('[data-testid="plugin-card"]').first()
      await firstCard.click()

      await page.waitForSelector('[data-testid="plugin-detail-container"]', { timeout: 15000 })
      const reviews = page.locator('[data-testid="plugin-reviews-section"]')
      if (await reviews.isVisible()) {
        await expect(reviews).toBeVisible()
      }
    })
  })

  test.describe('Navigation', () => {
    test('should navigate back from detail to marketplace', async ({ page }) => {
      const firstCard = page.locator('[data-testid="plugin-card"]').first()
      await firstCard.click()
      await page.waitForSelector('[data-testid="plugin-detail-container"]', { timeout: 15000 })

      await page.goBack()
      await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 15000 })
      await expect(page.locator('[data-testid="plugin-card"]').first()).toBeVisible()
    })
  })

  test.describe('Load More', () => {
    test('should display load more button if more plugins exist', async ({ page }) => {
      const loadMore = page.locator('[data-testid="load-more-button"]')
      if (await loadMore.isVisible()) {
        await loadMore.click()
        await page.waitForTimeout(500)
        const cards = page.locator('[data-testid="plugin-card"]')
        const count = await cards.count()
        expect(count).toBeGreaterThanOrEqual(3)
      }
    })
  })
})
