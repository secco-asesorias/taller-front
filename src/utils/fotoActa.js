/** Extensión sugerida según MIME (para POST /api/fotos/acta). */
export function extDesdeMime(mime = '') {
  const m = String(mime).toLowerCase()
  if (m.includes('png')) return 'png'
  if (m.includes('webp')) return 'webp'
  return 'jpg'
}

export async function fileToBase64DataPart(file) {
  const reader = new FileReader()
  await new Promise((res, rej) => {
    reader.onerror = () => rej(new Error('No se pudo leer la imagen'))
    reader.onload = () => res()
    reader.readAsDataURL(file)
  })
  const result = String(reader.result || '')
  return result.split(',')[1] || ''
}
