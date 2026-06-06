import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { cotizacionService } from '../../services/cotizacionService'
import { generarPDFPresupuestoCliente, generarPDFPresupuestoInterno } from '../../utils/pdfPresupuesto'
import VincularActaPanel from '../../components/cotizaciones/VincularActaPanel'
import PatenteLink from '../../components/vehiculo/PatenteLink'
import { isPatenteAbrible } from '../../lib/normalizePatente'
import { useMobile } from '../../hooks/useMobile'

function precioFinalConMargen(costoBruto, margenPct) {
  const pct = Number(margenPct)
  if (!(pct > 0 && pct < 100)) return Math.round(Number(costoBruto) || 0)
  const costoNeto = (Number(costoBruto) || 0) / 1.19
  return Math.round(costoNeto / (1 - pct / 100) * 1.19)
}


const TIPOS_ITEM = Object.freeze(['repuesto', 'servicio', 'trabajo', 'mano_obra'])
const TIPO_ITEM_LABELS = {
  repuesto: 'Repuesto',
  servicio: 'Servicio',
  trabajo: 'Trabajo',
  mano_obra: 'Mano de obra',
}
const TIPO_COLOR = {
  repuesto: 'var(--secco-gold)',
  servicio: 'var(--secco-green)',
  trabajo: 'var(--secco-gold)',
  mano_obra: 'var(--secco-purple)',
}

const TIPOS_LINEA = TIPOS_ITEM.filter((t) => t !== 'mano_obra')

function sanitizeTipoItem(raw) {
  const s = String(raw ?? '').toLowerCase().trim().replace(/\s+/g, '_')
  if (TIPOS_ITEM.includes(s)) return s
  if (s === 'extra') return 'servicio'
  if (s.includes('mano')) return 'mano_obra'
  if (s.includes('trabajo')) return 'trabajo'
  if (s.includes('servicio')) return 'servicio'
  if (s.includes('repuesto')) return 'repuesto'
  return 'repuesto'
}

function sanitizeTipoLinea(raw) {
  const t = sanitizeTipoItem(raw)
  return t === 'mano_obra' ? 'repuesto' : t
}

function calcularTotalesCotizacion(items = [], descuento = 0, overrides = {}) {
  const rows = items.filter((it) => it.descripcion?.trim())
  const isMO = (it) => sanitizeTipoItem(it.tipo) === 'mano_obra'
  const margenPct = Number(overrides.margen_pct) > 0 ? Number(overrides.margen_pct) : 30
  const horasTrabajo = Math.max(0, Number(overrides.horas_trabajo) || 0)
  const costoHoraTecnico = Math.max(0, Number(overrides.costo_hora_tecnico) || 0)
  const precioClienteNeto = (it) => {
    if (isMO(it)) return Number(it.precio_unitario || 0)
    const pu = Number(it.precio_unitario || 0)
    const cb = Number(it.costo_unitario || 0)
    if (pu > 0) return Math.round(pu / 1.19)
    if (cb > 0) return Math.round((cb / 1.19) / (1 - margenPct / 100))
    return 0
  }
  const costoNetoSecco = (it) => {
    if (isMO(it)) return 0
    const cb = Number(it.costo_unitario || 0)
    return cb > 0 ? Math.round(cb / 1.19) : 0
  }
  const costoTotalBruto = rows.reduce((s, it) => !isMO(it) ? s + Number(it.cantidad || 1) * (Number(it.costo_unitario) || 0) : s, 0)
  const costoRepuestosNetos = rows.reduce((s, it) => s + Number(it.cantidad || 1) * costoNetoSecco(it), 0)
  const ventaRepuestosNetosBruta = rows.filter((it) => !isMO(it)).reduce((s, it) => s + Number(it.cantidad || 1) * precioClienteNeto(it), 0)
  const ventaMoBruta = rows.filter((it) => isMO(it)).reduce((s, it) => s + Number(it.cantidad || 1) * precioClienteNeto(it), 0)
  const netoAntesDescuento = ventaRepuestosNetosBruta + ventaMoBruta
  const netoFinal = Math.max(0, netoAntesDescuento)
  const ventaRepuestosNetos = Math.round(ventaRepuestosNetosBruta)
  const ventaMo = Math.round(ventaMoBruta)
  const costoMoReal = Math.round(horasTrabajo * costoHoraTecnico)
  const costoTotalReal = Math.round(costoRepuestosNetos + costoMoReal)
  const utilidadRepuestos = Math.round(ventaRepuestosNetos - costoRepuestosNetos)
  const utilidadMo = Math.round(ventaMo - costoMoReal)
  const utilidadAntesDescuento = Math.round(utilidadRepuestos + utilidadMo)
  const ivaDebito = Math.round(netoFinal * 0.19)
  const ivaCredito = Math.round(costoRepuestosNetos * 0.19)
  const diferenciaIvaSii = ivaDebito - ivaCredito
  const subtotalCliente = Math.round(netoFinal + ivaDebito)
  const totalFinalSinDescuento = Math.round(subtotalCliente / 0.98)
  const cargoPorServicio = Math.round(totalFinalSinDescuento - subtotalCliente)
  const descuentoCalculado = overrides.descuento_tipo === 'porcentaje'
    ? totalFinalSinDescuento * (Number(descuento || 0) / 100)
    : Number(descuento || 0)
  const descuentoMonto = Math.min(totalFinalSinDescuento, Math.max(0, descuentoCalculado))
  const totalFinalCliente = Math.max(0, Math.round(totalFinalSinDescuento - descuentoMonto))
  const moConIva = Math.round(ventaMo * 1.19)
  const utilidadTotal = Math.round(utilidadAntesDescuento - descuentoMonto)
  const margen = netoFinal > 0 ? (utilidadTotal / netoFinal) * 100 : 0
  return {
    horas_trabajo: horasTrabajo, costo_hora_tecnico: Math.round(costoHoraTecnico),
    costo_total: Math.round(costoTotalBruto), costo_total_neto: Math.round(costoRepuestosNetos),
    costo_repuestos_netos: Math.round(costoRepuestosNetos), costo_mo_real: costoMoReal,
    costo_total_real: costoTotalReal, neto_repuestos: Math.round(ventaRepuestosNetos),
    venta_repuestos_netos: Math.round(ventaRepuestosNetos), neto_mo: Math.round(ventaMo),
    venta_mo: Math.round(ventaMo), mo_con_iva: moConIva, mano_obra_total: Math.round(ventaMo),
    neto_antes_descuento: Math.round(netoAntesDescuento), neto_final: Math.round(netoFinal),
    descuento: Math.round(descuentoMonto), descuento_valor: Number(descuento || 0),
    descuento_tipo: overrides.descuento_tipo || 'monto', subtotal: Math.round(netoFinal),
    iva: Math.round(ivaDebito), iva_credito: ivaCredito, iva_debito: ivaDebito,
    dif_iva: diferenciaIvaSii, diferencia_iva_sii: diferenciaIvaSii,
    subtotal_cliente: subtotalCliente, cargo_por_servicio: cargoPorServicio,
    total_final_sin_descuento: totalFinalSinDescuento, total_final_cliente: totalFinalCliente,
    total: subtotalCliente, utilidad_repuestos: utilidadRepuestos, utilidad_mo: utilidadMo,
    utilidad_antes_descuento: utilidadAntesDescuento, descuento_utilidad: Math.round(descuentoMonto),
    utilidad: utilidadTotal, utilidad_total: utilidadTotal,
    margen: Number(margen.toFixed(2)), margen_pct: Number(margen.toFixed(2)),
  }
}


const PRESUPUESTO_TOTALE_STORAGE_KEY = 'secco_presupuesto_alto_panel_totales'
const PRESUPUESTO_TOTALE_DEFAULT = 360
const PRESUPUESTO_TOTALE_MIN = 168

function money(v) {
  return `$${Math.round(Number(v) || 0).toLocaleString('es-CL')}`
}

function totalClienteCobro(totalFinal) {
  return Math.round((Number(totalFinal) || 0) / 0.98)
}

