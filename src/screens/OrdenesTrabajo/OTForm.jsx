import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ordenTrabajoService } from '../../services/ordenTrabajoService'
import { useRol, listarTecnicos } from '../../context/AuthContext'
import { useMobile } from '../../hooks/useMobile'

// ── Constantes de flujo ───────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'generada',    label: 'Generada' },
  { key: 'asignada',    label: 'Asignada' },
  { key: 'en_proceso',  label: 'En proceso' },
  { key: 'en_revision', label: 'En revisión' },
  { key: 'finalizada',  label: 'Finalizada' },
  { key: 'entregada',   label: 'Entregada' },
]

const STATUS_META = {
  generada:    { label: 'Generada',    bg: 'var(--card)',               color: 'var(--muted-foreground)', dot: '#6B6B6B' },
  asignada:    { label: 'Asignada',    bg: 'var(--secco-gold-10)',      color: 'var(--secco-gold)',        dot: '#1e3a8a' },
  en_proceso:  { label: 'En proceso',  bg: 'var(--secco-gold-10)',      color: 'var(--secco-gold)',        dot: '#a98225' },
  en_revision: { label: 'En revisión', bg: 'var(--secco-purple-12)',    color: 'var(--secco-purple)',      dot: '#5856D6' },
  finalizada:  { label: 'Finalizada',  bg: 'rgba(34,139,80,0.12)',      color: 'var(--secco-green)',       dot: '#228b50' },
  entregada:   { label: 'Entregada',   bg: 'var(--secco-green)',        color: 'var(--background)',        dot: '#228b50' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function money(v) {
  return `$${Math.round(Number(v) || 0).toLocaleString('es-CL')}`
}

function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function formatElapsed(ms) {
  if (!ms || ms < 0) return '—'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function formatHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function isManoObra(item) { return String(item.tipo || '').toLowerCase().includes('mano') }
function isRepuesto(item) { return String(item.tipo || '').toLowerCase().includes('repuesto') }

function fallbackRepuestosFromItems(items = []) {
  return (items || []).filter(it => it.descripcion && isRepuesto(it)).map((it, i) => ({
    id: it.id || `rep-${i + 1}`, nombre: it.descripcion || '',
    cantidad: Number(it.cantidad || 1), precio: Number(it.precio_unitario || 0), origen: 'presupuesto',
  }))
}

function fallbackInstruccionesFromItems(items = [], repuestos = []) {
  const ins = (items || []).filter(it => it.descripcion && !isRepuesto(it) && !isManoObra(it))
    .map((it, i) => ({ id: it.id || `ins-${i + 1}`, texto: it.descripcion || '', horas: undefined, repuestos_ids: [], orden: i + 1, completada: false }))
  if (!ins.length && repuestos.length) {
    ins.push({ id: 'ins-1-general', texto: 'Ejecutar trabajos aprobados según presupuesto y diagnóstico.', horas: undefined, repuestos_ids: repuestos.map(r => r.id), orden: 1, completada: false })
  }
  return ins
}

function normalizeRepuestosOT(ot) {
  const base = (Array.isArray(ot.repuestos) && ot.repuestos.length) ? ot.repuestos : fallbackRepuestosFromItems(ot.items || [])
  return base.map((r, i) => ({ id: r.id || `rep-${i + 1}`, nombre: r.nombre || r.descripcion || '', cantidad: Number(r.cantidad || 1), precio: Number(r.precio || r.precio_unitario || 0), origen: r.origen || 'manual' }))
}

function normalizeInstruccionesOT(ot, repuestos) {
  const base = (Array.isArray(ot.instrucciones) && ot.instrucciones.length) ? ot.instrucciones : fallbackInstruccionesFromItems(ot.items || [], repuestos)
  return base.map((ins, i) => ({ id: ins.id || `ins-${i + 1}`, texto: ins.texto || ins.descripcion || '', horas: ins.horas != null ? Number(ins.horas) : undefined, repuestos_ids: Array.isArray(ins.repuestos_ids) ? ins.repuestos_ids : [], orden: Number(ins.orden || i + 1), completada: Boolean(ins.completada) })).sort((a, b) => a.orden - b.orden)
}

const HORAS_OPTS = [
  { v: 0.25, l: '15 min' }, { v: 0.5, l: '30 min' }, { v: 0.75, l: '45 min' },
  { v: 1, l: '1 h' }, { v: 1.5, l: '1.5 h' }, { v: 2, l: '2 h' }, { v: 2.5, l: '2.5 h' },
  { v: 3, l: '3 h' }, { v: 4, l: '4 h' }, { v: 5, l: '5 h' }, { v: 6, l: '6 h' }, { v: 8, l: '8 h' },
]

// ── Shared style helpers ──────────────────────────────────────────────────────
const rowBox = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 10px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }

function miniInput(extra = {}) {
  return { minWidth: 0, fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontFamily: 'inherit', outline: 'none', color: 'var(--foreground)', background: 'var(--background)', boxSizing: 'border-box', ...extra }
}

const rowInput = { width: '100%', border: 'none', background: 'transparent', padding: '5px 6px', fontSize: 13, fontFamily: 'inherit', color: 'var(--foreground)', outline: 'none', minWidth: 0, boxSizing: 'border-box' }

function iconBtn(color) {
  return { width: 28, height: 28, border: '1px solid var(--border)', background: 'var(--background)', color, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700 }
}

const addBtn = { marginTop: 4, padding: '8px 12px', background: 'var(--secco-gold-10)', border: '1px solid var(--secco-gold-30)', color: 'var(--secco-gold)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }

// ── Sub-components comunes ────────────────────────────────────────────────────

function SectionTitle({ title, hint }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--foreground)' }}>{title}</p>
      {hint && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>{hint}</p>}
    </div>
  )
}

/** Incluye el técnico ya asignado en el select aunque no venga en GET /api/usuarios. */
function opcionesTecnicos(tecnicos, ot) {
  const id = ot?.tecnico_id
  const nombre = ot?.tecnico_nombre || ot?.tecnico_asignado
  if (!id) return tecnicos
  if (tecnicos.some((t) => t.id === id)) return tecnicos
  return [{ id, nombre: nombre || 'Técnico asignado' }, ...tecnicos]
}

function VehiclePanel({ ot }) {
  const veh = ot.vehiculos || ot.actas?.vehiculos || {}
  const cli = ot.clientes  || ot.actas?.clientes  || {}
  const cot = ot.cotizaciones || {}
  const acta = ot.actas || {}
  const bullets = [
    veh.marca && { label: 'Vehículo',  value: `${veh.marca} ${veh.modelo || ''} ${veh.anio || ''}`.trim() },
    veh.patente && { label: 'Patente', value: veh.patente, mono: true },
    ot.km_ingreso != null && { label: 'KM ingreso', value: `${Number(ot.km_ingreso).toLocaleString('es-CL')} km` },
    !ot.km_ingreso && acta.km && { label: 'KM', value: `${Number(acta.km).toLocaleString('es-CL')} km` },
    cli.nombre && { label: 'Cliente',  value: cli.nombre },
    cli.telefono && { label: 'Teléfono', value: cli.telefono },
    cot.numero_cotizacion && { label: 'Cotización', value: `COT-${cot.numero_cotizacion}` },
    cot.total && { label: 'Total cot.', value: money(cot.total) },
  ].filter(Boolean)

  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
      {bullets.map(({ label, value, mono }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--placeholder)', flexShrink: 0 }}>•</span>
          <span style={{ fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0, minWidth: 70 }}>{label}</span>
          <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '1px' : 'normal' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function RepuestosPanel({ repuestos, onChange, onAdd, onDelete }) {
  return (
    <div style={{ padding: '12px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--foreground)' }}>
          Repuestos
          {repuestos.length > 0 && (
            <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--muted-foreground)' }}>({repuestos.length})</span>
          )}
        </p>
        <button type="button" onClick={onAdd} style={addBtn}>+ Agregar</button>
      </div>

      {!repuestos.length && (
        <p style={{ color: 'var(--placeholder)', fontSize: 12, fontStyle: 'italic', margin: 0 }}>Sin repuestos.</p>
      )}

      {repuestos.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Cabecera */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 110px 32px', background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '6px 8px 6px 12px' }}>
            <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>Nombre</span>
            <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, textAlign: 'center' }}>Cant.</span>
            <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, textAlign: 'right', paddingRight: 6 }}>Precio</span>
            <span />
          </div>

          {/* Filas */}
          {repuestos.map((rep, idx) => (
            <div
              key={rep.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 64px 110px 32px',
                alignItems: 'center',
                borderBottom: idx < repuestos.length - 1 ? '1px solid var(--border)' : 'none',
                padding: '2px 4px 2px 4px',
              }}
            >
              <input
                value={rep.nombre}
                onChange={e => onChange(rep.id, 'nombre', e.target.value)}
                placeholder="Nombre del repuesto…"
                style={{ ...rowInput, padding: '8px 8px' }}
              />
              <div style={{ borderLeft: '1px solid var(--border)', height: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number" min="0" step="1"
                  value={rep.cantidad}
                  onChange={e => onChange(rep.id, 'cantidad', e.target.value)}
                  style={{ ...rowInput, textAlign: 'center', padding: '8px 4px' }}
                />
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
                <span style={{ position: 'absolute', left: 10, fontSize: 11, color: 'var(--muted-foreground)', pointerEvents: 'none', userSelect: 'none' }}>$</span>
                <input
                  type="number" min="0" step="100"
                  value={rep.precio || ''}
                  onChange={e => onChange(rep.id, 'precio', e.target.value)}
                  placeholder="0"
                  style={{ ...rowInput, paddingLeft: 20, paddingRight: 8, textAlign: 'right', width: '100%' }}
                />
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <button
                  type="button"
                  onClick={() => onDelete(rep.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--destructive)', fontSize: 16, fontWeight: 700, lineHeight: 1, opacity: 0.6, padding: '0 2px' }}
                >×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InstruccionesPanel({ instrucciones, onChange, onAdd, onDelete, onMove, onDropMove }) {
  const totalHoras = instrucciones.reduce((s, i) => s + (Number(i.horas) || 0), 0)
  return (
    <div style={{ padding: '12px 20px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--foreground)' }}>Instrucciones de trabajo</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>Tareas para el mecánico con tiempo estimado.</p>
        </div>
        <button type="button" onClick={onAdd} style={addBtn}>+ Agregar</button>
      </div>
      {!instrucciones.length && <p style={{ color: 'var(--placeholder)', fontSize: 12, fontStyle: 'italic' }}>Sin instrucciones aún.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {instrucciones.map((ins, i) => (
          <div
            key={ins.id}
            draggable
            onDragStart={e => e.dataTransfer.setData('text/plain', ins.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDropMove(e.dataTransfer.getData('text/plain'), ins.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'grab' }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--secco-gold)', minWidth: 18, flexShrink: 0 }}>{i + 1}</span>
            <input
              value={ins.texto}
              onChange={e => onChange(ins.id, 'texto', e.target.value)}
              placeholder="Descripción de la tarea…"
              style={miniInput({ flex: 1, minWidth: 0, padding: '7px 10px', fontSize: 13 })}
            />
            <select
              value={ins.horas ?? ''}
              onChange={e => onChange(ins.id, 'horas', e.target.value === '' ? undefined : parseFloat(e.target.value))}
              style={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 8, padding: '7px 6px', fontFamily: 'inherit', color: ins.horas ? 'var(--foreground)' : 'var(--placeholder)', background: 'var(--background)', cursor: 'pointer', flexShrink: 0, outline: 'none', minWidth: 70 }}
            >
              <option value="">— hs</option>
              {HORAS_OPTS.map(o => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
            <button type="button" onClick={() => onDelete(ins.id)} style={{ ...iconBtn('var(--destructive)'), flexShrink: 0 }}>×</button>
          </div>
        ))}
      </div>

      {instrucciones.length > 0 && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--secco-gold-10)', border: '1px solid var(--secco-gold-10)', borderRadius: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Total mano de obra estimada</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--secco-gold)' }}>{totalHoras > 0 ? `${totalHoras} hs` : '—'}</span>
        </div>
      )}
    </div>
  )
}

// ── Strip de progreso ─────────────────────────────────────────────────────────
function StatusStrip({ current }) {
  const idx = STATUS_STEPS.findIndex(s => s.key === current)
  return (
    <div style={{ padding: '10px 20px', borderBottom: '1px solid #F0F0F0', overflowX: 'auto', flexShrink: 0, background: 'var(--card)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
        {STATUS_STEPS.map((step, i) => {
          const done = i < idx
          const active = i === idx
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {i > 0 && (
                <div style={{ width: 18, height: 1.5, background: done ? 'var(--secco-gold)' : 'var(--border)', marginTop: 5, flexShrink: 0 }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 56 }}>
                <div style={{ width: active ? 11 : 7, height: active ? 11 : 7, borderRadius: '50%', background: done ? 'var(--secco-gold)' : active ? 'var(--secco-gold)' : 'var(--border)', boxShadow: active ? '0 0 0 3px var(--secco-gold-10)' : 'none', flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, color: active ? 'var(--secco-gold)' : done ? 'var(--muted-foreground)' : 'var(--inactive)', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.2 }}>
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Vista del mecánico ────────────────────────────────────────────────────────
function OTVistaTecnico({ ot: otInicial, onUpdate, onVolver }) {
  const [ot, setOt] = useState(otInicial)
  const [observaciones, setObservaciones] = useState(otInicial.observaciones ?? '')
  const [saving, setSaving] = useState(false)
  const [loadingBtn, setLoadingBtn] = useState(false)
  const saveTimer = useRef(null)
  const isDirty = useRef(false)  // true mientras el usuario tiene cambios sin guardar

  const recargar = useCallback(async () => {
    try {
      const updated = await ordenTrabajoService.obtener(ot.id)
      setOt(updated)
      // Solo actualizar observaciones desde el servidor si el usuario no está editando
      if (!isDirty.current && updated.observaciones != null) {
        setObservaciones(updated.observaciones)
      }
    } catch {}
  }, [ot.id])

  useEffect(() => {
    const interval = setInterval(recargar, 10000)
    return () => clearInterval(interval)
  }, [recargar])

  async function guardarObservaciones(valor) {
    setSaving(true)
    try {
      await ordenTrabajoService.actualizar(ot.id, { observaciones: valor })
      isDirty.current = false
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  function scheduleGuardarObs(valor) {
    isDirty.current = true
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => guardarObservaciones(valor), 1400)
  }

  async function handleIniciar() {
    setLoadingBtn(true)
    // Guardar observaciones pendientes antes de iniciar
    clearTimeout(saveTimer.current)
    if (isDirty.current) await guardarObservaciones(observaciones)
    try {
      const updated = await ordenTrabajoService.iniciarOT(ot.id)
      setOt(updated); await onUpdate()
    } catch (e) { alert(e?.message || 'Error al iniciar OT') }
    finally { setLoadingBtn(false) }
  }

  async function handleTerminar() {
    setLoadingBtn(true)
    // Guardar observaciones antes de terminar
    clearTimeout(saveTimer.current)
    await guardarObservaciones(observaciones)
    try {
      const updated = await ordenTrabajoService.terminarOT(ot.id)
      setOt(updated); await onUpdate()
    } catch (e) { alert(e?.message || 'Error al terminar OT') }
    finally { setLoadingBtn(false) }
  }

  const elapsed = ot.termino_servicio && ot.inicio_servicio
    ? new Date(ot.termino_servicio) - new Date(ot.inicio_servicio) : null
  const repuestos = (Array.isArray(ot.repuestos) && ot.repuestos.length)
    ? ot.repuestos
    : (ot.items || []).filter(it => it.descripcion && String(it.tipo || '').toLowerCase().includes('repuesto'))
        .map((it, i) => ({ id: it.id || `rep-${i + 1}`, nombre: it.descripcion || '', cantidad: Number(it.cantidad || 1), precio: Number(it.precio_unitario || 0) }))
  const instrucciones = Array.isArray(ot.instrucciones) ? ot.instrucciones.slice().sort((a, b) => a.orden - b.orden) : []
  const veh = ot.vehiculos || ot.actas?.vehiculos || {}
  const cli = ot.clientes  || ot.actas?.clientes  || {}
  const sc = STATUS_META[ot.status] || STATUS_META.generada
  const locked = ['en_revision', 'finalizada', 'entregada'].includes(ot.status)

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--background)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10, height: 52, flexShrink: 0 }}>
        <button type="button" onClick={onVolver} style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <img src="/logo-secco.png" alt="SECCO" style={{ height: 24, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>OT {ot.numero_ot ? `#${ot.numero_ot}` : ''}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>Mi orden de trabajo</p>
        </div>
        <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, flexShrink: 0 }}>{sc.label}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 48px' }}>

        {/* Vehículo */}
        <div style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--placeholder)' }}>Vehículo</p>
          {veh.marca && <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>{veh.marca} {veh.modelo || ''} {veh.anio || ''}{veh.patente && <span style={{ marginLeft: 8, fontFamily: 'monospace', letterSpacing: 1, fontWeight: 400, fontSize: 13, color: 'var(--secco-gold)' }}>{veh.patente}</span>}</p>}
          {cli.nombre && <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--muted-foreground)' }}>{cli.nombre}</p>}
          {ot.km_ingreso != null && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>KM ingreso: <strong>{Number(ot.km_ingreso).toLocaleString('es-CL')}</strong></p>}
        </div>

        {/* Tiempo — siempre visible */}
        <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 10, background: ot.termino_servicio ? 'rgba(34,139,80,0.06)' : ot.inicio_servicio ? 'var(--secco-gold)' : 'var(--card)', border: `1px solid ${ot.termino_servicio ? 'rgba(34,139,80,0.25)' : ot.inicio_servicio ? 'var(--secco-gold-30)' : 'var(--border)'}` }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--placeholder)' }}>Tiempo</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--placeholder)', textTransform: 'uppercase' }}>Inicio</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: ot.inicio_servicio ? 'var(--secco-gold)' : 'var(--placeholder)' }}>{formatHora(ot.inicio_servicio)}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--placeholder)', textTransform: 'uppercase' }}>Término</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: ot.termino_servicio ? 'var(--secco-green)' : 'var(--placeholder)' }}>{formatHora(ot.termino_servicio)}</p>
            </div>
          </div>
          {elapsed != null && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(34,139,80,0.2)' }}>
              <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--placeholder)', textTransform: 'uppercase' }}>Duración total</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--secco-green)' }}>{formatElapsed(elapsed)}</p>
            </div>
          )}
        </div>

        {/* Notas del TC — visible para el mecánico */}
        {ot.notas_torre && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(169,130,37,0.06)', border: '1px solid rgba(169,130,37,0.25)', borderRadius: 10 }}>
            <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#a98225' }}>Notas del TC</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ot.notas_torre}</p>
          </div>
        )}

        {/* Repuestos — grid 2 columnas */}
        {repuestos.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--placeholder)' }}>Repuestos a usar</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {repuestos.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--foreground)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6 }}>{r.nombre || '—'}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, flexShrink: 0 }}>×{r.cantidad}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tareas — grid 2 columnas */}
        {instrucciones.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--placeholder)' }}>Tareas asignadas</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {instrucciones.map((ins, i) => (
                <div key={ins.id} style={{ padding: '8px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--foreground)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i + 1}. {ins.texto}</p>
                  {ins.horas != null && <p style={{ margin: 0, fontSize: 11, color: 'var(--secco-gold)', fontWeight: 600 }}>{ins.horas} hs est.</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observaciones */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--placeholder)' }}>
            Tus observaciones {saving && <span style={{ fontWeight: 400, color: 'var(--placeholder)', marginLeft: 4 }}>guardando…</span>}
          </p>
          <textarea value={observaciones} onChange={e => { setObservaciones(e.target.value); scheduleGuardarObs(e.target.value) }}
            placeholder="Describe lo que hiciste, novedades, problemas encontrados..." rows={4} disabled={locked}
            style={{ width: '100%', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--foreground)', boxSizing: 'border-box', background: locked ? 'var(--card)' : 'var(--background)' }} />
        </div>

        {/* Controles de estado */}
        {ot.status === 'asignada' && (
          <button type="button" disabled={loadingBtn} onClick={handleIniciar}
            style={{ width: '100%', padding: '15px 0', fontSize: 15, fontWeight: 700, background: 'var(--secco-gold)', color: '#FFF', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, opacity: loadingBtn ? 0.6 : 1 }}>
            {loadingBtn ? '…' : '▶  Iniciar OT'}
          </button>
        )}
        {ot.status === 'en_proceso' && (
          <button type="button" disabled={loadingBtn} onClick={handleTerminar}
            style={{ width: '100%', padding: '15px 0', fontSize: 15, fontWeight: 700, background: 'var(--secco-purple)', color: '#FFF', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, opacity: loadingBtn ? 0.6 : 1 }}>
            {loadingBtn ? '…' : '■  Terminar OT'}
          </button>
        )}
        {ot.status === 'en_revision' && (
          <div style={{ padding: '14px 16px', background: 'rgba(88,86,214,0.07)', border: '1px solid rgba(88,86,214,0.3)', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--secco-purple)' }}>⏳ OT enviada a revisión</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>El TC está revisando el trabajo — aguarda su aprobación</p>
          </div>
        )}
        {ot.status === 'finalizada' && (
          <div style={{ padding: '14px 16px', background: 'rgba(34,139,80,0.07)', border: '1px solid rgba(34,139,80,0.25)', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--secco-green)' }}>✓ OT aprobada y finalizada</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>El TC aprobó el trabajo. Buen trabajo.</p>
          </div>
        )}
        {ot.status === 'entregada' && (
          <div style={{ padding: '14px 16px', background: 'var(--secco-green)', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--background)' }}>✓ Vehículo entregado al cliente</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Vista TC (admin) ──────────────────────────────────────────────────────────
export default function OTForm({ otInicial, onVolver }) {
  const isMobile = useMobile()
  const { esTecnico } = useRol()
  const [ot, setOt] = useState(otInicial)
  const initialRepuestos = normalizeRepuestosOT(otInicial)
  const [tecnicos, setTecnicos] = useState([])
  const [tecnicoId, setTecnicoId] = useState('')
  const [status, setStatus] = useState(otInicial.status || 'generada')
  const [repuestos, setRepuestos] = useState(initialRepuestos)
  const [instrucciones, setInstrucciones] = useState(() => normalizeInstruccionesOT(otInicial, initialRepuestos))
  const [notasTorre, setNotasTorre] = useState(otInicial.notas_torre || '')
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [activeTab, setActiveTab] = useState('estado')
  const saveTimer = useRef(null)

  useEffect(() => { listarTecnicos().then(setTecnicos).catch(() => {}) }, [])

  const recargar = useCallback(async () => {
    try {
      const updated = await ordenTrabajoService.obtener(ot.id)
      setOt(updated)
      setStatus(updated.status || 'generada')
    } catch {}
  }, [ot.id])

  useEffect(() => {
    const interval = setInterval(recargar, 10000)
    return () => clearInterval(interval)
  }, [recargar])

  useEffect(() => {
    if (ot.tecnico_id) setTecnicoId(ot.tecnico_id)
  }, [ot.tecnico_id])

  const tecnicosOpciones = useMemo(() => opcionesTecnicos(tecnicos, ot), [tecnicos, ot])

  const scheduleGuardar = useCallback((payload) => {
    setSaveStatus('unsaved')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      try { await ordenTrabajoService.actualizar(ot.id, payload); setSaveStatus('saved') }
      catch { setSaveStatus('error') }
    }, 1400)
  }, [ot.id])

  function touch(next = {}) {
    scheduleGuardar({ notas_torre: next.notas_torre ?? notasTorre, repuestos: next.repuestos ?? repuestos, instrucciones: next.instrucciones ?? instrucciones })
  }

  function updateRepuesto(id, field, value) {
    const next = repuestos.map(r => r.id === id ? { ...r, [field]: field === 'cantidad' || field === 'precio' ? Number(value || 0) : value } : r)
    setRepuestos(next); touch({ repuestos: next })
  }
  function addRepuesto() { const next = [...repuestos, { id: uid('rep'), nombre: '', cantidad: 1, precio: 0, origen: 'manual' }]; setRepuestos(next); touch({ repuestos: next }) }
  function deleteRepuesto(id) {
    const nextR = repuestos.filter(r => r.id !== id)
    const nextI = instrucciones.map(ins => ({ ...ins, repuestos_ids: ins.repuestos_ids.filter(rid => rid !== id) }))
    setRepuestos(nextR); setInstrucciones(nextI); touch({ repuestos: nextR, instrucciones: nextI })
  }
  function updateInstruccion(id, field, value) { const next = instrucciones.map(ins => ins.id === id ? { ...ins, [field]: value } : ins); setInstrucciones(next); touch({ instrucciones: next }) }
  function addInstruccion() { const next = [...instrucciones, { id: uid('ins'), texto: '', horas: undefined, repuestos_ids: [], orden: instrucciones.length + 1, completada: false }]; setInstrucciones(next); touch({ instrucciones: next }) }
  function deleteInstruccion(id) { const next = instrucciones.filter(ins => ins.id !== id).map((ins, i) => ({ ...ins, orden: i + 1 })); setInstrucciones(next); touch({ instrucciones: next }) }
  function toggleRepuestoInstruccion(insId, repId) {
    const next = instrucciones.map(ins => {
      if (ins.id !== insId) return ins
      const has = ins.repuestos_ids.includes(repId)
      return { ...ins, repuestos_ids: has ? ins.repuestos_ids.filter(id => id !== repId) : [...ins.repuestos_ids, repId] }
    })
    setInstrucciones(next); touch({ instrucciones: next })
  }
  function moveInstruccion(id, delta) {
    const idx = instrucciones.findIndex(ins => ins.id === id)
    const target = idx + delta
    if (idx < 0 || target < 0 || target >= instrucciones.length) return
    const next = [...instrucciones]; const [moved] = next.splice(idx, 1); next.splice(target, 0, moved)
    const ordered = next.map((ins, i) => ({ ...ins, orden: i + 1 }))
    setInstrucciones(ordered); touch({ instrucciones: ordered })
  }
  function dropMoveInstruccion(dragId, targetId) {
    if (!dragId || dragId === targetId) return
    const from = instrucciones.findIndex(ins => ins.id === dragId)
    const to = instrucciones.findIndex(ins => ins.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...instrucciones]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved)
    const ordered = next.map((ins, i) => ({ ...ins, orden: i + 1 }))
    setInstrucciones(ordered); touch({ instrucciones: ordered })
  }

  async function handleAsignar() {
    if (!tecnicoId) { alert('Selecciona un técnico.'); return }
    setLoading(true)
    try {
      const found = tecnicos.find(t => t.id === tecnicoId)
      await ordenTrabajoService.asignar(ot.id, { tecnico_id: tecnicoId, tecnico_nombre: found?.nombre || '' })
      const updated = await ordenTrabajoService.obtener(ot.id)
      setOt(updated); setStatus(updated.status || 'asignada'); setTecnicoId('')
    } catch (e) { alert(`Error: ${e.message}`) }
    finally { setLoading(false) }
  }

  async function handleAprobar() {
    setLoading(true)
    try {
      await ordenTrabajoService.aprobarOT(ot.id)
      const updated = await ordenTrabajoService.obtener(ot.id)
      setOt(updated); setStatus('finalizada')
    } catch (e) { alert(`Error: ${e.message}`) }
    finally { setLoading(false) }
  }

  async function handleMarcarEntregada() {
    setLoading(true)
    try {
      await ordenTrabajoService.entregar(ot.id)
      const updated = await ordenTrabajoService.obtener(ot.id)
      setOt(updated); setStatus('entregada')
    } catch (e) { alert(`Error: ${e.message}`) }
    finally { setLoading(false) }
  }

  async function handleEliminar() {
    if (!window.confirm(`¿Eliminar OT #${ot.numero_ot}? Esta acción no se puede deshacer.`)) return
    setLoading(true)
    try {
      await ordenTrabajoService.eliminar(ot.id)
      onVolver()
    } catch (e) { alert(`Error: ${e.message}`) }
    finally { setLoading(false) }
  }

  // Bifurcación por rol
  if (esTecnico) return <OTVistaTecnico ot={ot} onUpdate={recargar} onVolver={onVolver} />

  const sc = STATUS_META[status] || STATUS_META.generada
  const statusIdx = STATUS_STEPS.findIndex(s => s.key === status)
  const historial = ot.historial || []
  const elapsed = ot.termino_servicio && ot.inicio_servicio
    ? new Date(ot.termino_servicio) - new Date(ot.inicio_servicio) : null

  // Tabs
  const tabCount = instrucciones.filter(i => i.texto).length + repuestos.filter(r => r.nombre).length
  function tabBtn(key) {
    const active = activeTab === key
    return {
      flex: 1, padding: '9px 4px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      background: active ? 'var(--background)' : 'transparent', color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
      borderRadius: 8, boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    }
  }

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--background)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: isMobile ? '0 12px' : '0 16px', display: 'flex', alignItems: 'center', gap: 10, height: 52, flexShrink: 0 }}>
        <button type="button" onClick={onVolver} style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <img src="/logo-secco.png" alt="SECCO" style={{ height: 24, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>OT {ot.numero_ot ? `#${ot.numero_ot}` : ''}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>Torre de Control</p>
        </div>
        <span style={{ fontSize: 11, flexShrink: 0, color: saveStatus === 'saved' ? 'var(--secco-gold)' : saveStatus === 'saving' ? 'var(--placeholder)' : 'var(--destructive)' }}>
          {saveStatus === 'saved' ? '✓ guardado' : saveStatus === 'saving' ? 'guardando…' : '⚠ error'}
        </span>
        <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, flexShrink: 0, animation: status === 'en_revision' ? 'pulse 1.8s infinite' : 'none' }}>
          {status === 'en_revision' ? '🔔 ' : ''}{sc.label}
        </span>
        <button type="button" onClick={handleEliminar} disabled={loading}
          style={{ background: 'rgba(255,69,58,0.10)', border: '1.5px solid rgba(255,69,58,0.55)', color: '#FF453A', borderRadius: 8, height: 32, padding: '0 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, opacity: loading ? 0.5 : 1 }}>
          🗑 Eliminar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ background: 'var(--card)', borderRadius: 10, padding: 3, display: 'flex', gap: 3 }}>
          <button style={tabBtn('estado')} onClick={() => setActiveTab('estado')}>
            Estado{status === 'en_revision' ? ' 🔔' : ''}
          </button>
          <button style={tabBtn('trabajo')} onClick={() => setActiveTab('trabajo')}>
            Trabajo {tabCount > 0 ? `(${tabCount})` : ''}
          </button>
          <button style={tabBtn('historial')} onClick={() => setActiveTab('historial')}>
            Historial
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ══ TAB: ESTADO ══════════════════════════════════════════════════════ */}
        {activeTab === 'estado' && (
          <>
            {/* ── Barra de progreso ── */}
            <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--border)' }}>
              {/* Badge / banner estado actual */}
              <div style={{ marginBottom: 28 }}>
                {status === 'entregada' ? (
                  <div style={{ background: 'var(--secco-green)', borderRadius: 14, padding: '14px 20px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: '#FFF' }}>✓ Vehículo entregado</p>
                    {ot.tecnico_nombre && <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Técnico: {ot.tecnico_nombre}</p>}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      background: sc.bg, color: sc.dot,
                      fontSize: 15, fontWeight: 800,
                      padding: '8px 26px', borderRadius: 24,
                      border: `2px solid ${sc.dot}`,
                      animation: status === 'en_revision' ? 'pulse 1.8s infinite' : 'none',
                    }}>
                      {status === 'en_revision' ? '🔔 ' : ''}{sc.label}
                    </span>
                  </div>
                )}
              </div>
              {/* Timeline: dots posicionados absolutamente sobre una línea */}
              <div style={{ position: 'relative', height: 54, margin: '0 11px' }}>
                {/* Línea gris base */}
                <div style={{ position: 'absolute', top: 9, left: 0, right: 0, height: 3, background: 'var(--border)', borderRadius: 2 }} />
                {/* Línea de progreso coloreada */}
                <div style={{
                  position: 'absolute', top: 9, left: 0, height: 3,
                  background: sc.color, borderRadius: 2,
                  width: statusIdx === 0 ? '0%' : `${(statusIdx / (STATUS_STEPS.length - 1)) * 100}%`,
                  transition: 'width 0.5s ease',
                }} />
                {/* Puntos + labels */}
                {STATUS_STEPS.map((step, i) => {
                  const done   = i < statusIdx
                  const active = i === statusIdx
                  const pct    = (i / (STATUS_STEPS.length - 1)) * 100
                  return (
                    <div key={step.key} style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: 0,
                      transform: 'translateX(-50%)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: done ? '#a98225' : active ? sc.dot : 'var(--background)',
                        border: `2.5px solid ${done ? '#a98225' : active ? sc.dot : 'var(--border)'}`,
                        boxShadow: active ? `0 0 0 5px ${sc.bg}` : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: done || active ? '#FFF' : 'var(--placeholder)', fontWeight: 800,
                        zIndex: 1, position: 'relative', transition: 'box-shadow 0.3s',
                      }}>
                        {done || active ? '✓' : ''}
                      </div>
                      <span style={{
                        fontSize: active ? 10 : 9, whiteSpace: 'nowrap', lineHeight: 1,
                        fontWeight: active ? 700 : 400,
                        color: active ? sc.color : done ? 'var(--muted-foreground)' : 'var(--placeholder)',
                      }}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <VehiclePanel ot={ot} />

            {/* ── generada ── */}
            {status === 'generada' && (
              <div style={{ padding: '16px 20px' }}>
                <div style={{ padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--muted-foreground)' }}>Pendiente de configurar</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--placeholder)', lineHeight: 1.5 }}>Ir al tab <strong>Trabajo</strong> → asignar mecánico y configurar tareas. Al asignar, la OT pasa a <em>Asignada</em>.</p>
                </div>
              </div>
            )}

            {/* ── asignada ── */}
            {status === 'asignada' && (
              <div style={{ padding: '16px 20px' }}>
                <div style={{ padding: '14px 16px', background: 'var(--secco-gold-10)', border: '1px solid var(--secco-gold-30)', borderRadius: 12 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--secco-gold)' }}>⏳ Esperando que el mecánico inicie</p>
                  {ot.tecnico_nombre && <p style={{ margin: 0, fontSize: 13, color: 'var(--secco-gold)' }}>Asignado a: <strong>{ot.tecnico_nombre}</strong></p>}
                </div>
              </div>
            )}

            {/* ── en_proceso ── */}
            {status === 'en_proceso' && (
              <div style={{ padding: '16px 20px' }}>
                <div style={{ padding: '14px 16px', background: 'var(--secco-gold-10)', border: '1px solid var(--secco-gold-30)', borderRadius: 12 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--secco-gold)' }}>⚙ El mecánico está trabajando</p>
                  {ot.tecnico_nombre && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--secco-gold)' }}>{ot.tecnico_nombre}</p>}
                  {ot.inicio_servicio && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}>Inicio: <strong>{formatHora(ot.inicio_servicio)}</strong></p>}
                </div>
              </div>
            )}

            {/* ── en_revision — PANEL COMPLETO ── */}
            {status === 'en_revision' && (() => {
              const totalHorasEstimadas = instrucciones.reduce((s, i) => s + (Number(i.horas) || 0), 0)
              const repsValidos = repuestos.filter(r => r.nombre)
              const insValidas  = instrucciones.filter(i => i.texto)
              return (
                <div style={{ padding: '16px 20px' }}>

                  {/* Banner */}
                  <div style={{ padding: '12px 14px', background: 'rgba(88,86,214,0.07)', border: '2px solid rgba(88,86,214,0.3)', borderRadius: 12, marginBottom: 14 }}>
                    <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: 'var(--secco-purple)' }}>🔔 El mecánico terminó — revisa y aprueba</p>
                    {ot.tecnico_nombre && <p style={{ margin: 0, fontSize: 12, color: 'var(--secco-purple)' }}>Técnico: <strong>{ot.tecnico_nombre}</strong></p>}
                  </div>

                  {/* Tiempo — 4 celdas: inicio | término | duración real | estimado TC */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                    <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--placeholder)' }}>⏱ Tiempo</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px 8px' }}>
                      <div>
                        <p style={{ margin: '0 0 3px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inicio</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ot.inicio_servicio ? 'var(--secco-gold)' : 'var(--placeholder)' }}>{formatHora(ot.inicio_servicio)}</p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 3px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Término</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ot.termino_servicio ? 'var(--secco-green)' : 'var(--placeholder)' }}>{formatHora(ot.termino_servicio)}</p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 3px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Real</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: elapsed ? 'var(--secco-green)' : 'var(--placeholder)' }}>{elapsed ? formatElapsed(elapsed) : '—'}</p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 3px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TC asignó</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: totalHorasEstimadas > 0 ? 'var(--secco-gold)' : 'var(--placeholder)' }}>{totalHorasEstimadas > 0 ? `${totalHorasEstimadas}hs` : '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Repuestos — grid 2 col */}
                  {repsValidos.length > 0 && (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--placeholder)' }}>🔩 Repuestos ({repsValidos.length})</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                        {repsValidos.map(r => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 9px', background: 'var(--background)', border: '1px solid #EEEEEE', borderRadius: 7 }}>
                            <span style={{ fontSize: 12, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 4 }}>{r.nombre}</span>
                            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, flexShrink: 0 }}>×{r.cantidad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tareas — grid 2 col */}
                  {insValidas.length > 0 && (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--placeholder)' }}>🔧 Tareas ({insValidas.length})</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                        {insValidas.map((ins, i) => (
                          <div key={ins.id} style={{ padding: '7px 9px', background: 'var(--background)', border: '1px solid #EEEEEE', borderRadius: 7 }}>
                            <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--foreground)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i + 1}. {ins.texto}</p>
                            <p style={{ margin: 0, fontSize: 11, color: ins.horas ? 'var(--secco-gold)' : 'var(--placeholder)', fontWeight: 600 }}>{ins.horas ? `${ins.horas} hs` : '— hs'}</p>
                          </div>
                        ))}
                      </div>
                      {totalHorasEstimadas > 0 && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #EEEEEE', display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Total estimado:</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--secco-gold)' }}>{totalHorasEstimadas} hs</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observaciones del mecánico */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--placeholder)' }}>📝 Observaciones del mecánico</p>
                    {ot.observaciones
                      ? <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{ot.observaciones}</p>
                      : <p style={{ margin: 0, fontSize: 13, color: 'var(--inactive)', fontStyle: 'italic' }}>Sin observaciones.</p>
                    }
                  </div>

                  {/* Botón aprobar */}
                  <button type="button" onClick={handleAprobar} disabled={loading}
                    style={{ width: '100%', padding: '15px 0', fontSize: 15, fontWeight: 700, background: 'var(--secco-green)', color: '#FFF', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
                    {loading ? '…' : '✓  Aprobar y Finalizar OT'}
                  </button>
                </div>
              )
            })()}

            {/* ── finalizada ── */}
            {status === 'finalizada' && (() => {
              const totalHorasEstimadas = instrucciones.reduce((s, i) => s + (Number(i.horas) || 0), 0)
              return (
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ padding: '14px 16px', background: 'rgba(34,139,80,0.07)', border: '1px solid rgba(34,139,80,0.25)', borderRadius: 10, marginBottom: 12 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--secco-green)' }}>✓ OT aprobada — lista para entregar</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                      {ot.tecnico_nombre && <div><p style={{ margin: '0 0 1px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase' }}>Técnico</p><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{ot.tecnico_nombre}</p></div>}
                      {elapsed != null && <div><p style={{ margin: '0 0 1px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase' }}>Duración real</p><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--secco-green)' }}>{formatElapsed(elapsed)}</p></div>}
                      {totalHorasEstimadas > 0 && <div><p style={{ margin: '0 0 1px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase' }}>Estimado TC</p><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--secco-gold)' }}>{totalHorasEstimadas} hs</p></div>}
                      {ot.inicio_servicio && <div><p style={{ margin: '0 0 1px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase' }}>Horario</p><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)' }}>{formatHora(ot.inicio_servicio)} – {formatHora(ot.termino_servicio)}</p></div>}
                    </div>
                    {ot.observaciones && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(34,139,80,0.15)' }}>
                        <p style={{ margin: '0 0 4px', fontSize: 9, color: 'var(--placeholder)', textTransform: 'uppercase' }}>Obs. mecánico</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ot.observaciones}</p>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={handleMarcarEntregada} disabled={loading}
                    style={{ width: '100%', padding: '13px 0', fontSize: 14, fontWeight: 700, background: 'var(--secco-green)', color: '#FFF', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
                    {loading ? '…' : 'Marcar como Entregada al cliente →'}
                  </button>
                </div>
              )
            })()}

          </>
        )}

        {/* ══ TAB: TRABAJO ════════════════════════════════════════════════════ */}
        {activeTab === 'trabajo' && (
          <>
            {/* ── Asignación + Notas — PRIMERO ── */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <AsignacionSection
                ot={ot} tecnicos={tecnicos} tecnicoId={tecnicoId}
                setTecnicoId={setTecnicoId} handleAsignar={handleAsignar} loading={loading}
                label={ot.tecnico_nombre ? 'Reasignar mecánico' : 'Asignar mecánico'}
              />
              <div style={{ marginTop: 12 }}>
                <NotasTorreSection
                  notasTorre={notasTorre}
                  onChange={v => { setNotasTorre(v); touch({ notas_torre: v }) }}
                  hint="El mecánico verá estas notas en su vista."
                />
              </div>
            </div>
            {/* ── Repuestos ── */}
            <RepuestosPanel repuestos={repuestos} onChange={updateRepuesto} onAdd={addRepuesto} onDelete={deleteRepuesto} />
            <div style={{ margin: '0 20px', height: 1, background: 'var(--border)' }} />
            {/* ── Instrucciones ── */}
            <InstruccionesPanel instrucciones={instrucciones} onChange={updateInstruccion} onAdd={addInstruccion} onDelete={deleteInstruccion} onMove={moveInstruccion} onDropMove={dropMoveInstruccion} />
          </>
        )}

        {/* ══ TAB: HISTORIAL ══════════════════════════════════════════════════ */}
        {activeTab === 'historial' && (
          <div style={{ padding: '16px 20px' }}>
            <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted-foreground)' }}>Historial de la OT</p>
            {!historial.length && <p style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>Sin registros aún.</p>}
            {[...historial].reverse().map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--secco-gold)', marginTop: 4 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{h.accion}</p>
                  {h.nota && <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--muted-foreground)' }}>{h.nota}</p>}
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--placeholder)' }}>
                    {h.ts ? new Date(h.ts).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>
    </div>
  )
}

