import { useRef, useState } from 'react'

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])

/** Galerías móviles a veces envían MIME vacío o tipos genéricos; no bloquear si ya pasó accept="image/*". */
function validarImagen(file) {
  const ext = file.name?.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : ''
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) return
  if (ALLOWED_EXTENSIONS.has(ext)) return
  if (!type && !ext) return
  throw new Error('Formato no permitido. Usa JPG, PNG, WebP o una imagen de la galería.')
}

function previewFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function LocalMultiPhotoCapture({ label, required = false, fotos = [], onChange }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const normalized = Array.isArray(fotos) ? fotos : (fotos ? [{ id: 'legacy', preview: fotos }] : [])

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setLoading(true)
    setError('')
    try {
      files.forEach(validarImagen)
      const nuevas = []
      for (const file of files) {
        nuevas.push({ id: uid(), file, preview: await previewFile(file) })
      }
      onChange([...normalized, ...nuevas])
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las fotos.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function remove(index) {
    onChange(normalized.filter((_, i) => i !== index))
  }

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="s-label" style={{ marginBottom: 0 }}>{label}</span>
            {required && <span style={{ color: '#FF453A', fontSize: 12 }}>*</span>}
          </div>
          <span style={{ color: '#6B6B6B', fontSize: 12 }}>{normalized.length} foto(s)</span>
        </div>
      )}

      {!!normalized.length && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {normalized.map((foto, index) => (
            <div key={foto.id || `${foto.preview}-${index}`} style={{ position: 'relative' }}>
              <img
                src={foto.preview || foto.url || foto}
                alt={`${label || 'Foto'} ${index + 1}`}
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  borderRadius: 12,
                  border: '1px solid #E0E0E0',
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
                  background: '#FF453A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
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
            background: '#F5F5F5',
            border: '1.5px dashed #E0E0E0',
            borderRadius: 12,
            pointerEvents: 'none',
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading ? (
            <div style={{ width: 22, height: 22, border: '2px solid #a98225', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <>
              <span style={{ fontSize: 28 }}>📷</span>
              <span style={{ color: '#6B6B6B', fontSize: 13, fontWeight: 500 }}>Galería o cámara</span>
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
