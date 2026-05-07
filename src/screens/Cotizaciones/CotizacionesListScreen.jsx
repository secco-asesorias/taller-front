import { useEffect, useState } from 'react'
import { cotizacionService } from '../../services/cotizacionService'

const STATUS_LABEL = {
  borrador: 'Borrador',
  lista: 'Lista',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  sin_asignar: 'Sin asignar',
}

function statusStyle(status) {
  const map = {
    borrador: { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' },
    lista: { background: 'rgba(169,130,37,0.10)', color: '#a98225', border: '1px solid rgba(169,130,37,0.3)' },
    enviada: { background: 'rgba(30,58,138,0.08)', color: '#1e3a8a', border: '1px solid rgba(30,58,138,0.25)' },
    aprobada: { background: 'rgba(52,199,89,0.12)', color: '#1a7a34', border: '1px solid rgba(52,199,89,0.3)' },
    rechazada: { background: 'rgba(255,69,58,0.08)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.25)' },
    sin_asignar: { background: '#F5F5F5', color: '#6B6B6B', border: '1px solid #E0E0E0' },
  }
  return map[status] || map.borrador
}

function money(v) {
  return v ? `$${Math.round(Number(v)).toLocaleString('es-CL')}` : ''
}

export default function CotizacionesListScreen({ onNavigate }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cotizacionService.listar({ limite: 50 })
      .then(setCotizaciones)
      .catch((err) => setError(err.message || 'Error al cargar cotizaciones'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '24px 16px 40px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 700, margin: 0 }}>Cotizaciones</h2>
      </div>

      {error && <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando cotizaciones...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cotizaciones.map((cot) => {
            const veh = cot.vehiculos || cot.actas?.vehiculos || cot.vista_cliente?.vehiculo_manual || {}
            const cli = cot.clientes || cot.actas?.clientes || cot.vista_cliente?.cliente_manual || {}
            return (
              <button
                key={cot.id}
                onClick={() => onNavigate?.(`cotizaciones/${cot.id}`)}
                className="s-card"
                style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1.5px solid #E0E0E0', borderRadius: 14, background: '#FFFFFF', fontFamily: 'inherit', width: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', color: '#1e3a8a', fontSize: 15, fontWeight: 700 }}>
                      COT-{cot.numero_cotizacion}
                      {cot.vista_cliente?.titulo && ` · ${cot.vista_cliente.titulo}`}
                    </p>
                    <p style={{ margin: '0 0 2px', color: '#111114', fontSize: 13 }}>
                      {[veh.marca, veh.modelo, veh.patente].filter(Boolean).join(' · ')}
                    </p>
                    {cli.nombre && (
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>{cli.nombre}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap', ...statusStyle(cot.status) }}>
                      {STATUS_LABEL[cot.status] || cot.status}
                    </span>
                    {(cot.total || cot.total_final_cliente) && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#a98225' }}>
                        {money(cot.total_final_cliente || cot.total)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
          {!cotizaciones.length && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#6B6B6B', fontSize: 14 }}>No hay cotizaciones</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