function statusText(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const STATUS_COTIZACION = Object.freeze(['borrador', 'lista', 'enviada', 'aprobada', 'rechazada', 'sin_asignar'])

function sanitizeCotizacionStatus(raw) {
  const s = String(raw ?? '').toLowerCase().trim()
  return STATUS_COTIZACION.includes(s) ? s : 'borrador'
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildResumenInternoSnapshot(totales) {
  return {
    horas_trabajo: totales.horas_trabajo,
    costo_hora_tecnico: totales.costo_hora_tecnico,
    costo_mo_real: totales.costo_mo_real,
    venta_mo: totales.venta_mo,
    utilidad_mo: totales.utilidad_mo,
    costo_repuestos_netos: totales.costo_repuestos_netos,
    venta_repuestos_netos: totales.venta_repuestos_netos,
    utilidad_repuestos: totales.utilidad_repuestos,
    utilidad_antes_descuento: totales.utilidad_antes_descuento,
    descuento_utilidad: totales.descuento_utilidad,
    costo_total_real: totales.costo_total_real,
    neto_final: totales.neto_final,
    iva_debito: totales.iva_debito,
    iva_credito: totales.iva_credito,
    diferencia_iva_sii: totales.diferencia_iva_sii,
    subtotal_cliente: totales.subtotal_cliente,
    cargo_por_servicio: totales.cargo_por_servicio,
    total_final_sin_descuento: totales.total_final_sin_descuento,
    total_final_cliente: totales.total_final_cliente,
    margen_pct: totales.margen_pct,
  }
}

function moDescripcionFromApiItem(it) {
  if (!it) return ''
  return String(it.descripcion || '').trim()
}

function separateItems(raw = [], margenInicial = 30) {
  const moItems = raw.filter((it) => sanitizeTipoItem(it.tipo) === 'mano_obra')
  const rest    = raw.filter((it) => sanitizeTipoItem(it.tipo) !== 'mano_obra')

  const rows = rest.map((it, i) => {
    const cb = Number(it.costo_unitario)  || 0 
    const pu = Number(it.precio_unitario) || 0 
    return {
      _id: `${i}-${Math.random().toString(36).slice(2, 7)}`,
      tipo: sanitizeTipoLinea(it.tipo),
      descripcion: it.descripcion || '',
      cantidad: Number(it.cantidad) || 1,
      costo_unitario:  cb > 0 ? cb : '',

      precio_unitario: pu > 0 ? pu : cb > 0 ? precioFinalConMargen(cb, margenInicial) : '',
    }
  })

  if (!rows.length) rows.push(emptyRow())

  const manoObraRows = moItems.length
    ? moItems.map((it, idx) => ({
      _id: `mo-${idx}-${Math.random().toString(36).slice(2, 9)}`,
      descripcion: moDescripcionFromApiItem(it),
      precio: (Number(it.precio_unitario) || Number(it.mano_obra) || '') === 0 ? '' : (Number(it.precio_unitario) || Number(it.mano_obra) || ''),
    }))
    : [emptyMoRow()]

  return {
    rows,
    manoObraRows,
  }
}

function emptyMoRow() {
  return {
    _id: `mo-${Math.random().toString(36).slice(2, 9)}`,
    descripcion: '',
    precio: '',
  }
}

function emptyRow() {
  return {
    _id: Math.random().toString(36).slice(2, 9),
    tipo: 'repuesto',
    descripcion: '',
    cantidad: 1,
    costo_unitario: '',
    precio_unitario: '',
  }
}

function rowTotal(row) {
  return Math.round(Number(row.cantidad || 1) * Number(row.precio_unitario || 0))
}

function itemsForDB(rows, manoObraRows, horasTrabajoNum = 0, valorHoraClienteMo = 0) {
  const ht = Math.max(0, Number(horasTrabajoNum) || 0)
  const vh = Number(valorHoraClienteMo) || 0
  const horasMode = ht > 0 && vh > 0
  const ventaTotalHoras = horasMode ? Math.round(ht * vh) : 0

  const base = rows.map((row) => ({
    tipo: sanitizeTipoLinea(row.tipo),
    descripcion: row.descripcion || '',
    cantidad: Number(row.cantidad) || 1,
    costo_unitario: Number(row.costo_unitario) || 0,
    precio_unitario: Number(row.precio_unitario) || 0,
    mano_obra: 0,
    urgencia: 'recomendado',
    observacion: '',
  }))

  const list = Array.isArray(manoObraRows) ? manoObraRows : []
  let moApiItems = []
  if (horasMode && ventaTotalHoras > 0) {
    const m0 = list[0] || { descripcion: '' }
    const moDesc = String(m0.descripcion || '').trim() || 'Mano de obra'
    moApiItems = [{
      tipo: 'mano_obra',
      descripcion: moDesc,
      cantidad: 1,
      costo_unitario: 0,
      precio_unitario: ventaTotalHoras,
      mano_obra: ventaTotalHoras,
      urgencia: 'necesario',
      observacion: '',
    }]
  } else {
    moApiItems = list
      .filter((m) => Number(m.precio) > 0 || String(m.descripcion || '').trim())
      .map((m) => {
        const p = Number(m.precio) || 0
        const d = String(m.descripcion || '').trim() || 'Mano de obra'
        return {
          tipo: 'mano_obra',
          descripcion: d,
          cantidad: 1,
          costo_unitario: 0,
          precio_unitario: p,
          mano_obra: p,
          urgencia: 'necesario',
          observacion: '',
        }
      })
  }
  return [...base, ...moApiItems]
}

const ITEM_API_PLACEHOLDER = {
  tipo: 'servicio',
  descripcion: 'Descripción pendiente',
  cantidad: 1,
  costo_unitario: 0,
  precio_unitario: 0,
  mano_obra: 0,
  urgencia: 'recomendado',
  observacion: '',
}

const EMPTY_CLIENTE_MANUAL = { nombre: '', telefono: '', email: '' }
const EMPTY_VEHICULO_MANUAL = { marca: '', modelo: '', patente: '', anio: '', vin: '', km: '' }

function mergeClienteManual(cot) {
  return { ...EMPTY_CLIENTE_MANUAL, ...(cot?.vista_cliente?.cliente_manual || {}) }
}

function mergeVehiculoManual(cot) {
  return { ...EMPTY_VEHICULO_MANUAL, ...(cot?.vista_cliente?.vehiculo_manual || {}) }
}

function itemsGuardados(rows, manoObraRows, horasTrabajoNum, valorHoraClienteMo) {
  const raw = itemsForDB(rows, manoObraRows, horasTrabajoNum, valorHoraClienteMo).filter((it) => String(it.descripcion || '').trim())
  return raw.length ? raw : [ITEM_API_PLACEHOLDER]
}

export function nuevaCotizacionPlantilla() {
  return {
    id: null,
    numero_cotizacion: null,
    status: 'borrador',
    items: [],
    notas: '',
    notas_internas: '',
    descuento: 0,
    vista_cliente: {
      titulo: '',
      tipo_presupuesto: 'final',
      descuento_tipo: 'monto',
      descuento_valor: 0,
      horas_trabajo: 0,
      costo_hora_tecnico: 4900,
      cliente_manual: { ...EMPTY_CLIENTE_MANUAL },
      vehiculo_manual: { ...EMPTY_VEHICULO_MANUAL },
    },
    diagnosticos: null,
    actas: null,
    clientes: null,
    vehiculos: null,
  }
}

function buildPool(cotizacion) {
  const pool = new Set()
  ;(cotizacion.items || []).forEach((it) => it.descripcion && pool.add(it.descripcion))
  const diag = cotizacion.diagnosticos
  if (diag) {
    ;(diag.diagnostico_checklist || [])
      .filter((c) => ['requiere_atencion', 'urgente'].includes(c.estado))
      .forEach((c) => c.item && pool.add(c.item))
    ;(diag.diagnostico_repuestos || []).forEach((r) => r.nombre && pool.add(r.nombre))
  }
  return Array.from(pool)
}

// ─── DiagnosticoPanel ─────────────────────────────────────────
function DiagnosticoPanel({ cotizacion }) {
  const diag = cotizacion.diagnosticos
  const acta = cotizacion.actas || diag?.actas || {}
  const veh  = cotizacion.vehiculos || acta.vehiculos || cotizacion.vista_cliente?.vehiculo_manual || {}
  const cli  = cotizacion.clientes  || acta.clientes  || cotizacion.vista_cliente?.cliente_manual || {}

  if (!diag) {
    return (
      <div style={{ padding: 32, color: 'var(--muted-foreground)', fontSize: 13, textAlign: 'center' }}>
        <p style={{ fontSize: 28, margin: '0 0 8px' }}>📋</p>
        Sin diagnóstico vinculado.
      </div>
    )
  }

  const urgentes = (diag.diagnostico_checklist || []).filter((c) => c.estado === 'urgente')
  const atencion = (diag.diagnostico_checklist || []).filter((c) => c.estado === 'requiere_atencion')
  const repuestos = diag.diagnostico_repuestos || []

  const bullets = [
    veh.marca   && { label: 'Vehículo',    value: `${veh.marca} ${veh.modelo || ''} ${veh.anio || ''}`.trim() },
    veh.patente && { label: 'Patente',     value: veh.patente, mono: true },
    acta.km     && { label: 'Kilometraje', value: `${Number(acta.km).toLocaleString('es-CL')} km` },
    cli.nombre  && { label: 'Cliente',     value: cli.nombre },
    cli.telefono && { label: 'Teléfono',   value: cli.telefono },
    cli.email   && { label: 'Email',       value: cli.email },
  ].filter(Boolean)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 22px' }}>
      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <span style={{ background: 'var(--secco-gold)', color: '#FFF', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6 }}>
          DG-{diag.numero_diagnostico}
        </span>
        {diag.tipo_mantencion && (
          <span style={{ background: 'var(--card)', color: 'var(--foreground)', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {diag.tipo_mantencion}
          </span>
        )}
      </div>

      {/* Bullets con datos del vehículo */}
      <div style={{ marginBottom: 16 }}>
        {bullets.map(({ label, value, mono }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: 'var(--placeholder)', flexShrink: 0 }}>•</span>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0, minWidth: 68 }}>{label}</span>
            <span style={{ fontSize: 12, color: 'var(--foreground)', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '1px' : 'normal' }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 0 16px' }} />

      {acta.trabajo_solicitado && (
        <DiagSection label="Trabajo solicitado" color="#6B6B6B">
          <p style={{ margin: 0, fontSize: 12, color: 'var(--foreground)', lineHeight: 1.6 }}>{acta.trabajo_solicitado}</p>
        </DiagSection>
      )}
      {urgentes.length > 0 && (
        <DiagSection label={`Urgente (${urgentes.length})`} color="#FF453A">
          {urgentes.map((c, i) => <ChecklistItem key={i} item={c} icon="▲" iconColor="#FF453A" />)}
        </DiagSection>
      )}
      {atencion.length > 0 && (
        <DiagSection label={`Requiere atención (${atencion.length})`} color="#a98225">
          {atencion.map((c, i) => <ChecklistItem key={i} item={c} icon="●" iconColor="#a98225" />)}
        </DiagSection>
      )}
      {repuestos.length > 0 && (
        <DiagSection label="Repuestos detectados" color="#6B6B6B">
          {repuestos.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ color: 'var(--placeholder)', fontSize: 11, flexShrink: 0 }}>→</span>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--foreground)', flex: 1 }}>
                {r.nombre}{r.cantidad > 1 ? ` ×${r.cantidad}` : ''}
              </p>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: r.urgencia === 'necesario' ? 'var(--destructive)' : 'var(--secco-gold)' }}>
                {r.urgencia}
              </span>
            </div>
          ))}
        </DiagSection>
      )}
      {(diag.observaciones_grls || diag.observaciones_generales) && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
          <p style={sLabel}>Observaciones</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--foreground)', lineHeight: 1.6 }}>
            {diag.observaciones_grls || diag.observaciones_generales}
          </p>
        </div>
      )}
    </div>
  )
}

