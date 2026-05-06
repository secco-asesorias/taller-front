import { useState } from 'react'
import { useForm } from '../../context/FormContext'
import { validarSeccion4 } from '../../utils/validation'
import PhotoCapture from '../common/PhotoCapture'
import LocalMultiPhotoCapture from '../common/LocalMultiPhotoCapture'

const FOTOS_EXTERIOR = [
  { key: 'frontal',     label: 'Frontal',      icon: 'â¬†' },
  { key: 'trasera',     label: 'Trasera',      icon: 'â¬‡' },
  { key: 'lateral_izq', label: 'Lateral Izq.', icon: 'â—€' },
  { key: 'lateral_der', label: 'Lateral Der.', icon: 'â–¶' },
]

function EstadoSelector({ options, value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {options.map((op) => {
        const active = value === op.value
        return (
          <button key={op.value} type="button" onClick={() => onChange(op.value)}
            style={{
              padding: '16px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 150ms',
              border: active ? '1.5px solid #a98225' : '1.5px solid #E0E0E0',
              background: active ? 'rgba(169,130,37,0.10)' : '#FFFFFF',
              color: active ? '#a98225' : '#6B6B6B',
            }}
          >{op.label}</button>
        )
      })}
    </div>
  )
}

export default function Section4_EstadoVehiculo({ onNext, onBack }) {
  const { formData, updateForm } = useForm()
  const [errores, setErrores] = useState({})

  function updateFoto(key, result) {
    const fotos = { ...(formData.fotos || {}) }
    if (!result) { delete fotos[key]; delete fotos[`${key}_file`] }
    else { fotos[key] = result.preview; fotos[`${key}_file`] = result.file }
    updateForm({ fotos })
  }

  function updateFotosMultiples(key, items) {
    updateForm({
      fotos: {
        ...(formData.fotos || {}),
        [key]: items,
      },
    })
  }

  function handleSubmit() {
    const e = validarSeccion4(formData)
    setErrores(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: '#a98225', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>TÃ©cnico</p>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>Estado del VehÃ­culo</h2>
        <div className="s-divider" />
      </div>

      {/* 4A â€” Exterior */}
      <div className="s-card" style={{ marginBottom: 16 }}>
        <p style={{ color: '#a98225', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 0, marginBottom: 16 }}>
          4A Â· Exterior
        </p>

        <label className="s-label">Estado general <span style={{ color: '#FF453A' }}>*</span></label>
        <EstadoSelector
          options={[
            { value: 'sin_danos', label: 'âœ“  Sin daÃ±os visibles' },
            { value: 'con_danos', label: 'âš   Con daÃ±os visibles' },
          ]}
          value={formData.estado_exterior}
          onChange={(v) => updateForm({ estado_exterior: v })}
        />
        {errores.estado_exterior && <p className="s-error">âš  {errores.estado_exterior}</p>}

        {formData.estado_exterior === 'con_danos' && (
          <div style={{ marginTop: 16 }}>
            <label className="s-label">DescripciÃ³n de daÃ±os <span style={{ color: '#FF453A' }}>*</span></label>
            <textarea rows={3} value={formData.detalle_exterior}
              onChange={(e) => updateForm({ detalle_exterior: e.target.value })}
              placeholder="Rayones, abolladuras, zona afectadaâ€¦"
              className={`s-input ${errores.detalle_exterior ? 's-input-err' : ''}`}
              style={{ resize: 'none' }}
            />
            {errores.detalle_exterior && <p className="s-error">âš  {errores.detalle_exterior}</p>}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <label className="s-label">Fotos obligatorias <span style={{ color: '#FF453A' }}>*</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {FOTOS_EXTERIOR.map((f) => (
              <div key={f.key}>
                <p style={{ color: '#6B6B6B', fontSize: 11, fontWeight: 500, textAlign: 'center', marginBottom: 6 }}>{f.icon} {f.label}</p>
                <PhotoCapture label="" required preview={formData.fotos?.[f.key]} onChange={(r) => updateFoto(f.key, r)} />
              </div>
            ))}
          </div>
          {errores.fotos_exterior && <p className="s-error" style={{ marginTop: 8 }}>âš  {errores.fotos_exterior}</p>}
        </div>

        <div style={{ marginTop: 16 }}>
          <LocalMultiPhotoCapture
            label="Fotos adicionales del vehÃ­culo (opcional)"
            fotos={formData.fotos?.danos || []}
            onChange={(items) => updateFotosMultiples('danos', items)}
          />
        </div>
      </div>

      {/* 4B â€” Interior */}
      <div className="s-card" style={{ marginBottom: 16 }}>
        <p style={{ color: '#a98225', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 0, marginBottom: 16 }}>
          4B Â· Interior
        </p>

        <label className="s-label">Estado general <span style={{ color: '#FF453A' }}>*</span></label>
        <EstadoSelector
          options={[
            { value: 'buen_estado',       label: 'âœ“  Buen estado' },
            { value: 'con_observaciones', label: 'âš   Con observaciones' },
          ]}
          value={formData.estado_interior}
          onChange={(v) => updateForm({ estado_interior: v })}
        />
        {errores.estado_interior && <p className="s-error">âš  {errores.estado_interior}</p>}

        {formData.estado_interior === 'con_observaciones' && (
          <div style={{ marginTop: 16 }}>
            <label className="s-label">Observaciones <span style={{ color: '#FF453A' }}>*</span></label>
            <textarea rows={3} value={formData.detalle_interior}
              onChange={(e) => updateForm({ detalle_interior: e.target.value })}
              placeholder="TapicerÃ­a, tablero, oloresâ€¦"
              className={`s-input ${errores.detalle_interior ? 's-input-err' : ''}`}
              style={{ resize: 'none' }}
            />
            {errores.detalle_interior && <p className="s-error">âš  {errores.detalle_interior}</p>}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <LocalMultiPhotoCapture
            label="Fotos del interior"
            required
            fotos={formData.fotos?.interior || []}
            onChange={(items) => updateFotosMultiples('interior', items)}
          />
          {errores.foto_interior && <p className="s-error">âš  {errores.foto_interior}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button type="button" onClick={handleSubmit} className="s-btn-primary">Continuar</button>
        <button type="button" onClick={onBack}    className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}

