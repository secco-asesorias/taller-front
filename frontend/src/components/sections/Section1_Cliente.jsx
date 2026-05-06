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
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      {/* Header de secciÃ³n */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: '#a98225', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
          Torre de Control
        </p>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>
          Datos del Cliente
        </h2>
        <div className="s-divider" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Nombre */}
        <div>
          <label className="s-label">Nombre completo <span style={{ color: '#FF453A' }}>*</span></label>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="words"
            value={formData.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            onBlur={() => handleBlur('nombre')}
            placeholder="Juan PÃ©rez GonzÃ¡lez"
            className={`s-input ${errores.nombre ? 's-input-err' : ''}`}
          />
          {errores.nombre && <p className="s-error">âš  {errores.nombre}</p>}
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
          {errores.rut && <p className="s-error">âš  {errores.rut}</p>}
        </div>

        {/* TelÃ©fono */}
        <div>
          <label className="s-label">TelÃ©fono <span style={{ color: '#FF453A' }}>*</span></label>
          <input
            type="tel"
            inputMode="tel"
            value={formData.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            onBlur={() => handleBlur('telefono')}
            placeholder="+56 9 1234 5678"
            className={`s-input ${errores.telefono ? 's-input-err' : ''}`}
          />
          {errores.telefono && <p className="s-error">âš  {errores.telefono}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="s-label">Correo electrÃ³nico <span style={{ color: '#FF453A' }}>*</span></label>
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
          {errores.email && <p className="s-error">âš  {errores.email}</p>}
        </div>
      </div>

      <button type="button" onClick={handleSubmit} className="s-btn-primary" style={{ marginTop: 36 }}>
        Continuar
      </button>
    </div>
  )
}

