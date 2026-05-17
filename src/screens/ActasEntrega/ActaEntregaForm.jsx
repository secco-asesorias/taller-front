import { useEffect, useMemo, useRef, useState } from 'react'

import { FormEntregaProvider, mergeActaEntregaIntoInitialForm, useFormEntrega } from '../../context/FormEntregaContext'

import ProgressBar from '../../components/common/ProgressBar'

import SeleccionEntregaStep from '../../components/actasEntrega/SeleccionEntregaStep'

import Section3_Entrega from '../../components/sections/Section3_Entrega'

import Section4_EstadoVehiculo from '../../components/sections/Section4_EstadoVehiculo'

import DeclaracionesEntregaStep from '../../components/actasEntrega/DeclaracionesEntregaStep'

import { actaEntregaService } from '../../services/actaEntregaService'

import { useToast } from '../../components/common/ToastProvider'

import {

  validarSeleccionEntrega,

  validarSeccion3Entrega,

  validarSeccion4,

  validarDeclaracionesEntrega,

} from '../../utils/validation'



const TOTAL_SECCIONES = 4



const SECCIONES_ENTREGA = [

  { num: 1, label: 'Asignación' },

  { num: 2, label: 'Entrega' },

  { num: 3, label: 'Estado' },

  { num: 4, label: 'Confirmar' },

]



const VARIANT = 'entrega'



function calcularSeccionInicial(datos) {

  if (Object.keys(validarSeleccionEntrega(datos)).length) return 1

  if (Object.keys(validarSeccion3Entrega(datos)).length) return 2

  if (Object.keys(validarSeccion4(datos)).length) return 3

  if (Object.keys(validarDeclaracionesEntrega(datos)).length) return 4

  return 4

}



function ExitoScreen({ formData, onVolver }) {

  return (

    <div className="fade-in" style={{ minHeight: '100svh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(52,199,89,0.12)', border: '2px solid #1a7a34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 24, color: '#1a7a34' }}>

        ✓

      </div>

      <h2 style={{ color: '#111114', fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '0 0 8px' }}>

        Acta de entrega completada

      </h2>

      <p style={{ color: '#6B6B6B', fontSize: 14, textAlign: 'center', margin: '0 0 32px' }}>

        El vehículo quedó registrado como entregado al cliente.

      </p>

      <div className="s-card" style={{ width: '100%', maxWidth: 380, marginBottom: 28 }}>

        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 16, color: '#111114' }}>

          {formData.marca} {formData.modelo}

        </p>

        <p style={{ margin: 0, fontSize: 13, color: '#6B6B6B' }}>

          {formData.patente} · {formData.anio}

        </p>

        {formData.numero_acta_entrega ? (

          <p style={{ margin: '12px 0 0', fontSize: 13, color: '#1a7a34', fontWeight: 700 }}>

            Entrega #{formData.numero_acta_entrega}

          </p>

        ) : null}

      </div>

      <button type="button" onClick={onVolver} className="s-btn-primary" style={{ maxWidth: 380, width: '100%' }}>

        Volver al listado

      </button>

    </div>

  )

}



