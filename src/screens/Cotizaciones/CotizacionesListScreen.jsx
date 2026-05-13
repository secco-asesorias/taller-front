import { useEffect, useState } from 'react'
import { unwrapApiList } from '../../lib/unwrapApiList'
import { cotizacionService } from '../../services/cotizacionService'
import { useToast } from '../../components/common/ToastProvider'
import { useConfirm } from '../../components/common/ConfirmProvider'

const LIMITE_LISTA = 50

const STATUS_LABEL = {
  borrador: 'Borrador',
  lista: 'Lista',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  sin_asignar: 'Sin asignar',
}

function statusKey(s) {
  return String(s || '').toLowerCase()
}

function statusStyle(status) {
  const k = statusKey(status)
  const map = {
    borrador: { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' },
    lista: { background: 'rgba(169,130,37,0.10)', color: '#a98225', border: '1px solid rgba(169,130,37,0.3)' },
    enviada: { background: 'rgba(30,58,138,0.08)', color: '#1e3a8a', border: '1px solid rgba(30,58,138,0.25)' },
    aprobada: { background: 'rgba(52,199,89,0.12)', color: '#1a7a34', border: '1px solid rgba(52,199,89,0.3)' },
    rechazada: { background: 'rgba(255,69,58,0.08)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.25)' },
    sin_asignar: { background: '#F5F5F5', color: '#6B6B6B', border: '1px solid #E0E0E0' },
  }
  return map[k] || map.borrador
}

function money(v) {
  return v ? `$${Math.round(Number(v)).toLocaleString('es-CL')}` : ''
}

export default function CotizacionesListScreen({ onNavigate }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroDebounced, setFiltroDebounced] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

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
      ? cotizacionService.buscarPorPatente(filtroDebounced, { limite: LIMITE_LISTA })
      : cotizacionService.listar({ limite: LIMITE_LISTA })

    req
      .then((data) => {
        if (cancelled) return
        setCotizaciones(unwrapApiList(data, ['cotizaciones']))
      })
      .catch((err) => {
        if (!cancelled) {
          setCotizaciones([])
          setError(err?.message || 'Error al cargar cotizaciones')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filtroDebounced, refreshNonce])

  const refrescarLista = () => setRefreshNonce((n) => n + 1)
  const mostrarSpinnerCompleto = loading && !cotizaciones.length

  function irAEditar(cotId) {
    onNavigate?.(`cotizaciones/${cotId}`)
  }

  async function handleEliminar(cot) {
    const estado = STATUS_LABEL[statusKey(cot.status)] || cot.status || ''
    const advertencia = statusKey(cot.status) === 'aprobada'
      ? '\n\nEsta cotización está APROBADA. Si tiene una OT vinculada, asegurate de revisarla antes.'
      : ''
    const ok = await confirm({
      title: 'Eliminar cotización',
      message: `¿Eliminar la cotización COT-${cot.numero_cotizacion}${estado ? ` (${estado})` : ''}? Esta acción no se puede deshacer.${advertencia}`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    setDeletingId(cot.id)
    try {
      await cotizacionService.eliminar(cot.id)
      setCotizaciones((prev) => prev.filter((c) => c.id !== cot.id))
      toast.success('Cotización eliminada')
      refrescarLista()
    } catch (e) {
      const status = e?.status
      const mensaje = e?.message ? String(e.message) : 'No se pudo eliminar la cotización'
      if (status === 401 || status === 403) {
        toast.error('No tenés permisos para eliminar cotizaciones (solo administrador).')
      } else {
        toast.error(mensaje)
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ padding: '14px 12px 40px', maxWidth: 1040, margin: '0 auto' }}>
      <style>{`
        .cot-toolbar { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
        .cot-actions { display: inline-flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 6px; flex-shrink: 0; }
        .cot-action-btn { padding: 7px 12px !important; font-size: 12px !important; font-weight: 700 !important; line-height: 1.2 !important; border-radius: 10px !important; white-space: nowrap; min-height: 0 !important; height: auto !important; }
        @media (max-width: 380px) {
          .cot-actions { flex-wrap: wrap; max-width: 100%; }
        }
        .cot-searchWrap { position: relative; margin-bottom: 14px; }
        .cot-searchIcon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #AAAAAA; font-size: 14px; pointer-events: none; }
        .cot-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 720px) {
          .cot-grid { grid-template-columns: 1fr 1fr; }
        }
        .cot-card { border: 1.5px solid #E0E0E0; border-radius: 14px; background: #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,0.06); font-family: inherit; width: 100%; display: flex; flex-direction: column; overflow: hidden; }
        .cot-card-hit { padding: 16px; text-align: left; cursor: pointer; border: none; background: transparent; font-family: inherit; width: 100%; flex: 1; min-height: 0; }
        .cot-card-hit:hover { background: rgba(0,0,0,0.02); }
        .cot-card-hit:focus-visible { outline: 2px solid #a98225; outline-offset: -2px; }
        .cot-row-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; padding: 10px 12px 12px; border-top: 1px solid #F2F2F2; background: #FAFAFA; }
        .cot-row-btn { padding: 6px 12px !important; font-size: 11px !important; font-weight: 700 !important; line-height: 1.2 !important; border-radius: 8px !important; min-height: 0 !important; height: auto !important; width: auto !important; }
      `}</style>

      <div className="cot-toolbar">
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: '#111114', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Cotizaciones</h2>
          <p style={{ margin: '6px 0 0', color: '#6B6B6B', fontSize: 13, lineHeight: 1.45, maxWidth: 520 }}>
            Presupuestos del taller. Puedes buscar por patente o revisar los últimos cargados.
          </p>
          <p style={{ margin: '8px 0 0', color: '#111114', fontSize: 12, fontWeight: 600 }}>
            {loading ? 'Cargando…' : `${cotizaciones.length} resultado${cotizaciones.length === 1 ? '' : 's'}`}
            {loading && cotizaciones.length > 0 ? ' · actualizando' : ''}
          </p>
        </div>
        <div className="cot-actions">
          <button type="button" className="s-btn-primary cot-action-btn" onClick={() => onNavigate?.('cotizaciones/nueva')}>
            + Agregar
          </button>
          <button type="button" className="s-btn-secondary cot-action-btn" onClick={() => onNavigate?.('actas')}>
            Actas
          </button>
          <button type="button" className="s-btn-secondary cot-action-btn" onClick={refrescarLista} disabled={loading} title={loading ? 'Actualizando…' : 'Recargar listado'}>
            Actualizar
          </button>
        </div>
      </div>

      <div className="s-card" style={{ padding: 14, marginBottom: 14, borderRadius: 14 }}>
        <div className="cot-searchWrap">
          <span className="cot-searchIcon">⌕</span>
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
        <p style={{ color: '#AAAAAA', fontSize: 12, margin: 0, lineHeight: 1.45 }}>
          Presupuesto inicial vinculado al acta: paso «Trabajo solicitado» del formulario de acta. El borrador en servidor se crea al guardar o al cambiar de estado.
        </p>
      </div>

      {error && (
        <div
          className="s-card"
          style={{
            marginBottom: 14,
            padding: 14,
            borderRadius: 12,
            border: '1px solid rgba(255,69,58,0.35)',
            background: 'rgba(255,69,58,0.06)',
          }}
        >
          <p className="s-error" style={{ margin: 0 }}>{error}</p>
          <p style={{ color: '#6B6B6B', fontSize: 13, margin: '10px 0 0' }}>
            Revisa la sesión y la API. Puedes intentar de nuevo o crear un presupuesto nuevo.
          </p>
        </div>
      )}

      {mostrarSpinnerCompleto ? (
        <div className="s-card" style={{ padding: 36, textAlign: 'center', borderRadius: 14 }}>
          <p style={{ color: '#6B6B6B', fontSize: 14, margin: 0 }}>Cargando cotizaciones…</p>
        </div>
      ) : (
        <div className="cot-grid">
          {cotizaciones.map((cot) => {
            const veh = cot.vehiculos || cot.actas?.vehiculos || cot.vista_cliente?.vehiculo_manual || {}
            const cli = cot.clientes || cot.actas?.clientes || cot.vista_cliente?.cliente_manual || {}
            const eliminando = deletingId === cot.id
            return (
              <div key={cot.id} className="cot-card" style={{ minHeight: 120 }}>
                <button
                  type="button"
                  className="cot-card-hit"
                  onClick={() => irAEditar(cot.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 4px', color: '#1e3a8a', fontSize: 14, fontWeight: 800 }}>
                        COT-{cot.numero_cotizacion}
                        {cot.vista_cliente?.titulo && (
                          <span style={{ color: '#6B6B6B', fontWeight: 600 }}> · {cot.vista_cliente.titulo}</span>
                        )}
                      </p>
                      <p style={{ margin: '0 0 4px', color: '#111114', fontSize: 13, lineHeight: 1.35 }}>
                        {[veh.marca, veh.modelo, veh.patente].filter(Boolean).join(' · ') || 'Sin vehículo en datos'}
                      </p>
                      {cli.nombre ? (
                        <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>{cli.nombre}</p>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
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
                        {STATUS_LABEL[statusKey(cot.status)] || cot.status}
                      </span>
                      {(cot.total || cot.total_final_cliente) ? (
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#a98225' }}>
                          {money(cot.total_final_cliente || cot.total)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
                <div className="cot-row-actions">
                  <button
                    type="button"
                    className="s-btn-secondary cot-row-btn"
                    onClick={() => irAEditar(cot.id)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="s-btn-secondary cot-row-btn"
                    disabled={eliminando}
                    title="Eliminar cotización (requiere permisos de administrador)"
                    style={{
                      borderColor: 'rgba(255,69,58,0.35)',
                      color: '#FF453A',
                    }}
                    onClick={() => handleEliminar(cot)}
                  >
                    {eliminando ? '…' : 'Eliminar'}
                  </button>
                </div>
              </div>
            )
          })}

          {!cotizaciones.length && !loading && (
            <div
              className="s-card"
              style={{
                gridColumn: '1 / -1',
                padding: 40,
                textAlign: 'center',
                borderRadius: 14,
                border: '1px dashed #D0D0D0',
                background: '#FAFAFA',
              }}
            >
              <p style={{ color: '#111114', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
                {filtroDebounced ? 'No hay cotizaciones para esa patente' : 'No hay cotizaciones en el listado'}
              </p>
              <p style={{ color: '#6B6B6B', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
                {filtroDebounced
                  ? 'Prueba con otra patente o limpia el buscador para ver los últimos registros.'
                  : 'Abre el editor para cargar ítems y totales, o genera un presupuesto desde una acta.'}
              </p>
              <button type="button" className="s-btn-primary" onClick={() => onNavigate?.('cotizaciones/nueva')}>
                + Agregar presupuesto
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
