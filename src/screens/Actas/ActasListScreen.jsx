import { useEffect, useMemo, useState } from 'react'
import { actaService } from '../../services/actaService'
import { useToast } from '../../components/common/ToastProvider'

const STATUS_LABEL = {
  borrador: 'Borrador',
  activa: 'Activa',
  cerrada: 'Cerrada',
}

const STATUS_FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'activa', label: 'Activas' },
  { value: 'borrador', label: 'Borradores' },
  { value: 'cerrada', label: 'Cerradas' },
]

function statusStyle(status) {
  if (status === 'cerrada') return { background: 'rgba(52,199,89,0.12)', color: '#1a7a34', border: '1px solid rgba(52,199,89,0.3)' }
  if (status === 'borrador') return { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' }
  return { background: 'rgba(169,130,37,0.10)', color: '#a98225', border: '1px solid rgba(169,130,37,0.3)' }
}

function puedeContinuarActa(status) {
  return status === 'borrador' || status === 'activa'
}

export default function ActasListScreen({ onNavigate }) {
  const toast = useToast()
  const [actas, setActas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [error, setError] = useState('')

  useEffect(() => {
    actaService.listar({ limite: 50 })
      .then(setActas)
      .catch((err) => setError(err.message || 'Error al cargar actas'))
      .finally(() => setLoading(false))
  }, [])

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return actas.filter((a) => {
      if (statusFiltro !== 'todos' && a.status !== statusFiltro) return false
      if (!q) return true
      return (
        a.clientes?.nombre?.toLowerCase().includes(q) ||
        a.vehiculos?.patente?.toLowerCase().includes(q) ||
        String(a.numero_acta).includes(q)
      )
    })
  }, [actas, filtro, statusFiltro])

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
            placeholder="Buscar por patente, cliente o N° acta..."
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
                  flexShrink: 0,
                  ...statusStyle(acta.status),
                }}>
                  {STATUS_LABEL[acta.status] || acta.status}
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
