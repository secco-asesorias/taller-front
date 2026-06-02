import { useEffect, useMemo, useState } from 'react'
import { unwrapApiList } from '../../lib/unwrapApiList'
import { actaEntregaService } from '../../services/actaEntregaService'
import { useToast } from '../../components/common/ToastProvider'
import PatenteLink from '../../components/vehiculo/PatenteLink'
import { useMobile } from '../../hooks/useMobile'

const LIMITE_LISTA = 50

const STATUS_LABEL = {
  borrador: 'Borrador',
  cerrada: 'Cerrada',
}

const STATUS_FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'cerrada', label: 'Cerrada' },
]

function actaStatusKey(status) {
  return String(status || '').toLowerCase()
}

function statusStyle(status) {
  const s = actaStatusKey(status)
  if (s === 'cerrada') return { background: 'var(--secco-green-12)', color: 'var(--secco-green-dark)', border: '1px solid var(--secco-green-30)' }
  return { background: 'var(--secco-muted-10)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
}

function numeroActa(acta) {
  return acta.numero_acta_entrega ?? acta.numero_acta
}

function fechaEntrega(acta) {
  return acta.fecha_entrega || acta.fecha_ingreso
}

export default function ActasEntregaListScreen({ onNavigate }) {
  const toast = useToast()
  const isMobile = useMobile()
  const [actas, setActas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroDebounced, setFiltroDebounced] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [error, setError] = useState('')

  useEffect(() => {
    const trimmed = filtro.trim()
    if (!trimmed) {
      setFiltroDebounced('')
      return undefined
    }
    const t = setTimeout(() => setFiltroDebounced(trimmed), 350)
    return () => clearTimeout(t)
  }, [filtro])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const req = filtroDebounced
      ? actaEntregaService.buscarPorPatente(filtroDebounced, { limite: LIMITE_LISTA })
      : actaEntregaService.listar({ limite: LIMITE_LISTA })

    req
      .then((data) => {
        if (cancelled) return
        setActas(unwrapApiList(data, ['actas_entrega', 'actas']))
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Error al cargar actas de entrega')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [filtroDebounced])

  const filtradas = useMemo(() => {
    if (statusFiltro === 'todos') return actas
    return actas.filter((a) => actaStatusKey(a.status) === statusFiltro)
  }, [actas, statusFiltro])

  return (
    <div style={{ padding: isMobile ? '10px 8px 40px' : '14px 12px 40px' }}>
      <style>{`
        .ent-toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; }
        .ent-tools { display: grid; grid-template-columns: 1fr 170px; gap: 10px; margin-bottom: 14px; }
        .ent-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .ent-searchWrap { position: relative; }
        .ent-searchIcon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #AAAAAA; font-size: 14px; pointer-events: none; }
        @media (min-width: 720px) { .ent-grid { grid-template-columns: 1fr 1fr; gap: 12px; } }
        @media (max-width: 520px) { .ent-tools { grid-template-columns: 1fr; } }
      `}</style>

      <div className="ent-toolbar">
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 800, margin: 0 }}>Actas de entrega</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted-foreground)', fontSize: 12, lineHeight: 1.45 }}>
            Entrega del vehículo al cliente una vez finalizado el trabajo.
          </p>
          <p style={{ margin: '6px 0 0', color: 'var(--foreground)', fontSize: 12, fontWeight: 600 }}>
            {loading ? 'Cargando…' : `${filtradas.length} resultado${filtradas.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          className="s-btn-primary"
          style={{ width: 'auto', padding: '9px 14px', fontSize: 13, height: 40, background: 'var(--secco-green-dark)', borderColor: 'var(--secco-green-dark)' }}
          onClick={() => { toast.info('Nueva acta de entrega…'); onNavigate('actas-entrega/nueva') }}
        >
          + Nueva entrega
        </button>
      </div>

      <div className="ent-tools">
        <div className="ent-searchWrap">
          <span className="ent-searchIcon">⌕</span>
          <input
            type="text"
            placeholder="Buscar por patente…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value.toUpperCase())}
            className="s-input"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select className="s-input" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
          {STATUS_FILTROS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="s-error" style={{ marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando actas de entrega…</p>
        </div>
      ) : (
        <div className="ent-grid">
          {filtradas.map((acta) => {
            const num = numeroActa(acta)
            const fecha = fechaEntrega(acta)
            const esBorrador = actaStatusKey(acta.status) === 'borrador'
            return (
              <div
                key={acta.id}
                role="button"
                tabIndex={0}
                onClick={() => onNavigate(`actas-entrega/${acta.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onNavigate(`actas-entrega/${acta.id}`)
                  }
                }}
                style={{
                  padding: 16,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: '1.5px solid #E0E0E0',
                  borderRadius: 14,
                  background: 'var(--background)',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', color: 'var(--secco-green-dark)', fontSize: 15, fontWeight: 700 }}>
                      {num ? `ENT-${num}` : 'Entrega'}
                      {acta.vehiculos?.patente ? (
                        <> — <PatenteLink patente={acta.vehiculos.patente} mono stopPropagation /></>
                      ) : null}
                    </p>
                    <p style={{ margin: '0 0 2px', color: 'var(--foreground)', fontSize: 13, fontWeight: 500 }}>
                      {acta.clientes?.nombre}
                    </p>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 12 }}>
                      {acta.vehiculos?.marca} {acta.vehiculos?.modelo}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, flexShrink: 0, ...statusStyle(acta.status) }}>
                    {STATUS_LABEL[actaStatusKey(acta.status)] || acta.status}
                  </span>
                </div>
                {(fecha || esBorrador) ? (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    {fecha ? (
                      <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 11 }}>
                        Entrega: {new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    ) : (
                      <span style={{ flex: 1, minWidth: 8 }} />
                    )}
                    {esBorrador ? (
                      <button
                        type="button"
                        className="s-btn-secondary"
                        style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: fecha ? 'auto' : 0 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onNavigate(`actas-entrega/${acta.id}/editar`)
                        }}
                      >
                        Continuar
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
          {!filtradas.length && (
            <div style={{ textAlign: 'center', padding: '48px 0', gridColumn: '1 / -1' }}>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Sin resultados</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
