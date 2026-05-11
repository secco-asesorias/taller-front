import { useState, useEffect } from 'react'
import { useForm } from '../../context/FormContext'
import { validarSeccion6 } from '../../utils/validation'
import SignaturePad from '../common/SignaturePad'

export default function Section6_FirmaCliente({ onNext, onBack }) {
  const { formData, updateForm } = useForm()
  const [errores, setErrores] = useState({})

  useEffect(() => {
    if (!formData.nombre_cliente && formData.nombre)
      updateForm({ nombre_cliente: formData.nombre })
  }, [])

  function handleSubmit() {
    const e = validarSeccion6(formData)
    setErrores(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: '#a98225', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Cliente</p>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>Declaración y Firma</h2>
        <div className="s-divider" />
      </div>

      {/* DeclaraciÃ³n */}
      <div style={{
        background: 'rgba(169,130,37,0.06)', border: '1px solid rgba(169,130,37,0.3)',
        borderRadius: 14, padding: 20, marginBottom: 20,
      }}>
        <p style={{ color: '#a98225', fontStyle: 'italic', fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
          "El cliente declara haber retirado todos sus objetos personales del vehículo."
        </p>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 12 }}>
          <input type="checkbox" className="s-checkbox"
            checked={formData.acepta_declaracion}
            onChange={(e) => updateForm({ acepta_declaracion: e.target.checked })}
          />
          <span style={{ color: '#111114', fontSize: 14, fontWeight: 500 }}>Acepto la declaración anterior</span>
        </label>
        {errores.acepta_declaracion && <p className="s-error">{errores.acepta_declaracion}</p>}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 12 }}>
          <input type="checkbox" className="s-checkbox"
            checked={formData.acepta_responsabilidad_objetos}
            onChange={(e) => updateForm({ acepta_responsabilidad_objetos: e.target.checked })}
          />
          <span style={{ color: '#111114', fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
            Acepto que SECCO no será responsable por objetos personales, accesorios no declarados o bienes no retirados del vehículo antes de la recepción.
          </span>
        </label>
        {errores.acepta_responsabilidad_objetos && <p className="s-error">{errores.acepta_responsabilidad_objetos}</p>}

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <input type="checkbox" className="s-checkbox"
            checked={formData.acepta_pruebas_ruta}
            onChange={(e) => updateForm({ acepta_pruebas_ruta: e.target.checked })}
          />
          <span style={{ color: '#111114', fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
            Autorizo a SECCO a realizar pruebas de ruta cuando el equipo técnico lo estime necesario para diagnosticar o validar el funcionamiento del vehículo.
          </span>
        </label>
        {errores.acepta_pruebas_ruta && <p className="s-error">{errores.acepta_pruebas_ruta}</p>}
      </div>

      {/* Nombre + fecha */}
      <div className="s-card" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <label className="s-label">Nombre del firmante <span style={{ color: '#FF453A' }}>*</span></label>
          <input type="text" autoCapitalize="words"
            value={formData.nombre_cliente}
            onChange={(e) => updateForm({ nombre_cliente: e.target.value })}
            placeholder="Nombre completo"
            className={`s-input ${errores.nombre_cliente ? 's-input-err' : ''}`}
          />
          {errores.nombre_cliente && <p className="s-error">{errores.nombre_cliente}</p>}
        </div>
        <div>
          <label className="s-label">Fecha</label>
          <input type="date" value={formData.fecha_firma_cliente}
            onChange={(e) => updateForm({ fecha_firma_cliente: e.target.value })}
            className="s-input" />
        </div>
      </div>

      {/* Firma */}
      <div className="s-card" style={{ marginBottom: 16 }}>
        <SignaturePad label="Firma del cliente" onChange={(d) => updateForm({ firma_cliente: d })} />
        {errores.firma_cliente && <p className="s-error">{errores.firma_cliente}</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button type="button" onClick={handleSubmit} className="s-btn-primary">Continuar</button>
        <button type="button" onClick={onBack}    className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}

