import { useEffect, useMemo, useState } from 'react'
import { clienteService } from '../../services/clienteService'
import { useToast } from '../../components/common/ToastProvider'
import { vehiculoService } from '../../services/vehiculoService'
import { useConfirm } from '../../components/common/ConfirmProvider'
import PatenteLink from '../../components/vehiculo/PatenteLink'

export default function ClientesListScreen({ onNavigate }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ nombre: '', rut: '', telefono: '', email: '' })
  const [vehiculosOpen, setVehiculosOpen] = useState({}) // { [clienteId]: boolean }
  const [vehiculosByCliente, setVehiculosByCliente] = useState({}) // { [clienteId]: vehiculos[] }
  const [vehiculosLoading, setVehiculosLoading] = useState({}) // { [clienteId]: boolean }
  const [detalleCliente, setDetalleCliente] = useState(null)
  const [detalleVehiculo, setDetalleVehiculo] = useState(null)
  const [vehiculoModalOpen, setVehiculoModalOpen] = useState(false)
  const [vehiculoSaving, setVehiculoSaving] = useState(false)
  const [vehiculoEditId, setVehiculoEditId] = useState(null)
  const [vehiculoForm, setVehiculoForm] = useState({ cliente_id: '', patente: '', marca: '', modelo: '', anio: '', vin: '', color: '' })

  function cargar() {
    setLoading(true)
    setError('')
    clienteService.listar({ limite: 100 })
      .then(setClientes)
      .catch((err) => setError(err.message || 'Error al cargar clientes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    if (!filtro) return clientes
    const q = filtro.toLowerCase()
    return clientes.filter((c) => (
      c.nombre?.toLowerCase().includes(q) ||
      c.rut?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefono?.includes(q)
    ))
  }, [clientes, filtro])

  function openNuevo() {
    setEditId(null)
    setForm({ nombre: '', rut: '', telefono: '', email: '' })
    setModalOpen(true)
  }

  function openEditar(cliente) {
    setEditId(cliente.id)
    setForm({
      nombre: cliente.nombre || '',
      rut: cliente.rut || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
    })
    setModalOpen(true)
  }

  function openDetalleCliente(cliente) {
    setDetalleCliente(cliente)
  }

  function closeDetalleCliente() {
    setDetalleCliente(null)
  }

  async function handleEliminar(cliente) {
    const ok = await confirm({
      title: 'Eliminar cliente',
      message: `¿Eliminar el cliente "${cliente.nombre}"?`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await clienteService.eliminar(cliente.id)
      toast.success('Cliente eliminado')
      cargar()
    } catch (e) {
      toast.error(e?.message ? `Error al eliminar: ${e.message}` : 'Error al eliminar')
    }
  }

  async function handleEliminarDesdeDetalle(cliente) {
    await handleEliminar(cliente)
    closeDetalleCliente()
  }

  async function handleGuardar() {
    if (!form.nombre?.trim()) {
      toast.warning('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      if (editId) {
        await clienteService.actualizar(editId, form)
        toast.success('Cliente actualizado')
      } else {
        await clienteService.crear(form)
        toast.success('Cliente creado')
      }
      setModalOpen(false)
      cargar()
    } catch (e) {
      toast.error(e?.message ? `Error al guardar: ${e.message}` : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleVehiculos(clienteId) {
    setVehiculosOpen((p) => ({ ...p, [clienteId]: !p[clienteId] }))
    const willOpen = !vehiculosOpen[clienteId]
    if (!willOpen) return

    if (vehiculosByCliente[clienteId]) return
    setVehiculosLoading((p) => ({ ...p, [clienteId]: true }))
    try {
      const vehs = await vehiculoService.listarPorCliente(clienteId)
      setVehiculosByCliente((p) => ({ ...p, [clienteId]: Array.isArray(vehs) ? vehs : [] }))
    } catch (e) {
      toast.error(e?.message ? `Error al cargar vehículos: ${e.message}` : 'Error al cargar vehículos')
      setVehiculosByCliente((p) => ({ ...p, [clienteId]: [] }))
    } finally {
      setVehiculosLoading((p) => ({ ...p, [clienteId]: false }))
    }
  }

  function openDetalleVehiculo(v) {
    setDetalleVehiculo(v)
  }

  function closeDetalleVehiculo() {
    setDetalleVehiculo(null)
  }

  function openNuevoVehiculo(cliente) {
    setVehiculoEditId(null)
    setVehiculoForm({ cliente_id: cliente.id, patente: '', marca: '', modelo: '', anio: '', vin: '', color: '' })
    setVehiculoModalOpen(true)
  }

  function openEditarVehiculo(cliente, v) {
    setVehiculoEditId(v.id)
    setVehiculoForm({
      cliente_id: cliente.id,
      patente: v.patente || '',
      marca: v.marca || '',
      modelo: v.modelo || '',
      anio: v.anio || '',
      vin: v.vin || '',
      color: v.color || '',
    })
    setVehiculoModalOpen(true)
  }

  async function handleGuardarVehiculo() {
    if (!vehiculoForm.cliente_id) {
      toast.error('Falta cliente_id para el vehículo')
      return
    }
    if (!vehiculoForm.patente?.trim()) {
      toast.warning('La patente es obligatoria')
      return
    }
    setVehiculoSaving(true)
    try {
      const payload = {
        cliente_id: vehiculoForm.cliente_id,
        patente: String(vehiculoForm.patente || '').trim().toUpperCase(),
        marca: vehiculoForm.marca || null,
        modelo: vehiculoForm.modelo || null,
        anio: vehiculoForm.anio ? Number(vehiculoForm.anio) : null,
        vin: vehiculoForm.vin || null,
        color: vehiculoForm.color || null,
      }

      if (vehiculoEditId) {
        await vehiculoService.actualizar(vehiculoEditId, payload)
        toast.success('Vehículo actualizado')
      } else {
        await vehiculoService.crear(payload)
        toast.success('Vehículo creado')
      }

      // refrescar cache de vehículos del cliente
      const clienteId = vehiculoForm.cliente_id
      const vehs = await vehiculoService.listarPorCliente(clienteId).catch(() => null)
      if (Array.isArray(vehs)) setVehiculosByCliente((p) => ({ ...p, [clienteId]: vehs }))

      setVehiculoModalOpen(false)
      setVehiculoEditId(null)
    } catch (e) {
      toast.error(e?.message ? `Error al guardar vehículo: ${e.message}` : 'Error al guardar vehículo')
    } finally {
      setVehiculoSaving(false)
    }
  }

  async function handleEliminarVehiculo(clienteId, v) {
    const ok = await confirm({
      title: 'Eliminar vehículo',
      message: `¿Eliminar el vehículo "${v.patente || ''}"?`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await vehiculoService.eliminar(v.id)
      toast.success('Vehículo eliminado')
      const vehs = await vehiculoService.listarPorCliente(clienteId).catch(() => null)
      if (Array.isArray(vehs)) setVehiculosByCliente((p) => ({ ...p, [clienteId]: vehs }))
      closeDetalleVehiculo()
    } catch (e) {
      toast.error(e?.message ? `Error al eliminar vehículo: ${e.message}` : 'Error al eliminar vehículo')
    }
  }

  return (
    <div style={{ padding: '14px 12px 40px' }}>
      <style>{`
        .cli-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .cli-list { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 820px) { .cli-list { grid-template-columns: 1fr 1fr; gap: 12px; } }
      `}</style>

      <div className="cli-toolbar">
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 800, margin: 0 }}>Clientes</h2>
          <p style={{ margin: '4px 0 0', color: '#6B6B6B', fontSize: 12 }}>
            {loading ? 'Cargando...' : `${filtrados.length} resultado${filtrados.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button className="s-btn-primary" style={{ width: 'auto', height: 40, padding: '9px 14px', fontSize: 13 }} onClick={openNuevo}>
          + Nuevo
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre, RUT, email..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="s-input"
        style={{ marginBottom: 14 }}
      />

      {error && <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando clientes...</p>
        </div>
      ) : (
        <div className="cli-list">
          {filtrados.map((cliente) => (
            <div
              key={cliente.id}
              style={{
                padding: 16,
                border: '1.5px solid #E0E0E0',
                borderRadius: 14,
                background: '#FFFFFF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', color: '#111114', fontSize: 15, fontWeight: 700 }}>
                    {cliente.nombre}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {cliente.rut && (
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>
                        RUT: <span style={{ color: '#111114', fontFamily: 'monospace' }}>{cliente.rut}</span>
                      </p>
                    )}
                    {cliente.telefono && (
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>
                        Tel: {cliente.telefono}
                      </p>
                    )}
                    {cliente.email && (
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cliente.email}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => openDetalleCliente(cliente)}
                    style={{
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 10,
                      border: '1.5px solid rgba(0,0,0,0.10)',
                      background: '#FFFFFF',
                      color: '#111114',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Detalle
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVehiculos(cliente.id)}
                    style={{
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 10,
                      border: '1.5px solid rgba(169,130,37,0.30)',
                      background: 'rgba(169,130,37,0.08)',
                      color: '#6b4f10',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {vehiculosOpen[cliente.id] ? 'Ocultar' : 'Vehículos'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditar(cliente)}
                    style={{
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 10,
                      border: '1.5px solid rgba(30,58,138,0.25)',
                      background: 'rgba(30,58,138,0.06)',
                      color: '#1e3a8a',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEliminar(cliente)}
                    style={{
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 10,
                      border: '1.5px solid rgba(255,69,58,0.35)',
                      background: 'rgba(255,69,58,0.08)',
                      color: '#b42318',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {vehiculosOpen[cliente.id] && (
                <div style={{ marginTop: 12, background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 12, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <p style={{ margin: 0, color: '#6B6B6B', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Vehículos
                    </p>
                    <button
                      type="button"
                      onClick={() => openNuevoVehiculo(cliente)}
                      style={{
                        height: 30,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1.5px solid rgba(169,130,37,0.35)',
                        background: '#FFFFFF',
                        color: '#a98225',
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      + Agregar
                    </button>
                  </div>
                  {vehiculosLoading[cliente.id] ? (
                    <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>Cargando…</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(vehiculosByCliente[cliente.id] || []).map((v) => (
                        <div key={v.id} style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#111114' }}>
                                {v.patente ? (
                                  <PatenteLink patente={v.patente} mono style={{ fontWeight: 800, color: '#111114', textDecoration: 'none' }} />
                                ) : '—'}
                                {v.marca ? ` · ${v.marca}` : ''} {v.modelo ? `${v.modelo}` : ''}
                              </p>
                              {(v.anio || v.vin || v.color) && (
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B6B6B' }}>
                                  {v.anio ? `Año ${v.anio}` : ''}
                                  {v.anio && (v.vin || v.color) ? ' · ' : ''}
                                  {v.color || ''}
                                  {(v.color && v.vin) ? ' · ' : ''}
                                  {v.vin ? `VIN ${v.vin}` : ''}
                                </p>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => openDetalleVehiculo(v)}
                                style={{ height: 30, padding: '0 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#FFFFFF', color: '#111114', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                Detalle
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditarVehiculo(cliente, v)}
                                style={{ height: 30, padding: '0 10px', borderRadius: 10, border: '1px solid rgba(30,58,138,0.22)', background: 'rgba(30,58,138,0.06)', color: '#1e3a8a', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarVehiculo(cliente.id, v)}
                                style={{ height: 30, padding: '0 10px', borderRadius: 10, border: '1px solid rgba(255,69,58,0.35)', background: 'rgba(255,69,58,0.08)', color: '#b42318', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!vehiculosByCliente[cliente.id] || vehiculosByCliente[cliente.id].length === 0) && (
                        <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>Sin vehículos asociados</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {!filtrados.length && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#6B6B6B', fontSize: 14 }}>
                {filtro ? 'Sin resultados para tu búsqueda' : 'No hay clientes registrados'}
              </p>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div>
          <div
            onClick={() => !saving && setModalOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', zIndex: 70 }}
          />
          <div style={{
            position: 'fixed',
            left: 12,
            right: 12,
            top: '10vh',
            zIndex: 71,
            display: 'flex',
            justifyContent: 'center',
          }}>
            <div className="s-card" style={{ width: '100%', maxWidth: 520, background: '#FFFFFF', border: '1.5px solid #E0E0E0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#111114' }}>
                    {editId ? 'Editar cliente' : 'Nuevo cliente'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B6B6B' }}>
                    Completa los datos y guarda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, fontWeight: 900, lineHeight: 1, padding: 0, color: '#6B6B6B', opacity: saving ? 0.4 : 1 }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="s-label">Nombre <span style={{ color: '#FF453A' }}>*</span></label>
                  <input className="s-input" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div>
                  <label className="s-label">RUT</label>
                  <input className="s-input" value={form.rut} onChange={(e) => setForm((p) => ({ ...p, rut: e.target.value }))} />
                </div>
                <div>
                  <label className="s-label">Teléfono</label>
                  <input className="s-input" value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="s-label">Email</label>
                  <input className="s-input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="s-btn-secondary" type="button" disabled={saving} onClick={() => setModalOpen(false)} style={{ height: 44 }}>
                  Cancelar
                </button>
                <button className="s-btn-primary" type="button" disabled={saving} onClick={handleGuardar} style={{ height: 44 }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!!detalleCliente && (
        <div>
          <div onClick={closeDetalleCliente} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', zIndex: 72 }} />
          <div style={{ position: 'fixed', left: 12, right: 12, top: '10vh', zIndex: 73, display: 'flex', justifyContent: 'center' }}>
            <div className="s-card" style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', border: '1.5px solid #E0E0E0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#111114' }}>Detalle cliente</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B6B6B' }}>{detalleCliente.nombre}</p>
                </div>
                <button type="button" onClick={closeDetalleCliente} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, fontWeight: 900, lineHeight: 1, padding: 0, color: '#6B6B6B' }}>×</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="s-label">Nombre</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA' }}>{detalleCliente.nombre || '—'}</div>
                </div>
                <div>
                  <label className="s-label">RUT</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA', fontFamily: 'monospace' }}>{detalleCliente.rut || '—'}</div>
                </div>
                <div>
                  <label className="s-label">Teléfono</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA' }}>{detalleCliente.telefono || '—'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="s-label">Email</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA' }}>{detalleCliente.email || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="s-btn-secondary" type="button" onClick={() => { closeDetalleCliente(); openEditar(detalleCliente) }} style={{ height: 44 }}>
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleEliminarDesdeDetalle(detalleCliente)}
                  style={{ height: 44, width: '100%', borderRadius: 12, border: '1.5px solid rgba(255,69,58,0.35)', background: 'rgba(255,69,58,0.08)', color: '#b42318', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!!detalleVehiculo && (
        <div>
          <div onClick={closeDetalleVehiculo} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', zIndex: 72 }} />
          <div style={{ position: 'fixed', left: 12, right: 12, top: '10vh', zIndex: 73, display: 'flex', justifyContent: 'center' }}>
            <div className="s-card" style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', border: '1.5px solid #E0E0E0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#111114' }}>Detalle vehículo</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B6B6B' }}>
                    {detalleVehiculo.patente ? (
                      <PatenteLink patente={detalleVehiculo.patente} mono />
                    ) : '—'}
                  </p>
                </div>
                <button type="button" onClick={closeDetalleVehiculo} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, fontWeight: 900, lineHeight: 1, padding: 0, color: '#6B6B6B' }}>×</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="s-label">Patente</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA', fontFamily: 'monospace' }}>{detalleVehiculo.patente || '—'}</div>
                </div>
                <div>
                  <label className="s-label">Año</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA' }}>{detalleVehiculo.anio || '—'}</div>
                </div>
                <div>
                  <label className="s-label">Marca</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA' }}>{detalleVehiculo.marca || '—'}</div>
                </div>
                <div>
                  <label className="s-label">Modelo</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA' }}>{detalleVehiculo.modelo || '—'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="s-label">Color</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA' }}>{detalleVehiculo.color || '—'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="s-label">VIN</label>
                  <div className="s-input" style={{ padding: '14px 16px', fontSize: 15, background: '#FAFAFA', fontFamily: 'monospace' }}>{detalleVehiculo.vin || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {vehiculoModalOpen && (
        <div>
          <div onClick={() => !vehiculoSaving && setVehiculoModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', zIndex: 72 }} />
          <div style={{ position: 'fixed', left: 12, right: 12, top: '10vh', zIndex: 73, display: 'flex', justifyContent: 'center' }}>
            <div className="s-card" style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', border: '1.5px solid #E0E0E0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#111114' }}>
                    {vehiculoEditId ? 'Editar vehículo' : 'Nuevo vehículo'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B6B6B' }}>Asociado al cliente</p>
                </div>
                <button type="button" onClick={() => setVehiculoModalOpen(false)} disabled={vehiculoSaving} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, fontWeight: 900, lineHeight: 1, padding: 0, color: '#6B6B6B', opacity: vehiculoSaving ? 0.4 : 1 }}>×</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="s-label">Patente <span style={{ color: '#FF453A' }}>*</span></label>
                  <input className="s-input" value={vehiculoForm.patente} onChange={(e) => setVehiculoForm((p) => ({ ...p, patente: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className="s-label">Año</label>
                  <input className="s-input" value={vehiculoForm.anio} onChange={(e) => setVehiculoForm((p) => ({ ...p, anio: e.target.value }))} />
                </div>
                <div>
                  <label className="s-label">Marca</label>
                  <input className="s-input" value={vehiculoForm.marca} onChange={(e) => setVehiculoForm((p) => ({ ...p, marca: e.target.value }))} />
                </div>
                <div>
                  <label className="s-label">Modelo</label>
                  <input className="s-input" value={vehiculoForm.modelo} onChange={(e) => setVehiculoForm((p) => ({ ...p, modelo: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="s-label">Color</label>
                  <input className="s-input" value={vehiculoForm.color} onChange={(e) => setVehiculoForm((p) => ({ ...p, color: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="s-label">VIN</label>
                  <input className="s-input" value={vehiculoForm.vin} onChange={(e) => setVehiculoForm((p) => ({ ...p, vin: e.target.value.toUpperCase() }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="s-btn-secondary" type="button" disabled={vehiculoSaving} onClick={() => setVehiculoModalOpen(false)} style={{ height: 44 }}>
                  Cancelar
                </button>
                <button className="s-btn-primary" type="button" disabled={vehiculoSaving} onClick={handleGuardarVehiculo} style={{ height: 44 }}>
                  {vehiculoSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
