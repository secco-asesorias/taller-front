import { useMemo, useState } from 'react'
import ProgressBar from '../../components/common/ProgressBar'
import { useMobile } from '../../hooks/useMobile'
import DiagSeccion1_Motor from '../../components/diagnostico/DiagSeccion1_Motor'
import DiagSeccion2_Frenos from '../../components/diagnostico/DiagSeccion2_Frenos'
import DiagSeccion3_SuspDelantera from '../../components/diagnostico/DiagSeccion3_SuspDelantera'
import DiagSeccion4_SuspTrasera from '../../components/diagnostico/DiagSeccion4_SuspTrasera'
import DiagSeccion5_Transmision from '../../components/diagnostico/DiagSeccion5_Transmision'
import DiagSeccion6_Neumaticos from '../../components/diagnostico/DiagSeccion6_Neumaticos'
import DiagSeccion7_Escaneo from '../../components/diagnostico/DiagSeccion7_Escaneo'
import DiagSeccion8_PruebaRuta from '../../components/diagnostico/DiagSeccion8_PruebaRuta'
import DiagSeccion9_DiagFinal from '../../components/diagnostico/DiagSeccion9_DiagFinal'
import { DIAG_SECCIONES, getDiagSeccion } from '../../components/diagnostico/checklistData'
import { useDiagnostico } from '../../context/DiagnosticoContext'
import { diagnosticoService } from '../../services/diagnosticoService'

// Clasifica el tipo de mantención según los ítems urgentes/atención
function clasificarMantencion(items) {
  const urgentes = items.filter((i) => i.estado === 'urgente').length
  const atencion = items.filter((i) => i.estado === 'requiere_atencion').length
  if (urgentes >= 3) return 'full'
  if (urgentes >= 1 || atencion >= 4) return 'intermedia'
  if (atencion >= 1) return 'basica'
  return 'basica'
}

function tipoLabel(tipo) {
  return {
    basica: 'Básica',
    intermedia: 'Intermedia',
    full: 'Full',
    otro: 'Otro',
  }[tipo] || 'Pendiente'
}

const COMMENT_ITEM = 'Comentario general de la sección'

