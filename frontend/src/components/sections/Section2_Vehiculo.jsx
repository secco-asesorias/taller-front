import { useState } from 'react'
import { useForm } from '../../context/FormContext'
import { validarSeccion2 } from '../../utils/validation'

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: ANIO_ACTUAL - 1959 }, (_, i) => ANIO_ACTUAL + 1 - i)

const MARCAS = [
  'Audi','BMW','Chevrolet','CitroÃ«n','Fiat','Ford','Honda','Hyundai',
  'Jeep','Kia','Land Rover','Mazda','Mercedes-Benz','Mitsubishi','Nissan',
  'Opel','Peugeot','Renault','Seat','Skoda','Subaru','Suzuki','Toyota',
  'Volkswagen','Volvo','Otra',
]

export default function Section2_Vehiculo({ onNext, onBack }) {
  const { formData, updateForm } = useForm()
  const [errores, setErrores] = useState({})
  const [touched, setTouched] = useState({})

  function handleChange(campo, valor) {
    updateForm({ [campo]: valor })
    if (touched[campo]) {
      const e = validarSeccion2({ ...formData, [campo]: valor })
      setErrores((prev) => ({ ...prev, [campo]: e[campo] }))
    }
  }

  function handleBlur(campo) {
    setTouched((prev) => ({ ...prev, [campo]: true }))
    const e = validarSeccion2(formData)
    setErrores((prev) => ({ ...prev, [campo]: e[campo] }))
  }

  function handleSubmit() {
    const e = validarSeccion2(formData)
    setErrores(e)
    setTouched({ marca: true, modelo: true, anio: true, patente: true })
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: '#a98225', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
          Torre de Control
        </p>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>
          Identificación del Vehí­culo
        </h2>
        <div className="s-divider" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Marca */}
        <div>
          <label className="s-label">Marca <span style={{ color: '#FF453A' }}>*</span></label>
          <select
            value={formData.marca}
            onChange={(e) => handleChange('marca', e.target.value)}
            onBlur={() => handleBlur('marca')}
            className={`s-input ${errores.marca ? 's-input-err' : ''}`}
          >
            <option value="">Selecciona la marca</option>
            {MARCAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {errores.marca && <p className="s-error">âš  {errores.marca}</p>}
        </div>

        {/* Modelo */}
        <div>
          <label className="s-label">Modelo <span style={{ color: '#FF453A' }}>*</span></label>
          <input
            type="text"
            autoCapitalize="words"
            value={formData.modelo}
            onChange={(e) => handleChange('modelo', e.target.value)}
            onBlur={() => handleBlur('modelo')}
            placeholder="Corolla, Tucson, Mazda 3â€¦"
            className={`s-input ${errores.modelo ? 's-input-err' : ''}`}
          />
          {errores.modelo && <p className="s-error">âš  {errores.modelo}</p>}
        </div>

        {/* AÃ±o + Patente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="s-label">Año <span style={{ color: '#FF453A' }}>*</span></label>
            <select
              value={formData.anio}
              onChange={(e) => handleChange('anio', Number(e.target.value))}
              onBlur={() => handleBlur('anio')}
              className={`s-input ${errores.anio ? 's-input-err' : ''}`}
            >
              <option value="">Año</option>
              {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {errores.anio && <p className="s-error">âš  {errores.anio}</p>}
          </div>

          <div>
            <label className="s-label">Patente <span style={{ color: '#FF453A' }}>*</span></label>
            <input
              type="text"
              autoCapitalize="characters"
              value={formData.patente}
              onChange={(e) => handleChange('patente', e.target.value.replace(/\s/g, '').toUpperCase())}
              onBlur={() => handleBlur('patente')}
              placeholder="ABCD12"
              maxLength={6}
              className={`s-input ${errores.patente ? 's-input-err' : ''}`}
              style={{ fontFamily: 'monospace', letterSpacing: '2px' }}
            />
            {errores.patente && <p className="s-error">âš  {errores.patente}</p>}
          </div>
        </div>

        {/* Opcionales */}
        <div style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 14, padding: 18 }}>
          <p style={{ color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16, marginTop: 0 }}>
            Datos opcionales
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="s-label">VIN</label>
              <input
                type="text"
                autoCapitalize="characters"
                value={formData.vin}
                onChange={(e) => updateForm({ vin: e.target.value.toUpperCase() })}
                placeholder="Número de chasis"
                maxLength={17}
                className="s-input"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label className="s-label">Color</label>
              <input
                type="text"
                autoCapitalize="words"
                value={formData.color}
                onChange={(e) => updateForm({ color: e.target.value })}
                placeholder="Blanco, Negro metalizado"
                className="s-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 36 }}>
        <button type="button" onClick={handleSubmit} className="s-btn-primary">Continuar</button>
        <button type="button" onClick={onBack}    className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}

