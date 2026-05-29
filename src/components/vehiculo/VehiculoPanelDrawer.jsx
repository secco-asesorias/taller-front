import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchVehiculoPanelData } from '../../services/vehiculoPanelService'
import styles from './VehiculoPanelDrawer.module.css'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'actas', label: 'Ingreso' },
  { id: 'entregas', label: 'Entregas' },
  { id: 'diagnosticos', label: 'Diagnósticos' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'ordenes', label: 'OT' },
]

const COT_STATUS = {
  borrador: 'Borrador',
  lista: 'Lista',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  sin_asignar: 'Sin asignar',
}

function RowButton({ onClick, title, subtitle, meta, badge }) {
  return (
    <button type="button" className={styles.rowBtn} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--secco-gold)' }}>{title}</p>
          {subtitle ? (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--foreground)' }}>{subtitle}</p>
          ) : null}
          {meta ? (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted-foreground)' }}>{meta}</p>
          ) : null}
        </div>
        {badge ? (
          <span
            className={badge.className}
            style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}
          >
            {badge.text}
          </span>
        ) : null}
      </div>
    </button>
  )
}

function ListaTab({ items, render, empty, error }) {
  if (error) return <p className="s-error" style={{ marginBottom: 12 }}>{error}</p>
  if (!items?.length) {
    return <p style={{ color: 'var(--muted-foreground)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>{empty}</p>
  }
  return <div>{items.map(render)}</div>
}

function ResumenTab({ data, clientes, counts, onSelectTab, onNuevaActa, onNuevaEntrega }) {
  const veh = data.vehiculo || {}
  return (
    <div>
      {clientes.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: 'var(--secco-gold)', textTransform: 'uppercase' }}>Clientes</p>
          {clientes.map((c) => (
            <div key={c.id} style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{c.nombre || '—'}</p>
              {c.telefono ? <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>{c.telefono}</p> : null}
              {c.email ? <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>{c.email}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {veh.vin ? (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: 'var(--secco-gold)', textTransform: 'uppercase' }}>Datos</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--foreground)' }}><strong>VIN:</strong> {veh.vin}</p>
        </div>
      ) : null}

      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: 'var(--secco-gold)', textTransform: 'uppercase' }}>Accesos rápidos</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Ingreso', count: counts.actas, tab: 'actas' },
          { label: 'Entregas', count: counts.entregas, tab: 'entregas' },
          { label: 'Diagnósticos', count: counts.diagnosticos, tab: 'diagnosticos' },
          { label: 'Cotizaciones', count: counts.cotizaciones, tab: 'cotizaciones' },
          { label: 'OT', count: counts.ordenes, tab: 'ordenes' },
        ].map((item) => (
          <button
            key={item.tab}
            type="button"
            className={styles.rowBtn}
            style={{ marginBottom: 0, textAlign: 'center' }}
            onClick={() => onSelectTab(item.tab)}
          >
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--secco-gold)' }}>{item.count}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted-foreground)' }}>{item.label}</p>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        <button type="button" className="s-btn-secondary" style={{ width: '100%' }} onClick={onNuevaActa}>
          + Acta de ingreso
        </button>
        {onNuevaEntrega ? (
          <button
            type="button"
            className="s-btn-primary"
            style={{ width: '100%', background: 'var(--secco-green)', borderColor: 'var(--secco-green)' }}
            onClick={onNuevaEntrega}
          >
            + Acta de entrega
          </button>
        ) : null}
      </div>
    </div>
  )
}

function actaBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'cerrada')  return 'status-badge-cerrada'
  if (s === 'borrador') return 'status-badge-borrador'
  return 'status-badge-activa'
}

function cotBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'aprobada')  return 'status-badge-aprobada'
  if (s === 'rechazada') return 'status-badge-rechazada'
  if (s === 'enviada')   return 'status-badge-enviada'
  return 'status-badge-borrador'
}

