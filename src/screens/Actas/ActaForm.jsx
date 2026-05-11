import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, mergeActaIntoInitialForm, useForm } from '../../context/FormContext'
import ProgressBar from '../../components/common/ProgressBar'
import Section1_Cliente from '../../components/sections/Section1_Cliente'
import Section2_Vehiculo from '../../components/sections/Section2_Vehiculo'
import Section3_Ingreso from '../../components/sections/Section3_Ingreso'
import Section4_EstadoVehiculo from '../../components/sections/Section4_EstadoVehiculo'
import Section5_TrabajoSolicitado from '../../components/sections/Section5_TrabajoSolicitado'
import Section6_FirmaCliente from '../../components/sections/Section6_FirmaCliente'
import Section7_RecepcionSECCO from '../../components/sections/Section7_RecepcionSECCO'
import Section8_Checklist from '../../components/sections/Section8_Checklist'
import { actaService } from '../../services/actaService'
import { cotizacionService } from '../../services/cotizacionService'
import { generarPDFActa } from '../../utils/pdf'
import { useToast } from '../../components/common/ToastProvider'
import { extDesdeMime, fileToBase64DataPart } from '../../utils/fotoActa'
import {
  validarSeccion1,
  validarSeccion2,
  validarSeccion3,
  validarSeccion4,
  validarSeccion5,
  validarSeccion6,
  validarSeccion7,
} from '../../utils/validation'
import { supabase } from '../../services/api'

/** Marca/modelo “PENDIENTE” u otros marcadores: el vehículo aún no está capturado de verdad. */
function textoEsPendientePlaceholder(val) {
  const t = String(val ?? '').trim().toUpperCase()
  if (!t) return true
  return ['PENDIENTE', 'PEND.', 'N/A', 'NA', 'SIN DATO', 'SIN_DATO', 'SIN INFO', '—', '-'].includes(t)
}

function parseStoragePublicUrl(url) {
  // Ej: https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
  try {
    const u = new URL(url)
    const m = u.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (!m) return null
    return { bucket: m[1], path: decodeURIComponent(m[2]) }
  } catch {
    return null
  }
}

async function firmarFotosActaSiCorresponde(acta) {
  const fotos = Array.isArray(acta?.fotos_acta) ? acta.fotos_acta : []
  if (!fotos.length) return acta

  // Si el bucket es privado o hay restricciones, un signed URL permite verla en <img>.
  const signed = await Promise.all(fotos.map(async (f) => {
    const url = String(f?.url || '')
    const parsed = parseStoragePublicUrl(url)
    if (!parsed?.bucket || !parsed?.path) return f
    try {
      const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, 60 * 60) // 1h
      if (error || !data?.signedUrl) return f
      return { ...f, url: data.signedUrl }
    } catch {
      return f
    }
  }))

  return { ...acta, fotos_acta: signed }
}

