import { useRef, useState } from 'react'

/** Mantiene el input en el DOM para poder limpiar `value` al borrar; evita `display:none` (móviles). */
const SR_ONLY_FILE = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export default function PhotoCapture({ label, onChange, preview, required = false }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      onChange({ file, preview: reader.result })
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  function remove() {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <span className="s-label" style={{ marginBottom: 0 }}>{label}</span>
          {required && <span style={{ color: 'var(--destructive)', fontSize: 12 }}>*</span>}
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', ...(preview ? {} : { height: 130 }) }}>
        {preview ? (
          <div style={{ position: 'relative' }}>
            <img
              src={preview}
              alt={label}
              style={{
                width: '100%',
                height: 180,
                objectFit: 'cover',
                borderRadius: 12,
                border: '1px solid var(--border)',
                display: 'block',
              }}
            />
            <button
              type="button"
              onClick={remove}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'var(--destructive)',
                color: 'var(--background)',
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
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                background: 'rgba(255,255,255,0.92)',
                color: 'var(--secco-gold)',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 6,
                letterSpacing: '0.4px',
                border: '1px solid var(--secco-gold-30)',
              }}
            >
              ✓ Foto tomada
            </div>
          </div>
        ) : (
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
              borderRadius: 12,
              pointerEvents: 'none',
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? (
              <div style={{
                width: 22, height: 22,
                border: '2px solid #a98225',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : (
              <>
                <span style={{ fontSize: 28 }}>📷</span>
                <span style={{ color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500 }}>Galería o cámara</span>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={!preview && loading}
          style={
            preview
              ? SR_ONLY_FILE
              : {
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: loading ? 'wait' : 'pointer',
                  fontSize: 0,
                  zIndex: 2,
                }
          }
          onChange={handleFile}
        />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
