import { useRef, useState } from 'react'

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
          {required && <span style={{ color: '#FF453A', fontSize: 12 }}>*</span>}
        </div>
      )}

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
              border: '1px solid #E0E0E0',
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
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              background: 'rgba(255,255,255,0.92)',
              color: '#a98225',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 6,
              letterSpacing: '0.4px',
              border: '1px solid rgba(169,130,37,0.25)',
            }}
          >
            ✓ Foto tomada
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          style={{
            width: '100%',
            height: 130,
            background: '#F5F5F5',
            border: '1.5px dashed #E0E0E0',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'border-color 150ms',
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
              <span style={{ color: '#6B6B6B', fontSize: 13, fontWeight: 500 }}>Tomar foto</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
