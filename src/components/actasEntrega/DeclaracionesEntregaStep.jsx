import { useState } from 'react'
import { useFormEntrega } from '../../context/FormEntregaContext'
import { validarDeclaracionesEntrega } from '../../utils/validation'

function FirmaPreview({ url, titulo, subtitulo }) {
  if (!url) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>{titulo}</p>
      <img
        src={url}
        alt={titulo}
        style={{ maxWidth: '100%', maxHeight: 88, border: '1px solid var(--border)', borderRadius: 8, background: '#FFF' }}
      />
      {subtitulo ? <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--foreground)' }}>{subtitulo}</p> : null}
    </div>
  )
}

export default function DeclaracionesEntregaStep({ onNext, onBack, finishLabel = 'Completar entrega' }) {
  const { formData, updateForm } = useFormEntrega()
  const [errores, setErrores] = useState({})

  function handleSubmit() {
    const e = validarDeclaracionesEntrega(formData)
    setErrores(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--secco-green-dark)', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
          Paso 4
        </p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>
          Declaraciones y confirmación
        </h2>
        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 13, lineHeight: 1.45 }}>
          Las firmas provienen de registros previos. Solo confirma las declaraciones legales para cerrar la entrega.
        </p>
        <div className="s-divider" style={{ marginTop: 14 }} />
      </div>

      <div style={{
        background: 'rgba(26,122,52,0.06)', border: '1px solid rgba(26,122,52,0.25)',
        borderRadius: 14, padding: 20, marginBottom: 20,
      }}>
        <p style={{ color: 'var(--secco-green-dark)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
          El cliente declara haber retirado todos sus objetos personales del vehículo y recibir el vehículo en las condiciones descritas en este acta.
        </p>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 12 }}>
          <input
            type="checkbox"
            className="s-checkbox"
            checked={formData.acepta_declaracion}
            onChange={(e) => updateForm({ acepta_declaracion: e.target.checked })}
          />
          <span style={{ color: 'var(--foreground)', fontSize: 14, fontWeight: 500 }}>Acepto la declaración anterior</span>
        </label>
        {errores.acepta_declaracion ? <p className="s-error">{errores.acepta_declaracion}</p> : null}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 12 }}>
          <input
            type="checkbox"
            className="s-checkbox"
            checked={formData.acepta_responsabilidad_objetos}
            onChange={(e) => updateForm({ acepta_responsabilidad_objetos: e.target.checked })}
          />
          <span style={{ color: 'var(--foreground)', fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
            Acepto que SECCO no será responsable por objetos personales o accesorios no retirados del vehículo.
          </span>
        </label>
        {errores.acepta_responsabilidad_objetos ? <p className="s-error">{errores.acepta_responsabilidad_objetos}</p> : null}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            className="s-checkbox"
            checked={formData.acepta_pruebas_ruta}
            onChange={(e) => updateForm({ acepta_pruebas_ruta: e.target.checked })}
          />
          <span style={{ color: 'var(--foreground)', fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
            Autorizo pruebas de ruta cuando el equipo técnico lo estime necesario.
          </span>
        </label>
        {errores.acepta_pruebas_ruta ? <p className="s-error">{errores.acepta_pruebas_ruta}</p> : null}
      </div>

      <div className="s-card" style={{ marginBottom: 16 }}>
        <FirmaPreview
          url={formData.firma_cliente}
          titulo="Firma cliente (registro previo)"
          subtitulo={formData.nombre_cliente || formData.nombre}
        />
        <FirmaPreview
          url={formData.firma_secco}
          titulo="Firma SECCO (registro previo)"
          subtitulo={[formData.nombre_responsable, formData.cargo_responsable].filter(Boolean).join(' · ')}
        />
        {errores.firma_cliente ? <p className="s-error">{errores.firma_cliente}</p> : null}
        {errores.firma_secco ? <p className="s-error">{errores.firma_secco}</p> : null}
        {errores.nombre_cliente ? <p className="s-error">{errores.nombre_cliente}</p> : null}
        {errores.nombre_responsable ? <p className="s-error">{errores.nombre_responsable}</p> : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button type="button" className="s-btn-primary" style={{ background: 'var(--secco-green-dark)', borderColor: 'var(--secco-green-dark)' }} onClick={handleSubmit}>
          {finishLabel}
        </button>
        <button type="button" className="s-btn-secondary" onClick={onBack}>Volver</button>
      </div>
    </div>
  )
}
