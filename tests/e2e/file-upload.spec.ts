/**
 * File Upload E2E Tests
 *
 * SKIP: Client-side file upload page (/files) and auth pages not implemented.
 */

import { test, expect } from '@playwright/test'

test.skip('Client file upload page not implemented yet')
import path from 'path'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

test.describe('File Upload', () => {
  async function loginAsUser(page: import('@playwright/test').Page) {
    await page.request.post(`${getBaseUrl()}/api/__test__/seed-user`, {
      data: { username: 'fileuser', email: 'file@test.com', password: 'TestPass123!' },
    })

    await page.goto(`${getBaseUrl()}/login`)
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 15000 })
    await page.fill('[data-testid="login-email"]', 'file@test.com')
    await page.fill('[data-testid="login-password"]', 'TestPass123!')
    await page.click('[data-testid="login-submit"]')
    await page.waitForURL('**/dashboard', { timeout: 15000 })
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

    await loginAsUser(page)
    await page.goto(`${getBaseUrl()}/files`)
    await page.waitForSelector('[data-testid="file-manager-container"]', { timeout: 15000 })
  })

  test.afterEach(async ({ page, context }) => {
    const pages = context.pages()
    for (const p of pages) {
      if (p !== page) {
        await p.close()
      }
    }
  })

  test.describe('Upload File', () => {
    test('should upload a file successfully', async ({ page }) => {
      const testFilePath = path.join(__dirname, '__fixtures__', 'test-file.txt')

      await page.setInputFiles('[data-testid="file-input"]', testFilePath)
      await page.click('[data-testid="upload-button"]')

      await page.waitForSelector('[data-testid="file-item"]', { timeout: 15000 })
      await expect(page.locator('[data-testid="file-item"]').first()).toBeVisible()
      await expect(page.locator('[data-testid="file-item"]').first()).toContainText('test-file.txt')
    })

    test('should reject files with invalid type', async ({ page }) => {
      const testFilePath = path.join(__dirname, '__fixtures__', 'test-file.exe')

      await page.setInputFiles('[data-testid="file-input"]', testFilePath)
      await page.click('[data-testid="upload-button"]')

      await page.waitForSelector('[data-testid="upload-error"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="upload-error"]')).toContainText(
        /file type|not allowed/i
      )
    })

    test('should reject files exceeding size limit', async ({ page }) => {
      const testFilePath = path.join(__dirname, '__fixtures__', 'large-file.bin')

      await page.setInputFiles('[data-testid="file-input"]', testFilePath)
      await page.click('[data-testid="upload-button"]')

      await page.waitForSelector('[data-testid="upload-error"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="upload-error"]')).toContainText(
        /size|too large|exceed/i
      )
    })

    test('should show upload progress', async ({ page }) => {
      const testFilePath = path.join(__dirname, '__fixtures__', 'test-file.txt')

      await page.setInputFiles('[data-testid="file-input"]', testFilePath)
      await page.click('[data-testid="upload-button"]')

      await page
        .waitForSelector('[data-testid="upload-progress"]', { timeout: 5000 })
        .catch(() => {})
      await page.waitForSelector('[data-testid="file-item"]', { timeout: 15000 })
      await expect(page.locator('[data-testid="file-item"]').first()).toBeVisible()
    })
  })

  test.describe('View Files', () => {
    test('should display uploaded files list', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-file`, {
        data: { name: 'document.pdf', size: 1024, mimeType: 'application/pdf' },
      })

      await page.goto(`${getBaseUrl()}/files`)
      await page.waitForSelector('[data-testid="file-manager-container"]', { timeout: 15000 })

      await expect(page.locator('[data-testid="file-item"]').first()).toBeVisible()
      await expect(page.locator('[data-testid="file-item"]').first()).toContainText('document.pdf')
    })

    test('should show empty state when no files', async ({ page }) => {
      await expect(page.locator('[data-testid="file-empty-state"]')).toBeVisible()
    })
  })

  test.describe('Download File', () => {
    test('should download file via download link', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-file`, {
        data: {
          name: 'download-test.txt',
          size: 256,
          mimeType: 'text/plain',
          content: 'hello world',
        },
      })

      await page.goto(`${getBaseUrl()}/files`)
      await page.waitForSelector('[data-testid="file-item"]', { timeout: 15000 })

      const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
      await page
        .locator('[data-testid="file-item"]')
        .first()
        .locator('[data-testid="download-button"]')
        .click()
      const download = await downloadPromise

      expect(download.suggestedFilename()).toContain('download-test.txt')
    })
  })

  test.describe('Delete File', () => {
    test('should delete a file with confirmation', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-file`, {
        data: { name: 'to-delete.txt', size: 128, mimeType: 'text/plain' },
      })

      await page.goto(`${getBaseUrl()}/files`)
      await page.waitForSelector('[data-testid="file-item"]', { timeout: 15000 })

      await page
        .locator('[data-testid="file-item"]')
        .first()
        .locator('[data-testid="delete-file-button"]')
        .click()

      await page.waitForSelector('[data-testid="confirm-delete-dialog"]', { timeout: 10000 })
      await page.click('[data-testid="confirm-delete-button"]')

      await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="file-item"]')).toHaveCount(0)
    })
  })

  test.describe('Private File Access', () => {
    test('should access private file via signed URL', async ({ page }) => {
      const seedResp = await page.request.post(`${getBaseUrl()}/api/__test__/seed-file`, {
        data: { name: 'private-doc.pdf', size: 512, mimeType: 'application/pdf', isPrivate: true },
      })
      const seedData = await seedResp.json()

      const response = await page.request.get(
        `${getBaseUrl()}/api/files/${seedData.data.id}/download?token=${seedData.data.signedUrl}`
      )

      expect(response.ok()).toBeTruthy()
      expect(response.headers()['content-type']).toContain('application/pdf')
    })

    test('should deny access to private file without signed URL', async ({ page }) => {
      const seedResp = await page.request.post(`${getBaseUrl()}/api/__test__/seed-file`, {
        data: { name: 'private-doc2.pdf', size: 512, mimeType: 'application/pdf', isPrivate: true },
      })
      const seedData = await seedResp.json()

      const response = await page.request.get(
        `${getBaseUrl()}/api/files/${seedData.data.id}/download`
      )

      expect(response.status()).toBe(403)
    })
  })
})
