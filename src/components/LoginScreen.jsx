import { useState } from 'react'
import { login } from '../lib/auth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setCargando(true)
    setError('')
    try {
      await login(email.trim(), password)
    } catch {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh', background: 'var(--background)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px',
    }}>
      <img
        src="/logo-secco.png" alt="SECCO"
        style={{ height: 56, objectFit: 'contain', marginBottom: 16 }}
        onError={(e) => { e.target.style.display = 'none' }}
      />
      <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '0 0 32px' }}>
        Acta de Recepción de Vehículos
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@secco.cl"
              className="s-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="s-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p style={{ color: 'var(--destructive)', fontSize: 12, margin: 0 }}>⚠ {error}</p>
          )}

          <button
            type="submit"
            disabled={cargando || !email.trim() || !password}
            className="s-btn-primary"
            style={{ opacity: cargando || !email.trim() || !password ? 0.5 : 1 }}
          >
            {cargando
              ? <div style={{ width: 18, height: 18, border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
              : 'Ingresar'
            }
          </button>
        </div>
      </form>

      <p style={{ color: 'var(--placeholder)', fontSize: 12, marginTop: 32 }}>
        SECCO · Taller Mecánico
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
