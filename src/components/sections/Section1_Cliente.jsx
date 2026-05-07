import { useState } from 'react'
import { useForm } from '../../context/FormContext'
import { validarSeccion1, formatearRUT } from '../../utils/validation'

export default function Section1_Cliente({ onNext }) {
  const { formData, updateForm } = useForm()
  const [errores, setErrores] = useState({})
  const [touched, setTouched] = useState({})

  function handleChange(campo, valor) {
    updateForm({ [campo]: valor })
    if (touched[campo]) {
      const e = validarSeccion1({ ...formData, [campo]: valor })
      setErrores((prev) => ({ ...prev, [campo]: e[campo] }))
    }
  }

  function handleRUT(valor) {
    handleChange('rut', formatearRUT(valor))
  }

  function handleBlur(campo) {
    setTouched((prev) => ({ ...prev, [campo]: true }))
    const e = validarSeccion1(formData)
    setErrores((prev) => ({ ...prev, [campo]: e[campo] }))
  }

  function handleSubmit() {
    const e = validarSeccion1(formData)
    setErrores(e)
    setTouched({ nombre: true, rut: true, telefono: true, email: true })
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="section-enter" style={{ padding: '14px 12px 40px' }}>
      <style>{`
        .s1-wrap { display: flex; justify-content: center; }
        .s1-card { width: 100%; max-width: 560px; }
        .s1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .s1-footer { position: sticky; bottom: 0; padding-top: 14px; margin-top: 18px; background: linear-gradient(to bottom, rgba(245,245,245,0), rgba(245,245,245,1) 35%); }

        @media (max-width: 640px) {
          .s1-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="s1-wrap">
        <div className="s-card s1-card">
          {/* Header de sección */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ color: '#a98225', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 6px' }}>
              Torre de Control
            </p>
            <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px', margin: 0 }}>
              Datos del cliente
            </h2>
            <p style={{ margin: '6px 0 0', color: '#6B6B6B', fontSize: 13, lineHeight: 1.35 }}>
              Completa la información para continuar con la recepción.
            </p>
            <div className="s-divider" style={{ marginBottom: 0 }} />
          </div>

          <div className="s1-grid">
            {/* Nombre */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="s-label">Nombre completo <span style={{ color: '#FF453A' }}>*</span></label>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="words"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                onBlur={() => handleBlur('nombre')}
                placeholder="Juan Pérez González"
                className={`s-input ${errores.nombre ? 's-input-err' : ''}`}
              />
              {errores.nombre && <p className="s-error">⚠ {errores.nombre}</p>}
            </div>

            {/* RUT */}
            <div>
              <label className="s-label">RUT <span style={{ color: '#FF453A' }}>*</span></label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.rut}
                onChange={(e) => handleRUT(e.target.value)}
                onBlur={() => handleBlur('rut')}
                placeholder="12.345.678-9"
                maxLength={12}
                className={`s-input ${errores.rut ? 's-input-err' : ''}`}
                style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
              />
              {errores.rut && <p className="s-error">⚠ {errores.rut}</p>}
            </div>

            {/* Teléfono */}
            <div>
              <label className="s-label">Teléfono <span style={{ color: '#FF453A' }}>*</span></label>
              <input
                type="tel"
                inputMode="tel"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                onBlur={() => handleBlur('telefono')}
                placeholder="+56 9 1234 5678"
                className={`s-input ${errores.telefono ? 's-input-err' : ''}`}
              />
              {errores.telefono && <p className="s-error">⚠ {errores.telefono}</p>}
            </div>

            {/* Email */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="s-label">Correo electrónico <span style={{ color: '#FF453A' }}>*</span></label>
              <input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="cliente@ejemplo.cl"
                className={`s-input ${errores.email ? 's-input-err' : ''}`}
              />
              {errores.email && <p className="s-error">⚠ {errores.email}</p>}
            </div>
          </div>

          <div className="s1-footer">
            <button type="button" onClick={handleSubmit} className="s-btn-primary">
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

