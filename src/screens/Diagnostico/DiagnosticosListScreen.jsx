import { useEffect, useState } from 'react'
import { unwrapApiList } from '../../lib/unwrapApiList'
import { diagnosticoService } from '../../services/diagnosticoService'
import PatenteLink from '../../components/vehiculo/PatenteLink'
import { useMobile } from '../../hooks/useMobile'

const LIMITE_LISTA = 50

const STATUS_LABEL = {
  pendiente: 'Pendiente',
  proceso: 'En proceso',
  listo: 'Listo',
}

function statusStyle(status) {
  const map = {
    pendiente: { background: 'var(--secco-muted-10)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' },
    proceso: { background: 'var(--secco-gold-10)', color: 'var(--secco-gold)', border: '1px solid var(--secco-gold-30)' },
    listo: { background: 'var(--secco-green-12)', color: 'var(--secco-green-dark)', border: '1px solid var(--secco-green-30)' },
  }
  return map[status] || map.pendiente
}

export default function DiagnosticosListScreen({ onNavigate }) {
  const isMobile = useMobile()
  const [diagnosticos, setDiagnosticos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroDebounced, setFiltroDebounced] = useState('')
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
      ? diagnosticoService.buscarPorPatente(filtroDebounced, { limite: LIMITE_LISTA })
      : diagnosticoService.listar({ limite: LIMITE_LISTA })

    req
      .then((data) => {
        if (cancelled) return
        setDiagnosticos(unwrapApiList(data, ['diagnosticos']))
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Error al cargar diagnósticos')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filtroDebounced])

  return (
    <div style={{ padding: isMobile ? '12px 8px 40px' : '24px 16px 40px' }}>
      <style>{`
        .diag-toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; }
        .diag-searchWrap { position: relative; margin-bottom: 14px; }
        .diag-searchIcon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #AAAAAA; font-size: 14px; pointer-events: none; }
      `}</style>

      <div className="diag-toolbar">
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 700, margin: 0 }}>Diagnósticos</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted-foreground)', fontSize: 12 }}>
            {loading ? 'Cargando…' : `${diagnosticos.length} resultado${diagnosticos.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      <div className="diag-searchWrap">
        <span className="diag-searchIcon">⌕</span>
        <input
          type="text"
          className="s-input"
          placeholder="Buscar por patente…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          autoComplete="off"
          style={{ width: '100%', paddingLeft: 36 }}
        />
      </div>

      {error && <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando diagnósticos...</p>
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
                style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1.5px solid #E0E0E0', borderRadius: 14, background: 'var(--background)', fontFamily: 'inherit', width: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 2px', color: 'var(--secco-gold)', fontSize: 15, fontWeight: 700 }}>
                      DG-{diag.numero_diagnostico}
                    </p>
                    <p style={{ margin: '0 0 2px', color: 'var(--foreground)', fontSize: 13 }}>
                      {[veh.marca, veh.modelo].filter(Boolean).join(' · ')}
                      {veh.patente ? (
                        <>
                          {(veh.marca || veh.modelo) ? ' · ' : ''}
                          <PatenteLink patente={veh.patente} mono stopPropagation />
                        </>
                      ) : null}
                    </p>
                    {cli.nombre && (
                      <p style={{ margin: '0 0 2px', color: 'var(--muted-foreground)', fontSize: 12 }}>{cli.nombre}</p>
                    )}
                    {diag.tipo_mantencion && (
                      <p style={{ margin: 0, color: 'var(--secco-gold)', fontSize: 12, fontWeight: 600 }}>
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
              <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
                {filtroDebounced ? 'No hay diagnósticos para esa patente' : 'No hay diagnósticos'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
