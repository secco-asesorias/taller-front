import { useEffect, useMemo, useState } from 'react'
import { diagnosticoService } from '../../services/diagnosticoService'
import { cotizacionService } from '../../services/cotizacionService'
import { useToast } from '../../components/common/ToastProvider'
import { useRol } from '../../context/AuthContext'
import PatenteLink from '../../components/vehiculo/PatenteLink'
import { getDiagSeccion } from '../../components/diagnostico/checklistData'

const STATUS_LABEL = {
  pendiente: 'Pendiente',
  proceso: 'En proceso',
  listo: 'Listo',
  cerrado: 'Cerrado',
}

const TIPO_MANT_LABEL = {
  basica: 'Básica',
  intermedia: 'Intermedia',
  full: 'Full',
}

const ESTADO_CHECKLIST_LABEL = {
  ok: 'OK',
  requiere_atencion: 'Requiere atención',
  urgente: 'Urgente',
  no_aplica: 'N/A',
}

function statusStyle(status) {
  const map = {
    pendiente: { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' },
    proceso: { background: 'rgba(169,130,37,0.10)', color: '#a98225', border: '1px solid rgba(169,130,37,0.3)' },
    listo: { background: 'rgba(52,199,89,0.12)', color: '#1a7a34', border: '1px solid rgba(52,199,89,0.3)' },
    cerrado: { background: 'rgba(30,58,138,0.08)', color: '#1e3a8a', border: '1px solid rgba(30,58,138,0.25)' },
  }
  return map[status] || map.pendiente
}

function estadoItemStyle(estado) {
  const map = {
    ok: { color: '#1a7a34' },
    requiere_atencion: { color: '#a98225' },
    urgente: { color: '#FF453A', fontWeight: 700 },
    no_aplica: { color: '#AAAAAA' },
  }
  return map[estado] || {}
}

function Campo({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: 10, color: '#6B6B6B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#111114', fontWeight: 500, lineHeight: 1.4 }}>{value}</p>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#a98225', borderBottom: '1px solid rgba(169,130,37,0.2)', paddingBottom: 6 }}>{titulo}</p>
      {children}
    </div>
  )
}

function actaDe(diag) {
  return diag?.actas || {}
}

function vehiculoDe(diag) {
  const acta = actaDe(diag)
  return diag?.vehiculos || acta?.vehiculos || {}
}

function clienteDe(diag) {
  const acta = actaDe(diag)
  return diag?.clientes || acta?.clientes || {}
}

