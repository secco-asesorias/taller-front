import { useState } from 'react'
import { FormProvider, useForm } from '../../context/FormContext'
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
import { generarPDFActa } from '../../utils/pdf'

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
function ActaFormInner({ onVolver }) {
  const { formData, updateForm, resetForm } = useForm()
  const [seccion, setSeccion] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actaGuardada, setActaGuardada] = useState(false)

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function next() {
    setSeccion((s) => Math.min(s + 1, 8))
    scrollTop()
  }

  function back() {
    setSeccion((s) => Math.max(s - 1, 1))
    scrollTop()
  }

  async function subirFotosActa(actaId) {
    const fotos = formData.fotos || {}
    const singleKeys = ['frontal', 'trasera', 'lateral_izq', 'lateral_der']

    // Foto km
    if (formData.foto_km instanceof File) {
      const reader = new FileReader()
      await new Promise((res) => { reader.onload = res; reader.readAsDataURL(formData.foto_km) })
      const base64 = reader.result.split(',')[1]
      await actaService.subirFoto(actaId, 'km', base64, formData.foto_km.type || 'image/jpeg', 'jpg').catch(() => {})
    }

    // Foto combustible
    if (formData.foto_combustible instanceof File) {
      const reader = new FileReader()
      await new Promise((res) => { reader.onload = res; reader.readAsDataURL(formData.foto_combustible) })
      const base64 = reader.result.split(',')[1]
      await actaService.subirFoto(actaId, 'combustible', base64, formData.foto_combustible.type || 'image/jpeg', 'jpg').catch(() => {})
    }

    // Fotos exteriores single
    for (const key of singleKeys) {
      const file = fotos[`${key}_file`]
      if (file instanceof File) {
        const reader = new FileReader()
        await new Promise((res) => { reader.onload = res; reader.readAsDataURL(file) })
        const base64 = reader.result.split(',')[1]
        await actaService.subirFoto(actaId, key, base64, file.type || 'image/jpeg', 'jpg').catch(() => {})
      }
    }

    // Firmas (base64 ya listas)
    if (formData.firma_cliente) {
      const base64 = formData.firma_cliente.split(',')[1] || formData.firma_cliente
      await actaService.subirFoto(actaId, 'firma_cliente', base64, 'image/png', 'png').catch(() => {})
    }
    if (formData.firma_secco) {
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

      resetForm()
      setActaGuardada(true)
      scrollTop()
    } catch (e) {
      console.error(e)
      setError(`Error al procesar el acta: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (actaGuardada) {
    return <ExitoScreen formData={formData} onVolver={onVolver} />
  }

  return (
    <div style={{ minHeight: '100svh', background: '#FFFFFF' }}>
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
      </div>

      <ProgressBar seccionActual={seccion} />

      <div style={{ paddingTop: 24, paddingBottom: 40 }}>
        {seccion === 1 && <Section1_Cliente onNext={next} />}
        {seccion === 2 && <Section2_Vehiculo onNext={next} onBack={back} />}
        {seccion === 3 && <Section3_Ingreso onNext={next} onBack={back} />}
        {seccion === 4 && <Section4_EstadoVehiculo onNext={next} onBack={back} />}
        {seccion === 5 && (
          <Section5_TrabajoSolicitado
            onNext={next}
            onBack={back}
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
export default function ActaForm({ onVolver }) {
  return (
    <FormProvider>
      <ActaFormInner onVolver={onVolver} />
    </FormProvider>
  )
}