function DiagSection({ label, color, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ ...sLabel, color }}>{label}</p>
      {children}
    </div>
  )
}

function ChecklistItem({ item, icon, iconColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
      <span style={{ color: iconColor, fontSize: 11, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--foreground)', fontWeight: 500 }}>{item.item}</p>
        {item.observacion && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted-foreground)' }}>{item.observacion}</p>}
      </div>
    </div>
  )
}

const sLabel = {
  margin: '0 0 6px', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted-foreground)',
}

function SpreadsheetRow({ row, index, isActive, onFocus, onChange, onDelete, onEnter, autocompletePool }) {
  const total = rowTotal(row)
  const tipoSelectValue = TIPOS_LINEA.includes(row.tipo) ? row.tipo : 'repuesto'
  function upd(field, val) { onChange(row._id, field, val) }

  return (
    <tr
      style={{ background: isActive ? '#FFFDF5' : 'var(--background)', transition: 'background 80ms' }}
    >
      {/* # */}
      <td style={td({ width: 28, textAlign: 'center', color: 'var(--placeholder)', fontSize: 11, userSelect: 'none' })}>
        {index + 1}
      </td>

      {/* Concepto = tipo de ítem (API) */}
      <td style={td({ width: 110 })}>
        <div style={{ position: 'relative' }}>
          <select
            value={tipoSelectValue}
            onChange={(e) => upd('tipo', e.target.value)}
            onFocus={() => onFocus(row._id)}
            style={{
              width: '100%', border: 'none', background: 'transparent', outline: 'none',
              fontSize: 11, fontWeight: 700, color: TIPO_COLOR[tipoSelectValue] || 'var(--muted-foreground)',
              fontFamily: 'inherit', padding: '8px 18px 8px 8px', cursor: 'pointer',
              appearance: 'none', WebkitAppearance: 'none',
              textTransform: 'uppercase', letterSpacing: '0.4px',
            }}
          >
            {TIPOS_LINEA.map((t) => (
              <option key={t} value={t}>{TIPO_ITEM_LABELS[t]}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 8, color: 'var(--placeholder)', pointerEvents: 'none' }}>▾</span>
        </div>
      </td>

      {/* Descripción */}
      <td style={td({})}>
        <input
          type="text"
          data-presup-desc={row._id}
          value={row.descripcion}
          onChange={(e) => upd('descripcion', e.target.value)}
          onFocus={() => onFocus(row._id)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(row._id) } }}
          placeholder="Descripción del ítem..."
          list={`ac-${row._id}`}
          style={cellInput()}
        />
        <datalist id={`ac-${row._id}`}>
          {autocompletePool.map((s) => <option key={s} value={s} />)}
        </datalist>
      </td>

      {/* Cantidad */}
      <td style={td({ width: 52 })}>
        <input
          type="number" min="0" step="1"
          value={row.cantidad}
          onChange={(e) => upd('cantidad', e.target.value)}
          onFocus={(e) => { onFocus(row._id); e.target.select() }}
          style={cellInput({ textAlign: 'right' })}
        />
      </td>

      {/* Costo SECCO — editable, formateado CLP */}
      <td style={td({ width: 100 })}>
        <CurrencyInput
          value={row.costo_unitario}
          onChange={(val) => upd('costo_unitario', val)}
          onRowFocus={() => onFocus(row._id)}
        />
      </td>


      <td style={td({ width: 100, textAlign: 'right', paddingRight: 8 })}>
        <span style={{
          fontSize: 13, fontWeight: 600, paddingRight: 4,
          color: Number(row.precio_unitario) > 0 ? 'var(--secco-gold)' : 'var(--inactive)',
        }}>
          {Number(row.precio_unitario) > 0 ? money(row.precio_unitario) : '—'}
        </span>
      </td>

      {/* Total fila */}
      <td style={td({ width: 100, textAlign: 'right', paddingRight: 10 })}>
        <span style={{ fontSize: 13, fontWeight: 600, color: total > 0 ? 'var(--foreground)' : 'var(--inactive)' }}>
          {total > 0 ? money(total) : '—'}
        </span>
      </td>

      {/* Eliminar */}
      <td style={td({ width: 28, textAlign: 'center' })}>
        <button
          type="button" tabIndex={-1}
          onClick={() => onDelete(row._id)}
          style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', fontSize: 15, color: 'var(--inactive)', borderRadius: 4, lineHeight: 1 }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--destructive)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--inactive)'}
        >×</button>
      </td>
    </tr>
  )
}

function td(extra = {}) {
  return { padding: '2px 0', borderBottom: '1px solid #F2F2F2', verticalAlign: 'middle', ...extra }
}
function cellInput(extra = {}) {
  return { width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--foreground)', fontFamily: 'inherit', padding: '8px 8px', ...extra }
}

function CurrencyInput({ value, onChange, onRowFocus, placeholder = '$0', style = {} }) {
  const [focused, setFocused] = useState(false)
  const num = Number(value) || 0

  const displayValue = focused
    ? (value === '' ? '' : String(value))
    : (num > 0 ? `$${num.toLocaleString('es-CL')}` : '')

  function handleChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    onChange(raw === '' ? '' : raw)
  }

  function handleFocus(e) {
    setFocused(true)
    if (onRowFocus) onRowFocus()
    setTimeout(() => e.target.select(), 0)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      style={{ ...cellInput({ textAlign: 'right' }), ...style }}
    />
  )
}

