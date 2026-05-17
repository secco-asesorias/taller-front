import { useEffect, useState } from 'react'
import { useFormEntrega } from '../../context/FormEntregaContext'
import { validarSeccion3Entrega } from '../../utils/validation'
import PhotoCapture from '../common/PhotoCapture'
import FuelSelector from '../common/FuelSelector'

const DOCS = [
  { value: 'permiso', label: 'Permiso de circulación' },
  { value: 'soap', label: 'SOAP' },
  { value: 'revision', label: 'Revisión técnica' },
  { value: 'ninguna', label: 'Ninguna' },
  { value: 'otros', label: 'Otros' },
]

export default function Section3_Entrega({ onNext, onBack }) {
  const { formData, updateForm } = useFormEntrega()
  const [errores, setErrores] = useState({})

  useEffect(() => {
    const e = validarSeccion3Entrega(formData)
    if (Object.keys(e).length === 0) setErrores({})
  }, [
    formData.fecha_entrega,
    formData.hora_entrega,
    formData.kilometraje,
    formData.combustible,
    formData.llaves,
    formData.foto_km_preview,
    formData.foto_combustible_preview,
  ])

  function toggleDoc(val) {
    const actual = formData.documentacion || []
    if (val === 'ninguna') {
      updateForm({ documentacion: actual.includes('ninguna') ? [] : ['ninguna'] })
      return
    }
    let nuevo = actual.filter((v) => v !== 'ninguna')
    updateForm({ documentacion: nuevo.includes(val) ? nuevo.filter((v) => v !== val) : [...nuevo, val] })
  }

  function handleSubmit() {
    const e = validarSeccion3Entrega(formData)
    setErrores(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: '#a98225', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
          Entrega
        </p>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>
          Datos de entrega
        </h2>
        <div className="s-divider" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="s-label">Fecha entrega <span style={{ color: '#FF453A' }}>*</span></label>
            <input
              type="date"
              value={formData.fecha_entrega}
              onChange={(e) => updateForm({ fecha_entrega: e.target.value })}
              className="s-input"
            />
            {errores.fecha_entrega && <p className="s-error">{errores.fecha_entrega}</p>}
          </div>
          <div>
            <label className="s-label">Hora entrega <span style={{ color: '#FF453A' }}>*</span></label>
            <input
              type="time"
              value={formData.hora_entrega}
              onChange={(e) => updateForm({ hora_entrega: e.target.value })}
              className="s-input"
            />
            {errores.hora_entrega && <p className="s-error">{errores.hora_entrega}</p>}
          </div>
        </div>

        <div className="s-card">
          <label className="s-label">Kilometraje al entregar <span style={{ color: '#FF453A' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={formData.kilometraje}
              onChange={(e) => updateForm({ kilometraje: e.target.value })}
              placeholder="85000"
              className={`s-input ${errores.kilometraje ? 's-input-err' : ''}`}
              style={{ paddingRight: 50 }}
            />
            <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#6B6B6B', fontSize: 13, fontWeight: 500 }}>km</span>
          </div>
          {errores.kilometraje && <p className="s-error">{errores.kilometraje}</p>}
          <div style={{ marginTop: 16 }}>
            <PhotoCapture
              label="Foto del odómetro"
              required
              preview={formData.foto_km_preview}
              onChange={(result) => updateForm(result
                ? { foto_km: result.file, foto_km_preview: result.preview }
                : { foto_km: null, foto_km_preview: null })}
            />
            {errores.foto_km && <p className="s-error">{errores.foto_km}</p>}
          </div>
        </div>

        <div className="s-card">
          <label className="s-label" style={{ marginBottom: 12 }}>Nivel de combustible <span style={{ color: '#FF453A' }}>*</span></label>
          <FuelSelector value={formData.combustible} onChange={(v) => updateForm({ combustible: v })} />
          {errores.combustible && <p className="s-error">{errores.combustible}</p>}
          <div style={{ marginTop: 16 }}>
            <PhotoCapture
              label="Foto del indicador"
              required
              preview={formData.foto_combustible_preview}
              onChange={(result) => updateForm(result
                ? { foto_combustible: result.file, foto_combustible_preview: result.preview }
                : { foto_combustible: null, foto_combustible_preview: null })}
            />
            {errores.foto_combustible && <p className="s-error">{errores.foto_combustible}</p>}
          </div>
        </div>

        <div>
          <label className="s-label">Llaves entregadas <span style={{ color: '#FF453A' }}>*</span></label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2, 3, 4].map((n) => {
              const active = formData.llaves === n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateForm({ llaves: n })}
                  style={{
                    flex: 1,
                    padding: '14px 0',
                    borderRadius: 10,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    border: active ? '1.5px solid #a98225' : '1.5px solid #E0E0E0',
                    background: active ? '#a98225' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#6B6B6B',
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
          {errores.llaves && <p className="s-error">{errores.llaves}</p>}
        </div>

        <div>
          <label className="s-label">Documentación entregada al cliente</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DOCS.map((doc) => {
              const checked = (formData.documentacion || []).includes(doc.value)
              return (
                <label
                  key={doc.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: checked ? '1.5px solid #a98225' : '1.5px solid #E0E0E0',
                    background: '#FFFFFF',
                  }}
                >
                  <input type="checkbox" className="s-checkbox" checked={checked} onChange={() => toggleDoc(doc.value)} />
                  <span style={{ color: checked ? '#111114' : '#6B6B6B', fontSize: 15, fontWeight: 500 }}>{doc.label}</span>
                </label>
              )
            })}
          </div>
          {(formData.documentacion || []).includes('otros') && (
            <input
              type="text"
              value={formData.documentacion_otros}
              onChange={(e) => updateForm({ documentacion_otros: e.target.value })}
              placeholder="Especifica cuáles…"
              className="s-input"
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 36 }}>
        <button type="button" onClick={handleSubmit} className="s-btn-primary">Continuar</button>
        <button type="button" onClick={onBack} className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}
