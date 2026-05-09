import { test, expect } from '@playwright/test'

const SITE_URL = 'https://xbrowser-marketplace.dyyz1993.workers.dev'

async function measurePerformance(page: any, url: string) {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 })

  const metrics = await page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]

    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
    const lcp = performance.getEntriesByName('largest-contentful-paint')[0]?.startTime || 0
    const ttfb = nav?.responseStart || 0
    const domComplete = nav?.domComplete || 0
    const loadComplete = nav?.loadEventEnd || 0
    const tti = nav?.domInteractive || 0

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const totalTransferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
    const jsResources = resources.filter(r => r.name.endsWith('.js'))
    const cssResources = resources.filter(r => r.name.endsWith('.css'))
    const jsSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
    const cssSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)

    return {
      ttfb: Math.round(ttfb),
      fcp: Math.round(fcp),
      lcp: Math.round(lcp),
      tti: Math.round(tti),
      domComplete: Math.round(domComplete),
      loadComplete: Math.round(loadComplete),
      totalTransferSize,
      jsResourceCount: jsResources.length,
      cssResourceCount: cssResources.length,
      jsSize,
      cssSize,
      totalRequests: resources.length + 1,
    }
  })

  return metrics
}

async function measureCLS(page: any, url: string, duration = 3000) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  const cls = await page.evaluate(
    async ms => {
      return new Promise<number>(resolve => {
        let clsValue = 0
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            const ls = entry as any
            if (!ls.hadRecentInput) clsValue += ls.value
          }
        })
        observer.observe({ type: 'layout-shift', buffered: true })
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, ms)
      })
    },
    duration,
  )

  return cls
}