// ─── PresupuestoForm ──────────────────────────────────────────
export default function PresupuestoForm({ cotizacionInicial, onVolver, onAbrirOT, onPersistido }) {
  const isMobile = useMobile()
  const [cotizacion, setCotizacion] = useState(cotizacionInicial)
  const cotizacionIdRef = useRef(cotizacionInicial?.id || null)
  const cotizacionSnapRef = useRef(cotizacionInicial)

  // Separar ítems normales de la fila de M.O.
  const margenInicial = cotizacionInicial.vista_cliente?.margen_pct ?? 30
  const init = useMemo(() => separateItems(cotizacionInicial.items, margenInicial), [])

  const [rows, setRows]           = useState(() => init.rows.map((r) => ({ ...r, tipo: sanitizeTipoLinea(r.tipo) })))
  const [manoObraRows, setManoObraRows] = useState(init.manoObraRows)
  const [margen, setMargen]       = useState(cotizacionInicial.vista_cliente?.margen_pct ?? 30)
  const [descuento, setDescuento] = useState(cotizacionInicial.vista_cliente?.descuento_valor ?? cotizacionInicial.descuento ?? 0)
  const [descuentoTipo, setDescuentoTipo] = useState(cotizacionInicial.vista_cliente?.descuento_tipo || 'monto')
  const [notas, setNotas]         = useState(cotizacionInicial.notas || '')
  const [notasInternas, setNotasInternas] = useState(cotizacionInicial.notas_internas || '')
  const [titulo, setTitulo]       = useState(cotizacionInicial.vista_cliente?.titulo || '')
  const [horasTrabajo, setHorasTrabajo] = useState(String(cotizacionInicial.vista_cliente?.horas_trabajo ?? cotizacionInicial.diagnosticos?.horas_estimadas ?? ''))
  const [costoHoraTecnico, setCostoHoraTecnico] = useState(String(cotizacionInicial.vista_cliente?.costo_hora_tecnico ?? 4900))
  const [valorHoraClienteMo, setValorHoraClienteMo] = useState(() => {
    const tarifaGuardada = Number(cotizacionInicial.vista_cliente?.valor_hora_cliente_mo || 0)
    if (tarifaGuardada > 0) return tarifaGuardada
    const horas = Number(cotizacionInicial.vista_cliente?.horas_trabajo ?? cotizacionInicial.diagnosticos?.horas_estimadas ?? 0)
    const ventaMoInicial = init.manoObraRows.reduce((s, m) => s + (Number(m.precio) || 0), 0)
    return horas > 0 && ventaMoInicial > 0 ? ventaMoInicial / horas : 0
  })
  const [activeRow, setActiveRow] = useState(null)
  const [saveStatus, setSaveStatus] = useState(() => (cotizacionInicial?.id ? 'saved' : 'local'))
  const [status, setStatus]       = useState(sanitizeCotizacionStatus(cotizacionInicial.status))
  const [loading, setLoading]     = useState(false)
  const [isWide, setIsWide]       = useState(window.innerWidth >= 900)
  const [showDiag, setShowDiag]   = useState(false)
  const [showRechazo, setShowRechazo] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [alturaPanelTotales, setAlturaPanelTotales] = useState(() => {
    try {
      const v = Number(sessionStorage.getItem(PRESUPUESTO_TOTALE_STORAGE_KEY))
      if (Number.isFinite(v) && v >= PRESUPUESTO_TOTALE_MIN) return v
    } catch { /* ignore */ }
    return PRESUPUESTO_TOTALE_DEFAULT
  })
  const resizeTotalesDrag = useRef({ active: false, startY: 0, startH: 0 })
  const saveTimer = useRef(null)

  const [clienteManual, setClienteManual] = useState(() => mergeClienteManual(cotizacionInicial))
  const [vehiculoManual, setVehiculoManual] = useState(() => mergeVehiculoManual(cotizacionInicial))
  const clienteManualRef = useRef(clienteManual)
  const vehiculoManualRef = useRef(vehiculoManual)
  useEffect(() => { clienteManualRef.current = clienteManual }, [clienteManual])
  useEffect(() => { vehiculoManualRef.current = vehiculoManual }, [vehiculoManual])

  useEffect(() => {
    const nextCliente = mergeClienteManual(cotizacion)
    const nextVeh = mergeVehiculoManual(cotizacion)
    setClienteManual(nextCliente)
    setVehiculoManual(nextVeh)
    clienteManualRef.current = nextCliente
    vehiculoManualRef.current = nextVeh
  }, [cotizacion.id, cotizacion.acta_id])

  useEffect(() => {
    cotizacionIdRef.current = cotizacion?.id || null
    cotizacionSnapRef.current = cotizacion
  }, [cotizacion])

  const autocompletePool = useMemo(() => buildPool(cotizacion), [cotizacion])
  const veh = cotizacion.vehiculos || cotizacion.actas?.vehiculos || {}
  const cli = cotizacion.clientes || cotizacion.actas?.clientes || {
    ...EMPTY_CLIENTE_MANUAL,
    ...(cotizacion.vista_cliente?.cliente_manual || {}),
    ...clienteManual,
  }
  const cotizacionParaPanel = useMemo(() => ({
    ...cotizacion,
    vista_cliente: {
      ...(cotizacion.vista_cliente || {}),
      cliente_manual: { ...EMPTY_CLIENTE_MANUAL, ...(cotizacion.vista_cliente?.cliente_manual || {}), ...clienteManual },
      vehiculo_manual: { ...EMPTY_VEHICULO_MANUAL, ...(cotizacion.vista_cliente?.vehiculo_manual || {}), ...vehiculoManual },
    },
  }), [cotizacion, clienteManual, vehiculoManual])
  const horasTrabajoNum = useMemo(() => Math.max(0, toNumber(horasTrabajo)), [horasTrabajo])
  const ventaMoCalculada = useMemo(() => {
    if (horasTrabajoNum > 0 && Number(valorHoraClienteMo) > 0) {
      return Math.round(horasTrabajoNum * Number(valorHoraClienteMo))
    }
    return Math.round(manoObraRows.reduce((s, m) => s + (Number(m.precio) || 0), 0))
  }, [horasTrabajoNum, valorHoraClienteMo, manoObraRows])

  const horasModeMo = horasTrabajoNum > 0 && Number(valorHoraClienteMo) > 0

  useEffect(() => {
    const h = () => setIsWide(window.innerWidth >= 900)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── Totales ────────────────────────────────────────────────
  const totales = useMemo(() => {
    return calcularTotalesCotizacion(
      itemsForDB(rows, manoObraRows, horasTrabajoNum, Number(valorHoraClienteMo) || 0),
      descuento,
      {
        descuento_tipo: descuentoTipo,
        margen_pct: margen,
        horas_trabajo: horasTrabajo,
        costo_hora_tecnico: costoHoraTecnico,
      },
    )
  }, [rows, manoObraRows, descuento, descuentoTipo, margen, horasTrabajo, costoHoraTecnico, valorHoraClienteMo, horasTrabajoNum])
  const totalCobroCliente = useMemo(() => totales.total_final_cliente ?? totalClienteCobro(totales.total), [totales.total, totales.total_final_cliente])

  function buildVistaClientePayload(totalesActuales = totales) {
    const vc = cotizacion.vista_cliente || {}
    return {
      titulo,
      tipo_presupuesto: vc.tipo_presupuesto || cotizacion.tipo_presupuesto || 'final',
      descuento_tipo: descuentoTipo,
      descuento_valor: toNumber(descuento),
      margen_pct: margen,
      horas_trabajo: toNumber(horasTrabajo),
      costo_hora_tecnico: toNumber(costoHoraTecnico),
      valor_hora_cliente_mo: Number(valorHoraClienteMo || 0),
      resumen_interno: buildResumenInternoSnapshot(totalesActuales),
      cliente_manual: { ...EMPTY_CLIENTE_MANUAL, ...clienteManualRef.current },
      vehiculo_manual: { ...EMPTY_VEHICULO_MANUAL, ...vehiculoManualRef.current },
    }
  }

  /**
   * Primera persistencia: crea fila mínima en servidor y aplica el contenido actual.
   * @returns {{ id: string, created: boolean, full?: object }}
   */
  async function ensurePersistida() {
    const existing = cotizacionIdRef.current || cotizacion?.id
    if (existing) return { id: existing, created: false, full: null }
    setSaveStatus('saving')
    try {
      const base = await cotizacionService.crearBorrador()
      const id = base?.id
      if (!id) throw new Error('No se obtuvo id al crear el borrador')
      const items = itemsGuardados(rows, manoObraRows, horasTrabajoNum, Number(valorHoraClienteMo) || 0)
      await cotizacionService.actualizar(id, {
        items,
        descuento: toNumber(descuento),
        notas,
        notas_internas: notasInternas,
        vista_cliente: buildVistaClientePayload(),
        status: 'borrador',
      })
      const full = await cotizacionService.obtener(id)
      setCotizacion(full)
      cotizacionIdRef.current = full.id
      setStatus(sanitizeCotizacionStatus(full?.status))
      setSaveStatus('saved')
      return { id: full.id, created: true, full }
    } catch (e) {
      setSaveStatus('error')
      throw e
    }
  }

  // ── Autosave ───────────────────────────────────────────────
  const scheduleAutosave = useCallback((r, mo, nd, ndt, nn, nni, nt, mg, ht, cht, vhcm) => {
    if (!cotizacionIdRef.current) {
      clearTimeout(saveTimer.current)
      setSaveStatus('local')
      return
    }
    setSaveStatus('unsaved')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const id = cotizacionIdRef.current
      if (!id) {
        setSaveStatus('local')
        return
      }
      setSaveStatus('saving')
      try {
        const htNum = Math.max(0, toNumber(ht))
        const vhNum = Number((vhcm ?? valorHoraClienteMo) || 0)
        const totalesActuales = calcularTotalesCotizacion(itemsForDB(r, mo, htNum, vhNum), nd, {
          descuento_tipo: ndt,
          margen_pct: mg,
          horas_trabajo: ht,
          costo_hora_tecnico: cht,
        })
        const snap = cotizacionSnapRef.current || {}
        const vcBase = snap.vista_cliente || {}
        await cotizacionService.actualizar(id, {
          items: itemsGuardados(r, mo, htNum, vhNum),
          descuento: toNumber(nd),
          notas: nn, notas_internas: nni,
          vista_cliente: {
            titulo: nt,
            descuento_tipo: ndt,
            descuento_valor: toNumber(nd),
            margen_pct: mg,
            horas_trabajo: toNumber(ht),
            costo_hora_tecnico: toNumber(cht),
            valor_hora_cliente_mo: vhNum,
            resumen_interno: buildResumenInternoSnapshot(totalesActuales),
            tipo_presupuesto: vcBase.tipo_presupuesto || snap.tipo_presupuesto || 'final',
            cliente_manual: { ...EMPTY_CLIENTE_MANUAL, ...clienteManualRef.current },
            vehiculo_manual: { ...EMPTY_VEHICULO_MANUAL, ...vehiculoManualRef.current },
          },
        })
        setSaveStatus('saved')
      } catch { setSaveStatus('error') }
    }, 1400)
  }, [valorHoraClienteMo])

  function touch(r, mo, nd, ndt, nn, nni, nt, mg, ht, cht, vhcm) {
    scheduleAutosave(
      r   ?? rows,
      mo  ?? manoObraRows,
      nd  ?? descuento,
      ndt ?? descuentoTipo,
      nn  ?? notas,
      nni ?? notasInternas,
      nt  ?? titulo,
      mg  ?? margen,
      ht  ?? horasTrabajo,
      cht ?? costoHoraTecnico,
      vhcm ?? valorHoraClienteMo
    )
  }

  function patchClienteManual(patch) {
    setClienteManual((prev) => {
      const next = { ...prev, ...patch }
      clienteManualRef.current = next
      return next
    })
    touch()
  }

  function patchVehiculoManual(patch) {
    setVehiculoManual((prev) => {
      const next = { ...prev, ...patch }
      vehiculoManualRef.current = next
      return next
    })
    touch()
  }

  // ── Filas ─────────────────────────────────────────────────
  function updateRow(id, field, value) {
    const next = rows.map((r) => {
      if (r._id !== id) return r
      const updated = { ...r, [field]: field === 'tipo' ? sanitizeTipoLinea(value) : value }
      if (field === 'costo_unitario') {
        const cb = Number(value) || 0
        // Recalcular precio final (con IVA) usando margen real sobre precio de venta
        updated.precio_unitario = cb > 0 ? precioFinalConMargen(cb, margen) : ''
      }
      return updated
    })
    setRows(next)
    touch(next, null, null, null, null, null, null, null)
  }

  function deleteRow(id) {
    const next = rows.length > 1 ? rows.filter((r) => r._id !== id) : [emptyRow()]
    setRows(next)
    touch(next, null, null, null, null, null, null, null)
  }

  function addRow() {
    const r = emptyRow()
    const next = [...rows, r]
    setRows(next)
    setActiveRow(r._id)
    touch(next, null, null, null, null, null, null, null)
    return r._id
  }

  function focusDescripcionRow(rowId) {
    const id = String(rowId)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`input[data-presup-desc="${id}"]`)
        if (el && typeof el.focus === 'function') {
          el.focus()
          const v = String(el.value || '')
          if (!v.trim() && typeof el.select === 'function') el.select()
          else if (typeof el.setSelectionRange === 'function') el.setSelectionRange(v.length, v.length)
        }
      })
    })
  }

  function handleEnter(rowId) {
    const idx = rows.findIndex((r) => r._id === rowId)
    if (idx < 0) return
    if (idx === rows.length - 1) {
      const newId = addRow()
      focusDescripcionRow(newId)
    } else {
      const nextId = rows[idx + 1]._id
      setActiveRow(nextId)
      focusDescripcionRow(nextId)
    }
  }

  function updateManoObraRow(id, field, value) {
    setManoObraRows((prev) => {
      const next = prev.map((m) => {
        if (m._id !== id) return m
        return { ...m, [field]: value }
      })
      touch(null, next, null, null, null, null, null, null)
      return next
    })
  }

  function addManoObraRow() {
    setManoObraRows((prev) => {
      const next = [...prev, emptyMoRow()]
      touch(null, next, null, null, null, null, null, null)
      return next
    })
  }

  function deleteManoObraRow(id) {
    setManoObraRows((prev) => {
      const next = prev.length > 1 ? prev.filter((m) => m._id !== id) : [emptyMoRow()]
      touch(null, next, null, null, null, null, null, null)
      return next
    })
  }

  function handleMargenChange(val) {
    const mg = val === '' ? '' : Math.min(Number(val), 999)
    setMargen(mg)
    // Recalcular precio final de todas las filas con el nuevo margen
    const next = rows.map((r) => {
      const cb = Number(r.costo_unitario) || 0
      return cb > 0 ? { ...r, precio_unitario: precioFinalConMargen(cb, mg) } : r
    })
    setRows(next)
    touch(next, null, null, null, null, null, null, mg)
  }

  // ── Acciones ──────────────────────────────────────────────
  async function handleAction(newStatus) {
    setLoading(true)
    try {
      clearTimeout(saveTimer.current)
      const persisted = await ensurePersistida()
      await cotizacionService.actualizar(persisted.id, {
        items: itemsGuardados(rows, manoObraRows, horasTrabajoNum, Number(valorHoraClienteMo) || 0),
        descuento: toNumber(descuento),
        notas, notas_internas: notasInternas,
        vista_cliente: buildVistaClientePayload(),
        status: newStatus,
      })
      if (persisted.created && persisted.full && onPersistido) onPersistido(persisted.full)
      if (newStatus !== status) setStatus(sanitizeCotizacionStatus(newStatus))
      setSaveStatus('saved')
    } catch (e) { alert(`Error: ${e.message}`) }
    finally { setLoading(false) }
  }

  async function handleAprobar() {
    setLoading(true)
    try {
      clearTimeout(saveTimer.current)
      const persisted = await ensurePersistida()
      await cotizacionService.actualizar(persisted.id, {
        items: itemsGuardados(rows, manoObraRows, horasTrabajoNum, Number(valorHoraClienteMo) || 0),
        descuento: toNumber(descuento),
        notas, notas_internas: notasInternas,
        vista_cliente: buildVistaClientePayload(),
        status: 'enviada',
      })
      const ot = await cotizacionService.aprobar(persisted.id)
      if (persisted.created && persisted.full && onPersistido) onPersistido(persisted.full)
      setStatus('aprobada')
      if (onAbrirOT) onAbrirOT(ot)
    } catch (e) { alert(`Error al aprobar: ${e.message}`) }
    finally { setLoading(false) }
  }

  async function handleRechazar() {
    if (!motivoRechazo.trim()) { alert('Ingresa el motivo del rechazo.'); return }
    setLoading(true)
    try {
      const persisted = await ensurePersistida()
      await cotizacionService.rechazar(persisted.id, motivoRechazo)
      if (persisted.created && persisted.full && onPersistido) onPersistido(persisted.full)
      setStatus('rechazada')
      setShowRechazo(false)
    } catch (e) { alert(`Error al rechazar: ${e.message}`) }
    finally { setLoading(false) }
  }

  function cotizacionLocal() {
    return {
      ...cotizacion,
      items: itemsGuardados(rows, manoObraRows, horasTrabajoNum, Number(valorHoraClienteMo) || 0),
      descuento: totales.descuento,
      notas,
      notas_internas: notasInternas,
      vista_cliente: buildVistaClientePayload(),
      ...totales,
    }
  }

  async function handlePDF(tipo) {
    setLoading(true)
    try {
      if (tipo === 'cliente') {
        const local = cotizacionLocal()
        if (cotizacion?.id) {
          await cotizacionService.descargarPdfCliente(cotizacion.id, local)
        } else {
          await generarPDFPresupuestoCliente(local)
        }
      } else {
        await generarPDFPresupuestoInterno(cotizacionLocal())
      }
    } catch (e) { alert(`Error PDF: ${e.message}`) }
    finally { setLoading(false) }
  }

  async function handleGuardarBorradorManual() {
    setLoading(true)
    try {
      const r = await ensurePersistida()
      if (r.created && r.full && onPersistido) onPersistido(r.full)
    } catch (e) {
      alert(e?.message ? `No se pudo guardar: ${e.message}` : 'No se pudo guardar el borrador')
    } finally {
      setLoading(false)
    }
  }

  function clampAlturaTotales(h) {
    const maxH = Math.min(Math.floor(window.innerHeight * 0.72), 720)
    return Math.max(PRESUPUESTO_TOTALE_MIN, Math.min(maxH, Math.round(h)))
  }

  function startResizePanelTotales(e) {
    if (!e.isPrimary) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    const el = e.currentTarget
    resizeTotalesDrag.current = { active: true, startY: e.clientY, startH: alturaPanelTotales }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    let lastH = alturaPanelTotales
    try {
      el.setPointerCapture(e.pointerId)
    } catch { /* ignore */ }
    function onMove(ev) {
      if (!resizeTotalesDrag.current.active) return
      const dy = ev.clientY - resizeTotalesDrag.current.startY
      const h = clampAlturaTotales(resizeTotalesDrag.current.startH - dy)
      lastH = h
      setAlturaPanelTotales(h)
    }
    function onUp(ev) {
      resizeTotalesDrag.current.active = false
      try {
        el.releasePointerCapture(ev.pointerId)
      } catch { /* ignore */ }
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try {
        sessionStorage.setItem(PRESUPUESTO_TOTALE_STORAGE_KEY, String(lastH))
      } catch { /* ignore */ }
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  // ── Render ────────────────────────────────────────────────
  const sc = {
    sin_asignar: { bg: 'var(--foreground)', color: 'var(--background)' },
    asignado: { bg: 'var(--secco-gold)', color: 'var(--secco-gold)' },
    borrador: { bg: 'var(--card)', color: 'var(--muted-foreground)' },
    lista: { bg: 'var(--secco-gold-10)', color: 'var(--secco-gold)' },
    enviada: { bg: 'var(--secco-gold)', color: 'var(--background)' },
    aprobada: { bg: 'rgba(34,139,80,0.12)', color: 'var(--secco-green)' },
    rechazada: { bg: 'var(--secco-red-08)', color: 'var(--destructive)' },
  }[status] || { bg: 'var(--card)', color: 'var(--muted-foreground)' }
  const vehManualMerged = { ...EMPTY_VEHICULO_MANUAL, ...(cotizacion.vista_cliente?.vehiculo_manual || {}), ...vehiculoManual }
  const actaVinculadaNumero = cotizacion?.actas?.numero_acta ?? null
  const vehHeaderRaw = `${veh.marca || vehManualMerged.marca || ''} ${veh.modelo || vehManualMerged.modelo || ''}`.trim()
  const vehHeader = vehHeaderRaw
    || (actaVinculadaNumero ? `Acta #${actaVinculadaNumero}` : 'Presupuesto sin asignar')
  const patenteHeader = veh.patente || vehManualMerged.patente || (actaVinculadaNumero ? '—' : 'SIN ASIGNAR')
  const tieneAsignacion = Boolean(cotizacion.acta_id || cotizacion.vehiculo_id || cotizacion.actas?.id || cotizacion.vehiculos?.id)
  const esSoloLocal = !cotizacion?.id

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--background)', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10, height: 52, flexShrink: 0 }}>
        <button type="button" onClick={onVolver}
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <img src="/logo-secco.png" alt="SECCO" style={{ height: 24, objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {vehHeader} ·{' '}
            {isPatenteAbrible(patenteHeader) ? (
              <PatenteLink patente={patenteHeader} mono />
            ) : (
              <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{patenteHeader}</span>
            )}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cli.nombre || (esSoloLocal ? 'Completa datos en el presupuesto o vinculá un acta después' : '')}</p>
        </div>
        {esSoloLocal && (
          <button
            type="button"
            onClick={handleGuardarBorradorManual}
            disabled={loading}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'inherit',
              borderRadius: 8,
              border: '1px solid var(--secco-gold-30)',
              background: 'var(--secco-gold-10)',
              color: 'var(--secco-gold-dark)',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '…' : 'Guardar borrador'}
          </button>
        )}
        <span style={{ fontSize: 11, flexShrink: 0, color: saveStatus === 'saved' ? 'var(--secco-gold)' : saveStatus === 'saving' ? 'var(--placeholder)' : saveStatus === 'error' ? 'var(--destructive)' : saveStatus === 'local' ? 'var(--muted-foreground)' : 'var(--placeholder)' }}>
          {esSoloLocal
            ? (saveStatus === 'saving' ? 'Subiendo…' : saveStatus === 'error' ? '⚠ Error' : saveStatus === 'saved' ? '✓ En servidor' : 'Solo local')
            : (saveStatus === 'saved' ? '✓ Guardado' : saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'error' ? '⚠ Error' : '●')}
        </span>
        <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, flexShrink: 0, textTransform: 'capitalize' }}>
          {status === 'sin_asignar' ? 'Sin asignar' : statusText(status)}
        </span>
        {!isWide && (
          <button type="button" onClick={() => setShowDiag((v) => !v)}
            style={{ background: showDiag ? 'var(--secco-gold-10)' : 'var(--card)', border: '1px solid var(--border)', color: showDiag ? 'var(--secco-gold)' : 'var(--muted-foreground)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
            {showDiag ? 'Presupuesto' : 'Diagnóstico'}
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isWide ? 'row' : 'column' }}>

        {/* ── Panel izquierdo: Spreadsheet ─────────────────── */}
        <div style={{ flex: 1, display: isWide || !showDiag ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden', borderRight: isWide ? '1px solid var(--border)' : 'none' }}>

          {/* Título */}
          <div style={{ padding: '10px 16px 0', borderBottom: '1px solid #F2F2F2', flexShrink: 0 }}>
            <input
              type="text" value={titulo}
              onChange={(e) => { setTitulo(e.target.value); touch(null, null, null, null, null, null, e.target.value) }}
              placeholder="Título de la propuesta (opcional)"
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, color: 'var(--foreground)', fontFamily: 'inherit', padding: '7px 0', background: 'transparent' }}
            />
          </div>

          {/* Tabla */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 660 }}>
              <thead>
                <tr style={{ background: 'var(--card)', borderBottom: '1.5px solid #E0E0E0' }}>
                  <th style={th({ width: 28 })}>#</th>
                  <th style={th({ width: 110, textAlign: 'left', paddingLeft: 8 })}>Concepto</th>
                  <th style={th({ textAlign: 'left', paddingLeft: 8 })}>Descripción</th>
                  <th style={th({ width: 52, textAlign: 'right', paddingRight: 8 })}>Cant.</th>
                  <th style={th({ width: 100, textAlign: 'right', paddingRight: 8 })}>Costo SECCO</th>
                  <th style={th({ width: 100, textAlign: 'right', paddingRight: 8 })}>Precio +{margen}%</th>
                  <th style={th({ width: 100, textAlign: 'right', paddingRight: 10 })}>Total</th>
                  <th style={th({ width: 28 })}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <SpreadsheetRow
                    key={row._id}
                    row={row}
                    index={i}
                    isActive={activeRow === row._id}
                    onFocus={setActiveRow}
                    onChange={updateRow}
                    onDelete={deleteRow}
                    onEnter={handleEnter}
                    autocompletePool={autocompletePool}
                  />
                ))}
              </tbody>
            </table>

            {/* Botón agregar fila */}
            <button type="button" onClick={addRow}
              style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 0 28px', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--placeholder)', borderRadius: 6 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--secco-gold)'; e.currentTarget.style.background = 'var(--secco-gold-10)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--placeholder)'; e.currentTarget.style.background = 'none' }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Agregar ítem
            </button>

            {/* ── Mano de obra (una o más filas) ─────────────── */}
            <div style={{ margin: '8px 0 0', borderTop: '1.5px dashed #E0E0E0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 660 }}>
                <tbody>
                  {manoObraRows.map((mo, moIdx) => {
                    const precioNeta = Number(mo.precio) || 0
                    const totalFilaIva = Math.round(precioNeta * 1.19)
                    const precioFieldHoras = horasModeMo && moIdx === 0
                    const showCostoSecco = moIdx === 0 && totales.costo_mo_real > 0
                    return (
                      <tr key={mo._id} style={{ background: '#F8F6FF' }}>
                        <td style={td({ width: 28, textAlign: 'center', color: 'var(--placeholder)', fontSize: 10, fontWeight: 700 })}>
                          {`M.${moIdx + 1}`}
                        </td>
                        <td style={td({ width: 110 })}>
                          <span style={{ display: 'block', padding: '8px 8px', fontSize: 11, fontWeight: 700, color: 'var(--secco-gold)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            M. de obra
                          </span>
                        </td>
                        <td style={td({})}>
                          <input
                            type="text"
                            value={mo.descripcion ?? ''}
                            onChange={(e) => updateManoObraRow(mo._id, 'descripcion', e.target.value)}
                            onFocus={() => setActiveRow(null)}
                            placeholder="Descripción (ej. desmonte, alineación, diagnóstico…)"
                            autoComplete="off"
                            spellCheck="true"
                            aria-label={`Descripción mano de obra ${moIdx + 1}`}
                            style={cellInput({ color: 'var(--foreground)' })}
                          />
                        </td>
                        <td style={td({ width: 52, textAlign: 'center', color: 'var(--placeholder)', fontSize: 12 })}>1</td>
                        <td style={td({ width: 100 })}>
                          <span style={{ display: 'block', padding: '8px 8px', fontSize: 12, color: showCostoSecco ? 'var(--secco-gold)' : 'var(--inactive)', textAlign: 'right', fontWeight: 600 }}>
                            {showCostoSecco ? money(totales.costo_mo_real) : '—'}
                          </span>
                        </td>
                        <td style={td({ width: 100 })}>
                          {precioFieldHoras ? (
                            <CurrencyInput
                              value={ventaMoCalculada}
                              onChange={(val) => {
                                const total = Number(val) || 0
                                const nuevaTarifa = horasTrabajoNum > 0 ? total / horasTrabajoNum : 0
                                setValorHoraClienteMo(nuevaTarifa)
                                setManoObraRows((prev) => {
                                  const next = prev.map((m, i) => (i === 0 ? { ...m, precio: val } : m))
                                  touch(null, next, null, null, null, null, null, null, null, null, nuevaTarifa)
                                  return next
                                })
                              }}
                              style={{ color: 'var(--secco-gold)', fontWeight: 600, textAlign: 'right' }}
                            />
                          ) : horasModeMo && moIdx > 0 ? (
                            <span style={{ display: 'block', padding: '8px 8px', fontSize: 12, color: 'var(--placeholder)', textAlign: 'right' }}>—</span>
                          ) : (
                            <CurrencyInput
                              value={mo.precio}
                              onChange={(val) => updateManoObraRow(mo._id, 'precio', val)}
                              style={{ color: 'var(--secco-gold)', fontWeight: 600, textAlign: 'right' }}
                            />
                          )}
                        </td>
                        <td style={td({ width: 100, textAlign: 'right', paddingRight: 10 })}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: (horasModeMo && moIdx === 0 && ventaMoCalculada > 0) || (!horasModeMo && precioNeta > 0) ? 'var(--secco-gold)' : 'var(--inactive)' }}>
                            {horasModeMo && moIdx === 0 && ventaMoCalculada > 0
                              ? money(totales.mo_con_iva)
                              : !horasModeMo && precioNeta > 0
                                ? money(totalFilaIva)
                                : '—'}
                          </span>
                        </td>
                        <td style={td({ width: 28, textAlign: 'center' })}>
                          <button
                            type="button"
                            tabIndex={-1}
                            disabled={manoObraRows.length <= 1}
                            onClick={() => deleteManoObraRow(mo._id)}
                            title="Quitar línea"
                            style={{
                              background: 'none', border: 'none', padding: '2px 4px',
                              cursor: manoObraRows.length <= 1 ? 'default' : 'pointer',
                              fontSize: 15, color: manoObraRows.length <= 1 ? 'var(--inactive)' : 'var(--inactive)', borderRadius: 4, lineHeight: 1,
                            }}
                            onMouseEnter={(e) => { if (manoObraRows.length > 1) e.currentTarget.style.color = 'var(--destructive)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = manoObraRows.length <= 1 ? 'var(--inactive)' : 'var(--inactive)' }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <button
                type="button"
                disabled={horasModeMo}
                title={horasModeMo ? 'Con horas y tarifa cliente la M.O. se guarda como un solo total. Quitá horas o la tarifa para agregar más líneas.' : ''}
                onClick={addManoObraRow}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 0 28px', padding: '7px 12px',
                  background: 'none', border: 'none', cursor: horasModeMo ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', fontSize: 13, color: horasModeMo ? 'var(--inactive)' : 'var(--placeholder)', borderRadius: 6,
                }}
                onMouseEnter={(e) => { if (!horasModeMo) { e.currentTarget.style.color = 'var(--secco-gold)'; e.currentTarget.style.background = 'var(--secco-gold)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.color = horasModeMo ? 'var(--inactive)' : 'var(--placeholder)'; e.currentTarget.style.background = 'none' }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Agregar mano de obra
              </button>
            </div>
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Redimensionar panel de márgenes y totales"
            title="Arrastra para ajustar el alto del panel inferior (doble clic restaura altura por defecto)"
            onPointerDown={startResizePanelTotales}
            onDoubleClick={() => {
              setAlturaPanelTotales(PRESUPUESTO_TOTALE_DEFAULT)
              try {
                sessionStorage.setItem(PRESUPUESTO_TOTALE_STORAGE_KEY, String(PRESUPUESTO_TOTALE_DEFAULT))
              } catch { /* ignore */ }
            }}
            style={{
              flexShrink: 0,
              height: 11,
              cursor: 'row-resize',
              touchAction: 'none',
              userSelect: 'none',
              background: 'linear-gradient(180deg, #f5f5f5 0%, #ebebeb 50%, #e2e2e2 100%)',
              borderTop: '1px solid #dcdcdc',
              borderBottom: '1px solid #c8c8c8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <span style={{ width: 28, height: 3, borderRadius: 2, background: 'var(--placeholder)', display: 'block' }} aria-hidden />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.5px' }}>⋮⋮</span>
            <span style={{ width: 28, height: 3, borderRadius: 2, background: 'var(--placeholder)', display: 'block' }} aria-hidden />
          </div>

          {/* ── Totales ──────────────────────────────────────── */}
          <div
            style={{
              height: alturaPanelTotales,
              minHeight: PRESUPUESTO_TOTALE_MIN,
              flexShrink: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              borderTop: 'none',
              display: 'flex',
              flexDirection: 'column',
            }}
          >

            {/* Margen de repuestos */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #F2F2F2', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', flex: 1 }}>Margen repuestos</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number" min="0" max="999"
                  value={margen}
                  onChange={(e) => handleMargenChange(e.target.value)}
                  style={{ width: 64, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', textAlign: 'right', fontFamily: 'inherit', outline: 'none', color: 'var(--foreground)', background: 'var(--background)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>%</span>
              </div>
            </div>

            {/* Descuento */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #F2F2F2', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', flex: 1 }}>Descuento</span>
              <select
                value={descuentoTipo}
                onChange={(e) => { setDescuentoTipo(e.target.value); setDescuento(0); touch(null, null, 0, e.target.value, null, null, null) }}
                style={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', fontFamily: 'inherit', color: 'var(--foreground)', cursor: 'pointer', background: 'var(--background)' }}
              >
                <option value="monto">$</option>
                <option value="porcentaje">%</option>
              </select>
              {descuentoTipo === 'monto' ? (
                <CurrencyInput
                  value={descuento}
                  onChange={(val) => { setDescuento(val); touch(null, null, val, null, null, null, null) }}
                  style={{ width: 90, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', background: 'var(--background)' }}
                />
              ) : (
                <input
                  type="number" min="0" max="100"
                  value={descuento}
                  onChange={(e) => { setDescuento(e.target.value); touch(null, null, e.target.value, null, null, null, null) }}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  style={{ width: 90, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', textAlign: 'right', fontFamily: 'inherit', outline: 'none', color: 'var(--foreground)' }}
                />
              )}
            </div>

            {/* Mano de obra real */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #F2F2F2', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', minWidth: 120 }}>Mano de obra real</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Horas</span>
                <input
                  type="number" min="0" step="0.5"
                  value={horasTrabajo}
                  onChange={(e) => { setHorasTrabajo(e.target.value); touch(null, null, null, null, null, null, null, null, e.target.value, null) }}
                  style={{ width: 78, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', textAlign: 'right', fontFamily: 'inherit', outline: 'none', color: 'var(--foreground)', background: 'var(--background)' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Costo hora</span>
                <CurrencyInput
                  value={costoHoraTecnico}
                  onChange={(val) => { setCostoHoraTecnico(val); touch(null, null, null, null, null, null, null, null, null, val) }}
                  style={{ width: 96, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', background: 'var(--background)' }}
                />
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Costo M.O. real</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secco-gold)' }}>{money(totales.costo_mo_real)}</span>
              </div>
            </div>

            {/* Resumen numérico */}
            <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
              {[
                {
                  titulo: 'A. Costos',
                  rows: [
                    ['Costo repuestos neto', totales.costo_repuestos_netos],
                    ['IVA crédito', totales.iva_credito],
                    ['Costo mano de obra real', totales.costo_mo_real],
                    ['Costo total real', totales.costo_total_real],
                  ],
                },
                {
                  titulo: 'B. Ingresos',
                  rows: [
                    ['Venta repuestos neto', totales.venta_repuestos_netos],
                    ['Venta mano de obra neta', totales.venta_mo],
                    ['Neto antes de IVA', totales.neto_final],
                  ],
                },
                {
                  titulo: 'C. Resultado',
                  rows: [
                    ['Utilidad repuestos', totales.utilidad_repuestos],
                    ['Utilidad mano de obra', totales.utilidad_mo],
                    ['Utilidad antes descuento', totales.utilidad_antes_descuento],
                    ...(totales.descuento_utilidad > 0 ? [
                      [descuentoTipo === 'porcentaje' ? `- Descuento (${descuento}%)` : '- Descuento', -totales.descuento_utilidad, 'subtract'],
                    ] : []),
                    ['Utilidad total', totales.utilidad_total],
                    ['Margen %', `${totales.margen_pct.toFixed(1)}%`],
                  ],
                },
                {
                  titulo: 'D. Impuestos',
                  rows: [
                    ['IVA débito', totales.iva_debito],
                    ['IVA crédito', totales.iva_credito],
                    ['Diferencia IVA (SII)', totales.diferencia_iva_sii],
                  ],
                },
                {
                  titulo: 'E. Cobro final cliente',
                  full: true,
                  rows: [
                    ['Venta neta', totales.neto_final, 'base'],
                    ['+ IVA 19%', totales.iva_debito, 'add'],
                    ['= Subtotal cliente (venta neta + IVA)', totales.subtotal_cliente, 'subtotal'],
                    ['+ Cargo por servicio', totales.cargo_por_servicio, 'add'],
                    ['= Total sin descuento', totales.total_final_sin_descuento, 'subtotal'],
                    ...(totales.descuento > 0 ? [
                      [descuentoTipo === 'porcentaje' ? `- Descuento (${descuento}%)` : '- Descuento', -totales.descuento, 'subtract'],
                    ] : []),
                    ['= Total final cliente', totalCobroCliente, 'total_final'],
                  ],
                },
              ].map((section) => (
                <div key={section.titulo} style={{ gridColumn: section.full ? '1 / -1' : 'auto' }}>
                  <p style={{ ...sLabel, marginBottom: 8 }}>{section.titulo}</p>
                  {section.rows.map(([label, value, op]) => {
                    const esTexto = typeof value === 'string'
                    const esFinal = op === 'total_final'
                    const esUtilidad = label.includes('Utilidad')
                    const esNegativo = typeof value === 'number' && value < 0
                    const esSuma = op === 'add'
                    const esResta = op === 'subtract' || esNegativo
                    const colorOperacion = esResta ? 'var(--destructive)' : esSuma ? 'var(--secco-green)' : 'var(--muted-foreground)'
                    return (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: colorOperacion }}>{label}</span>
                        <span style={{
                          fontSize: esFinal ? 13 : 11,
                          fontWeight: esFinal ? 700 : 500,
                          color: esFinal ? 'var(--secco-gold)' : esResta ? 'var(--destructive)' : esSuma ? 'var(--secco-green)' : esUtilidad && Number(value) < 0 ? 'var(--destructive)' : 'var(--foreground)',
                          whiteSpace: 'nowrap',
                        }}>
                          {esTexto ? value : esNegativo ? `-${money(-value)}` : money(value)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Notas */}
            <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8 }}>
              <textarea rows={1} value={notas}
                onChange={(e) => { setNotas(e.target.value); touch(null, null, null, null, e.target.value, null, null) }}
                placeholder="Nota para el cliente..."
                style={{ flex: 1, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontFamily: 'inherit', outline: 'none', resize: 'none', color: 'var(--foreground)' }} />
              <textarea rows={1} value={notasInternas}
                onChange={(e) => { setNotasInternas(e.target.value); touch(null, null, null, null, null, e.target.value, null) }}
                placeholder="Nota interna..."
                style={{ flex: 1, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontFamily: 'inherit', outline: 'none', resize: 'none', color: 'var(--foreground)' }} />
            </div>
          </div>

          {/* ── Acciones (fijas al pie, fuera del scroll de totales) ── */}
          <div style={{
            flexShrink: 0,
            padding: '10px 16px 14px',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            background: 'var(--background)',
            borderTop: '1px solid var(--border)',
            boxShadow: '0 -2px 6px rgba(0,0,0,0.04)',
          }}>
            {status === 'sin_asignar' && (
              <div style={{ width: '100%', padding: '8px 12px', background: 'rgba(17,17,20,0.04)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 600 }}>
                  Presupuesto sin asignar: puedes editarlo, exportar PDF y enviarlo. Para aprobarlo y generar OT debe asociarse a un acta/vehículo.
                </p>
              </div>
            )}
            {status !== 'rechazada' && status !== 'aprobada' && [
              { label: 'PDF cliente',  fn: () => handlePDF('cliente'),    s: { bg: '#FFF', color: 'var(--foreground)', border: '1px solid var(--border)' } },
              { label: 'PDF interno',  fn: () => handlePDF('interno'),    s: { bg: '#FFF', color: 'var(--muted-foreground)', border: '1px solid var(--border)' } },
              { label: 'Marcar lista', fn: () => handleAction('lista'),   s: { bg: 'var(--secco-gold-10)', color: 'var(--secco-gold)', border: '1px solid var(--secco-gold-30)' } },
              { label: loading ? '…' : 'Enviar →', fn: () => handleAction('enviada'), s: { bg: 'var(--secco-gold)', color: '#FFF', border: 'none' } },
            ].map(({ label, fn, s }) => (
              <button key={label} type="button" onClick={fn} disabled={loading}
                style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, border: s.border, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}

            {/* Respuesta del cliente — visible cuando está enviada */}
            {status === 'enviada' && !tieneAsignacion && (
              <div style={{ width: '100%', padding: '8px 12px', background: 'var(--secco-gold-10)', border: '1px solid rgba(169,130,37,0.22)', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--secco-gold)', fontWeight: 600 }}>
                  Presupuesto enviado sin asignar: sigue disponible para asociarlo a un acta/vehículo. La aprobación queda habilitada después de asignarlo.
                </p>
              </div>
            )}
            {status === 'enviada' && tieneAsignacion && (
              <>
                <div style={{ width: '100%', height: 1, background: 'var(--card)', margin: '4px 0' }} />
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)', alignSelf: 'center', flex: 1 }}>Respuesta del cliente:</span>
                <button type="button" onClick={handleAprobar} disabled={loading}
                  style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, background: 'var(--secco-green)', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loading ? '…' : '✓ Aprobado'}
                </button>
                <button type="button" onClick={() => setShowRechazo((v) => !v)} disabled={loading}
                  style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, background: showRechazo ? 'rgba(255,69,58,0.12)' : '#FFF', color: 'var(--destructive)', border: '1px solid var(--secco-red-35)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✗ Rechazado
                </button>
                {showRechazo && (
                  <div style={{ width: '100%', display: 'flex', gap: 8, marginTop: 4 }}>
                    <input
                      type="text"
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      placeholder="Motivo del rechazo..."
                      style={{ flex: 1, fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontFamily: 'inherit', outline: 'none', color: 'var(--foreground)' }}
                      onKeyDown={(e) => e.key === 'Enter' && handleRechazar()}
                    />
                    <button type="button" onClick={handleRechazar} disabled={loading}
                      style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, background: 'var(--destructive)', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Confirmar
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Estado final: aprobado con acceso a OT */}
            {status === 'aprobada' && (
              <>
                <button type="button" onClick={() => handlePDF('cliente')} disabled={loading}
                  style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#FFF', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                  PDF cliente
                </button>
                <button type="button" onClick={() => handlePDF('interno')} disabled={loading}
                  style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#FFF', color: 'var(--muted-foreground)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                  PDF interno
                </button>
                {onAbrirOT && (
                  <button type="button" onClick={handleAprobar} disabled={loading}
                    style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, background: 'var(--secco-green)', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Ver OT →
                  </button>
                )}
              </>
            )}

            {/* Estado final: rechazado */}
            {status === 'rechazada' && (
              <>
                <div style={{ width: '100%', padding: '8px 12px', background: 'var(--secco-red-08)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--destructive)', fontWeight: 600 }}>Cotización rechazada</p>
                </div>
                <button type="button" onClick={() => handlePDF('cliente')} disabled={loading}
                  style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#FFF', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                  PDF cliente
                </button>
                <button type="button" onClick={() => handlePDF('interno')} disabled={loading}
                  style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: '#FFF', color: 'var(--muted-foreground)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                  PDF interno
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Panel derecho: Diagnóstico ────────────────────── */}
        <div style={{
          width: isWide ? '38%' : '100%', maxWidth: isWide ? 440 : undefined,
          flexShrink: 0, display: isWide || showDiag ? 'flex' : 'none',
          flexDirection: 'column', overflow: 'hidden', background: 'var(--card)',
        }}>
          <div style={{ padding: '11px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--background)' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {cotizacion?.diagnosticos ? 'Diagnóstico' : 'Contexto'}
            </p>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <VincularActaPanel
              cotizacion={cotizacion}
              disabled={loading}
              onVinculada={(full) => {
                setCotizacion(full)
                cotizacionIdRef.current = full?.id || cotizacionIdRef.current
                cotizacionSnapRef.current = full
              }}
              onError={(msg) => alert(msg)}
            />
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>Cliente y vehículo</p>
              <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
                Contacto y datos del auto para el PDF al cliente y el encabezado. Si la cotización viene de un acta, suelen venir cargados.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Nombre</span>
                  <input
                    type="text"
                    className="s-input"
                    value={clienteManual.nombre}
                    onChange={(e) => patchClienteManual({ nombre: e.target.value })}
                    placeholder="Nombre del cliente"
                    autoComplete="name"
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Teléfono</span>
                  <input
                    type="tel"
                    className="s-input"
                    value={clienteManual.telefono}
                    onChange={(e) => patchClienteManual({ telefono: e.target.value })}
                    placeholder="+56…"
                    autoComplete="tel"
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Correo</span>
                  <input
                    type="email"
                    className="s-input"
                    value={clienteManual.email}
                    onChange={(e) => patchClienteManual({ email: e.target.value })}
                    placeholder="correo@ejemplo.cl"
                    autoComplete="email"
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Marca</span>
                  <input
                    type="text"
                    className="s-input"
                    value={vehiculoManual.marca}
                    onChange={(e) => patchVehiculoManual({ marca: e.target.value })}
                    placeholder="Marca"
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Modelo</span>
                  <input
                    type="text"
                    className="s-input"
                    value={vehiculoManual.modelo}
                    onChange={(e) => patchVehiculoManual({ modelo: e.target.value })}
                    placeholder="Modelo"
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Patente</span>
                  <input
                    type="text"
                    className="s-input"
                    value={vehiculoManual.patente}
                    onChange={(e) => patchVehiculoManual({ patente: e.target.value.toUpperCase() })}
                    placeholder="ABCD12"
                    autoComplete="off"
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, fontFamily: 'monospace', letterSpacing: '1px' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Año</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="s-input"
                    value={vehiculoManual.anio}
                    onChange={(e) => patchVehiculoManual({ anio: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="2020"
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Kilometraje</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="s-input"
                    value={vehiculoManual.km}
                    onChange={(e) => patchVehiculoManual({ km: e.target.value.replace(/\D/g, '') })}
                    placeholder="125000"
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8 }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>VIN / Chasis</span>
                  <input
                    type="text"
                    className="s-input"
                    value={vehiculoManual.vin}
                    onChange={(e) => patchVehiculoManual({ vin: e.target.value.toUpperCase() })}
                    placeholder="WBA3A5C51CF256985"
                    autoComplete="off"
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, fontFamily: 'monospace', letterSpacing: '1px' }}
                  />
                </label>
              </div>
            </div>
            <DiagnosticoPanel cotizacion={cotizacionParaPanel} />
          </div>
        </div>
      </div>
    </div>
  )
}

function th(extra = {}) {
  return { padding: '7px 2px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--placeholder)', textAlign: 'center', ...extra }
}
