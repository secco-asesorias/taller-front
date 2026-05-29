import { useEffect, useRef, useState } from 'react'
import { unwrapApiList } from '../../lib/unwrapApiList'
import { useRol } from '../../context/AuthContext'
import { useMobile } from '../../hooks/useMobile'
import { actaService } from '../../services/actaService'
import { diagnosticoService } from '../../services/diagnosticoService'
import { cotizacionService } from '../../services/cotizacionService'
import { ordenTrabajoService } from '../../services/ordenTrabajoService'
import PatenteLink from '../../components/vehiculo/PatenteLink'

const STATUS_LABEL = {
  borrador: 'Borrador',
  activa: 'Activa',
  cerrada: 'Cerrada',
}

function statusClass(status) {
  if (status === 'cerrada')  return 'status-badge-cerrada'
  if (status === 'borrador') return 'status-badge-borrador'
  return 'status-badge-activa'
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
  const isMobile = useMobile()
  const [actas, setActas] = useState([])
  const actasRecientesRef = useRef([])
  const [loading, setLoading] = useState(true)
  const [buscandoPatente, setBuscandoPatente] = useState(false)
  const [patenteInput, setPatenteInput] = useState('')
  const [patenteDebounced, setPatenteDebounced] = useState('')
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
        if (actasTop.status === 'fulfilled') {
          const list = unwrapApiList(actasTop.value, ['actas'])
          setActas(list)
          actasRecientesRef.current = list
        }
        if (actasTop.status === 'rejected') setError(actasTop.reason?.message || 'Error al cargar actas')

        const actasList = actasAll.status === 'fulfilled' ? unwrapApiList(actasAll.value, ['actas']) : []
        const diagsList = diagsAll.status === 'fulfilled' ? unwrapApiList(diagsAll.value, ['diagnosticos']) : []
        const cotsList = cotsAll.status === 'fulfilled' ? unwrapApiList(cotsAll.value, ['cotizaciones']) : []
        const otsList = otsAll.status === 'fulfilled' ? unwrapApiList(otsAll.value, ['ordenes']) : []

        setResumen({
          actas: { total: actasList.length, porStatus: contarPorStatus(actasList) },
          diagnosticos: { total: diagsList.length, porStatus: contarPorStatus(diagsList) },
          cotizaciones: { total: cotsList.length, porStatus: contarPorStatus(cotsList) },
          ots: { total: otsList.length, porStatus: contarPorStatus(otsList) },
        })
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setPatenteDebounced(patenteInput.trim()), 350)
    return () => clearTimeout(t)
  }, [patenteInput])

  useEffect(() => {
    if (loading) return

    const normalizarLista = (data) => unwrapApiList(data, ['actas'])

    if (!patenteDebounced) {
      setActas(actasRecientesRef.current)
      setBuscandoPatente(false)
      setError('')
      return
    }

    let cancelled = false
    setBuscandoPatente(true)
    setError('')

    actaService
      .buscarPorPatente(patenteDebounced, { limite: 20 })
      .then((data) => {
        if (cancelled) return
        setActas(normalizarLista(data))
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Error al buscar por patente')
      })
      .finally(() => {
        if (!cancelled) setBuscandoPatente(false)
      })

    return () => {
      cancelled = true
    }
  }, [patenteDebounced, loading])

  return (
    <div style={{ padding: isMobile ? '8px 4px 28px' : '12px 4px 28px' }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '0 0 2px' }}>Bienvenido,</p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
          {nombre}
        </h2>
        {rolEtiqueta ? (
          <p style={{ margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 12 }}>{rolEtiqueta}</p>
        ) : null}
      </div>

      {/* Resumen */}
      <div className="s-card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, color: 'var(--foreground)', fontSize: 16, fontWeight: 800 }}>Resumen</p>
            <p style={{ margin: '2px 0 0', color: 'var(--muted-foreground)', fontSize: 12 }}>Estado general del taller</p>
          </div>
        </div>

        <div className="admin-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            {
              title: 'Actas',
              subtitle: `${resumen.actas.porStatus.borrador || 0} borrador`,
              value: resumen.actas.total,
              color: 'var(--secco-gold)',
              onClick: () => onNavigate?.('actas'),
            },
            {
              title: 'Diagnósticos',
              subtitle: `${resumen.diagnosticos.porStatus.pendiente || 0} pendientes`,
              value: resumen.diagnosticos.total,
              color: 'var(--secco-gold)',
              onClick: () => onNavigate?.('diagnosticos'),
            },
            {
              title: 'Cotizaciones',
              subtitle: `${resumen.cotizaciones.porStatus.borrador || 0} borrador`,
              value: resumen.cotizaciones.total,
              color: 'var(--secco-purple)',
              onClick: () => onNavigate?.('cotizaciones'),
            },
            {
              title: 'Órdenes de Trabajo',
              subtitle: `${resumen.ots.porStatus.en_proceso || 0} en proceso`,
              value: resumen.ots.total,
              color: 'var(--secco-green-dark)',
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
                background: 'var(--background)',
                border: '1.5px solid var(--border)',
                cursor: 'pointer',
                minWidth: 0,
              }}
            >
              <p style={{ margin: 0, fontSize: 11, fontWeight: 900, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                {kpi.title}
              </p>
              <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 900, color: kpi.color }}>
                {loading ? '—' : kpi.value}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            <p style={{ margin: 0, color: 'var(--foreground)', fontSize: 16, fontWeight: 800 }}>Historial de actas</p>
            <p style={{ margin: '2px 0 0', color: 'var(--muted-foreground)', fontSize: 12 }}>
              {patenteDebounced ? 'Resultados por patente' : 'Últimas recepciones'}
            </p>
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

        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            className="s-input"
            placeholder="Buscar por patente (ej. ABCD12)"
            value={patenteInput}
            onChange={(e) => setPatenteInput(e.target.value)}
            disabled={loading}
            autoComplete="off"
            style={{ width: '100%', minWidth: 0 }}
          />
        </div>

        {error && <p className="s-error" style={{ marginBottom: 10 }}>⚠ {error}</p>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '26px 0' }}>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: 0 }}>Cargando actas...</p>
          </div>
        ) : buscandoPatente ? (
          <div style={{ textAlign: 'center', padding: '26px 0' }}>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: 0 }}>Buscando por patente…</p>
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
                  border: '1.5px solid var(--border)',
                  borderRadius: 14,
                  background: 'var(--background)',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', color: 'var(--secco-gold)', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      #{acta.numero_acta}
                      {acta.vehiculos?.patente ? (
                        <> — <PatenteLink patente={acta.vehiculos.patente} mono stopPropagation /></>
                      ) : null}
                    </p>
                    <p style={{ margin: '0 0 2px', color: 'var(--foreground)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acta.clientes?.nombre}
                    </p>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acta.vehiculos?.marca} {acta.vehiculos?.modelo}
                    </p>
                  </div>
                  <span
                    className={statusClass(acta.status)}
                    style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, flexShrink: 0 }}
                  >
                    {STATUS_LABEL[acta.status] || acta.status}
                  </span>
                </div>

                {(acta.fecha_ingreso || acta.status === 'borrador') ? (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    {acta.fecha_ingreso ? (
                      <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 11 }}>
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
                <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: 0 }}>
                  {patenteDebounced ? 'No hay actas con esa patente' : 'Aún no hay actas'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
