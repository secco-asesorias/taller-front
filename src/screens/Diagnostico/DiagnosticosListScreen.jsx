import { useEffect, useState } from 'react'
import { diagnosticoService } from '../../services/diagnosticoService'

const STATUS_LABEL = {
  pendiente: 'Pendiente',
  proceso: 'En proceso',
  listo: 'Listo',
}

function statusStyle(status) {
  const map = {
    pendiente: { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' },
    proceso: { background: 'rgba(169,130,37,0.10)', color: '#a98225', border: '1px solid rgba(169,130,37,0.3)' },
    listo: { background: 'rgba(52,199,89,0.12)', color: '#1a7a34', border: '1px solid rgba(52,199,89,0.3)' },
  }
  return map[status] || map.pendiente
}

export default function DiagnosticosListScreen({ onNavigate }) {
  const [diagnosticos, setDiagnosticos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    diagnosticoService.listar({ limite: 50 })
      .then(setDiagnosticos)
      .catch((err) => setError(err.message || 'Error al cargar diagnósticos'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '24px 16px 40px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 700, margin: 0 }}>Diagnósticos</h2>
      </div>

      {error && <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando diagnósticos...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {diagnosticos.map((diag) => {
            const acta = diag.actas || {}
            const veh = acta.vehiculos || {}
            const cli = acta.clientes || {}
            return (
              <button
                key={diag.id}
                onClick={() => onNavigate?.(`diagnosticos/${diag.id}`)}
                className="s-card"
                style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1.5px solid #E0E0E0', borderRadius: 14, background: '#FFFFFF', fontFamily: 'inherit', width: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', color: '#1e3a8a', fontSize: 15, fontWeight: 700 }}>
                      DG-{diag.numero_diagnostico}
                    </p>
                    <p style={{ margin: '0 0 2px', color: '#111114', fontSize: 13 }}>
                      {[veh.marca, veh.modelo, veh.patente].filter(Boolean).join(' · ')}
                    </p>
                    {cli.nombre && (
                      <p style={{ margin: '0 0 2px', color: '#6B6B6B', fontSize: 12 }}>{cli.nombre}</p>
                    )}
                    {diag.tipo_mantencion && (
                      <p style={{ margin: 0, color: '#a98225', fontSize: 12, fontWeight: 600 }}>
                        Mantención: {diag.tipo_mantencion}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap', ...statusStyle(diag.status) }}>
                    {STATUS_LABEL[diag.status] || diag.status}
                  </span>
                </div>
              </button>
            )
          })}
          {!diagnosticos.length && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#6B6B6B', fontSize: 14 }}>No hay diagnósticos</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
