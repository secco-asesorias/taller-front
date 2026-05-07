import { useState, useEffect, useRef, useCallback } from 'react'
import { ordenTrabajoService } from '../../services/ordenTrabajoService'
import { listarTecnicos } from '../../context/AuthContext'

const STATUS_FLOW = ['generada', 'asignada', 'en_proceso', 'finalizada', 'entregada']
const STATUS_LABEL = {
  generada:   { label: 'Generada',   bg: '#F5F5F5',              color: '#6B6B6B' },
  asignada:   { label: 'Asignada',   bg: 'rgba(169,130,37,0.12)', color: '#a98225' },
  en_proceso: { label: 'En proceso', bg: 'rgba(80,100,200,0.12)', color: '#5064c8' },
  finalizada: { label: 'Finalizada', bg: 'rgba(34,139,80,0.12)', color: '#228b50' },
  entregada:  { label: 'Entregada',  bg: '#228b50',              color: '#FFFFFF' },
}

function money(v) {
  return `$${Math.round(Number(v) || 0).toLocaleString('es-CL')}`
}

function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function isManoObra(item) {
  return String(item.tipo || '').toLowerCase().includes('mano')
}

function isRepuesto(item) {
  return String(item.tipo || '').toLowerCase().includes('repuesto')
}

function fallbackRepuestosFromItems(items = []) {
  return (items || [])
    .filter((it) => it.descripcion && isRepuesto(it))
    .map((it, index) => ({
      id: it.id || `rep-${index + 1}`,
      nombre: it.descripcion || '',
      cantidad: Number(it.cantidad || 1),
      precio: Number(it.precio_unitario || 0),
      origen: 'presupuesto',
    }))
}

function fallbackInstruccionesFromItems(items = [], repuestos = []) {
  const instrucciones = (items || [])
    .filter((it) => it.descripcion && !isRepuesto(it) && !isManoObra(it))
    .map((it, index) => ({
      id: it.id || `ins-${index + 1}`,
      texto: it.descripcion || '',
      repuestos_ids: [],
      orden: index + 1,
      completada: false,
    }))

  if (!instrucciones.length && repuestos.length) {
    instrucciones.push({
      id: 'ins-1-revision-general',
      texto: 'Ejecutar trabajos aprobados según presupuesto y diagnóstico.',
      repuestos_ids: repuestos.map((r) => r.id),
      orden: 1,
      completada: false,
    })
  }

  return instrucciones
}

function normalizeRepuestosOT(ot) {
  const fromOT = Array.isArray(ot.repuestos) ? ot.repuestos : []
  const base = fromOT.length ? fromOT : fallbackRepuestosFromItems(ot.items || [])
  return base.map((r, index) => ({
    id: r.id || `rep-${index + 1}`,
    nombre: r.nombre || r.descripcion || '',
    cantidad: Number(r.cantidad || 1),
    precio: Number(r.precio || r.precio_unitario || 0),
    origen: r.origen || 'manual',
  }))
}

function normalizeInstruccionesOT(ot, repuestos) {
  const fromOT = Array.isArray(ot.instrucciones) ? ot.instrucciones : []
  const base = fromOT.length ? fromOT : fallbackInstruccionesFromItems(ot.items || [], repuestos)
  return base
    .map((ins, index) => ({
      id: ins.id || `ins-${index + 1}`,
      texto: ins.texto || ins.descripcion || '',
      repuestos_ids: Array.isArray(ins.repuestos_ids) ? ins.repuestos_ids : [],
      orden: Number(ins.orden || index + 1),
      completada: Boolean(ins.completada),
    }))
    .sort((a, b) => a.orden - b.orden)
}

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current)
  return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
}

