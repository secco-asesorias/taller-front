export function unwrapApiList(data, preferredKeys = []) {
  if (data == null) return []
  if (Array.isArray(data)) return data
  const o = data
  for (const k of preferredKeys) {
    const v = o[k]
    if (Array.isArray(v)) return v
  }
  const keys = ['data', 'results', 'items', 'rows', 'list', 'actas', 'diagnosticos', 'cotizaciones', 'ordenes']
  for (const k of keys) {
    const v = o[k]
    if (Array.isArray(v)) return v
  }
  return []
}
