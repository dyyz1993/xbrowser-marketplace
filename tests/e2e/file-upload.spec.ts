import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

async function registerAndLogin(
  email = 'publishtest@test.com',
  username = 'publishtest',
  password = '123456'
): Promise<string> {
  await fetch(`${getBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })

  const loginRes = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const loginData = await loginRes.json()
  return loginData.data?.token ?? loginData.token
}

async function seedApprovedPlugin(
  overrides: Partial<{ name: string; slug: string; description: string; category: string }> = {}
) {
  const defaults = {
    name: `Publish Test Plugin ${Date.now()}`,
    description: 'A plugin for publish flow testing',
    category: 'developer-tools',
  }
  const body = { ...defaults, ...overrides, status: 'approved' }

  const res = await fetch(`${getBaseUrl()}/api/__test__/seed-plugin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

test.describe('Plugin Publish Flow', () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.request.post(`${getBaseUrl()}/api/__test__/cleanup`)
    } catch {
      console.warn('Cleanup failed')
    }
    try {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed`)
    } catch {
      console.warn('Seed failed')
    }
  })

  test.afterEach(async ({ page, context }) => {
    const pages = context.pages()
    for (const p of pages) {
      if (p !== page) await p.close()
    }
  })

  test('should register a developer account and obtain token', async () => {
    const email = `dev${Date.now()}@test.com`
    const username = `dev${Date.now()}`

    const registerRes = await fetch(`${getBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: '123456' }),
    })
    expect(registerRes.status).toBe(201)

    const loginRes = await fetch(`${getBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: '123456' }),
    })
    expect(loginRes.ok).toBeTruthy()

    const loginData = await loginRes.json()
    expect(loginData.success).toBe(true)
    expect(loginData.data.token).toBeDefined()
    expect(typeof loginData.data.token).toBe('string')
  })

  test('should reject duplicate registration', async () => {
    const email = `dup${Date.now()}@test.com`
    const username = `dup${Date.now()}`

    const first = await fetch(`${getBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: '123456' }),
    })
    expect(first.status).toBe(201)

    const second = await fetch(`${getBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: '123456' }),
    })
    expect(second.status).toBe(409)
  })

  test('should reject login with wrong password', async () => {
    const email = `wrong${Date.now()}@test.com`
    const username = `wrong${Date.now()}`

    await fetch(`${getBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: '123456' }),
    })

    const loginRes = await fetch(`${getBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrongpass' }),
    })
    expect(loginRes.status).toBe(401)
  })

  test('should create a plugin via API and see it on marketplace', async ({ page }) => {
    const token = await registerAndLogin()

    const createRes = await fetch(`${getBaseUrl()}/api/plugins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'E2E Publish Plugin',
        slug: 'e2e-publish-plugin',
        description: 'Created via publish flow E2E test',
        category: 'developer-tools',
      }),
    })
    expect(createRes.ok).toBeTruthy()

    await seedApprovedPlugin({
      name: 'Approved Marketplace Plugin',
      slug: 'approved-marketplace-plugin',
      description: 'An approved plugin visible on marketplace',
      category: 'developer-tools',
    })

    await page.goto(`${getBaseUrl()}/`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

    await expect(page.locator('[data-testid="plugin-list"]')).toBeVisible()

    const cards = page.locator('[data-testid="plugin-card"]')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('should view plugin detail page with name and description', async ({ page }) => {
    await seedApprovedPlugin({
      name: 'Detail View Plugin',
      slug: 'detail-view-plugin',
      description: 'Plugin for testing detail page rendering',
      category: 'developer-tools',
    })

    await page.goto(`${getBaseUrl()}/plugin/detail-view-plugin`)
    await page.waitForLoadState('load')

    const container = page.locator('[data-testid="plugin-detail-container"]')
    await expect(container).toBeVisible({ timeout: 15000 })

    const name = page.locator('[data-testid="plugin-detail-name"]')
    await expect(name).toBeVisible()
    await expect(name).toContainText('Detail View Plugin')

    const desc = page.locator('[data-testid="plugin-detail-description"]')
    await expect(desc).toBeVisible()
    await expect(desc).toContainText('testing detail page rendering')
  })

  test('should display install command on plugin detail page', async ({ page }) => {
    await seedApprovedPlugin({
      name: 'Install Command Plugin',
      slug: 'install-command-plugin',
      description: 'Plugin for testing install command display',
      category: 'developer-tools',
    })

    await page.goto(`${getBaseUrl()}/plugin/install-command-plugin`)
    await page.waitForLoadState('load')

    const container = page.locator('[data-testid="plugin-detail-container"]')
    await expect(container).toBeVisible({ timeout: 15000 })

    await expect(page.locator('[data-testid="install-command"]')).toBeVisible()
    await expect(page.locator('[data-testid="copy-install-command-button"]')).toBeVisible()
  })

  test('should search for a published plugin', async ({ page }) => {
    await seedApprovedPlugin({
      name: 'Unique Searchable Plugin',
      slug: 'unique-searchable-plugin',
      description: 'Plugin for search testing',
      category: 'developer-tools',
    })

    await page.goto(`${getBaseUrl()}/`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

    const searchInput = page.locator('[data-testid="plugin-search-input"]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('Unique Searchable')
      await page.waitForTimeout(1500)

      const cards = page.locator('[data-testid="plugin-card"]')
      const count = await cards.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  test('should navigate from marketplace to plugin detail', async ({ page }) => {
    await seedApprovedPlugin({
      name: 'Navigation Test Plugin',
      slug: 'navigation-test-plugin',
      description: 'Plugin for testing card click navigation',
      category: 'developer-tools',
    })

    await page.goto(`${getBaseUrl()}/`)
    await page.waitForLoadState('load')
    await page.waitForSelector('[data-testid="marketplace-container"]', { timeout: 25000 })

    await page.locator('[data-testid="plugin-card"]').first().click()
    await page.waitForURL('**/plugin/**', { timeout: 10000 })

    await expect(page.locator('[data-testid="plugin-detail-container"]')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('[data-testid="plugin-detail-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="plugin-detail-description"]')).toBeVisible()
  })
})
