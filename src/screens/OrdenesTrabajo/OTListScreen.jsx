import { useEffect, useState } from 'react'
import { ordenTrabajoService } from '../../services/ordenTrabajoService'
import PatenteLink from '../../components/vehiculo/PatenteLink'

const STATUS_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'generada', label: 'Generada' },
  { value: 'asignada', label: 'Asignada' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'entregada', label: 'Entregada' },
]

function statusStyle(status) {
  const map = {
    generada: { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' },
    asignada: { background: 'rgba(30,58,138,0.08)', color: '#1e3a8a', border: '1px solid rgba(30,58,138,0.25)' },
    en_proceso: { background: 'rgba(169,130,37,0.10)', color: '#a98225', border: '1px solid rgba(169,130,37,0.3)' },
    finalizada: { background: 'rgba(52,199,89,0.12)', color: '#1a7a34', border: '1px solid rgba(52,199,89,0.3)' },
    entregada: { background: 'rgba(88,86,214,0.10)', color: '#5856D6', border: '1px solid rgba(88,86,214,0.25)' },
  }
  return map[status] || { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' }
}

const STATUS_LABEL = {
  generada: 'Generada',
  asignada: 'Asignada',
  en_proceso: 'En proceso',
  finalizada: 'Finalizada',
  entregada: 'Entregada',
}

export default function OTListScreen({ onNavigate }) {
  const [ots, setOts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    ordenTrabajoService.listar({ limite: 50, ...(filtroStatus ? { status: filtroStatus } : {}) })
      .then(setOts)
      .catch((err) => setError(err.message || 'Error al cargar órdenes'))
      .finally(() => setLoading(false))
  }, [filtroStatus])

  return (
    <div style={{ padding: '24px 16px 40px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>Órdenes de Trabajo</h2>
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
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando órdenes...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ots.map((ot) => (
            <button
              key={ot.id}
              onClick={() => onNavigate(`ordenes-trabajo/${ot.id}`)}
              className="s-card"
              style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1.5px solid #E0E0E0', borderRadius: 14, background: '#FFFFFF', fontFamily: 'inherit', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 2px', color: '#1e3a8a', fontSize: 15, fontWeight: 700 }}>
                    OT #{ot.numero_ot}
                  </p>
                  <p style={{ margin: '0 0 2px', color: '#111114', fontSize: 13 }}>
                    {ot.vehiculos?.patente ? (
                      <PatenteLink patente={ot.vehiculos.patente} mono stopPropagation />
                    ) : '—'}
                    {' — '}
                    {ot.vehiculos?.marca} {ot.vehiculos?.modelo}
                  </p>
                  <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>{ot.clientes?.nombre}</p>
                  {ot.tecnico_nombre && (
                    <p style={{ margin: '4px 0 0', color: '#a98225', fontSize: 12, fontWeight: 600 }}>
                      Técnico: {ot.tecnico_nombre}
                    </p>
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  whiteSpace: 'nowrap',
                  ...statusStyle(ot.status),
                }}>
                  {STATUS_LABEL[ot.status] || ot.status}
                </span>
              </div>
            </button>
          ))}
          {!ots.length && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#6B6B6B', fontSize: 14 }}>Sin órdenes de trabajo</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
