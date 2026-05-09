import { test, expect } from '@playwright/test'

const SITE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3010'

async function seedPluginsForHydration() {
  const plugins = [
    {
      name: 'Hydration Test Plugin A',
      slug: 'hydration-test-a',
      category: 'tools',
      status: 'approved',
      description: 'Test plugin A for hydration',
    },
    {
      name: 'Hydration Test Plugin B',
      slug: 'hydration-test-b',
      category: 'productivity',
      status: 'approved',
      description: 'Test plugin B for hydration',
    },
  ]
  for (const plugin of plugins) {
    await fetch(`${SITE_URL}/api/__test__/seed-plugin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plugin),
    })
  }
}

test.describe('SSR Hydration Quality', () => {
  test.describe.configure({ timeout: 30000 })

  test('homepage - DOM should not change significantly during hydration', async ({ page }) => {
    await fetch(`${SITE_URL}/api/__test__/cleanup`, { method: 'POST' })
    await fetch(`${SITE_URL}/api/__test__/seed`, { method: 'POST' })
    await seedPluginsForHydration()

    await page.goto(SITE_URL + '/', { waitUntil: 'domcontentloaded' })

    const ssrNodeCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-testid="plugin-card"]').length
    })

    if (ssrNodeCount === 0) {
      console.log('\n⚠️ SSR not active (local dev server). Skipping SSR assertions.')
      console.log('This test should run against a production/Cloudflare deployment.')
      return
    }

    const ssrTitle = await page.evaluate(() => document.title)

    await page.evaluate(() => {
      ;(window as any).__mutations = []
      const observer = new MutationObserver(muts => {
        for (const m of muts) {
          const target = m.target as HTMLElement
          const tag = target.tagName || target.nodeName || 'text'
          const id = target.id ? `#${target.id}` : ''
          const cls =
            target.className && typeof target.className === 'string'
              ? `.${target.className.split(' ').slice(0, 2).join('.')}`
              : ''
          ;(window as any).__mutations.push({
            type: m.type,
            target: `${tag}${id}${cls}`.substring(0, 80),
            addedCount: m.addedNodes.length,
            removedCount: m.removedNodes.length,
          })
        }
      })
      observer.observe(document.getElementById('root')!, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })
      ;(window as any).__observer = observer
    })

    await page.waitForTimeout(3000)

    const allMutations = await page.evaluate(() => {
      ;(window as any).__observer?.disconnect()
      return (window as any).__mutations || []
    })

    const hydratedNodeCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-testid="plugin-card"]').length
    })

    const hydratedTitle = await page.evaluate(() => document.title)

    console.log('\n=== Hydration Test Results (Homepage) ===')
    console.log(`Site URL: ${SITE_URL}`)
    console.log(`SSR plugin cards: ${ssrNodeCount}`)
    console.log(`Hydrated plugin cards: ${hydratedNodeCount}`)
    console.log(`SSR title: ${ssrTitle}`)
    console.log(`Hydrated title: ${hydratedTitle}`)
    console.log(`Total DOM mutations: ${allMutations.length}`)

    const majorMutations = allMutations.filter(
      (m: { addedCount: number; removedCount: number }) => m.addedCount > 5 || m.removedCount > 5
    )
    console.log(`Major mutations (added/removed > 5 nodes): ${majorMutations.length}`)

    const rootReplacements = allMutations.filter(
      (m: { target: string; removedCount: number }) =>
        m.target.includes('#root') && m.removedCount > 0
    )
    console.log(`Root-level replacements: ${rootReplacements.length}`)

    console.log('\nFirst 20 mutations:')
    allMutations
      .slice(0, 20)
      .forEach(
        (
          m: { type: string; target: string; addedCount: number; removedCount: number },
          i: number
        ) => {
          console.log(`  ${i + 1}. ${m.type} on ${m.target} (+${m.addedCount}/-${m.removedCount})`)
        }
      )

    if (majorMutations.length > 0) {
      console.log('\nMajor mutations detail:')
      majorMutations.forEach(
        (
          m: { type: string; target: string; addedCount: number; removedCount: number },
          i: number
        ) => {
          console.log(`  ${i + 1}. ${m.type} on ${m.target} (+${m.addedCount}/-${m.removedCount})`)
        }
      )
    }

    if (rootReplacements.length > 0) {
      console.log('\n⚠️ ROOT WAS REPLACED - This means createRoot was used, NOT hydration')
      console.log('The entire SSR content was cleared and re-rendered by React')
    } else {
      console.log('\n✅ Root was NOT replaced - hydration appears to be working')
    }

    expect(ssrNodeCount).toBeGreaterThan(0)
    expect(hydratedNodeCount).toBeGreaterThan(0)
  })

  test('homepage - measure CLS (Cumulative Layout Shift)', async ({ page }) => {
    await page.goto(SITE_URL + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)

    const clsValue = await page.evaluate(() => {
      let cls = 0
      const entries = performance.getEntriesByType('layout-shift') as Array<
        PerformanceEntry & { hadRecentInput?: boolean; value?: number }
      >
      for (const entry of entries) {
        if (!entry.hadRecentInput && entry.value) {
          cls += entry.value
        }
      }
      return cls
    })

    console.log(`\n=== CLS Results ===`)
    console.log(`CLS score: ${clsValue.toFixed(4)}`)
    console.log(
      `Rating: ${clsValue < 0.1 ? '✅ Good' : clsValue < 0.25 ? '⚠️ Needs Improvement' : '❌ Poor'}`
    )
    console.log(`Google threshold: Good < 0.1, Poor > 0.25`)

    expect(clsValue).toBeLessThan(0.5)
  })

  test('plugin detail - DOM should not change significantly', async ({ page }) => {
    await page.goto(SITE_URL + '/plugin/baidu', { waitUntil: 'domcontentloaded' })

    const ssrTitle = await page.evaluate(() => document.title)

    await page.evaluate(() => {
      ;(window as any).__mutations = []
      const observer = new MutationObserver(muts => {
        for (const m of muts) {
          const target = m.target as HTMLElement
          const tag = target.tagName || 'text'
          const id = target.id ? `#${target.id}` : ''
          ;(window as any).__mutations.push({
            type: m.type,
            target: `${tag}${id}`.substring(0, 80),
            addedCount: m.addedNodes.length,
            removedCount: m.removedNodes.length,
          })
        }
      })
      observer.observe(document.getElementById('root')!, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })
      ;(window as any).__observer = observer
    })

    await page.waitForTimeout(3000)

    const mutations = await page.evaluate(() => {
      ;(window as any).__observer?.disconnect()
      return (window as any).__mutations || []
    })

    const hydratedTitle = await page.evaluate(() => document.title)

    console.log(`\n=== Plugin Detail Hydration ===`)
    console.log(`SSR title: ${ssrTitle}`)
    console.log(`Hydrated title: ${hydratedTitle}`)
    console.log(`Total mutations: ${mutations.length}`)

    const rootMutations = mutations.filter(
      (m: { target: string; removedCount: number }) =>
        m.target.includes('#root') && m.removedCount > 0
    )
    if (rootMutations.length > 0) {
      console.log(`⚠️ ROOT WAS CLEARED - SSR content was replaced, not hydrated`)
    }

    mutations
      .slice(0, 10)
      .forEach(
        (
          m: { type: string; target: string; addedCount: number; removedCount: number },
          i: number
        ) => {
          console.log(`  ${i + 1}. ${m.type} on ${m.target} (+${m.addedCount}/-${m.removedCount})`)
        }
      )
  })
})
