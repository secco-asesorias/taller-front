import { useState } from 'react'
import { useForm } from '../../context/FormContext'
import { useFormEntrega } from '../../context/FormEntregaContext'
import { validarSeccion7 } from '../../utils/validation'
import SignaturePad from '../common/SignaturePad'

const CARGOS = ['Técnico', 'Torre de Control', 'Jefe de Taller', 'Administración']

export default function Section7_RecepcionSECCO({ onNext, onBack, variant = 'ingreso', finishLabel = 'Continuar' }) {
  const useFormHook = variant === 'entrega' ? useFormEntrega : useForm
  const { formData, updateForm } = useFormHook()
  const [errores, setErrores] = useState({})

  function handleSubmit() {
    const e = validarSeccion7(formData)
    setErrores(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--secco-gold)', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>SECCO</p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>
          {variant === 'entrega' ? 'Entrega SECCO' : 'Recepción SECCO'}
        </h2>
        <div className="s-divider" />
      </div>

      <div className="s-card" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 20 }}>
          <label className="s-label">Nombre del responsable <span style={{ color: 'var(--destructive)' }}>*</span></label>
          <input type="text" autoCapitalize="words"
            value={formData.nombre_responsable}
            onChange={(e) => updateForm({ nombre_responsable: e.target.value })}
            placeholder="Nombre completo"
            className={`s-input ${errores.nombre_responsable ? 's-input-err' : ''}`}
          />
          {errores.nombre_responsable && <p className="s-error">{errores.nombre_responsable}</p>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="s-label">Cargo <span style={{ color: 'var(--destructive)' }}>*</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CARGOS.map((c) => {
              const active = formData.cargo_responsable === c
              return (
                <button key={c} type="button" onClick={() => updateForm({ cargo_responsable: c })}
                  style={{
                    padding: '13px 8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 150ms',
                    border: active ? '1.5px solid #a98225' : '1.5px solid #E0E0E0',
                    background: active ? 'var(--secco-gold-10)' : 'var(--background)',
                    color: active ? 'var(--secco-gold)' : 'var(--muted-foreground)',
                  }}
                >{c}</button>
              )
            })}
          </div>
          {errores.cargo_responsable && <p className="s-error">{errores.cargo_responsable}</p>}
        </div>

        <div>
          <label className="s-label">Fecha</label>
          <input type="date" value={formData.fecha_firma_secco}
            onChange={(e) => updateForm({ fecha_firma_secco: e.target.value })}
            className="s-input" />
        </div>
      </div>

      <div className="s-card" style={{ marginBottom: 16 }}>
        <SignaturePad label="Firma SECCO" onChange={(d) => updateForm({ firma_secco: d })} />
        {errores.firma_secco && <p className="s-error">{errores.firma_secco}</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button type="button" onClick={handleSubmit} className="s-btn-primary">{finishLabel}</button>
        <button type="button" onClick={onBack}    className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}

