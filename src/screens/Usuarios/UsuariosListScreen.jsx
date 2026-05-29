import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { usuarioService } from '../../services/usuarioService'
import { useToast } from '../../components/common/ToastProvider'
import { useRol, ROL_ETIQUETAS } from '../../context/AuthContext'
import { unwrapApiList } from '../../lib/unwrapApiList'
import { useMobile } from '../../hooks/useMobile'

const ROLES = [
  { value: 'admin', label: ROL_ETIQUETAS.admin },
  { value: 'recepcionista', label: ROL_ETIQUETAS.recepcionista },
  { value: 'tecnico', label: ROL_ETIQUETAS.tecnico },
]

function rolBadgeClass(rol) {
  if (rol === 'admin')         return 'status-badge-info'
  if (rol === 'recepcionista') return 'status-badge-activa'
  return 'status-badge-cerrada'
}

const FORM_INICIAL = {
  email: '',
  password: '',
  nombre: '',
  rol: 'tecnico',
}

export default function UsuariosListScreen() {
  const toast = useToast()
  const { esAdmin, cargando: cargandoRol } = useRol()
  const isMobile = useMobile()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [formErrores, setFormErrores] = useState({})

  function cargar() {
    setLoading(true)
    setError('')
    usuarioService.listar({ limite: 50 })
      .then((data) => {
        const list = unwrapApiList(data, ['usuarios', 'users'])
        setUsuarios(Array.isArray(data) ? data : list)
      })
      .catch((err) => {
        const msg = err?.message || 'Error al cargar usuarios'
        setError(msg)
        if (err?.status === 403) setError('No tenés permisos para ver el personal del taller.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (esAdmin) cargar()
  }, [esAdmin])

  const filtrados = useMemo(() => {
    if (!filtro) return usuarios
    const q = filtro.toLowerCase()
    return usuarios.filter((u) => (
      u.nombre?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.rol?.toLowerCase().includes(q) ||
      (ROL_ETIQUETAS[u.rol] || '').toLowerCase().includes(q)
    ))
  }, [usuarios, filtro])

  function openNuevo() {
    setForm(FORM_INICIAL)
    setFormErrores({})
    setModalOpen(true)
  }

  function validarForm() {
    const e = {}
    const email = form.email.trim()
    if (!email) e.email = 'El correo es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Correo inválido'
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!form.password || form.password.length < 8) {
      e.password = 'La contraseña debe tener al menos 8 caracteres'
    }
    if (!['admin', 'recepcionista', 'tecnico'].includes(form.rol)) {
      e.rol = 'Selecciona un rol válido'
    }
    setFormErrores(e)
    return Object.keys(e).length === 0
  }

  async function handleCrear(e) {
    e?.preventDefault()
    if (!validarForm()) return
    setSaving(true)
    try {
      await usuarioService.crear({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        nombre: form.nombre.trim(),
        rol: form.rol,
      })
      toast.success('Usuario creado correctamente')
      setModalOpen(false)
      setForm(FORM_INICIAL)
      cargar()
    } catch (err) {
      const detalle = err?.data?.error || err?.message
      toast.error(detalle ? `No se pudo crear: ${detalle}` : 'Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  if (cargandoRol) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Verificando permisos…</p>
      </div>
    )
  }

  if (!esAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div style={{ padding: isMobile ? '10px 8px 40px' : '14px 12px 40px' }}>
      <style>{`
        .usr-list { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 820px) { .usr-list { grid-template-columns: 1fr 1fr; gap: 12px; } }
        .usr-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
      `}</style>

      <div className="usr-toolbar">
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 800, margin: 0 }}>Usuarios del taller</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted-foreground)', fontSize: 12, lineHeight: 1.45 }}>
            Personal con acceso al sistema (admin, recepción, técnicos). Los clientes se gestionan en Clientes.
          </p>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 12 }}>
            {loading ? 'Cargando…' : `${filtrados.length} usuario${filtrados.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          className="s-btn-primary"
          style={{ width: 'auto', height: 40, padding: '9px 14px', fontSize: 13 }}
          onClick={openNuevo}
        >
          + Nuevo usuario
        </button>
      </div>

      <input
        type="search"
        placeholder="Buscar por nombre, email o rol…"
        value={filtro}
        onChange={(ev) => setFiltro(ev.target.value)}
        className="s-input"
        style={{ marginBottom: 14 }}
      />

      {error ? <p className="s-error" style={{ marginBottom: 12 }}>{error}</p> : null}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando personal…</p>
        </div>
      ) : (
        <div className="usr-list">
          {filtrados.map((u) => (
            <div
              key={u.id || u.email}
              style={{
                padding: 16,
                border: '1.5px solid var(--border)',
                borderRadius: 14,
                background: 'var(--background)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', color: 'var(--foreground)', fontSize: 15, fontWeight: 700 }}>
                    {u.nombre || 'Sin nombre'}
                  </p>
                  <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.email || '—'}
                  </p>
                </div>
                <span
                  className={rolBadgeClass(u.rol)}
                  style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}
                >
                  {ROL_ETIQUETAS[u.rol] || u.rol || '—'}
                </span>
              </div>
            </div>
          ))}
          {!filtrados.length && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
                {filtro ? 'Sin resultados para tu búsqueda' : 'No hay usuarios registrados'}
              </p>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div>
          <div
            role="presentation"
            onClick={() => !saving && setModalOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', zIndex: 70 }}
          />
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 71,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            pointerEvents: 'none',
          }}>
            <form
              className="s-card"
              onSubmit={handleCrear}
              style={{
                pointerEvents: 'auto',
                width: '100%',
                maxWidth: 520,
                maxHeight: 'min(90dvh, 640px)',
                margin: 'auto',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'var(--background)',
                border: '1.5px solid var(--border)',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexShrink: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--foreground)' }}>Nuevo usuario</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>
                    Se creará la cuenta de acceso al taller.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setModalOpen(false)}
                  style={{ flexShrink: 0, background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted-foreground)', lineHeight: 1, padding: 0 }}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ marginBottom: 14 }}>
                <label className="s-label">Nombre completo <span style={{ color: 'var(--destructive)' }}>*</span></label>
                <input
                  type="text"
                  className={`s-input ${formErrores.nombre ? 's-input-err' : ''}`}
                  value={form.nombre}
                  onChange={(ev) => setForm((f) => ({ ...f, nombre: ev.target.value }))}
                  placeholder="Juan Pérez"
                  autoComplete="name"
                />
                {formErrores.nombre ? <p className="s-error">{formErrores.nombre}</p> : null}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="s-label">Correo <span style={{ color: 'var(--destructive)' }}>*</span></label>
                <input
                  type="email"
                  className={`s-input ${formErrores.email ? 's-input-err' : ''}`}
                  value={form.email}
                  onChange={(ev) => setForm((f) => ({ ...f, email: ev.target.value }))}
                  placeholder="tecnico@secco.cl"
                  autoComplete="off"
                />
                {formErrores.email ? <p className="s-error">{formErrores.email}</p> : null}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="s-label">Contraseña temporal <span style={{ color: 'var(--destructive)' }}>*</span></label>
                <input
                  type="password"
                  className={`s-input ${formErrores.password ? 's-input-err' : ''}`}
                  value={form.password}
                  onChange={(ev) => setForm((f) => ({ ...f, password: ev.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
                {formErrores.password ? <p className="s-error">{formErrores.password}</p> : null}
              </div>

              <div style={{ marginBottom: 4 }}>
                <label className="s-label">Rol <span style={{ color: 'var(--destructive)' }}>*</span></label>
                <select
                  className={`s-input ${formErrores.rol ? 's-input-err' : ''}`}
                  value={form.rol}
                  onChange={(ev) => setForm((f) => ({ ...f, rol: ev.target.value }))}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {formErrores.rol ? <p className="s-error">{formErrores.rol}</p> : null}
                <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                  Admin: gestión completa. Recepción: actas y cotizaciones. Técnico: diagnósticos y OT.
                </p>
              </div>
              </div>

              <div style={{
                flexShrink: 0,
                display: 'flex',
                gap: 10,
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
              }}>
                <button
                  type="button"
                  className="s-btn-secondary"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  style={{ flex: 1, width: 'auto', minWidth: 0, height: 44 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="s-btn-primary"
                  disabled={saving}
                  style={{ flex: 1, width: 'auto', minWidth: 0, height: 44 }}
                >
                  {saving ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
