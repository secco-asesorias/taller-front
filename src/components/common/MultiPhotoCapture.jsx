import { useRef, useState } from 'react'
import { eliminarFotoDiagnostico, subirFotoDiagnostico, supabaseConfigurado } from '../../lib/supabase'

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])
const MAX_IMAGE_SIDE = 1600
const IMAGE_QUALITY = 0.82

function validarImagen(file) {
  const ext = file.name?.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : ''
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) return
  if (ALLOWED_EXTENSIONS.has(ext)) return
  if (!type && !ext) return
  throw new Error('Formato no permitido. Usa JPG, PNG, WebP o una imagen de la galería.')
}

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}

async function optimizarImagen(file) {
  validarImagen(file)

  const img = await cargarImagen(file)
  const ratio = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * ratio))
  const height = Math.max(1, Math.round(img.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/webp', IMAGE_QUALITY)
  })
  if (!blob) return file

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
}

function toPreview(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
}

export default function MultiPhotoCapture({ seccion, item = null, label = 'Fotos de la sección', diagnosticoId, fotos = [], onChange }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setLoading(true)
    setError('')
    try {
      files.forEach(validarImagen)
      const nuevasFotos = []
      for (const file of files) {
        const optimizada = await optimizarImagen(file)
        if (supabaseConfigurado() && diagnosticoId) {
          const saved = await subirFotoDiagnostico(diagnosticoId, seccion, item, optimizada)
          nuevasFotos.push({
            id: saved.id,
            url: saved.url,
            item: saved.item || item,
            descripcion: saved.descripcion || '',
            orden: saved.orden || 0,
          })
        } else {
          const preview = await toPreview(optimizada)
          nuevasFotos.push({ url: preview, item, descripcion: '', file: optimizada })
        }
      }
      onChange([...(fotos || []), ...nuevasFotos])
    } catch (e) {
      setError(e.message || 'No se pudo subir la foto.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove(index) {
    const foto = fotos[index]
    onChange((fotos || []).filter((_, i) => i !== index))
    if (!supabaseConfigurado() || !diagnosticoId || !foto?.url) return
    try {
      await eliminarFotoDiagnostico({ ...foto, diagnostico_id: diagnosticoId, seccion, item })
    } catch (e) {
      setError(e.message || 'No se pudo eliminar la foto.')
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="s-label" style={{ marginBottom: 0 }}>{label}</span>
        <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{fotos?.length || 0} foto(s)</span>
      </div>

      {!!fotos?.length && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {fotos.map((foto, index) => (
            <div key={`${foto.url}-${index}`} style={{ position: 'relative' }}>
              <img
                src={foto.url}
                alt={`Foto ${index + 1}`}
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  display: 'block',
                }}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'var(--destructive)',
                  color: 'var(--background)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', height: 112 }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'var(--card)',
            border: '1.5px dashed #E0E0E0',
            borderRadius: 8,
            pointerEvents: 'none',
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading ? (
            <div style={{ width: 22, height: 22, border: '2px solid #a98225', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <>
              <span style={{ fontSize: 24 }}>📷</span>
              <span style={{ color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 600 }}>+ Galería o cámara</span>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={loading}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 0,
            zIndex: 2,
          }}
          onChange={handleFiles}
        />
      </div>

      {error && <p className="s-error">⚠ {error}</p>}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