// ── Pantalla de éxito ──────────────────────────────────────────
function ExitoScreen({ formData, onVolver }) {
  return (
    <div className="fade-in" style={{ minHeight: '100svh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(169,130,37,0.10)', border: '2px solid #a98225', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 24, color: '#a98225' }}>
        ✓
      </div>
      <h2 style={{ color: '#111114', fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '0 0 8px' }}>
        Acta completada
      </h2>
      <p style={{ color: '#6B6B6B', fontSize: 14, textAlign: 'center', margin: '0 0 32px' }}>
        El PDF se descargó automáticamente.
      </p>

      <div className="s-card" style={{ width: '100%', maxWidth: 380, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 16, color: '#111114' }}>
              {formData.marca} {formData.modelo}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#6B6B6B' }}>
              {formData.patente} · {formData.anio}
            </p>
          </div>
          {formData.numero_acta && (
            <span style={{ background: '#a98225', color: '#FFFFFF', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 8 }}>
              #{formData.numero_acta}
            </span>
          )}
        </div>
        <div style={{ borderTop: '1px solid #E0E0E0', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            ['Cliente', formData.nombre],
            ['Fecha', formData.fecha_ingreso ? new Date(formData.fecha_ingreso + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : ''],
            ['Kilometraje', formData.kilometraje ? `${Number(formData.kilometraje).toLocaleString('es-CL')} km` : ''],
            ['Responsable', formData.nombre_responsable],
          ].filter(([, v]) => v).map(([k, v]) => (
            <p key={k} style={{ margin: 0, fontSize: 13, color: '#6B6B6B' }}>
              <span style={{ color: '#111114', fontWeight: 500 }}>{k}:</span> {v}
            </p>
          ))}
        </div>
      </div>

      <button type="button" onClick={onVolver} className="s-btn-primary" style={{ maxWidth: 380, width: '100%' }}>
        Volver al inicio
      </button>
    </div>
  )
}

// ── Formulario interno (usa useForm) ───────────────────────────
function ActaFormInner({ onVolver, initialActa }) {
  const toast = useToast()
  const { formData, updateForm, resetForm, cargarDesdeActa } = useForm()
  const [seccion, setSeccion] = useState(1)
  /** Permite volver a pasos ya visitados sin saltar a pasos no alcanzados aún. */
  const [maxSeccionVisitada, setMaxSeccionVisitada] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actaGuardada, setActaGuardada] = useState(false)
  const [saveState, setSaveState] = useState({ state: 'idle', message: '' }) // idle | saving | saved | error
  const lastSavedHashRef = useRef('')
  const [presupuestosSinAsignar, setPresupuestosSinAsignar] = useState([])
  const [cargandoPresupuestos, setCargandoPresupuestos] = useState(false)
  const [asignandoPresupuesto, setAsignandoPresupuesto] = useState(null)
  const [creandoPresupuestoInicial, setCreandoPresupuestoInicial] = useState(false)

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    setMaxSeccionVisitada((m) => Math.max(m, seccion))
  }, [seccion])

  function irASeccion(n) {
    if (n < 1 || n > 8 || n > maxSeccionVisitada || n === seccion) return
    setSeccion(n)
    scrollTop()
  }

  function buildBorradorPayload() {
    // Importante: no enviar File ni previews (fotos se suben por /api/fotos/*).
    // En borrador guardamos el "estado del formulario" para reanudar.
    return {
      // IDs si existen
      acta_id: formData.acta_id || null,
      numero_acta: formData.numero_acta || null,
      cliente_id: formData.cliente_id || null,
      vehiculo_id: formData.vehiculo_id || null,

      // Cliente
      nombre: formData.nombre || '',
      rut: formData.rut || '',
      telefono: formData.telefono || '',
      email: formData.email || '',

      // Vehículo
      marca: formData.marca || '',
      modelo: formData.modelo || '',
      anio: formData.anio || '',
      patente: formData.patente || '',
      vin: formData.vin || null,
      color: formData.color || null,

      // Ingreso
      fecha_ingreso: formData.fecha_ingreso || null,
      hora_ingreso: formData.hora_ingreso || null,
      km: formData.kilometraje !== '' && formData.kilometraje != null ? Number(formData.kilometraje) : null,
      combustible: formData.combustible || null,
      llaves: formData.llaves !== '' && formData.llaves != null ? Number(formData.llaves) : null,
      documentacion: formData.documentacion || [],
      documentacion_otros: formData.documentacion_otros || null,

      // Estado
      estado_exterior: formData.estado_exterior || null,
      detalle_exterior: formData.detalle_exterior || null,
      estado_interior: formData.estado_interior || null,
      detalle_interior: formData.detalle_interior || null,

      // Trabajo
      trabajo_solicitado: formData.trabajo_solicitado || null,

      // Declaración + firma cliente (sin fotos)
      acepta_declaracion: !!formData.acepta_declaracion,
      acepta_responsabilidad_objetos: !!formData.acepta_responsabilidad_objetos,
      acepta_pruebas_ruta: !!formData.acepta_pruebas_ruta,
      nombre_cliente: formData.nombre_cliente || null,
      firma_cliente: formData.firma_cliente || null,
      fecha_firma_cliente: formData.fecha_firma_cliente || null,

      // Recepción SECCO + firma
      nombre_responsable: formData.nombre_responsable || null,
      cargo_responsable: formData.cargo_responsable || null,
      firma_secco: formData.firma_secco || null,
      fecha_firma_secco: formData.fecha_firma_secco || null,

      // Estado del acta
      status: 'borrador',
    }
  }

  const borradorHash = useMemo(() => {
    const p = buildBorradorPayload()
    // Hash simple para evitar POST repetidos idénticos
    return JSON.stringify(p)
  }, [
    formData.acta_id,
    formData.numero_acta,
    formData.cliente_id,
    formData.vehiculo_id,
    formData.nombre,
    formData.rut,
    formData.telefono,
    formData.email,
    formData.marca,
    formData.modelo,
    formData.anio,
    formData.patente,
    formData.vin,
    formData.color,
    formData.fecha_ingreso,
    formData.hora_ingreso,
    formData.kilometraje,
    formData.combustible,
    formData.llaves,
    formData.documentacion,
    formData.documentacion_otros,
    formData.estado_exterior,
    formData.detalle_exterior,
    formData.estado_interior,
    formData.detalle_interior,
    formData.trabajo_solicitado,
    formData.acepta_declaracion,
    formData.acepta_responsabilidad_objetos,
    formData.acepta_pruebas_ruta,
    formData.nombre_cliente,
    formData.firma_cliente,
    formData.fecha_firma_cliente,
    formData.nombre_responsable,
    formData.cargo_responsable,
    formData.firma_secco,
    formData.fecha_firma_secco,
  ])

  /** @returns {Promise<{ actaId: string|null, numeroActa?: number|null }|null>} */
  async function guardarBorrador({ force = false } = {}) {
    // No guardar mientras estamos cerrando/guardando final
    if (loading) return null
    // Evitar guardar borrador vacío
    const tieneAlgo = !!(formData.nombre || formData.rut || formData.patente || formData.acta_id)
    if (!tieneAlgo) return null

    if (!force && borradorHash === lastSavedHashRef.current) {
      return { actaId: formData.acta_id || null, numeroActa: formData.numero_acta ?? null }
    }

    setSaveState({ state: 'saving', message: 'Guardando…' })
    try {
      const payload = JSON.parse(borradorHash)
      const saved = await actaService.guardarBorrador(payload)
      const actaRow = saved?.acta ?? saved
      const actaIdFromSave = actaRow?.id ?? null
      const numeroFromSave = actaRow?.numero_acta ?? null

      // Si backend devuelve IDs, persistirlos en el form (la API devuelve `{ acta, cliente, vehiculo }`).
      if (actaIdFromSave && !formData.acta_id) updateForm({ acta_id: actaIdFromSave })
      if (numeroFromSave != null && !formData.numero_acta) updateForm({ numero_acta: numeroFromSave })
      if (saved?.cliente?.id && !formData.cliente_id) updateForm({ cliente_id: saved.cliente.id })
      if (saved?.vehiculo?.id && !formData.vehiculo_id) updateForm({ vehiculo_id: saved.vehiculo.id })

      lastSavedHashRef.current = borradorHash
      setSaveState({ state: 'saved', message: 'Guardado' })
      return {
        actaId: actaIdFromSave || formData.acta_id || null,
        numeroActa: numeroFromSave ?? formData.numero_acta ?? null,
      }
    } catch (e) {
      setSaveState({ state: 'error', message: e?.message ? `No guardado: ${e.message}` : 'No se pudo guardar' })
      return null
    }
  }

  const cargarPresupuestosSinAsignar = useCallback(async () => {
    setCargandoPresupuestos(true)
    try {
      const rows = await cotizacionService.listar({ limite: 80 })
      const list = Array.isArray(rows) ? rows : []
      const sin = list.filter(
        (c) =>
          !c.acta_id &&
          ['borrador', 'lista', 'enviada'].includes(String(c.status || '').toLowerCase())
      )
      setPresupuestosSinAsignar(sin)
    } catch {
      setPresupuestosSinAsignar([])
    } finally {
      setCargandoPresupuestos(false)
    }
  }, [])

  useEffect(() => {
    if (seccion !== 5) return
    cargarPresupuestosSinAsignar()
  }, [seccion, cargarPresupuestosSinAsignar])

  async function handleCrearPresupuestoInicial() {
    setCreandoPresupuestoInicial(true)
    try {
      const r = await guardarBorrador({ force: true })
      const actaId = r?.actaId
      if (!actaId) {
        toast.error('No hay borrador de acta guardado todavía. Completá cliente, vehículo e ingreso y esperá «Guardado».')
        return
      }
      const cot = await cotizacionService.crearInicialDesdeActa(actaId)
      if (cot?.id) updateForm({ presupuesto_inicial_id: cot.id })
      toast.success('Presupuesto inicial creado y vinculado a esta acta.')
      await cargarPresupuestosSinAsignar()
    } catch (e) {
      toast.error(e?.message ? String(e.message) : 'No se pudo crear el presupuesto')
    } finally {
      setCreandoPresupuestoInicial(false)
    }
  }

  async function handleAsignarPresupuesto(cotId) {
    setAsignandoPresupuesto(cotId)
    try {
      const r = await guardarBorrador({ force: true })
      const actaId = r?.actaId
      if (!actaId) {
        toast.error('Primero debe existir un borrador de acta guardado.')
        return
      }
      await cotizacionService.actualizar(cotId, { acta_id: actaId })
      updateForm({ presupuesto_inicial_id: cotId })
      toast.success('Presupuesto asignado a esta acta.')
      setPresupuestosSinAsignar((prev) => prev.filter((c) => c.id !== cotId))
    } catch (e) {
      toast.error(e?.message ? String(e.message) : 'No se pudo asignar el presupuesto')
    } finally {
      setAsignandoPresupuesto(null)
    }
  }

  function next() {
    guardarBorrador({ force: true }).finally(() => {
      setSeccion((s) => Math.min(s + 1, 8))
      scrollTop()
    })
  }

  function back() {
    setSeccion((s) => Math.max(s - 1, 1))
    scrollTop()
  }

  function calcularSeccionInicialDesdeForm(datos) {
    const e1 = validarSeccion1(datos)
    const clienteOk = datos.cliente_id && Object.keys(e1).length === 0
    if (!clienteOk) return 1

    const e2 = validarSeccion2(datos)
    const vehiculoPlaceholder =
      textoEsPendientePlaceholder(datos.marca) || textoEsPendientePlaceholder(datos.modelo)
    const vehiculoOk =
      datos.vehiculo_id && Object.keys(e2).length === 0 && !vehiculoPlaceholder
    if (!vehiculoOk) return 2

    if (Object.keys(validarSeccion3(datos)).length) return 3
    if (Object.keys(validarSeccion4(datos)).length) return 4
    if (Object.keys(validarSeccion5(datos)).length) return 5
    if (Object.keys(validarSeccion6(datos)).length) return 6
    if (Object.keys(validarSeccion7(datos)).length) return 7
    return 8
  }

  // Cargar acta inicial (modo edición desde detalle)
  useEffect(() => {
    if (!initialActa?.id) return
    // En modo edición, sincronizamos desde el backend para traer TODO el estado de la acta
    // (por ejemplo km/combustible/documentación), no solo cliente/vehículo.
    setSaveState({ state: 'saving', message: 'Sincronizando…' })
    actaService.obtener(initialActa.id)
      .then((full) => {
        return firmarFotosActaSiCorresponde(full)
          .then((fullSigned) => {
            cargarDesdeActa(fullSigned)
            setSaveState({ state: 'saved', message: 'Acta cargada' })
            const datos = mergeActaIntoInitialForm(fullSigned)
            setSeccion(calcularSeccionInicialDesdeForm(datos))
          })
      })
      .catch(() => {
        // Fallback: al menos cargar lo que venía en `initialActa`.
        cargarDesdeActa(initialActa)
        setSaveState({ state: 'saved', message: 'Acta cargada' })
        const datos = mergeActaIntoInitialForm(initialActa)
        setSeccion(calcularSeccionInicialDesdeForm(datos))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActa?.id])

  async function subirFotosActa(actaId) {
    const fotos = formData.fotos || {}
    const singleKeys = ['frontal', 'trasera', 'lateral_izq', 'lateral_der']

    // Foto km
    if (formData.foto_km instanceof File) {
      const base64 = await fileToBase64DataPart(formData.foto_km)
      const mime = formData.foto_km.type || 'image/jpeg'
      await actaService.subirFoto(actaId, 'km', base64, mime, extDesdeMime(mime)).catch(() => {})
    }

    // Foto combustible
    if (formData.foto_combustible instanceof File) {
      const base64 = await fileToBase64DataPart(formData.foto_combustible)
      const mime = formData.foto_combustible.type || 'image/jpeg'
      await actaService.subirFoto(actaId, 'combustible', base64, mime, extDesdeMime(mime)).catch(() => {})
    }

    // Fotos exteriores single
    for (const key of singleKeys) {
      const file = fotos[`${key}_file`]
      if (file instanceof File) {
        const base64 = await fileToBase64DataPart(file)
        const mime = file.type || 'image/jpeg'
        await actaService.subirFoto(actaId, key, base64, mime, extDesdeMime(mime)).catch(() => {})
      }
    }

    // Interior (array de { file?, preview, ... })
    const interiorItems = Array.isArray(fotos.interior) ? fotos.interior : (fotos.interior ? [fotos.interior] : [])
    for (const item of interiorItems) {
      if (item?.file instanceof File) {
        const base64 = await fileToBase64DataPart(item.file)
        const mime = item.file.type || 'image/jpeg'
        await actaService.subirFoto(actaId, 'interior', base64, mime, extDesdeMime(mime)).catch(() => {})
      }
    }

    // Daños adicionales (opcional) — el backend debe aceptar `tipo: "danos"` (o ajustar al contrato real).
    const danosItems = Array.isArray(fotos.danos) ? fotos.danos : []
    for (const item of danosItems) {
      if (item?.file instanceof File) {
        const base64 = await fileToBase64DataPart(item.file)
        const mime = item.file.type || 'image/jpeg'
        await actaService.subirFoto(actaId, 'danos', base64, mime, extDesdeMime(mime)).catch(() => {})
      }
    }

    // Firmas (base64 ya listas)
    if (formData.firma_cliente && String(formData.firma_cliente).startsWith('data:')) {
      const base64 = formData.firma_cliente.split(',')[1] || formData.firma_cliente
      await actaService.subirFoto(actaId, 'firma_cliente', base64, 'image/png', 'png').catch(() => {})
    }
    if (formData.firma_secco && String(formData.firma_secco).startsWith('data:')) {
      const base64 = formData.firma_secco.split(',')[1] || formData.firma_secco
      await actaService.subirFoto(actaId, 'firma_secco', base64, 'image/png', 'png').catch(() => {})
    }
  }

  async function handleFinish() {
    setLoading(true)
    setError(null)
    try {
      if (!formData.patente || !formData.marca) {
        throw new Error('Faltan datos del vehículo. Vuelve a la sección de identificación del vehículo.')
      }

      // Si ya hay un acta_id (borrador guardado) actualizamos, si no, creamos
      let actaId = formData.acta_id
      let numeroActa = formData.numero_acta

      const payload = {
        // IDs (si existen, el backend debería usarlos para evitar duplicados)
        cliente_id: formData.cliente_id || null,
        vehiculo_id: formData.vehiculo_id || null,
        // Cliente
        nombre: formData.nombre,
        rut: formData.rut,
        telefono: formData.telefono,
        email: formData.email,
        // Vehículo
        marca: formData.marca,
        modelo: formData.modelo,
        anio: formData.anio,
        patente: formData.patente,
        vin: formData.vin || null,
        color: formData.color || null,
        // Ingreso
        fecha_ingreso: formData.fecha_ingreso,
        hora_ingreso: formData.hora_ingreso,
        km: Number(formData.kilometraje) || 0,
        combustible: formData.combustible,
        llaves: Number(formData.llaves) || 0,
        documentacion: formData.documentacion || [],
        // Estado
        estado_exterior: formData.estado_exterior,
        detalle_exterior: formData.detalle_exterior || null,
        estado_interior: formData.estado_interior,
        detalle_interior: formData.detalle_interior || null,
        // Trabajo
        trabajo_solicitado: formData.trabajo_solicitado,
        // Firma cliente
        acepta_declaracion: !!formData.acepta_declaracion,
        acepta_responsabilidad_objetos: !!formData.acepta_responsabilidad_objetos,
        acepta_pruebas_ruta: !!formData.acepta_pruebas_ruta,
        nombre_cliente: formData.nombre_cliente || formData.nombre,
        // Responsable SECCO
        tecnico_nombre: formData.nombre_responsable,
        tc_nombre: formData.nombre_responsable,
        cargo_responsable: formData.cargo_responsable || null,
        // Estado final
        checklist_completo: true,
        status: 'cerrada',
      }

      if (actaId) {
        const updated = await actaService.actualizar(actaId, payload)
        numeroActa = updated.numero_acta || numeroActa
      } else {
        const created = await actaService.crear(payload)
        actaId = created.id
        numeroActa = created.numero_acta
        updateForm({ acta_id: actaId, numero_acta: numeroActa })
      }

      // Subir fotos (no bloquear si falla)
      try { await subirFotosActa(actaId) } catch (e) { console.warn('Fotos no subidas:', e.message) }

      // Generar PDF
      await generarPDFActa({ ...formData, acta_id: actaId, numero_acta: numeroActa })

      toast.success('Acta guardada correctamente')
      resetForm()
      setActaGuardada(true)
      scrollTop()
    } catch (e) {
      console.error(e)
      setError(`Error al procesar el acta: ${e.message}`)
      toast.error(e?.message ? `Error al guardar: ${e.message}` : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  if (actaGuardada) {
    return <ExitoScreen formData={formData} onVolver={onVolver} />
  }

  return (
    <div style={{ minHeight: '100svh', background: '#F5F5F5' }}>
      <style>{`
        .acta-stage {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 18px 16px 40px;
        }
        .acta-progressWrap {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
        }
        @media (max-width: 640px) {
          .acta-stage { padding: 14px 10px 32px; }
        }
      `}</style>
      {/* Header */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid #E0E0E0',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <button
          type="button"
          onClick={onVolver}
          style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', color: '#111114', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >←</button>
        <img src="/logo-secco.png" alt="SECCO"
          style={{ height: 28, objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div style={{ flex: 1 }} />
        {(formData.numero_acta || formData.patente) && (
          <span style={{ background: 'rgba(169,130,37,0.10)', color: '#a98225', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 8, fontFamily: 'monospace', border: '1px solid rgba(169,130,37,0.25)' }}>
            {formData.numero_acta ? `#${formData.numero_acta}` : formData.patente}
          </span>
        )}
        <span style={{
          marginLeft: 10,
          fontSize: 12,
          fontWeight: 700,
          color: saveState.state === 'error' ? '#FF453A' : saveState.state === 'saving' ? '#6B6B6B' : '#1a7a34',
          opacity: saveState.state === 'idle' ? 0.0 : 1,
          transition: 'opacity 200ms ease',
          whiteSpace: 'nowrap',
        }}>
          {saveState.message}
        </span>
      </div>

      <div className="acta-progressWrap">
        <ProgressBar
          seccionActual={seccion}
          maxSeccionAlcanzada={maxSeccionVisitada}
          onIrASeccion={irASeccion}
        />
      </div>

      <div className="acta-stage">
        {seccion === 1 && <Section1_Cliente onNext={next} />}
        {seccion === 2 && <Section2_Vehiculo onNext={next} onBack={back} />}
        {seccion === 3 && <Section3_Ingreso onNext={next} onBack={back} />}
        {seccion === 4 && <Section4_EstadoVehiculo onNext={next} onBack={back} />}
        {seccion === 5 && (
          <Section5_TrabajoSolicitado
            onNext={next}
            onBack={back}
            presupuestosSinAsignar={presupuestosSinAsignar}
            cargandoPresupuestos={cargandoPresupuestos}
            asignandoPresupuesto={asignandoPresupuesto}
            presupuestoSeleccionadoId={formData.presupuesto_inicial_id}
            onAsignarPresupuesto={handleAsignarPresupuesto}
            creandoPresupuestoInicial={creandoPresupuestoInicial}
            onCrearPresupuestoInicial={handleCrearPresupuestoInicial}
          />
        )}
        {seccion === 6 && <Section6_FirmaCliente onNext={next} onBack={back} />}
        {seccion === 7 && <Section7_RecepcionSECCO onNext={next} onBack={back} />}
        {seccion === 8 && <Section8_Checklist onFinish={handleFinish} onBack={back} loading={loading} />}
      </div>

      {error && (
        <div style={{
          position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 50,
          background: '#FF453A', color: '#FFFFFF', borderRadius: 14, padding: '14px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 14, flex: 1 }}>{error}</p>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}
    </div>
  )
}

// ── Export principal (envuelve con FormProvider) ───────────────
export default function ActaForm({ onVolver, initialActa }) {
  return (
    <FormProvider restore={false}>
      <ActaFormInner onVolver={onVolver} initialActa={initialActa} />
    </FormProvider>
  )
}
