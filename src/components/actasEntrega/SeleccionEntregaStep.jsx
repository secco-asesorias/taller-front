import { useEffect, useState } from 'react'
import { useFormEntrega } from '../../context/FormEntregaContext'
import { cargarContextoEntregaPorPatente, aplicarVehiculoYClienteAlForm } from '../../utils/cargarContextoEntregaPorPatente'
import { validarSeleccionEntrega } from '../../utils/validation'
import { listarTecnicos } from '../../context/AuthContext'
import { normalizePatente } from '../../lib/normalizePatente'

function SelectField({ label, value, onChange, options, placeholder, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="s-label">{label}</label>
      <select
        className={`s-input ${error ? 's-input-err' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error ? <p className="s-error">{error}</p> : null}
    </div>
  )
}

function FirmaPreview({ url, alt }) {
  if (!url) return null
  return (
    <img
      src={url}
      alt={alt}
      style={{ maxWidth: '100%', maxHeight: 72, border: '1px solid var(--border)', borderRadius: 8, background: '#FFF' }}
    />
  )
}

export default function SeleccionEntregaStep({ onNext, onBack }) {
  const { formData, updateForm } = useFormEntrega()
  const [patenteInput, setPatenteInput] = useState(formData.patente || '')
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [contexto, setContexto] = useState(null)
  const [clienteId, setClienteId] = useState(formData.cliente_id || '')
  const [trabajoId, setTrabajoId] = useState(formData.trabajo_origen_key || '')
  const [firmaClienteId, setFirmaClienteId] = useState(formData.firma_cliente_key || '')
  const [firmaSeccoId, setFirmaSeccoId] = useState(formData.firma_secco_key || '')
  const [tecnicoId, setTecnicoId] = useState('')
  const [tecnicos, setTecnicos] = useState([])
  const [errores, setErrores] = useState({})

  useEffect(() => {
    listarTecnicos().then(setTecnicos).catch(() => setTecnicos([]))
  }, [])

  useEffect(() => {
    if (!formData.patente || contexto) return
    buscarPatente(formData.patente, { silent: true })
  }, [])

  async function buscarPatente(patenteRaw, { silent = false } = {}) {
    const p = normalizePatente(patenteRaw || patenteInput)
    if (!p) {
      if (!silent) setErrorBusqueda('Ingresa la patente del vehículo')
      return
    }
    setBuscando(true)
    setErrorBusqueda('')
    try {
      const ctx = await cargarContextoEntregaPorPatente(p)
      setContexto(ctx)
      setPatenteInput(p)

      const clienteUnico = ctx.clientes.length === 1 ? ctx.clientes[0] : null
      const cid = formData.cliente_id && ctx.clientes.some((c) => c.id === formData.cliente_id)
        ? formData.cliente_id
        : clienteUnico?.id || ''
      setClienteId(cid || '')

      if (cid && ctx.vehiculo) {
        const cli = ctx.clientes.find((c) => c.id === cid) || clienteUnico
        aplicarVehiculoYClienteAlForm(updateForm, ctx.vehiculo, cli)
      } else {
        updateForm({ patente: p, vehiculo_id: ctx.vehiculo?.id || null })
      }

      if (formData.trabajo_origen_key) {
        setTrabajoId(formData.trabajo_origen_key)
      } else if (ctx.trabajos.length === 1) {
        aplicarTrabajo(ctx.trabajos[0])
      }
      if (formData.firma_cliente_key) setFirmaClienteId(formData.firma_cliente_key)
      if (formData.firma_secco_key) setFirmaSeccoId(formData.firma_secco_key)
    } catch (e) {
      setContexto(null)
      setErrorBusqueda(e?.message || 'No se encontró el vehículo')
    } finally {
      setBuscando(false)
    }
  }

  function aplicarTrabajo(trabajo) {
    if (!trabajo) return
    setTrabajoId(trabajo.id)
    updateForm({
      trabajo_origen_key: trabajo.id,
      trabajo_origen_tipo: trabajo.tipo,
      trabajo_origen_ref_id: trabajo.refId,
      trabajo_realizado: trabajo.texto,
    })
  }

  function aplicarFirmaCliente(opt) {
    if (!opt) return
    setFirmaClienteId(opt.id)
    updateForm({
      firma_cliente_key: opt.id,
      firma_cliente: opt.preview,
      nombre_cliente: opt.nombre || formData.nombre_cliente || formData.nombre,
    })
  }

  function aplicarFirmaSecco(opt) {
    if (!opt) return
    setFirmaSeccoId(opt.id)
    updateForm({
      firma_secco_key: opt.id,
      firma_secco: opt.preview,
      nombre_responsable: opt.nombre || formData.nombre_responsable,
      cargo_responsable: opt.cargo || formData.cargo_responsable,
    })
  }

  function onClienteChange(id) {
    setClienteId(id)
    const cli = contexto?.clientes?.find((c) => c.id === id)
    if (cli && contexto?.vehiculo) aplicarVehiculoYClienteAlForm(updateForm, contexto.vehiculo, cli)
  }

  function onTecnicoChange(id) {
    setTecnicoId(id)
    const t = tecnicos.find((x) => x.id === id)
    if (t) {
      updateForm({
        nombre_responsable: t.nombre || '',
        cargo_responsable: 'Técnico',
      })
    }
  }

  function handleSubmit() {
    if (clienteId && clienteId !== formData.cliente_id) {
      updateForm({ cliente_id: clienteId })
    }
    const datos = {
      ...formData,
      cliente_id: clienteId || formData.cliente_id,
      vehiculo_id: contexto?.vehiculo?.id || formData.vehiculo_id,
      trabajo_realizado: formData.trabajo_realizado,
      firma_cliente: formData.firma_cliente,
      firma_secco: formData.firma_secco,
      nombre_responsable: formData.nombre_responsable,
      cargo_responsable: formData.cargo_responsable,
    }
    const e = validarSeleccionEntrega(datos)
    setErrores(e)
    if (Object.keys(e).length === 0) {
      updateForm({ seleccion_confirmada: true })
      onNext()
    }
  }

  const trabajoOpts = (contexto?.trabajos || []).map((t) => ({ value: t.id, label: t.label }))
  const firmaClienteOpts = (contexto?.firmasCliente || []).map((f) => ({ value: f.id, label: f.label }))
  const firmaSeccoOpts = (contexto?.firmasSecco || []).map((f) => ({ value: f.id, label: f.label }))
  const tecnicoOpts = tecnicos.map((t) => ({ value: t.id, label: t.nombre || 'Sin nombre' }))

  const firmaClienteSel = contexto?.firmasCliente?.find((f) => f.id === firmaClienteId)
  const firmaSeccoSel = contexto?.firmasSecco?.find((f) => f.id === firmaSeccoId)

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--secco-green-dark)', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
          Paso 1
        </p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>
          Vincular registros existentes
        </h2>
        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 13, lineHeight: 1.45 }}>
          La entrega usa un cliente, vehículo, trabajo y firmas que ya estén en el sistema. No se crean datos nuevos en este paso.
        </p>
        <div className="s-divider" style={{ marginTop: 14 }} />
      </div>

      <div className="s-card" style={{ marginBottom: 16 }}>
        <label className="s-label">Patente del vehículo <span style={{ color: 'var(--destructive)' }}>*</span></label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="s-input"
            style={{ fontFamily: 'monospace', letterSpacing: '1px', flex: 1 }}
            placeholder="ABCD12"
            value={patenteInput}
            onChange={(e) => setPatenteInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && buscarPatente()}
          />
          <button
            type="button"
            className="s-btn-primary"
            style={{ width: 'auto', padding: '0 18px', background: 'var(--secco-green-dark)', borderColor: 'var(--secco-green-dark)' }}
            disabled={buscando}
            onClick={() => buscarPatente()}
          >
            {buscando ? '…' : 'Buscar'}
          </button>
        </div>
        {errorBusqueda ? <p className="s-error" style={{ marginTop: 8 }}>{errorBusqueda}</p> : null}
        {errores.patente ? <p className="s-error">{errores.patente}</p> : null}
      </div>

      {contexto?.vehiculo ? (
        <>
          <div className="s-card" style={{ marginBottom: 16, background: 'var(--card)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: 'var(--secco-green-dark)', textTransform: 'uppercase' }}>
              Vehículo encontrado
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, fontFamily: 'monospace' }}>{contexto.patente}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)' }}>
              {[contexto.vehiculo.marca, contexto.vehiculo.modelo, contexto.vehiculo.anio].filter(Boolean).join(' · ')}
            </p>
          </div>

          {contexto.clientes.length > 1 ? (
            <SelectField
              label={<>Cliente registrado <span style={{ color: 'var(--destructive)' }}>*</span></>}
              value={clienteId}
              onChange={onClienteChange}
              options={contexto.clientes.map((c) => ({
                value: c.id,
                label: [c.nombre, c.rut].filter(Boolean).join(' · '),
              }))}
              placeholder="Selecciona el cliente…"
              error={errores.cliente_id}
            />
          ) : contexto.clientes[0] ? (
            <div className="s-card" style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)' }}>CLIENTE</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{contexto.clientes[0].nombre}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>
                {[contexto.clientes[0].rut, contexto.clientes[0].telefono].filter(Boolean).join(' · ')}
              </p>
            </div>
          ) : (
            <p className="s-error" style={{ marginBottom: 16 }}>El vehículo no tiene un cliente vinculado en el sistema.</p>
          )}

          <SelectField
            label={<>Trabajo realizado (desde historial) <span style={{ color: 'var(--destructive)' }}>*</span></>}
            value={trabajoId}
            onChange={(id) => {
              const t = contexto.trabajos.find((x) => x.id === id)
              aplicarTrabajo(t)
            }}
            options={trabajoOpts}
            placeholder={trabajoOpts.length ? 'Selecciona OT, cotización o acta…' : 'Sin trabajos previos para esta patente'}
            error={errores.trabajo_realizado}
          />

          {formData.trabajo_realizado ? (
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 700 }}>Vista previa del trabajo</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--foreground)', whiteSpace: 'pre-wrap', lineHeight: 1.45, maxHeight: 120, overflow: 'auto' }}>
                {formData.trabajo_realizado}
              </p>
            </div>
          ) : null}

          <SelectField
            label={<>Firma del cliente (registro previo) <span style={{ color: 'var(--destructive)' }}>*</span></>}
            value={firmaClienteId}
            onChange={(id) => aplicarFirmaCliente(contexto.firmasCliente.find((f) => f.id === id))}
            options={firmaClienteOpts}
            placeholder={firmaClienteOpts.length ? 'Selecciona una firma guardada…' : 'No hay firmas de cliente en actas previas'}
            error={errores.firma_cliente}
          />
          {firmaClienteSel ? (
            <div style={{ marginBottom: 16 }}>
              <FirmaPreview url={firmaClienteSel.preview} alt="Firma cliente" />
            </div>
          ) : null}

          <SelectField
            label={<>Responsable SECCO (equipo) <span style={{ color: 'var(--destructive)' }}>*</span></>}
            value={tecnicoId}
            onChange={onTecnicoChange}
            options={tecnicoOpts}
            placeholder="Selecciona quién entrega…"
            error={errores.nombre_responsable}
          />

          <SelectField
            label={<>Firma SECCO (registro previo) <span style={{ color: 'var(--destructive)' }}>*</span></>}
            value={firmaSeccoId}
            onChange={(id) => aplicarFirmaSecco(contexto.firmasSecco.find((f) => f.id === id))}
            options={firmaSeccoOpts}
            placeholder={firmaSeccoOpts.length ? 'Selecciona firma del taller…' : 'No hay firmas SECCO previas'}
            error={errores.firma_secco}
          />
          {firmaSeccoSel ? (
            <div style={{ marginBottom: 16 }}>
              <FirmaPreview url={firmaSeccoSel.preview} alt="Firma SECCO" />
              {firmaSeccoSel.nombre ? (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>{firmaSeccoSel.nombre}</p>
              ) : null}
            </div>
          ) : null}

          {!trabajoOpts.length || !firmaClienteOpts.length || !firmaSeccoOpts.length ? (
            <p style={{ fontSize: 12, color: 'var(--secco-gold)', lineHeight: 1.45, marginBottom: 16 }}>
              Faltan registros previos (OT, cotización, acta de ingreso o entrega con firmas). Completa primero el flujo de ingreso/OT en el taller.
            </p>
          ) : null}
        </>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button type="button" className="s-btn-primary" style={{ background: 'var(--secco-green-dark)', borderColor: 'var(--secco-green-dark)' }} onClick={handleSubmit}>
          Continuar
        </button>
        {onBack ? (
          <button type="button" className="s-btn-secondary" onClick={onBack}>Volver</button>
        ) : null}
      </div>
    </div>
  )
}
