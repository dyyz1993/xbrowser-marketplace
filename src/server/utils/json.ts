export function parseJsonField<T>(value: string | null | undefined): T | undefined {
  if (!value) return undefined
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

export function serializeJsonField(value: string[] | undefined): string | undefined {
  if (!value || value.length === 0) return undefined
  return JSON.stringify(value)
}