function ActaEntregaFormInner({ onVolver, initialActa }) {

  const toast = useToast()

  const { formData, updateForm, resetForm, cargarDesdeActa } = useFormEntrega()

  const [seccion, setSeccion] = useState(1)

  const [maxSeccionVisitada, setMaxSeccionVisitada] = useState(1)

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState(null)

  const [completada, setCompletada] = useState(false)

  const [saveState, setSaveState] = useState({ state: 'idle', message: '' })

  const lastSavedHashRef = useRef('')



  useEffect(() => {

    setMaxSeccionVisitada((m) => Math.max(m, seccion))

  }, [seccion])



  function scrollTop() {

    window.scrollTo({ top: 0, behavior: 'smooth' })

  }



  function irASeccion(n) {

    if (n < 1 || n > TOTAL_SECCIONES || n > maxSeccionVisitada || n === seccion) return

    setSeccion(n)

    scrollTop()

  }



  function buildBorradorPayload() {

    return {

      acta_entrega_id: formData.acta_entrega_id || null,

      numero_acta_entrega: formData.numero_acta_entrega || null,

      cliente_id: formData.cliente_id || null,

      vehiculo_id: formData.vehiculo_id || null,

      nombre: formData.nombre || '',

      rut: formData.rut || '',

      telefono: formData.telefono || '',

      email: formData.email || '',

      marca: formData.marca || '',

      modelo: formData.modelo || '',

      anio: formData.anio || '',

      patente: formData.patente || '',

      vin: formData.vin || null,

      color: formData.color || null,

      fecha_entrega: formData.fecha_entrega || null,

      hora_entrega: formData.hora_entrega || null,

      km: formData.kilometraje !== '' && formData.kilometraje != null ? Number(formData.kilometraje) : null,

      combustible: formData.combustible || null,

      llaves: formData.llaves !== '' && formData.llaves != null ? Number(formData.llaves) : null,

      documentacion: formData.documentacion || [],

      documentacion_otros: formData.documentacion_otros || null,

      estado_exterior: formData.estado_exterior || null,

      detalle_exterior: formData.detalle_exterior || null,

      estado_interior: formData.estado_interior || null,

      detalle_interior: formData.detalle_interior || null,

      trabajo_realizado: formData.trabajo_realizado || null,

      trabajo_origen_tipo: formData.trabajo_origen_tipo || null,

      trabajo_origen_ref_id: formData.trabajo_origen_ref_id || null,

      acepta_declaracion: !!formData.acepta_declaracion,

      acepta_responsabilidad_objetos: !!formData.acepta_responsabilidad_objetos,

      acepta_pruebas_ruta: !!formData.acepta_pruebas_ruta,

      nombre_cliente: formData.nombre_cliente || null,

      firma_cliente: formData.firma_cliente || null,

      fecha_firma_cliente: formData.fecha_firma_cliente || null,

      nombre_responsable: formData.nombre_responsable || null,

      cargo_responsable: formData.cargo_responsable || null,

      firma_secco: formData.firma_secco || null,

      fecha_firma_secco: formData.fecha_firma_secco || null,

      status: 'borrador',

    }

  }



  const borradorHash = useMemo(() => JSON.stringify(buildBorradorPayload()), [formData])



  async function guardarBorrador({ force = false } = {}) {

    if (loading) return null

    if (!formData.cliente_id || !formData.vehiculo_id) return null

    if (Object.keys(validarSeleccionEntrega(formData)).length) return null

    if (!force && borradorHash === lastSavedHashRef.current) {

      return { actaId: formData.acta_entrega_id || null, numero: formData.numero_acta_entrega ?? null }

    }

    setSaveState({ state: 'saving', message: 'Guardando…' })

    try {

      const payload = JSON.parse(borradorHash)

      const saved = await actaEntregaService.guardarBorrador(payload)

      const actaRow = saved?.acta_entrega ?? saved?.acta ?? saved

      const actaId = actaRow?.id ?? null

      const numero = actaRow?.numero_acta_entrega ?? actaRow?.numero_acta ?? null

      if (actaId && !formData.acta_entrega_id) updateForm({ acta_entrega_id: actaId })

      if (numero != null && !formData.numero_acta_entrega) updateForm({ numero_acta_entrega: numero })

      lastSavedHashRef.current = borradorHash

      setSaveState({ state: 'saved', message: 'Guardado' })

      return { actaId: actaId || formData.acta_entrega_id, numero }

    } catch (e) {

      setSaveState({ state: 'error', message: e?.message ? `No guardado: ${e.message}` : 'No se pudo guardar' })

      return null

    }

  }



  function next() {

    guardarBorrador({ force: true }).finally(() => {

      setSeccion((s) => Math.min(s + 1, TOTAL_SECCIONES))

      scrollTop()

    })

  }



  function back() {

    setSeccion((s) => Math.max(s - 1, 1))

    scrollTop()

  }



  useEffect(() => {

    if (!initialActa?.id) return

    setSaveState({ state: 'saving', message: 'Sincronizando…' })

    actaEntregaService.obtener(initialActa.id)

      .then((full) => {

        cargarDesdeActa(full)

        setSaveState({ state: 'saved', message: 'Acta cargada' })

        setSeccion(calcularSeccionInicial(mergeActaEntregaIntoInitialForm(full)))

      })

      .catch(() => {

        cargarDesdeActa(initialActa)

        setSaveState({ state: 'saved', message: 'Acta cargada' })

        setSeccion(calcularSeccionInicial(mergeActaEntregaIntoInitialForm(initialActa)))

      })

  }, [initialActa?.id])



  async function handleFinish() {

    setLoading(true)

    setError(null)

    try {

      const errSel = validarSeleccionEntrega(formData)

      if (Object.keys(errSel).length) {

        throw new Error('Completa la asignación de cliente, vehículo, trabajo y firmas existentes.')

      }

      if (!formData.cliente_id || !formData.vehiculo_id) {

        throw new Error('Debes vincular un cliente y vehículo ya registrados.')

      }

      let actaId = formData.acta_entrega_id

      const payload = {

        cliente_id: formData.cliente_id,

        vehiculo_id: formData.vehiculo_id,

        nombre: formData.nombre,

        rut: formData.rut,

        telefono: formData.telefono,

        email: formData.email,

        marca: formData.marca,

        modelo: formData.modelo,

        anio: formData.anio,

        patente: formData.patente,

        vin: formData.vin || null,

        color: formData.color || null,

        fecha_entrega: formData.fecha_entrega,

        hora_entrega: formData.hora_entrega,

        km: Number(formData.kilometraje) || 0,

        combustible: formData.combustible,

        llaves: Number(formData.llaves) || 0,

        documentacion: formData.documentacion || [],

        estado_exterior: formData.estado_exterior,

        detalle_exterior: formData.detalle_exterior || null,

        estado_interior: formData.estado_interior,

        detalle_interior: formData.detalle_interior || null,

        trabajo_realizado: formData.trabajo_realizado,

        trabajo_origen_tipo: formData.trabajo_origen_tipo || null,

        trabajo_origen_ref_id: formData.trabajo_origen_ref_id || null,

        acepta_declaracion: !!formData.acepta_declaracion,

        acepta_responsabilidad_objetos: !!formData.acepta_responsabilidad_objetos,

        acepta_pruebas_ruta: !!formData.acepta_pruebas_ruta,

        nombre_cliente: formData.nombre_cliente || formData.nombre,

        firma_cliente: formData.firma_cliente,

        tecnico_nombre: formData.nombre_responsable,

        tc_nombre: formData.nombre_responsable,

        cargo_responsable: formData.cargo_responsable || null,

        firma_secco: formData.firma_secco,

        checklist_completo: true,

        status: 'cerrada',

      }



      if (actaId) {

        await actaEntregaService.actualizar(actaId, payload)

        await actaEntregaService.cerrar(actaId).catch(() => {})

      } else {

        const created = await actaEntregaService.crear({

          cliente_id: formData.cliente_id,

          vehiculo_id: formData.vehiculo_id,

          ...payload,

        })

        actaId = created.id

        await actaEntregaService.cerrar(actaId).catch(() => {})

      }



      toast.success('Acta de entrega registrada')

      resetForm()

      setCompletada(true)

      scrollTop()

    } catch (e) {

      setError(`Error al procesar el acta: ${e.message}`)

      toast.error(e?.message || 'Error al guardar')

    } finally {

      setLoading(false)

    }

  }



  if (completada) {

    return <ExitoScreen formData={formData} onVolver={onVolver} />

  }



  return (

    <div style={{ minHeight: '100svh', background: '#F5F5F5' }}>

      <div style={{

        background: '#FFFFFF', borderBottom: '1px solid #E0E0E0',

        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,

        position: 'sticky', top: 0, zIndex: 40,

      }}>

        <button type="button" onClick={onVolver} style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', color: '#111114', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer' }}>←</button>

        <img src="/logo-secco.png" alt="SECCO" style={{ height: 28, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />

        <div style={{ flex: 1 }} />

        <span style={{ background: 'rgba(26,122,52,0.10)', color: '#1a7a34', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(26,122,52,0.25)' }}>

          Entrega

        </span>

        {(formData.numero_acta_entrega || formData.patente) && (

          <span style={{ background: 'rgba(169,130,37,0.10)', color: '#a98225', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 8, fontFamily: 'monospace', border: '1px solid rgba(169,130,37,0.25)' }}>

            {formData.numero_acta_entrega ? `#${formData.numero_acta_entrega}` : formData.patente}

          </span>

        )}

        <span style={{ fontSize: 12, fontWeight: 700, color: saveState.state === 'error' ? '#FF453A' : '#1a7a34', marginLeft: 8 }}>

          {saveState.message}

        </span>

      </div>



      <ProgressBar

        seccionActual={seccion}

        secciones={SECCIONES_ENTREGA}

        maxSeccionAlcanzada={maxSeccionVisitada}

        onIrASeccion={irASeccion}

      />



      <div style={{ maxWidth: 960, margin: '0 auto', padding: '18px 16px 40px' }}>

        {seccion === 1 && <SeleccionEntregaStep onNext={next} />}

        {seccion === 2 && <Section3_Entrega onNext={next} onBack={back} />}

        {seccion === 3 && <Section4_EstadoVehiculo onNext={next} onBack={back} variant={VARIANT} />}

        {seccion === 4 && (

          <DeclaracionesEntregaStep

            onNext={handleFinish}

            onBack={back}

            finishLabel={loading ? 'Guardando…' : 'Completar entrega'}

          />

        )}

      </div>



      {error && (

        <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 50, background: '#FF453A', color: '#FFF', borderRadius: 14, padding: '14px 16px' }}>

          <p style={{ margin: 0, fontSize: 14 }}>{error}</p>

        </div>

      )}

    </div>

  )

}



export default function ActaEntregaForm({ onVolver, initialActa }) {

  return (

    <FormEntregaProvider restore={false}>

      <ActaEntregaFormInner onVolver={onVolver} initialActa={initialActa} />

    </FormEntregaProvider>

  )

}

