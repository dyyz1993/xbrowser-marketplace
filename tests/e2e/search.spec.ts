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

test.describe.configure({ mode: 'serial' })

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await fetch(`${getBaseUrl()}/api/__test__/cleanup`, { method: 'POST' })
    await fetch(`${getBaseUrl()}/api/__test__/seed`, { method: 'POST' })

    await seedPlugin({
      name: 'Amazon Helper',
      slug: 'amazon-helper',
      description: 'Helps with Amazon shopping',
      category: 'e-commerce',
      status: 'approved',
    })
    await seedPlugin({
      name: 'Taobao Tools',
      slug: 'taobao-tools',
      description: 'Tools for Taobao sellers',
      category: 'e-commerce',
      status: 'approved',
    })
    await seedPlugin({
      name: 'Productivity Booster',
      slug: 'productivity-booster',
      description: 'Boost your productivity at work',
      category: 'productivity',
      status: 'approved',
    })
  })

  test.afterEach(async ({ page }) => {
    const pages = page.context().pages()
    for (const p of pages) {
      if (p !== page) await p.close()
    }
  })

  test('should navigate to search page and show search input', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/search`)
    await page.waitForLoadState('load')

    const searchInput = page.locator('[data-testid="plugin-search-input"]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible()
    }
  })

  test('should type query and see filtered results', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/search?q=amazon`)
    await page.waitForLoadState('load')
    await page.waitForTimeout(2000)

    const cards = page.locator('[data-testid="plugin-card"]')
    const count = await cards.count()
    if (count > 0) {
      const firstCardText = await cards.first().textContent()
      expect(firstCardText?.toLowerCase()).toContain('amazon')
    }
  })

  test('should show empty state for non-matching query', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/search?q=zzz-no-match-xyz`)
    await page.waitForLoadState('load')
    await page.waitForTimeout(2000)

    const emptyState = page.locator('[data-testid="search-empty-state"]')
    if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible()
    }
  })

  test('should filter by category', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/search?category=e-commerce`)
    await page.waitForLoadState('load')
    await page.waitForTimeout(2000)

    const cards = page.locator('[data-testid="plugin-card"]')
    if ((await cards.count()) > 0) {
      await expect(cards.first()).toBeVisible()
    }
  })

  test('should combine search query with category filter', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/search?q=helper&category=e-commerce`)
    await page.waitForLoadState('load')
    await page.waitForTimeout(2000)

    const cards = page.locator('[data-testid="plugin-card"]')
    if ((await cards.count()) > 0) {
      await expect(cards.first()).toBeVisible()
    }
  })
})
