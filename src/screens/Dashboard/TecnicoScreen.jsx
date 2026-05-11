import { useState, useEffect } from 'react'
import { listarOTs, listarOTsPorTecnico, cargarOTCompleta, avanzarEstadoOT } from '../../lib/supabase'

const STATUS_FLOW = ['generada', 'asignada', 'en_proceso', 'finalizada', 'entregada']
const STATUS_LABEL = {
  generada:   { label: 'Generada',   bg: '#F5F5F5',              color: '#6B6B6B' },
  asignada:   { label: 'Asignada',   bg: 'rgba(169,130,37,0.12)', color: '#a98225' },
  en_proceso: { label: 'En proceso', bg: 'rgba(80,100,200,0.12)', color: '#5064c8' },
  finalizada: { label: 'Finalizada', bg: 'rgba(34,139,80,0.12)', color: '#228b50' },
  entregada:  { label: 'Entregada',  bg: '#228b50',              color: '#FFFFFF' },
}

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current)
  return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
}

function otPatente(ot) {
  return ot.vehiculos?.patente || ot.actas?.vehiculos?.patente || '—'
}
function otVehiculo(ot) {
  const v = ot.vehiculos || ot.actas?.vehiculos || {}
  return `${v.marca || ''} ${v.modelo || ''}`.trim() || 'Vehículo'
}
function otCliente(ot) {
  return ot.clientes?.nombre || ot.actas?.clientes?.nombre || ''
}
function isManoObra(item) {
  return String(item.tipo || '').toLowerCase().includes('mano')
}
function isRepuesto(item) {
  return String(item.tipo || '').toLowerCase().includes('repuesto')
}
function repuestosOT(ot) {
  const fromOT = Array.isArray(ot.repuestos) ? ot.repuestos : []
  if (fromOT.length) return fromOT
  return (ot.items || [])
    .filter((it) => it.descripcion && isRepuesto(it))
    .map((it, index) => ({
      id: it.id || `rep-${index + 1}`,
      nombre: it.descripcion || '',
      cantidad: Number(it.cantidad || 1),
      precio: Number(it.precio_unitario || 0),
    }))
}
function instruccionesOT(ot, repuestos) {
  const fromOT = Array.isArray(ot.instrucciones) ? ot.instrucciones : []
  if (fromOT.length) return [...fromOT].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0))
  const base = (ot.items || [])
    .filter((it) => it.descripcion && !isRepuesto(it) && !isManoObra(it))
    .map((it, index) => ({
      id: it.id || `ins-${index + 1}`,
      texto: it.descripcion || '',
      repuestos_ids: [],
      orden: index + 1,
    }))
  if (!base.length && repuestos.length) {
    base.push({
      id: 'ins-1-revision-general',
      texto: 'Ejecutar trabajos aprobados según presupuesto y diagnóstico.',
      repuestos_ids: repuestos.map((r) => r.id),
      orden: 1,
    })
  }
  return base
}

function OTCard({ ot, onClick }) {
  const sc = STATUS_LABEL[ot.status] || STATUS_LABEL.generada
  return (
    <button type="button" onClick={() => onClick(ot)}
      style={{
        width: '100%', textAlign: 'left', background: '#FFFFFF',
        border: '1px solid #E0E0E0', borderRadius: 12, padding: '14px 16px',
        cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
      }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {ot.numero_ot && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#a98225', background: 'rgba(169,130,37,0.1)', padding: '2px 7px', borderRadius: 5 }}>
              OT #{ot.numero_ot}
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#6B6B6B', letterSpacing: '1px' }}>
            {otPatente(ot)}
          </span>
        </div>
        <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: 14, color: '#111114' }}>{otVehiculo(ot)}</p>
        <p style={{ margin: 0, fontSize: 12, color: '#6B6B6B' }}>
          {otCliente(ot)}
          {ot.tecnico_nombre && <span> · {ot.tecnico_nombre}</span>}
        </p>
      </div>
      <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, flexShrink: 0 }}>
        {sc.label}
      </span>
    </button>
  )
}