async function measureHydration(page: any, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  const hasSSG = await page.evaluate(() => {
    return document.getElementById('root')?.getAttribute('data-ssg') === 'true'
  })

  if (!hasSSG) {
    return { hasSSG: false, mutations: [], rootReplaced: false, ssrNodeCount: 0 }
  }

  const ssrState = await page.evaluate(() => {
    const root = document.getElementById('root')!
    return {
      nodeCount: root.querySelectorAll('*').length,
      pluginCards: root.querySelectorAll('[data-testid="plugin-card"]').length,
      textContent: root.textContent?.substring(0, 200) || '',
    }
  })

  await page.evaluate(() => {
    ;(window as any).__mutations = []
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        const target = m.target as HTMLElement
        ;(window as any).__mutations.push({
          type: m.type,
          target: `${target.tagName || 'text'}${target.id ? '#' + target.id : ''}`.substring(0, 60),
          added: m.addedNodes.length,
          removed: m.removedNodes.length,
          attributeName: m.attributeName || '',
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

  await page.waitForTimeout(4000)

  const mutations = await page.evaluate(() => {
    ;(window as any).__observer?.disconnect()
    return (window as any).__mutations || []
  })

  const hydratedState = await page.evaluate(() => {
    const root = document.getElementById('root')!
    return {
      nodeCount: root.querySelectorAll('*').length,
      pluginCards: root.querySelectorAll('[data-testid="plugin-card"]').length,
      textContent: root.textContent?.substring(0, 200) || '',
    }
  })

  const rootReplaced = mutations.some((m: any) => m.target.includes('#root') && m.removed > 10)
  const majorMutations = mutations.filter((m: any) => m.added > 3 || m.removed > 3)

  return {
    hasSSG: true,
    ssrNodeCount: ssrState.nodeCount,
    hydratedNodeCount: hydratedState.nodeCount,
    ssrPluginCards: ssrState.pluginCards,
    hydratedPluginCards: hydratedState.pluginCards,
    totalMutations: mutations.length,
    majorMutations: majorMutations.length,
    rootReplaced,
    mutations: mutations.slice(0, 15),
  }
}

async function validateSEO(page: any, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  const seo = await page.evaluate(() => {
    const getMeta = (name: string) => {
      const el =
        document.querySelector(`meta[property="${name}"]`) ||
        document.querySelector(`meta[name="${name}"]`)
      return el?.getAttribute('content') || ''
    }
    return {
      title: document.title,
      ogTitle: getMeta('og:title'),
      ogDescription: getMeta('og:description'),
      ogImage: getMeta('og:image'),
      ogUrl: getMeta('og:url'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      description: getMeta('description'),
      noindex: getMeta('robots')?.includes('noindex') || false,
      hasJSONLD: !!document.querySelector('script[type="application/ld+json"]'),
      h1: document.querySelector('h1')?.textContent || '',
      h1Count: document.querySelectorAll('h1').length,
    }
  })

  return seo
}

test.describe('Performance Metrics (Core Web Vitals)', () => {
  test.describe.configure({ timeout: 60000 })

  const pages = [
    { name: 'Homepage', url: '/' },
    { name: 'Plugin Detail', url: '/plugin/baidu/' },
    { name: 'Categories', url: '/categories/' },
    { name: 'CLI', url: '/cli/' },
  ]

  for (const { name, url } of pages) {
    test(`${name} (${url}) — performance metrics`, async ({ page }) => {
      const metrics = await measurePerformance(page, SITE_URL + url)

      console.log(`\n=== ${name} Performance ===`)
      console.log(
        `  TTFB:         ${metrics.ttfb}ms  ${metrics.ttfb < 800 ? '✅' : metrics.ttfb < 1800 ? '⚠️' : '❌'}`,
      )
      console.log(
        `  FCP:          ${metrics.fcp}ms  ${metrics.fcp < 1800 ? '✅' : metrics.fcp < 3000 ? '⚠️' : '❌'}`,
      )
      console.log(
        `  LCP:          ${metrics.lcp}ms  ${metrics.lcp < 2500 ? '✅' : metrics.lcp < 4000 ? '⚠️' : '❌'}`,
      )
      console.log(
        `  TTI:          ${metrics.tti}ms  ${metrics.tti < 3800 ? '✅' : metrics.tti < 7000 ? '⚠️' : '❌'}`,
      )
      console.log(`  DOM Complete: ${metrics.domComplete}ms`)
      console.log(`  Load:         ${metrics.loadComplete}ms`)
      console.log(
        `  JS:           ${metrics.jsResourceCount} files, ${(metrics.jsSize / 1024).toFixed(1)}KB`,
      )
      console.log(
        `  CSS:          ${metrics.cssResourceCount} files, ${(metrics.cssSize / 1024).toFixed(1)}KB`,
      )
      console.log(
        `  Total:        ${(metrics.totalTransferSize / 1024).toFixed(1)}KB (${metrics.totalRequests} requests)`,
      )

      expect(metrics.ttfb, `TTFB should be < 2500ms (proxy-adjusted)`).toBeLessThan(2500)
      expect(metrics.fcp, `FCP should be < 3000ms`).toBeLessThan(3000)
      expect(metrics.lcp, `LCP should be < 4000ms`).toBeLessThan(4000)
    })
  }
})

test.describe('Hydration Quality', () => {
  test.describe.configure({ timeout: 60000 })

  test('Homepage — SSG hydration DOM mutations', async ({ page }) => {
    const result = await measureHydration(page, SITE_URL + '/')

    console.log('\n=== Homepage Hydration ===')
    console.log(`  Has SSG:           ${result.hasSSG ? '✅' : '❌'}`)
    if (result.hasSSG) {
      console.log(`  SSR nodes:         ${result.ssrNodeCount}`)
      console.log(`  Hydrated nodes:    ${result.hydratedNodeCount}`)
      console.log(`  SSR plugin cards:  ${result.ssrPluginCards}`)
      console.log(`  Hydrated cards:    ${result.hydratedPluginCards}`)
      console.log(`  Total mutations:   ${result.totalMutations}`)
      console.log(`  Major mutations:   ${result.majorMutations}`)
      console.log(`  Root replaced:     ${result.rootReplaced ? '❌ YES (bad)' : '✅ NO (good)'}`)
      if (result.mutations.length > 0) {
        console.log('  First mutations:')
        result.mutations.forEach((m: any, i: number) => {
          console.log(`    ${i + 1}. ${m.type} on ${m.target} (+${m.added}/-${m.removed})`)
        })
      }
    }

    if (result.hasSSG) {
      expect(result.rootReplaced, 'Root should NOT be completely replaced').toBe(false)
      expect(result.majorMutations, 'Should have few major mutations').toBeLessThan(10)
    }
  })

  test('Plugin Detail — SSG hydration DOM mutations', async ({ page }) => {
    const result = await measureHydration(page, SITE_URL + '/plugin/baidu/')

    console.log('\n=== Plugin Detail Hydration ===')
    console.log(`  Has SSG:           ${result.hasSSG ? '✅' : '❌'}`)
    if (result.hasSSG) {
      console.log(`  SSR nodes:         ${result.ssrNodeCount}`)
      console.log(`  Hydrated nodes:    ${result.hydratedNodeCount}`)
      console.log(`  Total mutations:   ${result.totalMutations}`)
      console.log(`  Root replaced:     ${result.rootReplaced ? '❌ YES' : '✅ NO'}`)
    }

    if (result.hasSSG) {
      expect(result.rootReplaced).toBe(false)
    }
  })

  test('Homepage — CLS (Cumulative Layout Shift)', async ({ page }) => {
    const cls = await measureCLS(page, SITE_URL + '/', 5000)

    console.log(`\n=== Homepage CLS ===`)
    console.log(
      `  CLS: ${cls.toFixed(4)} ${cls < 0.1 ? '✅ Good' : cls < 0.25 ? '⚠️ Needs Improvement' : '❌ Poor'}`,
    )

    expect(cls, 'CLS should be < 0.1 (Good)').toBeLessThan(0.1)
  })

  test('Plugin Detail — CLS', async ({ page }) => {
    const cls = await measureCLS(page, SITE_URL + '/plugin/baidu/', 5000)

    console.log(`\n=== Plugin Detail CLS ===`)
    console.log(
      `  CLS: ${cls.toFixed(4)} ${cls < 0.1 ? '✅ Good' : cls < 0.25 ? '⚠️ Needs Improvement' : '❌ Poor'}`,
    )

    expect(cls, 'CLS should be < 0.3').toBeLessThan(0.3)
  })
})

test.describe('Slow Network Simulation', () => {
  test.describe.configure({ timeout: 120000 })

  test('Homepage on Slow 3G — still usable', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (500 * 1024) / 8,
      uploadThroughput: (250 * 1024) / 8,
      latency: 100,
    })

    const start = Date.now()
    await page.goto(SITE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    const domContentLoaded = Date.now() - start

    const hasContent = await page.evaluate(() => {
      const root = document.getElementById('root')
      return root ? root.querySelectorAll('*').length > 10 : false
    })

    await page.waitForTimeout(3000)

    const hasPluginCards = await page.evaluate(() => {
      return document.querySelectorAll('[data-testid="plugin-card"]').length > 0
    })

    console.log(`\n=== Slow 3G (500 Kbps) ===`)
    console.log(`  DOM Content Loaded: ${domContentLoaded}ms`)
    console.log(`  Content visible:    ${hasContent ? '✅' : '❌'}`)
    console.log(`  Plugin cards:       ${hasPluginCards ? '✅' : '⚠️ (API still loading)'}`)

    expect(hasContent, 'Page should have content even on slow 3G').toBe(true)

    await context.close()
  })

  test('Homepage on Fast 3G — should load within 10s', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 50,
    })

    const start = Date.now()
    await page.goto(SITE_URL + '/', { waitUntil: 'load', timeout: 60000 })
    const loadTime = Date.now() - start

    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByName('first-contentful-paint')
      return entries.length > 0 ? Math.round(entries[0].startTime) : -1
    })

    console.log(`\n=== Fast 3G (1.6 Mbps) ===`)
    console.log(`  Full load: ${loadTime}ms`)
    console.log(`  FCP:       ${fcp}ms`)
    console.log(`  Rating:    ${loadTime < 5000 ? '✅ Good' : loadTime < 10000 ? '⚠️' : '❌'}`)

    expect(loadTime, 'Should fully load within 10s on Fast 3G').toBeLessThan(10000)

    await context.close()
  })
})

