/**
 * WebSocket App E2E Tests
 *
 * Testing WebSocket application functionality with Playwright
 *
 * The dev server is started automatically by global-setup.ts
 * on a random available port.
 */

import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

const persistenceTestInProgress = false

test.beforeEach(async ({ page }) => {
  if (!persistenceTestInProgress) {
    try {
      const response = await page.request.post(`${getBaseUrl()}/api/__test__/cleanup`)
      if (!response.ok) {
        console.warn('Failed to cleanup database:', await response.text())
      }
    } catch (error) {
      console.warn('Error during database cleanup:', error)
    }
  }

  try {
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (e) {
        console.warn('Could not clear storage:', e)
      }
    })
  } catch (error) {
    console.warn('Error clearing storage:', error)
  }

  await page.goto(`${getBaseUrl()}/websocket`)
  await page.waitForLoadState('load')
  await page.waitForSelector('[data-testid="websocket-container"]', { timeout: 25000 })
})

test.afterEach(async ({ page, context }) => {
  const pages = context.pages()
  for (const p of pages) {
    if (p !== page) {
      await p.close()
    }
  }
})

test.describe('WebSocket App', () => {
  test.describe('Page Load', () => {
    test('should load websocket page successfully', async ({ page }) => {
      await expect(page.locator('[data-testid="websocket-container"]')).toBeVisible()
      await expect(page.locator('h1').last()).toHaveText('WebSocket Demo')
    })

    test('should display empty state when no messages', async ({ page }) => {
      await page.waitForSelector('[data-testid="empty-state"]', { timeout: 25000 })
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible()
    })
  })

  test.describe('WebSocket Connection', () => {
    test('should connect to WebSocket', async ({ page }) => {
      await page.click('[data-testid="connect-ws-button"]')
      await page.waitForSelector('[data-testid="ws-status-open"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="ws-status-open"]')).toBeVisible()
    })

    test('should disconnect from WebSocket', async ({ page }) => {
      await page.click('[data-testid="connect-ws-button"]')
      await page.waitForSelector('[data-testid="ws-status-open"]', { timeout: 10000 })

      await page.click('[data-testid="disconnect-ws-button"]')
      await page.waitForSelector('[data-testid="ws-status-closed"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="ws-status-closed"]')).toBeVisible()
    })
  })

  test.describe('Send Messages', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="connect-ws-button"]')
      await page.waitForSelector('[data-testid="ws-status-open"]', { timeout: 10000 })
    })

    test('should send echo message', async ({ page }) => {
      await page.fill('[data-testid="ws-message-input"]', 'Hello WebSocket')
      await page.selectOption('[data-testid="ws-message-type-select"]', 'echo')
      await page.click('[data-testid="send-message-button"]')

      await page.waitForSelector('[data-testid="message-item"]', { timeout: 10000 })
      const count = await page.locator('[data-testid="message-item"]').count()
      expect(count).toBeGreaterThanOrEqual(2)
    })

    test('should send ping message', async ({ page }) => {
      await page.selectOption('[data-testid="ws-message-type-select"]', 'ping')
      await page.click('[data-testid="send-message-button"]')

      await page.waitForSelector('[data-testid="message-item"]', { timeout: 10000 })
      const count = await page.locator('[data-testid="message-item"]').count()
      expect(count).toBeGreaterThanOrEqual(2)
    })

    test('should send broadcast message', async ({ page }) => {
      await page.fill('[data-testid="ws-message-input"]', 'Broadcast message')
      await page.selectOption('[data-testid="ws-message-type-select"]', 'broadcast')
      await page.click('[data-testid="send-message-button"]')

      await page.waitForSelector('[data-testid="message-item"]', { timeout: 10000 })
      const count = await page.locator('[data-testid="message-item"]').count()
      expect(count).toBeGreaterThanOrEqual(1)
    })

    test('should send notification message', async ({ page }) => {
      await page.fill('[data-testid="ws-message-input"]', 'Notification message')
      await page.selectOption('[data-testid="ws-message-type-select"]', 'notification')
      await page.click('[data-testid="send-message-button"]')

      await page.waitForSelector('[data-testid="message-item"]', { timeout: 10000 })
      const count = await page.locator('[data-testid="message-item"]').count()
      expect(count).toBeGreaterThanOrEqual(1)
    })

    test('should clear input after sending message', async ({ page }) => {
      await page.fill('[data-testid="ws-message-input"]', 'Test message')
      await page.selectOption('[data-testid="ws-message-type-select"]', 'echo')
      await page.click('[data-testid="send-message-button"]')
      await expect(page.locator('[data-testid="ws-message-input"]')).toHaveValue('')
    })

    test('should not send empty message', async ({ page }) => {
      const initialCount = await page.locator('[data-testid="message-item"]').count()

      await page.selectOption('[data-testid="ws-message-type-select"]', 'echo')
      await expect(page.locator('[data-testid="send-message-button"]')).toBeDisabled()
      await page.click('[data-testid="send-message-button"]', { force: true }).catch(() => {})

      await page.waitForTimeout(500)
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(initialCount)
    })
  })

  test.describe('Clear Messages', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="connect-ws-button"]')
      await page.waitForSelector('[data-testid="ws-status-open"]', { timeout: 10000 })

      await page.fill('[data-testid="ws-message-input"]', 'Test message')
      await page.selectOption('[data-testid="ws-message-type-select"]', 'echo')
      await page.click('[data-testid="send-message-button"]')
      await page.waitForSelector('[data-testid="message-item"]', { timeout: 10000 })
    })

    test('should clear all messages', async ({ page }) => {
      await page.click('[data-testid="clear-messages-button"]')
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(0)
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible()
    })
  })

  test.describe('Multiple Messages', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="connect-ws-button"]')
      await page.waitForSelector('[data-testid="ws-status-open"]', { timeout: 10000 })
    })

    test('should display multiple messages', async ({ page }) => {
      await page.fill('[data-testid="ws-message-input"]', 'Message 1')
      await page.selectOption('[data-testid="ws-message-type-select"]', 'echo')
      await page.click('[data-testid="send-message-button"]')
      await page.waitForSelector('[data-testid="message-item"]', { timeout: 10000 })

      await page.fill('[data-testid="ws-message-input"]', 'Message 2')
      await page.click('[data-testid="send-message-button"]')
      await page.waitForTimeout(1000)

      const count = await page.locator('[data-testid="message-item"]').count()
      expect(count).toBeGreaterThanOrEqual(3)
    })

    test('should display message count', async ({ page }) => {
      await page.fill('[data-testid="ws-message-input"]', 'Message 1')
      await page.selectOption('[data-testid="ws-message-type-select"]', 'echo')
      await page.click('[data-testid="send-message-button"]')
      await page.waitForSelector('[data-testid="message-item"]', { timeout: 10000 })

      await expect(page.locator('[data-testid="message-count"]')).toHaveText(/Messages \(\d+\)/)
    })
  })

  test.describe('WebSocket Status', () => {
    test('should show open status when connected', async ({ page }) => {
      await page.click('[data-testid="connect-ws-button"]')
      await page.waitForSelector('[data-testid="ws-status-open"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="ws-status-open"]')).toBeVisible()
    })

    test('should show closed status when disconnected', async ({ page }) => {
      await page.click('[data-testid="connect-ws-button"]')
      await page.waitForSelector('[data-testid="ws-status-open"]', { timeout: 10000 })

      await page.click('[data-testid="disconnect-ws-button"]')
      await page.waitForSelector('[data-testid="ws-status-closed"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="ws-status-closed"]')).toBeVisible()
    })
  })
})
