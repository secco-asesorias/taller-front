import { useCallback, useEffect, useState } from 'react'
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

  const cargar = useCallback(() => {
    setLoading(true)
    setError('')
    cotizacionService
      .listar({ limite: 50 })
      .then((rows) => {
        setCotizaciones(Array.isArray(rows) ? rows : [])
      })
      .catch((err) => {
        setCotizaciones([])
        setError(err.message || 'Error al cargar cotizaciones')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div style={{ padding: '24px 16px 40px', maxWidth: 720, margin: '0 auto' }}>
      <div
        className="s-card"
        style={{
          marginBottom: 20,
          padding: 18,
          borderRadius: 14,
          border: '1px solid #E8E8E8',
          background: '#FFFFFF',
        }}
      >
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Cotizaciones</h2>
        <p style={{ color: '#6B6B6B', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
          Acá ves los presupuestos recientes. Para armar uno desde cero abrís el mismo editor de siempre; recién al guardar o al cambiar de estado se crea el registro en el servidor.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="s-btn-primary"
            onClick={() => onNavigate?.('cotizaciones/nueva')}
            style={{ minWidth: 200 }}
          >
            + Nuevo presupuesto
          </button>
          <button type="button" className="s-btn-secondary" onClick={() => onNavigate?.('actas')}>
            Ir a actas
          </button>
          <button
            type="button"
            className="s-btn-secondary"
            onClick={cargar}
            disabled={loading}
            style={{ marginLeft: 'auto' }}
          >
            {loading ? 'Actualizando…' : 'Actualizar lista'}
          </button>
        </div>
        <p style={{ color: '#AAAAAA', fontSize: 12, margin: '14px 0 0', lineHeight: 1.45 }}>
          También puedes generar un <strong>presupuesto inicial</strong> vinculado al acta desde el paso «Trabajo solicitado» del formulario de acta.
        </p>
      </div>

      {error && (
        <div
          className="s-card"
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 12,
            border: '1px solid rgba(255,69,58,0.35)',
            background: 'rgba(255,69,58,0.06)',
          }}
        >
          <p className="s-error" style={{ margin: 0 }}>
            {error}
          </p>
          <p style={{ color: '#6B6B6B', fontSize: 13, margin: '10px 0 0' }}>
            Revisá la sesión y la API. Igual puedes intentar crear un presupuesto nuevo con el botón de arriba.
          </p>
        </div>
      )}

      {loading && !cotizaciones.length ? (
        <div className="s-card" style={{ padding: 28, textAlign: 'center', borderRadius: 14 }}>
          <p style={{ color: '#6B6B6B', fontSize: 14, margin: 0 }}>Cargando cotizaciones…</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cotizaciones.map((cot) => {
            const veh = cot.vehiculos || cot.actas?.vehiculos || cot.vista_cliente?.vehiculo_manual || {}
            const cli = cot.clientes || cot.actas?.clientes || cot.vista_cliente?.cliente_manual || {}
            return (
              <button
                key={cot.id}
                type="button"
                onClick={() => onNavigate?.(`cotizaciones/${cot.id}`)}
                className="s-card"
                style={{
                  padding: 16,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: '1.5px solid #E0E0E0',
                  borderRadius: 14,
                  background: '#FFFFFF',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', color: '#1e3a8a', fontSize: 15, fontWeight: 700 }}>
                      COT-{cot.numero_cotizacion}
                      {cot.vista_cliente?.titulo && ` · ${cot.vista_cliente.titulo}`}
                    </p>
                    <p style={{ margin: '0 0 2px', color: '#111114', fontSize: 13 }}>
                      {[veh.marca, veh.modelo, veh.patente].filter(Boolean).join(' · ') || 'Sin vehículo en datos'}
                    </p>
                    {cli.nombre && <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>{cli.nombre}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 20,
                        whiteSpace: 'nowrap',
                        ...statusStyle(cot.status),
                      }}
                    >
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

          {!cotizaciones.length && !loading && (
            <div
              className="s-card"
              style={{
                padding: 36,
                textAlign: 'center',
                borderRadius: 14,
                border: '1px dashed #D0D0D0',
                background: '#FAFAFA',
              }}
            >
              <p style={{ fontSize: 36, margin: '0 0 12px' }}>📄</p>
              <p style={{ color: '#111114', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
                Todavía no hay cotizaciones en el listado
              </p>
              <p style={{ color: '#6B6B6B', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
                Abrí el editor para cargar ítems, mano de obra y totales. El borrador en servidor se crea cuando guardás o enviás.
              </p>
              <button
                type="button"
                className="s-btn-primary"
                onClick={() => onNavigate?.('cotizaciones/nueva')}
              >
                + Nuevo presupuesto
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
