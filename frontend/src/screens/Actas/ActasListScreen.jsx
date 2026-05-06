import { useEffect, useState } from 'react'
import { actaService } from '../../services/actaService'

const STATUS_LABEL = {
  borrador: 'Borrador',
  activa: 'Activa',
  cerrada: 'Cerrada',
}

function statusStyle(status) {
  if (status === 'cerrada') return { background: 'rgba(52,199,89,0.12)', color: '#1a7a34', border: '1px solid rgba(52,199,89,0.3)' }
  if (status === 'borrador') return { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' }
  return { background: 'rgba(169,130,37,0.10)', color: '#a98225', border: '1px solid rgba(169,130,37,0.3)' }
}

export default function ActasListScreen({ onNavigate }) {
  const [actas, setActas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    actaService.listar({ limite: 50 })
      .then(setActas)
      .catch((err) => setError(err.message || 'Error al cargar actas'))
      .finally(() => setLoading(false))
  }, [])

  const filtradas = actas.filter((a) => {
    if (!filtro) return true
    const q = filtro.toLowerCase()
    return (
      a.clientes?.nombre?.toLowerCase().includes(q) ||
      a.vehiculos?.patente?.toLowerCase().includes(q) ||
      String(a.numero_acta).includes(q)
    )
  })

  return (
    <div style={{ padding: '24px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 700, margin: 0 }}>Actas</h2>
        <button className="s-btn-primary" style={{ padding: '9px 18px', fontSize: 14 }} onClick={() => onNavigate('actas/nueva')}>
          + Nueva
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por patente, cliente o N° acta..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="s-input"
        style={{ marginBottom: 16 }}
      />

      {error && <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando actas...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map((acta) => (
            <button
              key={acta.id}
              onClick={() => onNavigate(`actas/${acta.id}`)}
              className="s-card"
              style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1.5px solid #E0E0E0', borderRadius: 14, background: '#FFFFFF', fontFamily: 'inherit', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 2px', color: '#1e3a8a', fontSize: 15, fontWeight: 700 }}>
                    #{acta.numero_acta} — {acta.vehiculos?.patente}
                  </p>
                  <p style={{ margin: '0 0 2px', color: '#111114', fontSize: 13, fontWeight: 500 }}>
                    {acta.clientes?.nombre}
                  </p>
                  <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>
                    {acta.vehiculos?.marca} {acta.vehiculos?.modelo}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  ...statusStyle(acta.status),
                }}>
                  {STATUS_LABEL[acta.status] || acta.status}
                </span>
              </div>
              {acta.fecha_ingreso && (
                <p style={{ margin: '8px 0 0', color: '#6B6B6B', fontSize: 11 }}>
                  {new Date(acta.fecha_ingreso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              )}
            </button>
          ))}
          {!filtradas.length && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#6B6B6B', fontSize: 14 }}>Sin resultados</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
