import { useEffect, useMemo, useState } from 'react'
import { unwrapApiList } from '../../lib/unwrapApiList'
import { actaService } from '../../services/actaService'
import { useToast } from '../../components/common/ToastProvider'
import PatenteLink from '../../components/vehiculo/PatenteLink'

const LIMITE_LISTA = 50

const STATUS_LABEL = {
  borrador: 'Borrador',
  activa: 'Activa',
  cerrada: 'Cerrada',
}

const STATUS_FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'activa', label: 'Activa' },
  { value: 'cerrada', label: 'Cerrada' },
]

function actaStatusKey(status) {
  return String(status || '').toLowerCase()
}

function statusStyle(status) {
  const s = actaStatusKey(status)
  if (s === 'cerrada') return { background: 'rgba(52,199,89,0.12)', color: '#1a7a34', border: '1px solid rgba(52,199,89,0.3)' }
  if (s === 'borrador') return { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' }
  return { background: 'rgba(169,130,37,0.10)', color: '#a98225', border: '1px solid rgba(169,130,37,0.3)' }
}

function puedeContinuarActa(status) {
  const s = actaStatusKey(status)
  return s === 'borrador' || s === 'activa'
}

export default function ActasListScreen({ onNavigate }) {
  const toast = useToast()
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
      return
    }
    const t = setTimeout(() => setFiltroDebounced(trimmed), 350)
    return () => clearTimeout(t)
  }, [filtro])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const req = filtroDebounced
      ? actaService.buscarPorPatente(filtroDebounced, { limite: LIMITE_LISTA })
      : actaService.listar({ limite: LIMITE_LISTA })

    req
      .then((data) => {
        if (cancelled) return
        setActas(unwrapApiList(data, ['actas']))
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Error al cargar actas')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filtroDebounced])

  const filtradas = useMemo(() => {
    if (statusFiltro === 'todos') return actas
    return actas.filter((a) => actaStatusKey(a.status) === statusFiltro)
  }, [actas, statusFiltro])

  return (
    <div style={{ padding: '14px 12px 40px' }}>
      <style>{`
        .actas-toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; }
        .actas-tools { display: grid; grid-template-columns: 1fr 170px; gap: 10px; margin-bottom: 14px; }
        .actas-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .actas-searchWrap { position: relative; }
        .actas-searchIcon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #AAAAAA; font-size: 14px; pointer-events: none; }

        @media (min-width: 720px) {
          .actas-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
        }
        @media (max-width: 520px) {
          .actas-tools { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="actas-toolbar">
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 800, margin: 0 }}>Actas</h2>
          <p style={{ margin: '4px 0 0', color: '#6B6B6B', fontSize: 12 }}>
            {loading ? 'Cargando...' : `${filtradas.length} resultado${filtradas.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          className="s-btn-primary"
          style={{ width: 'auto', padding: '9px 14px', fontSize: 13, height: 40 }}
          onClick={() => { toast.info('Creando nueva acta…'); onNavigate('actas/nueva') }}
        >
          + Nueva
        </button>
      </div>

      <div className="actas-tools">
        <div className="actas-searchWrap">
          <span className="actas-searchIcon">⌕</span>
          <input
            type="text"
            placeholder="Buscar por patente…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
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

      {error && <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando actas...</p>
        </div>
      ) : (
        <div className="actas-grid">
          {filtradas.map((acta) => (
            <div
              key={acta.id}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate(`actas/${acta.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onNavigate(`actas/${acta.id}`)
                }
              }}
              style={{
                padding: 16,
                textAlign: 'left',
                cursor: 'pointer',
                border: '1.5px solid #E0E0E0',
                borderRadius: 14,
                background: '#FFFFFF',
                fontFamily: 'inherit',
                width: '100%',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', color: '#1e3a8a', fontSize: 15, fontWeight: 700 }}>
                    #{acta.numero_acta}
                    {acta.vehiculos?.patente ? (
                      <> — <PatenteLink patente={acta.vehiculos.patente} mono stopPropagation /></>
                    ) : null}
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
                  flexShrink: 0,
                  ...statusStyle(acta.status),
                }}>
                  {STATUS_LABEL[actaStatusKey(acta.status)] || acta.status}
                </span>
              </div>
              {(acta.fecha_ingreso || puedeContinuarActa(acta.status)) ? (
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  {acta.fecha_ingreso ? (
                    <p style={{ margin: 0, color: '#6B6B6B', fontSize: 11 }}>
                      {new Date(acta.fecha_ingreso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  ) : (
                    <span style={{ flex: 1, minWidth: 8 }} />
                  )}
                  {puedeContinuarActa(acta.status) ? (
                    <button
                      type="button"
                      className="s-btn-secondary"
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginLeft: acta.fecha_ingreso ? 'auto' : 0,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate(`actas/${acta.id}/editar`)
                      }}
                    >
                      Continuar acta
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
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
