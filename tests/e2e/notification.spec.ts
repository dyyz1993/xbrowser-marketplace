/**
 * Notification App E2E Tests
 *
 * Testing Notification application functionality with Playwright
 *
 * The dev server is started automatically by global-setup.ts
 * on a random available port.
 */

import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

/**
 * Cleanup after each test
 * IMPORTANT: Close all browser resources to prevent memory leaks
 */
// Track if we're in a test that needs persistence
const persistenceTestInProgress = false

test.beforeEach(async ({ page }) => {
  // Only cleanup database if we're not in a persistence test
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

  // Clear storage safely
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (e) {
        // Ignore security errors for localStorage access
        console.warn('Could not clear storage:', e)
      }
    })
  } catch (error) {
    console.warn('Error clearing storage:', error)
  }

  await page.goto(`${getBaseUrl()}/notifications`)
  await page.waitForLoadState('load')
  await page.waitForSelector('[data-testid="notification-container"]', { timeout: 25000 })
})

test.afterEach(async ({ page, context }) => {
  // Close all pages in context
  const pages = context.pages()
  for (const p of pages) {
    if (p !== page) {
      await p.close()
    }
  }
})

test.describe('Notification App', () => {
  /**
   * Test 1: Page Load
   */
  test.describe('Page Load', () => {
    test('should load notification page successfully', async ({ page }) => {
      // Verify main container is visible
      await expect(page.locator('[data-testid="notification-container"]')).toBeVisible()

      // Verify page title
      await expect(page.locator('h1').last()).toHaveText('Notifications')
    })

    test('should display empty state when no notifications', async ({ page }) => {
      // Wait for empty state to appear
      await page.waitForSelector('[data-testid="empty-state"]', { timeout: 25000 })

      // Verify empty state message
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible()
    })
  })

  /**
   * Test 2: SSE Connection
   */
  test.describe('SSE Connection', () => {
    test('should connect to SSE', async ({ page }) => {
      await page.click('[data-testid="connect-sse-button"]')
      await page.waitForSelector('[data-testid="sse-status-connected"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="sse-status-connected"]')).toBeVisible()
    })

    test('should disconnect from SSE', async ({ page }) => {
      await page.click('[data-testid="connect-sse-button"]')
      await page.waitForSelector('[data-testid="sse-status-connected"]', { timeout: 10000 })

      await page.click('[data-testid="disconnect-sse-button"]')
      await page.waitForSelector('[data-testid="sse-status-disconnected"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="sse-status-disconnected"]')).toBeVisible()
    })
  })

  /**
   * Test 3: Create Notification
   */
  test.describe('Create Notification', () => {
    test('should create a new info notification', async ({ page }) => {
      // Fill in notification details
      await page.fill('[data-testid="notification-title-input"]', 'Test Info Notification')
      await page.fill(
        '[data-testid="notification-message-input"]',
        'This is a test info notification'
      )
      await page.selectOption('[data-testid="notification-type-select"]', 'info')

      // Submit form
      await page.click('[data-testid="create-notification-button"]')

      await page.waitForSelector('[data-testid="notification-item-unread"]', { timeout: 10000 })
      await expect(
        page
          .locator('[data-testid="notification-item-unread"] [data-testid="notification-title"]')
          .first()
      ).toHaveText('Test Info Notification')
    })

    test('should create a new success notification', async ({ page }) => {
      await page.fill('[data-testid="notification-title-input"]', 'Test Success Notification')
      await page.fill(
        '[data-testid="notification-message-input"]',
        'This is a test success notification'
      )
      await page.selectOption('[data-testid="notification-type-select"]', 'success')

      await page.click('[data-testid="create-notification-button"]')

      await page.waitForSelector('[data-testid="notification-item-unread"]', { timeout: 10000 })
      await expect(
        page
          .locator('[data-testid="notification-item-unread"] [data-testid="notification-title"]')
          .first()
      ).toHaveText('Test Success Notification')
    })

    test('should create a new warning notification', async ({ page }) => {
      await page.fill('[data-testid="notification-title-input"]', 'Test Warning Notification')
      await page.fill(
        '[data-testid="notification-message-input"]',
        'This is a test warning notification'
      )
      await page.selectOption('[data-testid="notification-type-select"]', 'warning')

      await page.click('[data-testid="create-notification-button"]')

      await page.waitForSelector('[data-testid="notification-item-unread"]', { timeout: 10000 })
      await expect(
        page
          .locator('[data-testid="notification-item-unread"] [data-testid="notification-title"]')
          .first()
      ).toHaveText('Test Warning Notification')
    })

    test('should create a new error notification', async ({ page }) => {
      await page.fill('[data-testid="notification-title-input"]', 'Test Error Notification')
      await page.fill(
        '[data-testid="notification-message-input"]',
        'This is a test error notification'
      )
      await page.selectOption('[data-testid="notification-type-select"]', 'error')

      await page.click('[data-testid="create-notification-button"]')

      await page.waitForSelector('[data-testid="notification-item-unread"]', { timeout: 10000 })
      await expect(
        page
          .locator('[data-testid="notification-item-unread"] [data-testid="notification-title"]')
          .first()
      ).toHaveText('Test Error Notification')
    })

    test('should clear input after creating notification', async ({ page }) => {
      await page.fill('[data-testid="notification-title-input"]', 'Test Notification')
      await page.fill('[data-testid="notification-message-input"]', 'Test message')
      await page.click('[data-testid="create-notification-button"]')

      await expect(page.locator('[data-testid="notification-title-input"]')).toHaveValue('')
      await expect(page.locator('[data-testid="notification-message-input"]')).toHaveValue('')
    })

    test('should not create empty notification', async ({ page }) => {
      const initialCount = await page
        .locator('[data-testid="notification-item-read"], [data-testid="notification-item-unread"]')
        .count()

      await expect(page.locator('[data-testid="create-notification-button"]')).toBeDisabled()
      await page.click('[data-testid="create-notification-button"]', { force: true })
      await page.waitForTimeout(500)

      const newCount = await page
        .locator('[data-testid="notification-item-read"], [data-testid="notification-item-unread"]')
        .count()
      expect(newCount).toBe(initialCount)
    })
  })

  /**
   * Test 4: Mark as Read
   */
  test.describe('Mark as Read', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('[data-testid="notification-title-input"]', 'Test Notification')
      await page.fill('[data-testid="notification-message-input"]', 'Test message')
      await page.click('[data-testid="create-notification-button"]')
      await page.waitForSelector('[data-testid="notification-item-unread"]', { timeout: 10000 })
    })

    test('should mark notification as read', async ({ page }) => {
      await page.click('[data-testid="mark-as-read-button"]')
      await page.waitForSelector('[data-testid="notification-item-read"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="notification-item-read"]')).toBeVisible()
    })

    test('should mark all notifications as read', async ({ page }) => {
      await page.fill('[data-testid="notification-title-input"]', 'Test Notification 2')
      await page.fill('[data-testid="notification-message-input"]', 'Test message 2')
      await page.click('[data-testid="create-notification-button"]')
      await page.waitForTimeout(1000)

      await page.click('[data-testid="mark-all-read-button"]')
      await page.waitForTimeout(1000)

      const readNotifications = await page.locator('[data-testid="notification-item-read"]').count()
      const totalNotifications = await page
        .locator('[data-testid="notification-item-read"], [data-testid="notification-item-unread"]')
        .count()
      expect(readNotifications).toBe(totalNotifications)
    })
  })

  /**
   * Test 5: Delete Notification
   */
  test.describe('Delete Notification', () => {
    test('should delete a notification', async ({ page }) => {
      await page.fill('[data-testid="notification-title-input"]', 'Notification to delete')
      await page.fill('[data-testid="notification-message-input"]', 'Test message')
      await page.click('[data-testid="create-notification-button"]')
      await page.waitForSelector('[data-testid="notification-item-unread"]', { timeout: 10000 })

      const countBefore = await page
        .locator('[data-testid="notification-item-read"], [data-testid="notification-item-unread"]')
        .count()

      await page.click('[data-testid="delete-notification-button"]')
      await page.waitForTimeout(1000)

      const countAfter = await page
        .locator('[data-testid="notification-item-read"], [data-testid="notification-item-unread"]')
        .count()
      expect(countAfter).toBe(countBefore - 1)
    })
  })

  /**
   * Test 6: Multiple Notifications
   */
  test.describe('Multiple Notifications', () => {
    test('should display multiple notifications', async ({ page }) => {
      await page.fill('[data-testid="notification-title-input"]', 'Notification 1')
      await page.fill('[data-testid="notification-message-input"]', 'Message 1')
      await page.click('[data-testid="create-notification-button"]')
      await page.waitForTimeout(500)

      await page.fill('[data-testid="notification-title-input"]', 'Notification 2')
      await page.fill('[data-testid="notification-message-input"]', 'Message 2')
      await page.click('[data-testid="create-notification-button"]')
      await page.waitForTimeout(500)

      await page.fill('[data-testid="notification-title-input"]', 'Notification 3')
      await page.fill('[data-testid="notification-message-input"]', 'Message 3')
      await page.click('[data-testid="create-notification-button"]')
      await page.waitForTimeout(500)

      const count = await page
        .locator('[data-testid="notification-item-read"], [data-testid="notification-item-unread"]')
        .count()
      expect(count).toBeGreaterThanOrEqual(3)
    })

    test('should display unread count', async ({ page }) => {
      await page.fill('[data-testid="notification-title-input"]', 'Notification 1')
      await page.fill('[data-testid="notification-message-input"]', 'Message 1')
      await page.click('[data-testid="create-notification-button"]')
      await page.waitForSelector('[data-testid="notification-item-unread"]', { timeout: 10000 })

      await page.fill('[data-testid="notification-title-input"]', 'Notification 2')
      await page.fill('[data-testid="notification-message-input"]', 'Message 2')
      await page.click('[data-testid="create-notification-button"]')
      await page.waitForTimeout(2000)

      const unreadLocator = page.locator('[data-testid="unread-count"]')
      await expect(unreadLocator).not.toHaveText('0', { timeout: 10000 })
    })
  })

  /**
   * Test 7: Persistence
   */
  test.describe('Persistence', () => {
    test('should persist notifications across page reloads', async ({ page, browser }) => {
      try {
        const response = await page.request.post(`${getBaseUrl()}/api/__test__/cleanup`)
        if (!response.ok) {
          console.warn('Failed to cleanup database:', await response.text())
        }
      } catch (error) {
        console.warn('Error during database cleanup:', error)
      }

      await page.goto(`${getBaseUrl()}/notifications`)
      await page.waitForLoadState('load')
      await page.waitForSelector('[data-testid="notification-container"]', { timeout: 25000 })

      await page.fill('[data-testid="notification-title-input"]', 'Persistent notification')
      await page.fill(
        '[data-testid="notification-message-input"]',
        'This notification should persist'
      )
      await page.click('[data-testid="create-notification-button"]')

      await page.waitForSelector('[data-testid="notification-item-unread"]', { timeout: 10000 })

      const newContext = await browser.newContext()
      const newPage = await newContext.newPage()

      try {
        await newPage.goto(`${getBaseUrl()}/notifications`)
        await newPage.waitForLoadState('load')
        await newPage.waitForSelector('[data-testid="notification-item-unread"]', {
          timeout: 15000,
        })

        await expect(
          newPage
            .locator('[data-testid="notification-item-unread"] [data-testid="notification-title"]')
            .first()
        ).toHaveText('Persistent notification')
      } finally {
        await newContext.close()
      }
    })
  })
})
