import { useState } from 'react'
import { supabase } from '../../services/api'
import { useMobile } from '../../hooks/useMobile'

export default function LoginScreen() {
  const isMobile = useMobile()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: isMobile ? '16px 12px' : '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ position: 'absolute', top: 24, left: 0, right: 0, textAlign: 'center' }}>
          <img
            src="/logo-secco.png"
            alt="SECCO"
            style={{ height: 56, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: 8, letterSpacing: '0.5px' }}>
            TU TRANQUILIDAD NOS MUEVE
          </p>
        </div>

        {/* Card */}
        <div className="s-card" style={{ borderRadius: 20, padding: '32px 28px' }}>
          <h2 style={{ color: 'var(--secco-gold)', fontSize: 20, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
            Iniciar sesión
          </h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13, textAlign: 'center', margin: '0 0 28px' }}>
            Accede al sistema de gestión del taller
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="s-label">Correo electrónico</label>
              <input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@secco.cl"
                className="s-input"
                required
              />
            </div>

            <div>
              <label className="s-label">Contraseña</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="s-input"
                required
              />
            </div>

            {error && (
              <div className="s-error-box">
                <p className="s-error" style={{ margin: 0, fontSize: 13 }}>⚠ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="s-btn-primary"
              style={{ marginTop: 4 }}
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ color: 'var(--muted-foreground)', fontSize: 11, textAlign: 'center', marginTop: 24, opacity: 0.5 }}>
          SECCO © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