export default function VehiculoPanelDrawer({ patente, onClose }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('resumen')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!patente) {
      setData(null)
      setError('')
      setTab('resumen')
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setTab('resumen')

    fetchVehiculoPanelData(patente)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null)
          setError(e?.message || 'Error al cargar datos del vehículo')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [patente])

  if (!patente) return null

  function go(path) {
    onClose()
    navigate(path)
  }

  const veh = data?.vehiculo || {}
  const tituloVeh = [veh.marca, veh.modelo, veh.anio].filter(Boolean).join(' ') || 'Vehículo'
  const clientes = data?.clientes || []

  const counts = {
    actas: data?.actas?.length ?? 0,
    entregas: data?.actasEntrega?.length ?? 0,
    diagnosticos: data?.diagnosticos?.length ?? 0,
    cotizaciones: data?.cotizaciones?.length ?? 0,
    ordenes: data?.ordenes?.length ?? 0,
  }

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Cerrar panel"
        onClick={onClose}
      />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={`Vehículo ${patente}`}>
        <header className={styles.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Vehículo
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '2px', color: 'var(--foreground)' }}>
              {patente}
            </p>
            {!loading && data ? (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                {tituloVeh}
                {veh.color ? ` · ${veh.color}` : ''}
              </p>
            ) : null}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          {loading ? (
            <p style={{ color: 'var(--muted-foreground)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>Cargando…</p>
          ) : null}

          {error ? (
            <p className="s-error" style={{ marginBottom: 12 }}>{error}</p>
          ) : null}

          {!loading && data ? (
            <>
              {data.vehiculoNoEncontrado ? (
                <div className={`${styles.banner} ${styles.bannerWarn}`}>
                  No hay vehículo registrado con esta patente. Igual se muestran actas, diagnósticos y cotizaciones vinculados.
                </div>
              ) : null}

              {data.vehiculoError ? (
                <div className={`${styles.banner} ${styles.bannerWarn}`}>{data.vehiculoError}</div>
              ) : null}

              {data.borradorActa ? (
                <div className={`${styles.banner} ${styles.bannerInfo}`}>
                  <strong>Borrador de acta activo</strong>
                  {' — '}
                  ACT-{data.borradorActa.numero_acta || '—'}
                  <button
                    type="button"
                    className="s-btn-primary"
                    style={{ display: 'block', marginTop: 8, width: '100%', padding: '8px 12px', fontSize: 12 }}
                    onClick={() => go(`/actas/${data.borradorActa.id}/editar`)}
                  >
                    Continuar acta
                  </button>
                </div>
              ) : null}

              {data.borradorEntrega ? (
                <div
                  className={`${styles.banner} ${styles.bannerInfo}`}
                  style={{ borderColor: 'var(--secco-green-30)', background: 'var(--secco-green-12)' }}
                >
                  <strong style={{ color: 'var(--secco-green-dark)' }}>Borrador de entrega activo</strong>
                  {' — '}
                  ENT-{data.borradorEntrega.numero_acta_entrega ?? data.borradorEntrega.numero_acta ?? '—'}
                  <button
                    type="button"
                    className="s-btn-primary"
                    style={{ display: 'block', marginTop: 8, width: '100%', padding: '8px 12px', fontSize: 12, background: 'var(--secco-green)', borderColor: 'var(--secco-green)' }}
                    onClick={() => go(`/actas-entrega/${data.borradorEntrega.id}/editar`)}
                  >
                    Continuar entrega
                  </button>
                </div>
              ) : null}

              <div className={styles.tabs}>
                {TABS.map((t) => {
                  const count = t.id === 'resumen' ? null : counts[t.id]
                  const label = count != null ? `${t.label} (${count})` : t.label
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                      onClick={() => setTab(t.id)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {tab === 'resumen' ? (
                <ResumenTab
                  data={data}
                  clientes={clientes}
                  counts={counts}
                  onSelectTab={setTab}
                  onNuevaActa={() => go('/actas/nueva')}
                  onNuevaEntrega={() => go('/actas-entrega/nueva')}
                />
              ) : null}

              {tab === 'actas' ? (
                <ListaTab
                  empty="No hay actas para esta patente."
                  error={data.actasError}
                  items={data.actas}
                  render={(acta) => (
                    <RowButton
                      key={acta.id}
                      title={`ACT-${acta.numero_acta || '—'}`}
                      subtitle={acta.clientes?.nombre}
                      meta={acta.fecha_ingreso
                        ? new Date(acta.fecha_ingreso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                        : null}
                      badge={{ text: acta.status || '—', className: actaBadgeClass(acta.status) }}
                      onClick={() => {
                        const s = String(acta.status || '').toLowerCase()
                        if (s === 'borrador' || s === 'activa') go(`/actas/${acta.id}/editar`)
                        else go(`/actas/${acta.id}`)
                      }}
                    />
                  )}
                />
              ) : null}

              {tab === 'entregas' ? (
                <ListaTab
                  empty="No hay actas de entrega para esta patente."
                  error={data.actasEntregaError}
                  items={data.actasEntrega}
                  render={(acta) => {
                    const num = acta.numero_acta_entrega ?? acta.numero_acta
                    const fecha = acta.fecha_entrega || acta.fecha_ingreso
                    const esBorrador = String(acta.status || '').toLowerCase() === 'borrador'
                    return (
                      <RowButton
                        key={acta.id}
                        title={`ENT-${num || '—'}`}
                        subtitle={acta.clientes?.nombre}
                        meta={fecha
                          ? new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                          : null}
                        badge={{ text: acta.status || '—', className: actaBadgeClass(acta.status) }}
                        onClick={() => {
                          if (esBorrador) go(`/actas-entrega/${acta.id}/editar`)
                          else go(`/actas-entrega/${acta.id}`)
                        }}
                      />
                    )
                  }}
                />
              ) : null}

              {tab === 'diagnosticos' ? (
                <ListaTab
                  empty="No hay diagnósticos para esta patente."
                  error={data.diagnosticosError}
                  items={data.diagnosticos}
                  render={(diag) => (
                    <RowButton
                      key={diag.id}
                      title={`DG-${diag.numero_diagnostico || '—'}`}
                      subtitle={diag.tipo_mantencion ? `Mantención: ${diag.tipo_mantencion}` : diag.actas?.clientes?.nombre}
                      meta={diag.actas?.numero_acta ? `Acta #${diag.actas.numero_acta}` : null}
                      badge={{ text: diag.status || '—', className: 'status-badge-activa' }}
                      onClick={() => go(`/diagnosticos/${diag.id}`)}
                    />
                  )}
                />
              ) : null}

              {tab === 'cotizaciones' ? (
                <ListaTab
                  empty="No hay cotizaciones para esta patente."
                  error={data.cotizacionesError}
                  items={data.cotizaciones}
                  render={(cot) => (
                    <RowButton
                      key={cot.id}
                      title={cot.numero_cotizacion ? `Cotización #${cot.numero_cotizacion}` : 'Cotización'}
                      subtitle={cot.clientes?.nombre || cot.actas?.clientes?.nombre}
                      meta={cot.actas?.numero_acta ? `Acta #${cot.actas.numero_acta}` : null}
                      badge={{ text: COT_STATUS[cot.status] || cot.status || '—', className: cotBadgeClass(cot.status) }}
                      onClick={() => go(`/cotizaciones/${cot.id}`)}
                    />
                  )}
                />
              ) : null}

              {tab === 'ordenes' ? (
                <>
                  {data.ordenesFiltradoLocal ? (
                    <p style={{ fontSize: 11, color: 'var(--placeholder)', margin: '0 0 10px', lineHeight: 1.45 }}>
                      Órdenes filtradas del listado general (no hay búsqueda por patente en el API).
                    </p>
                  ) : null}
                  <ListaTab
                    empty="No hay órdenes de trabajo para esta patente."
                    error={data.ordenesError}
                    items={data.ordenes}
                    render={(ot) => (
                      <RowButton
                        key={ot.id}
                        title={`OT #${ot.numero_ot || '—'}`}
                        subtitle={ot.clientes?.nombre}
                        meta={ot.tecnico_nombre ? `Técnico: ${ot.tecnico_nombre}` : null}
                        badge={{ text: String(ot.status || '').replaceAll('_', ' '), className: 'status-badge-info' }}
                        onClick={() => go(`/ordenes-trabajo/${ot.id}`)}
                      />
                    )}
                  />
                </>
              ) : null}

              <p style={{ marginTop: 16, fontSize: 11, color: 'var(--placeholder)', lineHeight: 1.45 }}>
                Las fotos solo se gestionan dentro de cada acta o diagnóstico; no hay listado por patente.
              </p>
            </>
          ) : null}
        </div>
      </aside>
    </>
  )
}