function VehiclePanel({ ot }) {
  const veh = ot.vehiculos || ot.actas?.vehiculos || ot.cotizaciones?.diagnosticos?.actas?.vehiculos || {}
  const cli = ot.clientes  || ot.actas?.clientes  || ot.cotizaciones?.diagnosticos?.actas?.clientes  || {}
  const acta = ot.actas || ot.cotizaciones?.diagnosticos?.actas || {}
  const cot = ot.cotizaciones || {}

  const bullets = [
    veh.marca   && { label: 'Vehículo',    value: `${veh.marca} ${veh.modelo || ''} ${veh.anio || ''}`.trim() },
    veh.patente && { label: 'Patente',     value: veh.patente, mono: true },
    acta.km     && { label: 'Km',          value: `${Number(acta.km).toLocaleString('es-CL')} km` },
    cli.nombre  && { label: 'Cliente',     value: cli.nombre },
    cli.telefono && { label: 'Teléfono',   value: cli.telefono },
    cot.numero_cotizacion && { label: 'Cotización', value: `COT-${cot.numero_cotizacion}` },
    cot.total   && { label: 'Total cot.',  value: money(cot.total) },
  ].filter(Boolean)

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E0E0E0' }}>
      {bullets.map(({ label, value, mono }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: '#AAAAAA', flexShrink: 0 }}>•</span>
          <span style={{ fontSize: 11, color: '#6B6B6B', flexShrink: 0, minWidth: 68 }}>{label}</span>
          <span style={{ fontSize: 12, color: '#111114', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '1px' : 'normal' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function RepuestosPanel({ repuestos, onChange, onAdd, onDelete }) {
  return (
    <div style={{ padding: '12px 20px' }}>
      <SectionTitle title="Repuestos" hint="Materiales aprobados o agregados por torre." />
      {!repuestos.length && <p style={{ color: '#6B6B6B', fontSize: 13 }}>Sin repuestos asociados.</p>}
      {repuestos.map((rep, i) => (
        <div key={rep.id} style={rowBox}>
          <span style={{ fontSize: 10, color: '#AAAAAA', minWidth: 18, textAlign: 'right', paddingTop: 9 }}>{i + 1}</span>
          <input
            value={rep.nombre}
            onChange={(e) => onChange(rep.id, 'nombre', e.target.value)}
            placeholder="Nombre del repuesto"
            style={miniInput({ flex: 1 })}
          />
          <input
            type="number"
            min="0"
            step="1"
            value={rep.cantidad}
            onChange={(e) => onChange(rep.id, 'cantidad', e.target.value)}
            placeholder="Cant."
            style={miniInput({ width: 64, textAlign: 'right' })}
          />
          <input
            type="number"
            min="0"
            step="100"
            value={rep.precio || ''}
            onChange={(e) => onChange(rep.id, 'precio', e.target.value)}
            placeholder="$ opcional"
            style={miniInput({ width: 98, textAlign: 'right' })}
          />
          <button type="button" onClick={() => onDelete(rep.id)} style={iconBtn('#FF453A')}>×</button>
        </div>
      ))}
      <button type="button" onClick={onAdd} style={addBtn}>+ Agregar repuesto</button>
    </div>
  )
}

function InstruccionesPanel({ instrucciones, repuestos, onChange, onToggleRep, onAdd, onDelete, onMove, onDropMove }) {
  return (
    <div style={{ padding: '12px 20px 20px' }}>
      <SectionTitle title="Instrucciones de trabajo" hint="Tareas editables y repuestos que debe usar el técnico." />
      {!instrucciones.length && <p style={{ color: '#6B6B6B', fontSize: 13 }}>Sin instrucciones aún.</p>}
      {instrucciones.map((ins, i) => {
        const asociados = repuestos.filter((r) => ins.repuestos_ids.includes(r.id))
        return (
          <div
            key={ins.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', ins.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDropMove(e.dataTransfer.getData('text/plain'), ins.id)}
            style={{ ...rowBox, alignItems: 'flex-start', padding: 10, cursor: 'grab' }}
          >
            <div style={{ minWidth: 22, paddingTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#a98225' }}>{i + 1}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <textarea
                rows={2}
                value={ins.texto}
                onChange={(e) => onChange(ins.id, 'texto', e.target.value)}
                placeholder="Ej: Cambiar pastillas de freno delanteras"
                style={{ ...miniInput({ width: '100%' }), resize: 'vertical', lineHeight: 1.45 }}
              />
              <div style={{ marginTop: 8 }}>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Repuestos asociados</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {repuestos.map((rep) => {
                    const active = ins.repuestos_ids.includes(rep.id)
                    return (
                      <button
                        key={rep.id}
                        type="button"
                        onClick={() => onToggleRep(ins.id, rep.id)}
                        style={{
                          border: `1px solid ${active ? '#a98225' : '#E0E0E0'}`,
                          background: active ? 'rgba(169,130,37,0.10)' : '#FFFFFF',
                          color: active ? '#a98225' : '#6B6B6B',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {rep.nombre || rep.id}
                      </button>
                    )
                  })}
                  {!repuestos.length && <span style={{ fontSize: 12, color: '#AAAAAA' }}>Agrega repuestos arriba para asociarlos.</span>}
                </div>
                {!!asociados.length && (
                  <p style={{ margin: '7px 0 0', fontSize: 11, color: '#6B6B6B' }}>
                    Usa: {asociados.map((r) => `${r.nombre}${r.cantidad > 1 ? ` x${r.cantidad}` : ''}`).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button type="button" onClick={() => onMove(ins.id, -1)} style={iconBtn('#6B6B6B')}>↑</button>
              <button type="button" onClick={() => onMove(ins.id, 1)} style={iconBtn('#6B6B6B')}>↓</button>
              <button type="button" onClick={() => onDelete(ins.id)} style={iconBtn('#FF453A')}>×</button>
            </div>
          </div>
        )
      })}
      <button type="button" onClick={onAdd} style={addBtn}>+ Agregar instrucción</button>
    </div>
  )
}

function SectionTitle({ title, hint }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#111114' }}>{title}</p>
      {hint && <p style={{ margin: 0, fontSize: 12, color: '#6B6B6B' }}>{hint}</p>}
    </div>
  )
}

const rowBox = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
  padding: '8px 10px',
  background: '#FFFFFF',
  border: '1px solid #E0E0E0',
  borderRadius: 8,
}

function miniInput(extra = {}) {
  return {
    minWidth: 0,
    fontSize: 13,
    border: '1px solid #E0E0E0',
    borderRadius: 6,
    padding: '8px 10px',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#111114',
    background: '#FFFFFF',
    boxSizing: 'border-box',
    ...extra,
  }
}

function iconBtn(color) {
  return {
    width: 28,
    height: 28,
    border: '1px solid #E0E0E0',
    background: '#FFFFFF',
    color,
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 700,
  }
}

const addBtn = {
  marginTop: 4,
  padding: '8px 12px',
  background: 'rgba(169,130,37,0.08)',
  border: '1px solid rgba(169,130,37,0.25)',
  color: '#a98225',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
}

export default function OTForm({ otInicial, onVolver }) {
  const [ot, setOt] = useState(otInicial)
  const initialRepuestos = normalizeRepuestosOT(otInicial)
  const [tecnicos, setTecnicos] = useState([])
  const [tecnicoId, setTecnicoId] = useState('')
  const [tecnico, setTecnico] = useState(otInicial.tecnico_nombre || '')
  const [status, setStatus] = useState(otInicial.status || 'generada')
  const [repuestos, setRepuestos] = useState(initialRepuestos)
  const [instrucciones, setInstrucciones] = useState(() => normalizeInstruccionesOT(otInicial, initialRepuestos))
  const [notasTorre, setNotasTorre] = useState(otInicial.notas_torre || '')
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [activeTab, setActiveTab] = useState('torre')
  const saveTimer = useRef(null)

  useEffect(() => {
    listarTecnicos().then(setTecnicos).catch(() => {})
  }, [])

  const scheduleGuardar = useCallback((payload) => {
    setSaveStatus('unsaved')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await ordenTrabajoService.actualizar(ot.id, payload)
        setSaveStatus('saved')
      } catch { setSaveStatus('error') }
    }, 1400)
  }, [ot.id])

  function touch(next = {}) {
    scheduleGuardar({
      notas_torre: next.notas_torre ?? notasTorre,
      repuestos: next.repuestos ?? repuestos,
      instrucciones: next.instrucciones ?? instrucciones,
    })
  }

  function updateRepuesto(id, field, value) {
    const next = repuestos.map((r) => (
      r.id === id
        ? { ...r, [field]: field === 'cantidad' || field === 'precio' ? Number(value || 0) : value }
        : r
    ))
    setRepuestos(next)
    touch({ repuestos: next })
  }

  function addRepuesto() {
    const next = [...repuestos, { id: uid('rep'), nombre: '', cantidad: 1, precio: 0, origen: 'manual' }]
    setRepuestos(next)
    touch({ repuestos: next })
  }

  function deleteRepuesto(id) {
    const nextRepuestos = repuestos.filter((r) => r.id !== id)
    const nextInstrucciones = instrucciones.map((ins) => ({
      ...ins,
      repuestos_ids: ins.repuestos_ids.filter((repId) => repId !== id),
    }))
    setRepuestos(nextRepuestos)
    setInstrucciones(nextInstrucciones)
    touch({ repuestos: nextRepuestos, instrucciones: nextInstrucciones })
  }

  function updateInstruccion(id, field, value) {
    const next = instrucciones.map((ins) => ins.id === id ? { ...ins, [field]: value } : ins)
    setInstrucciones(next)
    touch({ instrucciones: next })
  }

  function addInstruccion() {
    const next = [...instrucciones, { id: uid('ins'), texto: '', repuestos_ids: [], orden: instrucciones.length + 1, completada: false }]
    setInstrucciones(next)
    touch({ instrucciones: next })
  }

  function deleteInstruccion(id) {
    const next = instrucciones
      .filter((ins) => ins.id !== id)
      .map((ins, index) => ({ ...ins, orden: index + 1 }))
    setInstrucciones(next)
    touch({ instrucciones: next })
  }

  function toggleRepuestoInstruccion(insId, repId) {
    const next = instrucciones.map((ins) => {
      if (ins.id !== insId) return ins
      const has = ins.repuestos_ids.includes(repId)
      return {
        ...ins,
        repuestos_ids: has
          ? ins.repuestos_ids.filter((id) => id !== repId)
          : [...ins.repuestos_ids, repId],
      }
    })
    setInstrucciones(next)
    touch({ instrucciones: next })
  }

  function moveInstruccion(id, delta) {
    const idx = instrucciones.findIndex((ins) => ins.id === id)
    const target = idx + delta
    if (idx < 0 || target < 0 || target >= instrucciones.length) return
    const next = [...instrucciones]
    const [moved] = next.splice(idx, 1)
    next.splice(target, 0, moved)
    const ordered = next.map((ins, index) => ({ ...ins, orden: index + 1 }))
    setInstrucciones(ordered)
    touch({ instrucciones: ordered })
  }

  function dropMoveInstruccion(dragId, targetId) {
    if (!dragId || dragId === targetId) return
    const from = instrucciones.findIndex((ins) => ins.id === dragId)
    const to = instrucciones.findIndex((ins) => ins.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...instrucciones]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    const ordered = next.map((ins, index) => ({ ...ins, orden: index + 1 }))
    setInstrucciones(ordered)
    touch({ instrucciones: ordered })
  }

  async function handleAsignar() {
    if (!tecnicoId) { alert('Selecciona un técnico.'); return }
    setLoading(true)
    try {
      await ordenTrabajoService.asignar(ot.id, tecnicoId, tecnico)
      setStatus('asignada')
      const updated = await ordenTrabajoService.obtener(ot.id)
      setOt(updated)
    } catch (e) { alert(`Error: ${e.message}`) }
    finally { setLoading(false) }
  }

  async function handleAvanzar() {
    const next = nextStatus(status)
    if (!next) return
    setLoading(true)
    try {
      await ordenTrabajoService.actualizar(ot.id, { status: next })
      setStatus(next)
      const updated = await ordenTrabajoService.obtener(ot.id)
      setOt(updated)
    } catch (e) { alert(`Error: ${e.message}`) }
    finally { setLoading(false) }
  }

  const sc = STATUS_LABEL[status] || STATUS_LABEL.generada
  const next = nextStatus(status)
  const historial = ot.historial || []

  const tabBtn = (active) => ({
    flex: 1, padding: '9px 0', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    background: active ? '#FFFFFF' : 'transparent',
    color: active ? '#111114' : '#6B6B6B',
    borderRadius: 8,
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
  })

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #E0E0E0', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10, height: 52, flexShrink: 0 }}>
        <button type="button" onClick={onVolver}
          style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', color: '#111114', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <img src="/logo-secco.png" alt="SECCO" style={{ height: 24, objectFit: 'contain', flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111114' }}>
            OT {ot.numero_ot ? `#${ot.numero_ot}` : ''}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#6B6B6B' }}>Torre de Control</p>
        </div>
        <span style={{ fontSize: 11, flexShrink: 0, color: saveStatus === 'saved' ? '#a98225' : saveStatus === 'saving' ? '#AAAAAA' : '#FF453A' }}>
          {saveStatus === 'saved' ? '✓' : saveStatus === 'saving' ? '…' : '⚠'}
        </span>
        <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, flexShrink: 0 }}>
          {sc.label}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #E0E0E0', flexShrink: 0 }}>
        <div style={{ background: '#F5F5F5', borderRadius: 10, padding: 3, display: 'flex', gap: 3 }}>
          <button style={tabBtn(activeTab === 'torre')} onClick={() => setActiveTab('torre')}>Torre</button>
          <button style={tabBtn(activeTab === 'items')} onClick={() => setActiveTab('items')}>Trabajo ({instrucciones.filter(i => i.texto).length})</button>
          <button style={tabBtn(activeTab === 'historial')} onClick={() => setActiveTab('historial')}>Historial</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Tab: Torre */}
        {activeTab === 'torre' && (
          <>
            <VehiclePanel ot={ot} />

            {/* Asignar técnico */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F2F2F2' }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6B6B6B' }}>Técnico asignado</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={tecnicoId}
                  onChange={(e) => {
                    setTecnicoId(e.target.value)
                    const found = tecnicos.find((t) => t.id === e.target.value)
                    setTecnico(found?.nombre || '')
                  }}
                  style={{ flex: 1, fontSize: 13, border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', color: '#111114', cursor: 'pointer', background: '#FFFFFF', outline: 'none' }}
                >
                  <option value="">— Seleccionar técnico —</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
                <button type="button" onClick={handleAsignar} disabled={loading || !tecnicoId}
                  style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#a98225', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', opacity: !tecnicoId ? 0.5 : 1 }}>
                  {loading ? '…' : 'Asignar'}
                </button>
              </div>
            </div>

            {/* Notas de torre */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F2F2F2' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6B6B6B' }}>Notas internas (torre)</p>
              <textarea
                rows={4}
                value={notasTorre}
                onChange={(e) => { setNotasTorre(e.target.value); touch({ notas_torre: e.target.value }) }}
                placeholder="Instrucciones para el técnico, observaciones del cliente, estado de repuestos..."
                style={{ width: '100%', fontSize: 13, border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: '#111114', boxSizing: 'border-box' }}
              />
            </div>

            {/* Avanzar estado */}
            {next && (
              <div style={{ padding: '16px 20px' }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6B6B6B' }}>Estado</p>
                <button type="button" onClick={handleAvanzar} disabled={loading}
                  style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 700, background: '#a98225', color: '#FFF', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loading ? '…' : `Avanzar a: ${STATUS_LABEL[next]?.label || next} →`}
                </button>
              </div>
            )}
            {!next && (
              <div style={{ padding: '16px 20px' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(34,139,80,0.08)', border: '1px solid rgba(34,139,80,0.25)', borderRadius: 10, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#228b50' }}>OT completada y entregada</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab: Ítems */}
        {activeTab === 'items' && (
          <>
            <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F2F2F2' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6B6B6B' }}>Orden de trabajo</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B6B6B' }}>
                Primero materiales, luego tareas. El técnico verá esta misma separación.
              </p>
            </div>
            <RepuestosPanel
              repuestos={repuestos}
              onChange={updateRepuesto}
              onAdd={addRepuesto}
              onDelete={deleteRepuesto}
            />
            <div style={{ padding: '0 20px' }}>
              <div style={{ height: 1, background: '#E0E0E0', position: 'relative', margin: '4px 0' }}>
                <span style={{ position: 'absolute', left: 0, top: -9, background: '#FFFFFF', color: '#AAAAAA', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', paddingRight: 8 }}>
                  Instrucciones
                </span>
              </div>
            </div>
            <InstruccionesPanel
              instrucciones={instrucciones}
              repuestos={repuestos}
              onChange={updateInstruccion}
              onToggleRep={toggleRepuestoInstruccion}
              onAdd={addInstruccion}
              onDelete={deleteInstruccion}
              onMove={moveInstruccion}
              onDropMove={dropMoveInstruccion}
            />
          </>
        )}

        {/* Tab: Historial */}
        {activeTab === 'historial' && (
          <div style={{ padding: '16px 20px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6B6B6B' }}>Historial de la OT</p>
            {!historial.length && <p style={{ color: '#6B6B6B', fontSize: 13 }}>Sin registros aún.</p>}
            {[...historial].reverse().map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a98225', marginTop: 3 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#111114' }}>{h.accion}</p>
                  {h.nota && <p style={{ margin: '0 0 2px', fontSize: 12, color: '#6B6B6B' }}>{h.nota}</p>}
                  <p style={{ margin: 0, fontSize: 11, color: '#AAAAAA' }}>
                    {h.ts ? new Date(h.ts).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
