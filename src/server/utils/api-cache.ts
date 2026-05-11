interface CacheConfig {
  key: string
  ttl: number
}

export async function withApiCache<T>(
  cache: KVNamespace | undefined,
  config: CacheConfig,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!cache) {
    return fetcher()
  }

  const cached = await cache.get(config.key, 'text')
  if (cached) {
    try {
      return JSON.parse(cached) as T
    } catch {
      // invalid cache entry, continue to fetch
    }
  }

  const data = await fetcher()

  cache
    .put(config.key, JSON.stringify(data), {
      expirationTtl: config.ttl,
    })
    .catch(() => {})

  return data
}

export async function invalidateCache(cache: KVNamespace | undefined, key: string): Promise<void> {
  if (!cache) return
  await cache.delete(key).catch(() => {})
}

export async function invalidatePluginCache(
  cache: KVNamespace | undefined,
  extraKeys?: string[]
): Promise<void> {
  if (!cache) return
  const keys = [
    'plugins:list:1:20:newest',
    'plugins:featured',
    'categories:all',
    'stats:overview',
    ...(extraKeys ?? []),
  ]
  await Promise.all(keys.map(k => cache.delete(k).catch(() => {})))
}
