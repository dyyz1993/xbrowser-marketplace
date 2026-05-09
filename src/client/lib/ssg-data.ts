const SSG_DATA_ID = '__SSG_DATA__'

export interface SSGHomeData {
  plugins: Array<{
    name: string
    description: string
    slug: string
    downloads: number
    avgRating: number
    category: string
  }>
  categories: Array<{
    name: string
    slug: string
    count: number
  }>
  totalPlugins: number
}

export interface SSGPluginDetailData {
  plugin: {
    slug: string
    name: string
    description: string
    avgRating: number
    reviewCount: number
    downloads: number
    author: string
    category: string
    version: string
  }
}

export interface SSGCategoriesData {
  categories: Array<{
    name: string
    slug: string
    description?: string
    pluginCount: number
  }>
  totalPlugins: number
}

type SSGPageData = SSGHomeData | SSGPluginDetailData | SSGCategoriesData

let cachedData: SSGPageData | null = null

export function getSSGData<T extends SSGPageData = SSGPageData>(): T | null {
  if (cachedData) return cachedData as T

  if (typeof document === 'undefined') return null

  const script = document.getElementById(SSG_DATA_ID)
  if (!script?.textContent) return null

  try {
    cachedData = JSON.parse(script.textContent) as SSGPageData
    return cachedData as T
  } catch {
    return null
  }
}

export function isSSGPage(): boolean {
  if (typeof document === 'undefined') return false
  const root = document.getElementById('root')
  return root?.getAttribute('data-ssg') === 'true'
}

export function clearSSGData(): void {
  cachedData = null
  if (typeof document === 'undefined') return
  const script = document.getElementById(SSG_DATA_ID)
  if (script) script.remove()
}