export default function DiagnosticoForm({ onVolver }) {
  const isMobile = useMobile()
  const { diagnosticoData, updateDiagnostico } = useDiagnostico()
  const [seccion, setSeccion] = useState(() => {
    if (diagnosticoData.status !== 'proceso') return 1
    const seccionesGuardadas = Object.values(diagnosticoData.checklist || {})
      .map((row) => Number(row.seccion))
      .filter(Boolean)
    return seccionesGuardadas.length ? Math.min(Math.max(...seccionesGuardadas), 9) : 1
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(false)

  const progressSections = useMemo(() => DIAG_SECCIONES.map(({ num, label }) => ({ num, label })), [])

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    setSeccion((s) => Math.max(s - 1, 1))
    scrollTop()
  }

  function itemsDeSeccion(num) {
    const config = getDiagSeccion(num)
    const checklistItems = config.items.map((item) => {
      const saved = diagnosticoData.checklist?.[`${num}_${item}`]
      return {
        seccion: num,
        item,
        estado: saved?.estado || 'ok',
        observacion: saved?.observacion || '',
      }
    })
    const comment = diagnosticoData.checklist?.[`${num}_${COMMENT_ITEM}`]
    return [
      ...checklistItems,
      {
        seccion: num,
        item: COMMENT_ITEM,
        estado: 'no_aplica',
        observacion: comment?.observacion || '',
      },
    ]
  }

  async function guardarSeccionActual(num) {
    if (!diagnosticoData.diagnostico_id) return
    await diagnosticoService.guardarChecklist(diagnosticoData.diagnostico_id, itemsDeSeccion(num))
    if (diagnosticoData.status === 'pendiente') {
      await diagnosticoService.actualizar(diagnosticoData.diagnostico_id, { status: 'proceso' })
      updateDiagnostico({ status: 'proceso' })
    }
  }

  async function next() {
    setLoading(true)
    setError(null)
    try {
      await guardarSeccionActual(seccion)
      setSeccion((s) => Math.min(s + 1, 9))
      scrollTop()
    } catch (e) {
      setError(`No se pudo guardar la sección: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function finish() {
    setLoading(true)
    setError(null)
    try {
      await guardarSeccionActual(9)

      const checklistCompleto = DIAG_SECCIONES.flatMap((s) => itemsDeSeccion(s.num))
      const tipo = clasificarMantencion(checklistCompleto)

      if (diagnosticoData.diagnostico_id) {
        await diagnosticoService.guardarRepuestos(diagnosticoData.diagnostico_id, diagnosticoData.repuestos)
        await diagnosticoService.actualizar(diagnosticoData.diagnostico_id, {
          status: 'listo',
          tipo_mantencion: tipo,
          tecnico_asignado: diagnosticoData.tecnico_asignado || null,
          horas_estimadas: diagnosticoData.horas_estimadas ? Number(diagnosticoData.horas_estimadas) : null,
          observaciones_generales: diagnosticoData.observaciones_generales || null,
        })
      }

      updateDiagnostico({ status: 'listo', tipo_mantencion: tipo })
      setExito(true)
      scrollTop()
    } catch (e) {
      setError(`No se pudo cerrar el diagnóstico: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (exito) {
    return (
      <div className="fade-in" style={{ minHeight: '100svh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--secco-gold-10)', border: '2px solid #a98225', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 24, color: 'var(--secco-gold)' }}>
          ✓
        </div>
        <h2 style={{ color: 'var(--foreground)', fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '0 0 8px' }}>Diagnóstico listo</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14, textAlign: 'center', margin: '0 0 32px' }}>
          Mantención sugerida: <strong style={{ color: 'var(--secco-gold)' }}>{tipoLabel(diagnosticoData.tipo_mantencion)}</strong>
        </p>

        <div className="s-card" style={{ width: '100%', maxWidth: 380, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 16, color: 'var(--foreground)' }}>
                {diagnosticoData.marca} {diagnosticoData.modelo}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}>
                {diagnosticoData.patente} · {diagnosticoData.anio}
              </p>
            </div>
            {diagnosticoData.numero_diagnostico && (
              <span style={{ background: 'var(--secco-gold)', color: 'var(--background)', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 8 }}>
                DG-{diagnosticoData.numero_diagnostico}
              </span>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}><span style={{ color: 'var(--foreground)', fontWeight: 500 }}>Cliente:</span> {diagnosticoData.nombre_cliente}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}><span style={{ color: 'var(--foreground)', fontWeight: 500 }}>Kilometraje:</span> {Number(diagnosticoData.kilometraje || 0).toLocaleString('es-CL')} km</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}><span style={{ color: 'var(--foreground)', fontWeight: 500 }}>Estado:</span> Listo para presupuesto</p>
          </div>
        </div>

        <button type="button" onClick={onVolver} className="s-btn-primary" style={{ maxWidth: 380, width: '100%' }}>
          Ver detalle del diagnóstico
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--background)' }}>
      <div style={{
        background: 'var(--background)', borderBottom: '1px solid var(--border)',
        padding: isMobile ? '10px 12px' : '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <button type="button" onClick={onVolver}
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >←</button>
        <img src="/logo-secco.png" alt="SECCO"
          style={{ height: 28, objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div style={{ flex: 1 }} />
        <span style={{ background: 'var(--secco-gold-10)', color: 'var(--secco-gold)', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 8, fontFamily: 'monospace', border: '1px solid var(--secco-gold-30)' }}>
          {diagnosticoData.patente || `DG-${diagnosticoData.numero_diagnostico || ''}`}
        </span>
      </div>

      <ProgressBar seccionActual={seccion} secciones={progressSections} />

      <div style={{ paddingTop: 24, paddingBottom: 40 }}>
        {seccion === 1 && <DiagSeccion1_Motor onNext={next} onBack={onVolver} loading={loading} />}
        {seccion === 2 && <DiagSeccion2_Frenos onNext={next} onBack={back} loading={loading} />}
        {seccion === 3 && <DiagSeccion3_SuspDelantera onNext={next} onBack={back} loading={loading} />}
        {seccion === 4 && <DiagSeccion4_SuspTrasera onNext={next} onBack={back} loading={loading} />}
        {seccion === 5 && <DiagSeccion5_Transmision onNext={next} onBack={back} loading={loading} />}
        {seccion === 6 && <DiagSeccion6_Neumaticos onNext={next} onBack={back} loading={loading} />}
        {seccion === 7 && <DiagSeccion7_Escaneo onNext={next} onBack={back} loading={loading} />}
        {seccion === 8 && <DiagSeccion8_PruebaRuta onNext={next} onBack={back} loading={loading} />}
        {seccion === 9 && <DiagSeccion9_DiagFinal onNext={finish} onBack={back} loading={loading} />}
      </div>

      {error && (
        <div style={{
          position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 50,
          background: 'var(--destructive)', color: 'var(--background)', borderRadius: 8, padding: '14px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 14, flex: 1 }}>{error}</p>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--background)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
