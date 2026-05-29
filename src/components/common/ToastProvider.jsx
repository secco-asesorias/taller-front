import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ToastContext = createContext(null)

function toastClass(type) {
  if (type === 'success') return 'toast-success'
  if (type === 'error')   return 'toast-error'
  if (type === 'warning') return 'toast-warning'
  return 'toast-info'
}

function toastIcon(type) {
  if (type === 'success') return '✓'
  if (type === 'error')   return '⚠'
  if (type === 'warning') return '!'
  return 'ℹ'
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(1)

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message, opts = {}) => {
    const id = idRef.current++
    const toast = {
      id,
      type: opts.type || 'info',
      message: String(message || ''),
      durationMs: typeof opts.durationMs === 'number' ? opts.durationMs : 2600,
    }
    setToasts((prev) => [...prev, toast])
    if (toast.durationMs > 0) {
      window.setTimeout(() => remove(id), toast.durationMs)
    }
    return id
  }, [remove])

  const api = useMemo(() => ({
    push,
    remove,
    success: (msg, opts) => push(msg, { ...(opts || {}), type: 'success' }),
    error:   (msg, opts) => push(msg, { ...(opts || {}), type: 'error' }),
    info:    (msg, opts) => push(msg, { ...(opts || {}), type: 'info' }),
    warning: (msg, opts) => push(msg, { ...(opts || {}), type: 'warning' }),
  }), [push, remove])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div style={{
          position: 'fixed',
          right: 12,
          bottom: 12,
          zIndex: 80,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          width: 'min(380px, calc(100vw - 24px))',
          pointerEvents: 'none',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          <style>{`
            @media (max-width: 860px) {
              .toast-stack { left: 12px !important; right: 12px !important; bottom: 86px !important; }
            }
          `}</style>
          <div className="toast-stack" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {toasts.map((t) => (
              <div
                key={t.id}
                className={toastClass(t.type)}
                style={{
                  borderRadius: 14,
                  padding: '12px 12px',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  pointerEvents: 'auto',
                }}
              >
                <span style={{ flexShrink: 0, fontWeight: 900, width: 20, textAlign: 'center' }}>{toastIcon(t.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.35, wordBreak: 'break-word' }}>{t.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 18,
                    lineHeight: 1,
                    fontWeight: 900,
                    color: 'inherit',
                    opacity: 0.8,
                  }}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
