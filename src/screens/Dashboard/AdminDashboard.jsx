import { useEffect, useState } from 'react'
import { useRol } from '../../context/AuthContext'
import { actaService } from '../../services/actaService'
import { diagnosticoService } from '../../services/diagnosticoService'
import { cotizacionService } from '../../services/cotizacionService'
import { ordenTrabajoService } from '../../services/ordenTrabajoService'

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

function contarPorStatus(list = [], campo = 'status') {
  const map = {}
  for (const it of list) {
    const s = it?.[campo] || 'desconocido'
    map[s] = (map[s] || 0) + 1
  }
  return map
}

export default function AdminDashboard({ onNavigate }) {
  const { nombre, rolEtiqueta } = useRol()
  const [actas, setActas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState({
    actas: { total: 0, porStatus: {} },
    diagnosticos: { total: 0, porStatus: {} },
    cotizaciones: { total: 0, porStatus: {} },
    ots: { total: 0, porStatus: {} },
  })

  useEffect(() => {
    setLoading(true)
    setError('')

    Promise.allSettled([
      actaService.listar({ limite: 10 }),
      actaService.listar({ limite: 50 }),
      diagnosticoService.listar({ limite: 50 }),
      cotizacionService.listar({ limite: 50 }),
      ordenTrabajoService.listar({ limite: 50 }),
    ])
      .then(([actasTop, actasAll, diagsAll, cotsAll, otsAll]) => {
        if (actasTop.status === 'fulfilled') setActas(actasTop.value || [])
        if (actasTop.status === 'rejected') setError(actasTop.reason?.message || 'Error al cargar actas')

        const actasList = actasAll.status === 'fulfilled' ? (actasAll.value || []) : []
        const diagsList = diagsAll.status === 'fulfilled' ? (diagsAll.value || []) : []
        const cotsList = cotsAll.status === 'fulfilled' ? (cotsAll.value || []) : []
        const otsList = otsAll.status === 'fulfilled' ? (otsAll.value || []) : []

        setResumen({
          actas: { total: actasList.length, porStatus: contarPorStatus(actasList) },
          diagnosticos: { total: diagsList.length, porStatus: contarPorStatus(diagsList) },
          cotizaciones: { total: cotsList.length, porStatus: contarPorStatus(cotsList) },
          ots: { total: otsList.length, porStatus: contarPorStatus(otsList) },
        })
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '12px 4px 28px' }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: '#6B6B6B', fontSize: 13, margin: '0 0 2px' }}>Bienvenido,</p>
        <h2 style={{ color: '#111114', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
          {nombre}
        </h2>
        {rolEtiqueta ? (
          <p style={{ margin: '6px 0 0', color: '#6B6B6B', fontSize: 12 }}>{rolEtiqueta}</p>
        ) : null}
      </div>

      {/* Resumen */}
      <div className="s-card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, color: '#111114', fontSize: 16, fontWeight: 800 }}>Resumen</p>
            <p style={{ margin: '2px 0 0', color: '#6B6B6B', fontSize: 12 }}>Estado general del taller</p>
          </div>
        </div>

        <div className="admin-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            {
              title: 'Actas',
              subtitle: `${resumen.actas.porStatus.borrador || 0} borrador`,
              value: resumen.actas.total,
              color: '#1e3a8a',
              onClick: () => onNavigate?.('actas'),
            },
            {
              title: 'Diagnósticos',
              subtitle: `${resumen.diagnosticos.porStatus.pendiente || 0} pendientes`,
              value: resumen.diagnosticos.total,
              color: '#a98225',
              onClick: () => onNavigate?.('diagnosticos'),
            },
            {
              title: 'Cotizaciones',
              subtitle: `${resumen.cotizaciones.porStatus.borrador || 0} borrador`,
              value: resumen.cotizaciones.total,
              color: '#5856D6',
              onClick: () => onNavigate?.('cotizaciones'),
            },
            {
              title: 'Órdenes de Trabajo',
              subtitle: `${resumen.ots.porStatus.en_proceso || 0} en proceso`,
              value: resumen.ots.total,
              color: '#1a7a34',
              onClick: () => onNavigate?.('ordenes-trabajo'),
            },
          ].map((kpi) => (
            <div
              key={kpi.title}
              role="button"
              tabIndex={0}
              onClick={kpi.onClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  kpi.onClick?.()
                }
              }}
              style={{
                padding: 12,
                borderRadius: 14,
                background: '#FFFFFF',
                border: '1.5px solid #E0E0E0',
                cursor: 'pointer',
                minWidth: 0,
              }}
            >
              <p style={{ margin: 0, fontSize: 11, fontWeight: 900, letterSpacing: '0.7px', textTransform: 'uppercase', color: '#6B6B6B' }}>
                {kpi.title}
              </p>
              <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 900, color: kpi.color }}>
                {loading ? '—' : kpi.value}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#6B6B6B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {loading ? 'Cargando…' : kpi.subtitle}
              </p>
            </div>
          ))}
        </div>

        <style>{`
          @media (max-width: 920px) {
            .admin-kpis { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 520px) {
            .admin-kpis { grid-template-columns: 1fr; }
          }
        `}</style>
      </div>

      <div className="s-card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, color: '#111114', fontSize: 16, fontWeight: 800 }}>Historial de actas</p>
            <p style={{ margin: '2px 0 0', color: '#6B6B6B', fontSize: 12 }}>Últimas recepciones</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="s-btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => onNavigate?.('actas')}>
              Ver todas
            </button>
            <button className="s-btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => onNavigate?.('actas/nueva')}>
              + Nueva
            </button>
          </div>
        </div>

        {error && <p className="s-error" style={{ marginBottom: 10 }}>⚠ {error}</p>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '26px 0' }}>
            <p style={{ color: '#6B6B6B', fontSize: 13, margin: 0 }}>Cargando actas...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actas.map((acta) => (
              <div
                key={acta.id}
                onClick={() => onNavigate?.(`actas/${acta.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onNavigate?.(`actas/${acta.id}`)
                  }
                }}
                style={{
                  padding: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: '1.5px solid #E0E0E0',
                  borderRadius: 14,
                  background: '#FFFFFF',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', color: '#1e3a8a', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      #{acta.numero_acta} — {acta.vehiculos?.patente}
                    </p>
                    <p style={{ margin: '0 0 2px', color: '#111114', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acta.clientes?.nombre}
                    </p>
                    <p style={{ margin: 0, color: '#6B6B6B', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acta.vehiculos?.marca} {acta.vehiculos?.modelo}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: 20,
                    flexShrink: 0,
                    ...statusStyle(acta.status),
                  }}>
                    {STATUS_LABEL[acta.status] || acta.status}
                  </span>
                </div>

                {(acta.fecha_ingreso || acta.status === 'borrador') ? (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    {acta.fecha_ingreso ? (
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 11 }}>
                        {new Date(acta.fecha_ingreso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    ) : (
                      <span />
                    )}
                    {acta.status === 'borrador' ? (
                      <button
                        type="button"
                        className="s-btn-secondary"
                        style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onNavigate?.(`actas/${acta.id}/editar`)
                        }}
                      >
                        Continuar
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}

            {!actas.length && (
              <div style={{ textAlign: 'center', padding: '26px 0' }}>
                <p style={{ color: '#6B6B6B', fontSize: 13, margin: 0 }}>Aún no hay actas</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
