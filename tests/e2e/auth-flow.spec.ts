import { test, expect } from '@playwright/test'

function getBaseUrl(): string {
  return process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010'
}

test.describe('Auth Flow', () => {
  const testUser = {
    username: `e2e_user_${Date.now()}`,
    email: `e2e_${Date.now()}@test.com`,
    password: 'TestPass123!',
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

  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/register`)
      await page.waitForSelector('[data-testid="register-form"]', { timeout: 15000 })

      await page.fill('[data-testid="register-username"]', testUser.username)
      await page.fill('[data-testid="register-email"]', testUser.email)
      await page.fill('[data-testid="register-password"]', testUser.password)
      await page.fill('[data-testid="register-confirm-password"]', testUser.password)
      await page.click('[data-testid="register-submit"]')

      await page.waitForURL('**/dashboard', { timeout: 15000 })
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('should show error for duplicate email', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-user`, {
        data: { username: 'existing_user', email: testUser.email, password: 'hashed' },
      })

      await page.goto(`${getBaseUrl()}/register`)
      await page.waitForSelector('[data-testid="register-form"]', { timeout: 15000 })

      await page.fill('[data-testid="register-username"]', 'another_user')
      await page.fill('[data-testid="register-email"]', testUser.email)
      await page.fill('[data-testid="register-password"]', testUser.password)
      await page.fill('[data-testid="register-confirm-password"]', testUser.password)
      await page.click('[data-testid="register-submit"]')

      await page.waitForSelector('[data-testid="form-error"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="form-error"]')).toContainText(/already.*exist|already.*registered/i)
    })

    test('should show error for duplicate username', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-user`, {
        data: { username: testUser.username, email: 'other@test.com', password: 'hashed' },
      })

      await page.goto(`${getBaseUrl()}/register`)
      await page.waitForSelector('[data-testid="register-form"]', { timeout: 15000 })

      await page.fill('[data-testid="register-username"]', testUser.username)
      await page.fill('[data-testid="register-email"]', `unique_${Date.now()}@test.com`)
      await page.fill('[data-testid="register-password"]', testUser.password)
      await page.fill('[data-testid="register-confirm-password"]', testUser.password)
      await page.click('[data-testid="register-submit"]')

      await page.waitForSelector('[data-testid="form-error"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="form-error"]')).toContainText(/already.*taken|already.*exist/i)
    })

    test('should show error for password mismatch', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/register`)
      await page.waitForSelector('[data-testid="register-form"]', { timeout: 15000 })

      await page.fill('[data-testid="register-username"]', 'mismatch_user')
      await page.fill('[data-testid="register-email"]', 'mismatch@test.com')
      await page.fill('[data-testid="register-password"]', 'Password123!')
      await page.fill('[data-testid="register-confirm-password"]', 'DifferentPassword!')
      await page.click('[data-testid="register-submit"]')

      await page.waitForSelector('[data-testid="form-error"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="form-error"]')).toContainText(/match/i)
    })
  })

  test.describe('Login', () => {
    test('should login with correct credentials', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-user`, {
        data: { username: 'loginuser', email: 'login@test.com', password: 'TestPass123!' },
      })

      await page.goto(`${getBaseUrl()}/login`)
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 15000 })

      await page.fill('[data-testid="login-email"]', 'login@test.com')
      await page.fill('[data-testid="login-password"]', 'TestPass123!')
      await page.click('[data-testid="login-submit"]')

      await page.waitForURL('**/dashboard', { timeout: 15000 })
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('should show error for wrong password', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-user`, {
        data: { username: 'loginuser', email: 'login@test.com', password: 'TestPass123!' },
      })

      await page.goto(`${getBaseUrl()}/login`)
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 15000 })

      await page.fill('[data-testid="login-email"]', 'login@test.com')
      await page.fill('[data-testid="login-password"]', 'WrongPassword!')
      await page.click('[data-testid="login-submit"]')

      await page.waitForSelector('[data-testid="form-error"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="form-error"]')).toContainText(/invalid|incorrect|wrong/i)
    })

    test('should show error for non-existent user', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/login`)
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 15000 })

      await page.fill('[data-testid="login-email"]', 'nonexistent@test.com')
      await page.fill('[data-testid="login-password"]', 'SomePassword!')
      await page.click('[data-testid="login-submit"]')

      await page.waitForSelector('[data-testid="form-error"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="form-error"]')).toContainText(/invalid|not found/i)
    })
  })

  test.describe('API Key Auth', () => {
    test('should authenticate using API key', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-user`, {
        data: {
          username: 'apikeyuser',
          email: 'apikey@test.com',
          password: 'TestPass123!',
          apiKey: 'test-api-key-e2e-12345',
        },
      })

      const response = await page.request.get(`${getBaseUrl()}/api/user/profile`, {
        headers: { Authorization: 'Bearer test-api-key-e2e-12345' },
      })

      expect(response.ok()).toBeTruthy()
      const body = await response.json()
      expect(body.data.email).toBe('apikey@test.com')
    })
  })

  test.describe('Logout', () => {
    test('should logout and clear session', async ({ page }) => {
      await page.request.post(`${getBaseUrl()}/api/__test__/seed-user`, {
        data: { username: 'logoutuser', email: 'logout@test.com', password: 'TestPass123!' },
      })

      await page.goto(`${getBaseUrl()}/login`)
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 15000 })

      await page.fill('[data-testid="login-email"]', 'logout@test.com')
      await page.fill('[data-testid="login-password"]', 'TestPass123!')
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('**/dashboard', { timeout: 15000 })

      await page.click('[data-testid="logout-button"]')

      await page.waitForURL('**/login', { timeout: 15000 })
      await expect(page).toHaveURL(/\/login/)

      const token = await page.evaluate(() => localStorage.getItem('auth_token'))
      expect(token).toBeNull()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected page without auth', async ({ page }) => {
      await page.goto(`${getBaseUrl()}/dashboard`)
      await page.waitForURL('**/login', { timeout: 15000 })
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect to login when token is expired', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expired-token-12345')
      })

      await page.goto(`${getBaseUrl()}/dashboard`)
      await page.waitForURL('**/login', { timeout: 15000 })
      await expect(page).toHaveURL(/\/login/)
    })
  })
})
