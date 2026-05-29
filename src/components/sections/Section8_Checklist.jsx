import { useForm } from '../../context/FormContext'

function buildChecklist(formData) {
  const fotosReq = ['frontal', 'trasera', 'lateral_izq', 'lateral_der']
  const todasFotos = fotosReq.every((f) => formData.fotos?.[f])
  const fotosInterior = Array.isArray(formData.fotos?.interior)
    ? formData.fotos.interior
    : (formData.fotos?.interior ? [formData.fotos.interior] : [])
  return [
    {
      id: 'fotos_vehiculo',
      label: 'Fotos del vehículo tomadas correctamente',
      ok: todasFotos && fotosInterior.length > 0,
      detalle: !todasFotos ? 'Faltan fotos de vista exterior' : !fotosInterior.length ? 'Falta foto del interior' : null,
    },
    {
      id: 'km_foto',
      label: 'Kilometraje registrado con evidencia fotográfica',
      ok: !!formData.kilometraje && !!formData.foto_km_preview,
      detalle: !formData.kilometraje ? 'Falta el kilometraje' : !formData.foto_km_preview ? 'Falta la foto del odómetro' : null,
    },
    {
      id: 'combustible_foto',
      label: 'Combustible registrado con evidencia fotográfica',
      ok: !!formData.combustible && !!formData.foto_combustible_preview,
      detalle: !formData.combustible ? 'Falta el nivel de combustible' : !formData.foto_combustible_preview ? 'Falta la foto del indicador' : null,
    },
    {
      id: 'danos',
      label: 'Daños preexistentes registrados',
      ok: !!formData.estado_exterior,
      detalle: !formData.estado_exterior ? 'No se registra el estado exterior' : null,
    },
    {
      id: 'firma_cliente',
      label: 'Cliente firmó conformidad',
      ok: !!formData.firma_cliente && formData.acepta_declaracion,
      detalle: !formData.acepta_declaracion ? 'El cliente no aceptó la declaración' : !formData.firma_cliente ? 'Falta la firma del cliente' : null,
    },
  ]
}

export default function Section8_Checklist({ onFinish, onBack, loading }) {
  const { formData } = useForm()
  const items = buildChecklist(formData)
  const todosOk = items.every((i) => i.ok)

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--secco-gold)', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Revisión final</p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>Checklist de Validación</h2>
        <div className="s-divider" />
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {items.map((item) => (
          <div key={item.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderRadius: 12,
              background: 'var(--background)',
              border: `1px solid ${item.ok ? 'var(--secco-gold-30)' : 'rgba(255,69,58,0.3)'}`,
            }}
            className={item.ok ? 'check-animate' : ''}
          >
            <span style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1,
              background: item.ok ? 'var(--secco-gold)' : 'transparent',
              border: item.ok ? 'none' : '1.5px solid #FF453A',
              color: item.ok ? 'var(--background)' : 'var(--destructive)',
            }}>
              {item.ok ? '' : ''}
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: item.ok ? 'var(--foreground)' : 'var(--destructive)' }}>{item.label}</p>
              {item.detalle && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--destructive)' }}>{item.detalle}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Estado global */}
      {!todosOk ? (
        <div style={{ background: 'var(--secco-red-08)', border: '1px solid var(--secco-red-25)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ color: 'var(--destructive)', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>No se puede cerrar el acta</p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: 0 }}>Corrige los Í­tems marcados en rojo antes de continuar.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--secco-gold-10)', border: '1px solid var(--secco-gold-30)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ color: 'var(--secco-gold)', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>Acta lista para cerrar</p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: 0 }}>Todos los campos requeridos están completos.</p>
        </div>
      )}

      {/* ClÃ¡usula de transparencia */}
      <div style={{
        borderLeft: '3px solid #a98225', background: 'rgba(169,130,37,0.05)',
        borderRadius: '0 10px 10px 0', padding: '14px 16px', marginBottom: 24,
      }}>
        <p style={{ color: 'var(--foreground)', fontStyle: 'italic', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          "SECCO no acepta ni permite incentivos externos que alteren el diagnóstico o recomendación técnica."
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" onClick={onFinish} disabled={!todosOk || loading}
          className="s-btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? (
            <>
              <div style={{ width: 18, height: 18, border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Guardando y generando PDF
            </>
          ) : 'Guardar acta y descargar PDF'}
        </button>
        <button type="button" onClick={onBack} disabled={loading} className="s-btn-secondary">Volver</button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

