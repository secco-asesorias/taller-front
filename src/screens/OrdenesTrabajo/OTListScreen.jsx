import { useEffect, useState } from 'react'
import { ordenTrabajoService } from '../../services/ordenTrabajoService'
import { useRol } from '../../context/AuthContext'
import PatenteLink from '../../components/vehiculo/PatenteLink'
import { useMobile } from '../../hooks/useMobile'

const STATUS_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'generada', label: 'Generada' },
  { value: 'asignada', label: 'Asignada' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'en_revision', label: 'En Revisión' },
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'entregada', label: 'Entregada' },
]

function statusStyle(status) {
  const map = {
    generada:    { background: 'var(--secco-muted-10)', color: 'var(--muted-foreground)',  border: '1px solid var(--border)' },
    asignada:    { background: 'var(--secco-gold-10)',   color: 'var(--secco-gold)',  border: '1px solid var(--secco-gold-30)' },
    en_proceso:  { background: 'var(--secco-gold-10)',  color: 'var(--secco-gold)',  border: '1px solid var(--secco-gold-30)' },
    en_revision: { background: 'var(--secco-purple-12)',   color: 'var(--secco-purple)',  border: '1px solid var(--secco-purple-35)' },
    finalizada:  { background: 'var(--secco-green-12)',   color: 'var(--secco-green-dark)',  border: '1px solid var(--secco-green-30)' },
    entregada:   { background: 'var(--secco-green)',                color: 'var(--background)',  border: '1px solid var(--secco-green)' },
  }
  return map[status] || { background: 'var(--secco-muted-10)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
}

const STATUS_LABEL = {
  generada:    'Generada',
  asignada:    'Asignada',
  en_proceso:  'En proceso',
  en_revision: 'En revisión',
  finalizada:  'Finalizada',
  entregada:   'Entregada',
}

function formatHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function formatElapsed(ms) {
  if (!ms || ms < 0) return '—'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export default function OTListScreen({ onNavigate }) {
  const isMobile = useMobile()
  const { esTecnico, perfil } = useRol()
  const [ots, setOts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = {
      limite: 50,
      ...(filtroStatus ? { status: filtroStatus } : {}),
      // El técnico solo ve sus OTs; el admin ve todas
      ...(esTecnico && perfil?.id ? { tecnico_id: perfil.id } : {}),
    }
    ordenTrabajoService.listar(params)
      .then(setOts)
      .catch((err) => setError(err.message || 'Error al cargar órdenes'))
      .finally(() => setLoading(false))
  }, [filtroStatus, esTecnico, perfil?.id])

  return (
    <div style={{ padding: isMobile ? '12px 8px 40px' : '24px 16px 40px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>Órdenes de Trabajo</h2>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="s-input"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando órdenes...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ots.map((ot) => (
            <button
              key={ot.id}
              onClick={() => onNavigate(`ordenes-trabajo/${ot.id}`)}
              className="s-card"
              style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1.5px solid #E0E0E0', borderRadius: 14, background: 'var(--background)', fontFamily: 'inherit', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', color: 'var(--secco-gold)', fontSize: 15, fontWeight: 700 }}>
                    OT #{ot.numero_ot}
                  </p>
                  <p style={{ margin: '0 0 2px', color: 'var(--foreground)', fontSize: 13 }}>
                    {ot.vehiculos?.patente ? (
                      <PatenteLink patente={ot.vehiculos.patente} mono stopPropagation />
                    ) : '—'}
                    {' — '}
                    {ot.vehiculos?.marca} {ot.vehiculos?.modelo}
                  </p>
                  <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 12 }}>{ot.clientes?.nombre}</p>
                  {ot.tecnico_nombre && (
                    <p style={{ margin: '4px 0 0', color: 'var(--secco-gold)', fontSize: 12, fontWeight: 600 }}>
                      Técnico: {ot.tecnico_nombre}
                    </p>
                  )}
                  {/* Grid de tiempo — solo si hay datos */}
                  {(ot.inicio_servicio || ot.termino_servicio) && (() => {
                    const elapsed = ot.inicio_servicio && ot.termino_servicio
                      ? new Date(ot.termino_servicio) - new Date(ot.inicio_servicio) : null
                    const horasTC = (ot.instrucciones || []).reduce((s, i) => s + (Number(i.horas) || 0), 0)
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '2px 16px', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        {[
                          { label: 'Inicio',    value: formatHora(ot.inicio_servicio),  color: '#5064c8' },
                          { label: 'Término',   value: formatHora(ot.termino_servicio), color: '#228b50' },
                          { label: 'Trabajado', value: elapsed ? formatElapsed(elapsed) : '—', color: elapsed ? '#228b50' : 'var(--placeholder)' },
                          { label: 'TC asignó', value: horasTC > 0 ? `${horasTC} hs` : '—', color: horasTC > 0 ? '#a98225' : 'var(--placeholder)' },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <p style={{ margin: '0 0 1px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  whiteSpace: 'nowrap', marginLeft: 10, flexShrink: 0,
                  ...statusStyle(ot.status),
                }}>
                  {STATUS_LABEL[ot.status] || ot.status}
                </span>
              </div>
            </button>
          ))}
          {!ots.length && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Sin órdenes de trabajo</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
