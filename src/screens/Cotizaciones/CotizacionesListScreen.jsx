import { useEffect, useState } from 'react'
import { unwrapApiList } from '../../lib/unwrapApiList'
import { cotizacionService } from '../../services/cotizacionService'
import { useToast } from '../../components/common/ToastProvider'
import { useConfirm } from '../../components/common/ConfirmProvider'
import PatenteLink from '../../components/vehiculo/PatenteLink'
import { useMobile } from '../../hooks/useMobile'

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
    borrador: { background: 'var(--secco-muted-10)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' },
    lista: { background: 'var(--secco-gold-10)', color: 'var(--secco-gold)', border: '1px solid var(--secco-gold-30)' },
    enviada: { background: 'var(--secco-gold-10)', color: 'var(--secco-gold)', border: '1px solid var(--secco-gold-30)' },
    aprobada: { background: 'var(--secco-green-12)', color: 'var(--secco-green-dark)', border: '1px solid var(--secco-green-30)' },
    rechazada: { background: 'var(--secco-red-08)', color: 'var(--destructive)', border: '1px solid var(--secco-red-25)' },
    sin_asignar: { background: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' },
  }
  return map[k] || map.borrador
}

function money(v) {
  return v ? `$${Math.round(Number(v)).toLocaleString('es-CL')}` : ''
}