function OTDetail({ otId, onBack }) {
  const [ot, setOt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [avanzando, setAvanzando] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    setLoading(true)
    cargarOTCompleta(otId)
      .then((data) => { setOt(data); setStatus(data.status) })
      .catch((e) => alert(`Error: ${e.message}`))
      .finally(() => setLoading(false))
  }, [otId])

  async function handleAvanzar() {
    const next = nextStatus(status)
    if (!next) return
    setAvanzando(true)
    try {
      await avanzarEstadoOT(otId, next)
      setStatus(next)
      const updated = await cargarOTCompleta(otId)
      setOt(updated)
    } catch (e) { alert(`Error: ${e.message}`) }
    finally { setAvanzando(false) }
  }

  if (loading || !ot) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
        <div style={{ width: 20, height: 20, border: '2px solid #a98225', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando OT…</span>
      </div>
    )
  }

  const sc = STATUS_LABEL[status] || STATUS_LABEL.generada
  const next = nextStatus(status)
  const historial = ot.historial || []
  const veh = ot.vehiculos || ot.actas?.vehiculos || {}
  const cli = ot.clientes || ot.actas?.clientes || {}
  const acta = ot.actas || {}
  const repuestos = repuestosOT(ot)
  const instrucciones = instruccionesOT(ot, repuestos)

  const canAdvance = ['asignada', 'en_proceso'].includes(status)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Sub-header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button type="button" onClick={onBack}
          style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111114' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111114' }}>
            OT {ot.numero_ot ? `#${ot.numero_ot}` : ''} · {veh.marca} {veh.modelo}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#6B6B6B' }}>{cli.nombre || ''} · {veh.patente || ''}</p>
        </div>
        <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, flexShrink: 0 }}>
          {sc.label}
        </span>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>

        {/* Datos rápidos */}
        <div style={{ background: '#F5F5F5', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          {[
            acta.km && ['Km ingreso', `${Number(acta.km).toLocaleString('es-CL')} km`],
            ot.tecnico_nombre && ['Técnico', ot.tecnico_nombre],
            ot.created_at && ['Creada', new Date(ot.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#6B6B6B' }}>{k}</span>
              <span style={{ fontSize: 12, color: '#111114', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Notas de torre */}
        {ot.notas_torre && (
          <div style={{ background: 'rgba(169,130,37,0.06)', border: '1px solid rgba(169,130,37,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#a98225' }}>Instrucciones de torre</p>
            <p style={{ margin: 0, fontSize: 13, color: '#111114', lineHeight: 1.6 }}>{ot.notas_torre}</p>
          </div>
        )}

        {/* Repuestos */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6B6B6B' }}>Repuestos</p>
          {!repuestos.length && <p style={{ margin: 0, fontSize: 13, color: '#6B6B6B' }}>Sin repuestos asociados.</p>}
          {repuestos.map((rep, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: '#AAAAAA', minWidth: 18, textAlign: 'right', flexShrink: 0, paddingTop: 2 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#111114', fontWeight: 500 }}>{rep.nombre || 'Repuesto sin nombre'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B6B6B' }}>Cantidad: {rep.cantidad || 1}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#a98225', flexShrink: 0 }}>
                Material
              </span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: '#E0E0E0', margin: '8px 0 18px' }} />

        {/* Instrucciones */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6B6B6B' }}>Instrucciones de trabajo</p>
          {!instrucciones.length && <p style={{ margin: 0, fontSize: 13, color: '#6B6B6B' }}>Sin instrucciones cargadas.</p>}
          {instrucciones.map((ins, i) => {
            const asociados = repuestos.filter((rep) => (ins.repuestos_ids || []).includes(rep.id))
            return (
              <div key={ins.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, padding: '12px 14px', background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: '#a98225', fontWeight: 700, minWidth: 18, textAlign: 'right', flexShrink: 0, paddingTop: 2 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#111114', fontWeight: 600, lineHeight: 1.45 }}>{ins.texto}</p>
                  {!!asociados.length && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {asociados.map((rep) => (
                        <span key={rep.id} style={{ fontSize: 11, fontWeight: 600, color: '#a98225', background: 'rgba(169,130,37,0.10)', border: '1px solid rgba(169,130,37,0.24)', borderRadius: 6, padding: '3px 7px' }}>
                          {rep.nombre}{rep.cantidad > 1 ? ` x${rep.cantidad}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Avanzar estado */}
        {canAdvance && (
          <button type="button" onClick={handleAvanzar} disabled={avanzando}
            style={{ width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 700, background: '#a98225', color: '#FFF', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
            {avanzando ? '…' : `Marcar "${STATUS_LABEL[next]?.label || next}" →`}
          </button>
        )}
        {status === 'finalizada' && (
          <div style={{ padding: '14px 16px', background: 'rgba(34,139,80,0.08)', border: '1px solid rgba(34,139,80,0.25)', borderRadius: 12, textAlign: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#228b50' }}>Trabajo finalizado — esperando entrega</p>
          </div>
        )}

        {/* Historial compacto */}
        {historial.length > 0 && (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6B6B6B' }}>Historial</p>
            {[...historial].reverse().map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a98225', marginTop: 5, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 1px', fontSize: 12, fontWeight: 600, color: '#111114' }}>{h.accion}</p>
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

export default function TecnicoScreen({ onVolver }) {
  const [ots, setOts] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [otActivaId, setOtActivaId] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('activas')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      const data = await listarOTs(50)
      setOts(data)
    } catch (e) { alert(`Error al cargar OTs: ${e.message}`) }
    finally { setCargando(false) }
  }

  if (otActivaId) {
    return (
      <div style={{ height: '100svh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid #E0E0E0', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10, height: 52, flexShrink: 0 }}>
          <button type="button" onClick={onVolver}
            style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', color: '#111114', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <img src="/logo-secco.png" alt="SECCO" style={{ height: 24, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111114', flex: 1 }}>Vista Técnico</p>
        </div>
        <OTDetail otId={otActivaId} onBack={() => setOtActivaId(null)} />
      </div>
    )
  }

  const activas = (ots || []).filter((ot) => ['asignada', 'en_proceso'].includes(ot.status))
  const otras   = (ots || []).filter((ot) => !['asignada', 'en_proceso'].includes(ot.status))
  const visibles = filtroStatus === 'activas' ? activas : otras

  const tabBtn = (active) => ({
    flex: 1, padding: '9px 0', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    background: active ? '#FFFFFF' : 'transparent',
    color: active ? '#111114' : '#6B6B6B',
    borderRadius: 8,
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
  })

  return (
    <div style={{ minHeight: '100svh', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #E0E0E0', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10, height: 52, flexShrink: 0 }}>
        <button type="button" onClick={onVolver}
          style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', color: '#111114', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <img src="/logo-secco.png" alt="SECCO" style={{ height: 24, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111114', flex: 1 }}>Vista Técnico</p>
        <button type="button" onClick={cargar} disabled={cargando}
          style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B6B' }}
          title="Actualizar">
          {cargando ? <div style={{ width: 14, height: 14, border: '2px solid #a98225', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : '↻'}
        </button>
      </div>

      <div style={{ flex: 1, padding: '16px 16px 40px' }}>

        {/* Tabs */}
        <div style={{ background: '#F5F5F5', borderRadius: 10, padding: 3, display: 'flex', gap: 3, marginBottom: 16 }}>
          <button style={tabBtn(filtroStatus === 'activas')} onClick={() => setFiltroStatus('activas')}>
            En curso ({activas.length})
          </button>
          <button style={tabBtn(filtroStatus === 'otras')} onClick={() => setFiltroStatus('otras')}>
            Otras ({otras.length})
          </button>
        </div>

        {cargando && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
            <div style={{ width: 20, height: 20, border: '2px solid #a98225', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando OTs…</span>
          </div>
        )}

        {!cargando && !visibles.length && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🔧</p>
            <p style={{ color: '#6B6B6B', fontSize: 14, margin: 0 }}>
              {filtroStatus === 'activas' ? 'No hay OTs en curso.' : 'No hay OTs en esta categoría.'}
            </p>
          </div>
        )}

        {!cargando && visibles.map((ot) => (
          <OTCard key={ot.id} ot={ot} onClick={(o) => setOtActivaId(o.id)} />
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
