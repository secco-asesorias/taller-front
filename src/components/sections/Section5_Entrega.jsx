import { useState } from 'react'
import { useFormEntrega } from '../../context/FormEntregaContext'
import { validarSeccion5Entrega } from '../../utils/validation'

export default function Section5_Entrega({ onNext, onBack }) {
  const { formData, updateForm } = useFormEntrega()
  const [errores, setErrores] = useState({})

  function handleSubmit() {
    const e = validarSeccion5Entrega(formData)
    setErrores(e)
    if (Object.keys(e).length === 0) onNext()
  }

  const chars = (formData.trabajo_realizado ?? '').length

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--secco-gold)', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Taller</p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>Trabajo realizado</h2>
        <div className="s-divider" />
      </div>

      <div className="s-card" style={{ marginBottom: 16 }}>
        <label className="s-label">Descripción <span style={{ color: 'var(--destructive)' }}>*</span></label>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Resume los trabajos ejecutados y el estado del vehículo al momento de la entrega.
        </p>
        <textarea
          rows={6}
          value={formData.trabajo_realizado ?? ''}
          onChange={(e) => updateForm({ trabajo_realizado: e.target.value })}
          placeholder="Se realizó cambio de aceite, filtros, revisión de frenos…"
          className={`s-input ${errores.trabajo_realizado ? 's-input-err' : ''}`}
          style={{ resize: 'none' }}
        />
        {errores.trabajo_realizado && <p className="s-error">{errores.trabajo_realizado}</p>}
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--placeholder)', textAlign: 'right' }}>{chars} caracteres</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button type="button" onClick={handleSubmit} className="s-btn-primary">Continuar</button>
        <button type="button" onClick={onBack} className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}
