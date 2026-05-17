/** Normaliza patente para búsquedas y comparación (trim + mayúsculas). */
export function normalizePatente(value) {
  if (value == null) return ''
  return String(value).trim().toUpperCase()
}

export function isPatenteAbrible(value) {
  const p = normalizePatente(value)
  if (!p) return false
  if (p === '—' || p === '-' || p === 'SIN ASIGNAR') return false
  return true
}