function fmtFecha(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function DiagnosticoDetalleScreen({ diagId, onVolver, onEditar, onNavigate }) {
  const toast = useToast()
  const { esAdmin, puedeEditarDiagnostico } = useRol()
  const [diag, setDiag] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creandoCot, setCreandoCot] = useState(false)

  function cargar() {
    if (!diagId) {
      setError('ID no especificado')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    diagnosticoService
      .obtener(diagId)
      .then(setDiag)
      .catch((err) => setError(err?.message || 'Error al cargar diagnóstico'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
  }, [diagId])

  const checklist = diag?.diagnostico_checklist || []
  const repuestos = diag?.diagnostico_repuestos || []
  const fotos = diag?.diagnostico_fotos || []

  const resumenChecklist = useMemo(() => {
    const counts = { ok: 0, requiere_atencion: 0, urgente: 0, no_aplica: 0 }
    for (const row of checklist) {
      const e = row.estado || 'ok'
      if (counts[e] != null) counts[e] += 1
    }
    return counts
  }, [checklist])

  const checklistPorSeccion = useMemo(() => {
    const map = new Map()
    for (const row of checklist) {
      const num = Number(row.seccion) || 0
      if (!map.has(num)) map.set(num, [])
      map.get(num).push(row)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [checklist])

  const itemsAtencion = useMemo(
    () => checklist.filter((r) => ['requiere_atencion', 'urgente'].includes(r.estado)),
    [checklist],
  )

  async function handleCrearCotizacion() {
    if (!diag?.id) return
    setCreandoCot(true)
    try {
      const cot = await cotizacionService.crearDesdeDiagnostico(diag.id)
      const id = cot?.id || cot?.cotizacion?.id
      toast.success('Cotización borrador creada')
      if (id) onNavigate?.(`cotizaciones/${id}`)
    } catch (e) {
      toast.error(e?.message || 'No se pudo crear la cotización')
    } finally {
      setCreandoCot(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando diagnóstico...</p>
      </div>
    )
  }

  if (error || !diag) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p className="s-error">⚠ {error || 'Diagnóstico no encontrado'}</p>
        <button type="button" className="s-btn-secondary" style={{ marginTop: 16 }} onClick={onVolver}>Volver</button>
      </div>
    )
  }

  const acta = actaDe(diag)
  const veh = vehiculoDe(diag)
  const cli = clienteDe(diag)
  const puedeEditar = puedeEditarDiagnostico && ['pendiente', 'proceso', 'listo'].includes(diag.status)
  const puedeCotizar = esAdmin && ['listo', 'cerrado'].includes(diag.status)

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E0E0E0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 40 }}>
        <button type="button" onClick={onVolver}
          style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', color: '#111114', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>
            DG-{diag.numero_diagnostico ?? '—'}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#6B6B6B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[veh.marca, veh.modelo].filter(Boolean).join(' ')}
            {veh.patente ? (
              <>
                {' · '}
                <PatenteLink patente={veh.patente} mono />
              </>
            ) : null}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, flexShrink: 0, ...statusStyle(diag.status) }}>
          {STATUS_LABEL[diag.status] || diag.status}
        </span>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Resumen rápido */}
        <div className="s-card" style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              ['OK', resumenChecklist.ok, '#1a7a34'],
              ['Atención', resumenChecklist.requiere_atencion, '#a98225'],
              ['Urgente', resumenChecklist.urgente, '#FF453A'],
              ['Repuestos', repuestos.length, '#1e3a8a'],
              ['Fotos', fotos.length, '#6B6B6B'],
            ].map(([label, n, color]) => (
              <div key={label} style={{ flex: '1 1 72px', textAlign: 'center', padding: '8px 6px', background: '#F9F9F9', borderRadius: 8, border: '1px solid #EEEEEE' }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color }}>{n}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6B6B6B', fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <Seccion titulo="Vehículo y cliente">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
            <Campo label="Cliente" value={cli.nombre} />
            <Campo label="Teléfono" value={cli.telefono} />
            <Campo label="Patente" value={veh.patente} />
            <Campo label="Vehículo" value={[veh.marca, veh.modelo, veh.anio].filter(Boolean).join(' ')} />
            <Campo label="Kilometraje" value={acta.km != null ? `${Number(acta.km).toLocaleString('es-CL')} km` : null} />
            <Campo label="Acta" value={acta.numero_acta ? `#${acta.numero_acta}` : null} />
          </div>
          {acta.id && (
            <button type="button" className="s-btn-secondary" style={{ marginTop: 12, width: '100%' }} onClick={() => onNavigate?.(`actas/${acta.id}`)}>
              Ver acta de ingreso →
            </button>
          )}
        </Seccion>

        <Seccion titulo="Datos del diagnóstico">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
            <Campo label="Mantención sugerida" value={TIPO_MANT_LABEL[diag.tipo_mantencion] || diag.tipo_mantencion} />
            <Campo label="Horas estimadas" value={diag.horas_estimadas != null ? String(diag.horas_estimadas) : null} />
            <Campo label="Inicio" value={fmtFecha(diag.fecha_inicio)} />
            <Campo label="Cierre" value={fmtFecha(diag.fecha_cierre)} />
          </div>
          {diag.observaciones_generales && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, color: '#6B6B6B', fontWeight: 700, textTransform: 'uppercase' }}>Observaciones</p>
              <p style={{ margin: 0, fontSize: 13, color: '#111114', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{diag.observaciones_generales}</p>
            </div>
          )}
          {acta.trabajo_solicitado && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, color: '#6B6B6B', fontWeight: 700, textTransform: 'uppercase' }}>Trabajo solicitado (acta)</p>
              <p style={{ margin: 0, fontSize: 13, color: '#111114', lineHeight: 1.5 }}>{acta.trabajo_solicitado}</p>
            </div>
          )}
        </Seccion>

        {!!itemsAtencion.length && (
          <Seccion titulo="Hallazgos prioritarios">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {itemsAtencion.slice(0, 12).map((row, i) => {
                const sec = getDiagSeccion(row.seccion)
                return (
                  <div key={`${row.seccion}-${row.item}-${i}`} style={{ padding: '10px 12px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #EEEEEE' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#6B6B6B' }}>{sec?.label || `Sección ${row.seccion}`}</p>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#111114' }}>{row.item}</p>
                    <p style={{ margin: 0, fontSize: 12, ...estadoItemStyle(row.estado) }}>
                      {ESTADO_CHECKLIST_LABEL[row.estado] || row.estado}
                      {row.observacion ? ` — ${row.observacion}` : ''}
                    </p>
                  </div>
                )
              })}
              {itemsAtencion.length > 12 && (
                <p style={{ margin: 0, fontSize: 12, color: '#6B6B6B' }}>+{itemsAtencion.length - 12} ítems más en el checklist</p>
              )}
            </div>
          </Seccion>
        )}

        {!!repuestos.length && (
          <Seccion titulo="Repuestos sugeridos">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {repuestos.map((r, i) => (
                <div key={r.id || i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 10px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #EEEEEE' }}>
                  <span style={{ fontSize: 13, color: '#111114', fontWeight: 500 }}>{r.nombre}</span>
                  <span style={{ fontSize: 12, color: '#6B6B6B', flexShrink: 0 }}>
                    x{r.cantidad || 1} · {r.urgencia || '—'}
                  </span>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {!!checklistPorSeccion.length && (
          <Seccion titulo="Checklist por sección">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {checklistPorSeccion.map(([num, rows]) => {
                const sec = getDiagSeccion(num) || { label: `Sección ${num}` }
                const urgentes = rows.filter((r) => r.estado === 'urgente').length
                const atencion = rows.filter((r) => r.estado === 'requiere_atencion').length
                return (
                  <div key={num} style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 10, background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111114' }}>{num}. {sec.label}</p>
                      <span style={{ fontSize: 11, color: '#6B6B6B' }}>{rows.length} ítems</span>
                    </div>
                    {(urgentes > 0 || atencion > 0) && (
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#a98225' }}>
                        {urgentes > 0 && `${urgentes} urgente${urgentes > 1 ? 's' : ''}`}
                        {urgentes > 0 && atencion > 0 && ' · '}
                        {atencion > 0 && `${atencion} con atención`}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </Seccion>
        )}

        {!checklist.length && !repuestos.length && (
          <p style={{ color: '#6B6B6B', fontSize: 13, marginBottom: 20 }}>Sin checklist ni repuestos registrados aún.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {puedeEditar && (
            <button type="button" className="s-btn-primary" onClick={() => onEditar?.(diag.id)}>
              {diag.status === 'pendiente' ? 'Iniciar / editar checklist' : 'Continuar diagnóstico'}
            </button>
          )}
          {puedeCotizar && (
            <button type="button" className="s-btn-primary" disabled={creandoCot} onClick={handleCrearCotizacion}>
              {creandoCot ? 'Creando…' : 'Crear cotización desde diagnóstico'}
            </button>
          )}
          <button type="button" className="s-btn-secondary" onClick={onVolver}>
            Volver al listado
          </button>
        </div>
      </div>
    </div>
  )
}
