import { useEffect, useState } from 'react'
import { unwrapApiList } from '../../lib/unwrapApiList'
import { diagnosticoService } from '../../services/diagnosticoService'
import { useRol } from '../../context/AuthContext'
import PatenteLink from '../../components/vehiculo/PatenteLink'
import { useMobile } from '../../hooks/useMobile'

const LIMITE_LISTA = 50

const STATUS_LABEL = {
  pendiente: 'Pendiente',
  proceso: 'En proceso',
  listo: 'Listo',
  cerrado: 'Cerrado',
}

const FILTROS = [
  { key: '', label: 'Todos' },
  { key: 'activos', label: 'Activos' },
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'proceso', label: 'En proceso' },
  { key: 'listo', label: 'Listo' },
  { key: 'cerrado', label: 'Cerrado' },
]

function statusStyle(status) {
  const map = {
    pendiente: { background: 'var(--secco-muted-10)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' },
    proceso: { background: 'var(--secco-gold-10)', color: 'var(--secco-gold)', border: '1px solid var(--secco-gold-30)' },
    listo: { background: 'var(--secco-green-12)', color: 'var(--secco-green-dark)', border: '1px solid var(--secco-green-30)' },
  }
  return map[status] || map.pendiente
}

function vehiculoDe(diag) {
  const acta = diag?.actas || {}
  return diag?.vehiculos || acta?.vehiculos || {}
}

function clienteDe(diag) {
  const acta = diag?.actas || {}
  return diag?.clientes || acta?.clientes || {}
}

export default function DiagnosticosListScreen({ onNavigate }) {
  const isMobile = useMobile()
  const [diagnosticos, setDiagnosticos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroPatente, setFiltroPatente] = useState('')
  const [filtroDebounced, setFiltroDebounced] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const trimmed = filtroPatente.trim()
    if (!trimmed) {
      setFiltroDebounced('')
      return
    }
    const t = setTimeout(() => setFiltroDebounced(trimmed), 350)
    return () => clearTimeout(t)
  }, [filtroPatente])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const params = { limite: LIMITE_LISTA }
    if (filtroStatus && filtroStatus !== 'activos') params.status = filtroStatus

    const req = filtroDebounced
      ? diagnosticoService.buscarPorPatente(filtroDebounced, {
          ...params,
          ...(filtroStatus === 'activos' ? { soloActivos: true } : {}),
        })
      : diagnosticoService.listar(params)

    const reqActivos = filtroStatus === 'activos' && !filtroDebounced
      ? Promise.all([
          diagnosticoService.listar({ limite: LIMITE_LISTA, status: 'pendiente' }),
          diagnosticoService.listar({ limite: LIMITE_LISTA, status: 'proceso' }),
        ]).then(([a, b]) => {
          const l1 = unwrapApiList(a, ['diagnosticos'])
          const l2 = unwrapApiList(b, ['diagnosticos'])
          const ids = new Set()
          return [...l1, ...l2].filter((d) => {
            if (ids.has(d.id)) return false
            ids.add(d.id)
            return true
          })
        })
      : null

    const finalReq = reqActivos || req

    finalReq
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : unwrapApiList(data, ['diagnosticos'])
        setDiagnosticos(list)
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
  }, [filtroDebounced, filtroStatus])

  return (
    <div style={{ padding: isMobile ? '12px 8px 40px' : '24px 16px 40px' }}>
      <style>{`
        .diag-toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; }
        .diag-searchWrap { position: relative; margin-bottom: 12px; }
        .diag-searchIcon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #AAAAAA; font-size: 14px; pointer-events: none; }
        .diag-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
        .diag-filterBtn { padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 20px; border: 1px solid #E0E0E0; background: #FFFFFF; color: #6B6B6B; cursor: pointer; font-family: inherit; }
        .diag-filterBtn.active { background: rgba(169,130,37,0.12); border-color: rgba(169,130,37,0.35); color: #a98225; }
      `}</style>

      <div className="diag-toolbar">
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 700, margin: 0 }}>Diagnósticos</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted-foreground)', fontSize: 12 }}>
            {loading ? 'Cargando…' : `${diagnosticos.length} resultado${diagnosticos.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {puedeCrearDiagnostico && (
          <button
            type="button"
            className="s-btn-primary"
            style={{ flexShrink: 0, padding: '8px 14px', fontSize: 13 }}
            onClick={() => onNavigate?.('actas')}
          >
            + Desde acta
          </button>
        )}
      </div>

      <div className="diag-searchWrap">
        <span className="diag-searchIcon">⌕</span>
        <input
          type="text"
          className="s-input"
          placeholder="Buscar por patente…"
          value={filtroPatente}
          onChange={(e) => setFiltroPatente(e.target.value)}
          autoComplete="off"
          style={{ width: '100%', paddingLeft: 36 }}
        />
      </div>

      <div className="diag-filters">
        {FILTROS.map(({ key, label }) => (
          <button
            key={key || 'all'}
            type="button"
            className={`diag-filterBtn${filtroStatus === key ? ' active' : ''}`}
            onClick={() => setFiltroStatus(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {puedeCrearDiagnostico && (
        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#6B6B6B', lineHeight: 1.45 }}>
          Para crear un diagnóstico, abrí el acta de ingreso y usá <strong>Iniciar diagnóstico</strong>.
        </p>
      )}

      {error && <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando diagnósticos...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {diagnosticos.map((diag) => {
            const veh = vehiculoDe(diag)
            const cli = clienteDe(diag)
            const acta = diag.actas || {}
            const urgentes = (diag.diagnostico_checklist || []).filter((c) => c.estado === 'urgente').length
            return (
              <button
                key={diag.id}
                type="button"
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
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, ...statusStyle(diag.status) }}>
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
              {puedeCrearDiagnostico && !filtroDebounced && (
                <button type="button" className="s-btn-secondary" style={{ marginTop: 16 }} onClick={() => onNavigate?.('actas')}>
                  Ir a actas de ingreso
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