function fechaStr(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function CotizacionesListScreen({ onNavigate }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const isMobile = useMobile()
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [orden, setOrden] = useState('nueva')

  function setRango(rango) {
    const hoy = new Date()
    if (rango === 'hoy') {
      const s = hoyISO(); setFechaDesde(s); setFechaHasta(s)
    } else if (rango === 'semana') {
      const d = new Date(hoy)
      d.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
      setFechaDesde(d.toISOString().slice(0, 10)); setFechaHasta(hoyISO())
    } else if (rango === 'mes') {
      const m = String(hoy.getMonth() + 1).padStart(2, '0')
      setFechaDesde(`${hoy.getFullYear()}-${m}-01`); setFechaHasta(hoyISO())
    } else {
      setFechaDesde(''); setFechaHasta('')
    }
  }

  // Filtrado y ordenamiento 100% client-side
  const cotizacionesFiltradas = cotizaciones
    .filter((cot) => {
      const veh = cot.vehiculos || cot.actas?.vehiculos || cot.vista_cliente?.vehiculo_manual || {}
      const patente = String(veh.patente || '').toUpperCase()
      const q = filtro.trim().toUpperCase()
      if (q && !patente.includes(q)) return false
      if (fechaDesde || fechaHasta) {
        const f = new Date(cot.created_at)
        if (fechaDesde && f < new Date(fechaDesde + 'T00:00:00')) return false
        if (fechaHasta && f > new Date(fechaHasta + 'T23:59:59')) return false
      }
      return true
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at) - new Date(b.created_at)
      return orden === 'nueva' ? -diff : diff
    })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    cotizacionService.listar({ limite: LIMITE_LISTA })
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
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [refreshNonce])

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
    <div style={{ padding: isMobile ? '10px 8px 40px' : '14px 12px 40px', maxWidth: 1040, margin: '0 auto' }}>
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
          <h2 style={{ color: 'var(--foreground)', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Cotizaciones</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 13, lineHeight: 1.45, maxWidth: 520 }}>
            Presupuestos del taller. Puedes buscar por patente o revisar los últimos cargados.
          </p>
          <p style={{ margin: '8px 0 0', color: 'var(--foreground)', fontSize: 12, fontWeight: 600 }}>
            {loading ? 'Cargando…' : `${cotizacionesFiltradas.length} resultado${cotizacionesFiltradas.length === 1 ? '' : 's'}${cotizacionesFiltradas.length !== cotizaciones.length ? ` (de ${cotizaciones.length})` : ''}`}
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
            placeholder="Filtrar por patente…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            autoComplete="off"
            style={{ width: '100%', paddingLeft: 36 }}
          />
        </div>

        {/* Orden y filtro por fecha */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="s-input"
            style={{ width: 'auto', fontSize: 12, padding: '5px 8px', cursor: 'pointer' }}
          >
            <option value="nueva">Más nueva primero</option>
            <option value="vieja">Más vieja primero</option>
          </select>
          <span style={{ color: 'var(--border)', fontSize: 14 }}>|</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Fecha:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <input
              type="date"
              className="s-input"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ width: 140, fontSize: 12, padding: '5px 8px' }}
              title="Desde"
            />
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>—</span>
            <input
              type="date"
              className="s-input"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ width: 140, fontSize: 12, padding: '5px 8px' }}
              title="Hasta"
            />
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes']].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRango(k)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
            {(fechaDesde || fechaHasta) && (
              <button
                type="button"
                onClick={() => setRango('todo')}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--secco-red-25)', background: 'var(--secco-red-08)',
                  color: 'var(--destructive)', whiteSpace: 'nowrap',
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          className="s-card"
          style={{
            marginBottom: 14,
            padding: 14,
            borderRadius: 12,
            border: '1px solid var(--secco-red-35)',
            background: 'var(--secco-red-08)',
          }}
        >
          <p className="s-error" style={{ margin: 0 }}>{error}</p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '10px 0 0' }}>
            Revisa la sesión y la API. Puedes intentar de nuevo o crear un presupuesto nuevo.
          </p>
        </div>
      )}

      {mostrarSpinnerCompleto ? (
        <div className="s-card" style={{ padding: 36, textAlign: 'center', borderRadius: 14 }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, margin: 0 }}>Cargando cotizaciones…</p>
        </div>
      ) : (
        <div className="cot-grid">
          {cotizacionesFiltradas.map((cot) => {
            const veh = cot.vehiculos || cot.actas?.vehiculos || cot.vista_cliente?.vehiculo_manual || {}
            const cli = cot.clientes || cot.actas?.clientes || cot.vista_cliente?.cliente_manual || {}
            const eliminando = deletingId === cot.id
            const tieneActaVinculada = Boolean(cot.acta_id || cot.actas?.id)
            const numeroActa = cot.actas?.numero_acta ?? null
            const descripcionVehiculo = [veh.marca, veh.modelo, veh.patente].filter(Boolean).join(' · ')
            const lineaVehiculo = descripcionVehiculo
              || (tieneActaVinculada
                ? `Vinculada a Acta${numeroActa ? ` #${numeroActa}` : ''} · sin datos cargados`
                : 'Sin vehículo en datos')
            return (
              <div key={cot.id} className="cot-card" style={{ minHeight: 120 }}>
                <button
                  type="button"
                  className="cot-card-hit"
                  onClick={() => irAEditar(cot.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 4px', color: 'var(--secco-gold)', fontSize: 14, fontWeight: 800 }}>
                        COT-{cot.numero_cotizacion}
                        {cot.vista_cliente?.titulo && (
                          <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}> · {cot.vista_cliente.titulo}</span>
                        )}
                      </p>
                      <p style={{ margin: '0 0 4px', color: descripcionVehiculo ? 'var(--foreground)' : 'var(--muted-foreground)', fontSize: 13, lineHeight: 1.35, fontStyle: descripcionVehiculo ? 'normal' : 'italic' }}>
                        {veh.patente ? (
                          <>
                            {[veh.marca, veh.modelo].filter(Boolean).join(' · ')}
                            {(veh.marca || veh.modelo) ? ' · ' : ''}
                            <PatenteLink patente={veh.patente} mono stopPropagation />
                          </>
                        ) : (
                          lineaVehiculo
                        )}
                      </p>
                      {cli.nombre ? (
                        <p style={{ margin: '0 0 2px', color: 'var(--muted-foreground)', fontSize: 12 }}>{cli.nombre}</p>
                      ) : null}
                      {cot.created_at && (
                        <p style={{ margin: 0, color: 'var(--placeholder)', fontSize: 11 }}>
                          📅 {fechaStr(cot.created_at)}
                        </p>
                      )}
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
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--secco-green)' }}>
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
                      borderColor: 'var(--secco-red-35)',
                      color: 'var(--destructive)',
                    }}
                    onClick={() => handleEliminar(cot)}
                  >
                    {eliminando ? '…' : 'Eliminar'}
                  </button>
                </div>
              </div>
            )
          })}

          {!cotizacionesFiltradas.length && !loading && (
            <div
              className="s-card"
              style={{
                gridColumn: '1 / -1',
                padding: 40,
                textAlign: 'center',
                borderRadius: 14,
                border: '1px dashed #D0D0D0',
                background: 'var(--card)',
              }}
            >
              <p style={{ color: 'var(--foreground)', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
                {filtro.trim() ? 'No hay cotizaciones para esa patente' : (fechaDesde || fechaHasta) ? 'No hay cotizaciones en ese rango de fechas' : 'No hay cotizaciones en el listado'}
              </p>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
                {filtro.trim()
                  ? 'Probá con otra patente o limpiá el buscador para ver todos.'
                  : (fechaDesde || fechaHasta)
                    ? 'Ajustá el rango de fechas o presioná Limpiar para ver todas.'
                    : 'Abrí el editor para cargar ítems y totales, o generá un presupuesto desde una acta.'}
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
