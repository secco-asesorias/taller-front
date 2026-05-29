import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    danger: false,
    resolve: null,
  })

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts?.title || 'Confirmar',
        message: opts?.message || '',
        confirmText: opts?.confirmText || 'Confirmar',
        cancelText: opts?.cancelText || 'Cancelar',
        danger: !!opts?.danger,
        resolve,
      })
    })
  }, [])

  const close = useCallback((result) => {
    if (state.resolve) state.resolve(result)
    setState((s) => ({ ...s, open: false, resolve: null }))
  }, [state.resolve])

  const api = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {state.open && createPortal(
        <div>
          <div
            onClick={() => close(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.30)', zIndex: 90 }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 91, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <div style={{
              width: 'min(520px, 100%)',
              background: 'var(--background)',
              borderRadius: 16,
              border: '1.5px solid #E0E0E0',
              boxShadow: '0 18px 50px rgba(0,0,0,0.20)',
              padding: 16,
            }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--foreground)' }}>{state.title}</p>
              {state.message && (
                <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.45, color: 'var(--muted-foreground)' }}>
                  {state.message}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="s-btn-secondary"
                  style={{ height: 44 }}
                >
                  {state.cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className="s-btn-primary"
                  style={{
                    height: 44,
                    background: state.danger ? 'var(--destructive)' : undefined,
                  }}
                >
                  {state.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  return ctx
}