test.describe('SEO Validation', () => {
  test.describe.configure({ timeout: 60000 })

  test('Homepage — SEO tags', async ({ page }) => {
    const seo = await validateSEO(page, SITE_URL + '/')

    console.log('\n=== Homepage SEO ===')
    console.log(`  Title:       ${seo.title}`)
    console.log(`  og:title:    ${seo.ogTitle}`)
    console.log(`  og:description: ${seo.ogDescription.substring(0, 60)}...`)
    console.log(`  og:image:    ${seo.ogImage ? '✅' : '❌'}`)
    console.log(`  Canonical:   ${seo.canonical}`)
    console.log(`  H1:          ${seo.h1}`)
    console.log(`  H1 count:    ${seo.h1Count}`)
    console.log(`  JSON-LD:     ${seo.hasJSONLD ? '✅' : '⚠️'}`)
    console.log(`  Noindex:     ${seo.noindex ? '❌' : '✅'}`)

    expect(seo.title).toContain('XBrowser')
    expect(seo.canonical).toBeTruthy()
    expect(seo.ogTitle).toBeTruthy()
    expect(seo.noindex).toBe(false)
    expect(seo.h1Count).toBeGreaterThanOrEqual(1)
  })

  test('Plugin Detail — SEO tags', async ({ page }) => {
    const seo = await validateSEO(page, SITE_URL + '/plugin/baidu/')

    console.log('\n=== Plugin Detail SEO ===')
    console.log(`  Title:       ${seo.title}`)
    console.log(`  og:title:    ${seo.ogTitle}`)
    console.log(`  Canonical:   ${seo.canonical}`)
    console.log(`  H1:          ${seo.h1}`)
    console.log(`  JSON-LD:     ${seo.hasJSONLD ? '✅' : '❌'}`)
    console.log(`  Noindex:     ${seo.noindex ? '❌' : '✅'}`)

    expect(seo.title).toContain('Baidu')
    expect(seo.canonical).toContain('/plugin/baidu')
    expect(seo.ogTitle).toBeTruthy()
    expect(seo.hasJSONLD).toBe(true)
    expect(seo.noindex).toBe(false)
  })

  test('Categories — SEO tags', async ({ page }) => {
    const seo = await validateSEO(page, SITE_URL + '/categories/')

    console.log('\n=== Categories SEO ===')
    console.log(`  Title:       ${seo.title}`)
    console.log(`  Canonical:   ${seo.canonical}`)
    console.log(`  Noindex:     ${seo.noindex ? '❌' : '✅'}`)

    expect(seo.title).toBeTruthy()
    expect(seo.canonical).toBeTruthy()
    expect(seo.noindex).toBe(false)
  })

  test('Search page — should have noindex', async ({ page }) => {
    const seo = await validateSEO(page, SITE_URL + '/search')

    console.log('\n=== Search SEO ===')
    console.log(`  Noindex:     ${seo.noindex ? '✅' : '❌ (should be noindex)'}`)

    expect(seo.noindex, 'Search page should have noindex').toBe(true)
  })

  test('Login page — should have noindex', async ({ page }) => {
    const seo = await validateSEO(page, SITE_URL + '/login')

    console.log('\n=== Login SEO ===')
    console.log(`  Noindex:     ${seo.noindex ? '✅' : '❌'}`)

    expect(seo.noindex, 'Login page should have noindex').toBe(true)
  })

  test('Sitemap — valid XML with correct URLs', async ({ page }) => {
    const response = await page.goto(SITE_URL + '/sitemap.xml')
    const xml = await response!.text()

    const urlCount = (xml.match(/<loc>/g) || []).length
    const hasHomepage = xml.includes('<loc>https://xbrowser-marketplace.dyyz1993.workers.dev</loc>') || xml.includes('<loc>https://xbrowser-marketplace.dyyz1993.workers.dev/</loc>')
    const hasPlugin = xml.includes('/plugin/')
    const hasCategories = xml.includes('/categories')
    const hasNo1970 = !xml.includes('1970-')

    console.log('\n=== Sitemap ===')
    console.log(`  URLs:        ${urlCount}`)
    console.log(`  Homepage:    ${hasHomepage ? '✅' : '❌'}`)
    console.log(`  Plugins:     ${hasPlugin ? '✅' : '❌'}`)
    console.log(`  Categories:  ${hasCategories ? '✅' : '❌'}`)
    console.log(`  No 1970 dates: ${hasNo1970 ? '✅' : '❌'}`)

    expect(urlCount).toBeGreaterThan(5)
    expect(hasHomepage).toBe(true)
    expect(hasPlugin).toBe(true)
    expect(hasNo1970).toBe(true)
  })

  test('Robots.txt — correct rules', async ({ page }) => {
    const response = await page.goto(SITE_URL + '/robots.txt')
    const txt = await response!.text()

    const allowsPlugin = txt.includes('Allow: /plugin/')
    const disallowsAPI = txt.includes('Disallow: /api/')
    const disallowsAdmin = txt.includes('Disallow: /admin/')
    const hasSitemap = txt.includes('Sitemap:')

    console.log('\n=== Robots.txt ===')
    console.log(`  Allow /plugin/:   ${allowsPlugin ? '✅' : '❌'}`)
    console.log(`  Disallow /api/:   ${disallowsAPI ? '✅' : '❌'}`)
    console.log(`  Disallow /admin/: ${disallowsAdmin ? '✅' : '❌'}`)
    console.log(`  Has Sitemap:      ${hasSitemap ? '✅' : '❌'}`)

    expect(allowsPlugin).toBe(true)
    expect(disallowsAPI).toBe(true)
    expect(disallowsAdmin).toBe(true)
    expect(hasSitemap).toBe(true)
  })
})