// ── Sección de asignación (reutilizable) ─────────────────────────────────────
function AsignacionSection({ ot, tecnicos, tecnicoId, setTecnicoId, handleAsignar, loading, label = 'Asignar mecánico' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--muted-foreground)' }}>{label}</p>
      {ot.tecnico_nombre && (
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--secco-gold)', fontWeight: 600 }}>
          Actual: {ot.tecnico_nombre}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}
          style={{ flex: 1, fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontFamily: 'inherit', color: 'var(--foreground)', background: 'var(--background)', outline: 'none', cursor: 'pointer' }}>
          <option value="">— Seleccionar técnico —</option>
          {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <button type="button" onClick={handleAsignar} disabled={loading || !tecnicoId}
          style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700, background: tecnicoId ? 'var(--secco-gold)' : 'var(--border)', color: tecnicoId ? '#FFF' : 'var(--placeholder)', border: 'none', borderRadius: 8, cursor: tecnicoId ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
          {loading ? '…' : 'Asignar'}
        </button>
      </div>
    </div>
  )
}

// ── Sección de notas de torre ─────────────────────────────────────────────────
function NotasTorreSection({ notasTorre, onChange, hint = 'Instrucciones internas para el técnico.' }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--muted-foreground)' }}>Notas para el mecánico</p>
      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--placeholder)' }}>{hint}</p>
      <textarea rows={3} value={notasTorre} onChange={e => onChange(e.target.value)}
        placeholder="Instrucciones especiales, prioridades, advertencias..."
        style={{ width: '100%', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: 'var(--foreground)', boxSizing: 'border-box' }} />
    </div>
  )
}
