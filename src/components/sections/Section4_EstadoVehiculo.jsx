import { useEffect, useState } from 'react'
import { useForm } from '../../context/FormContext'
import { validarSeccion4 } from '../../utils/validation'
import PhotoCapture from '../common/PhotoCapture'
import LocalMultiPhotoCapture from '../common/LocalMultiPhotoCapture'
import { actaService } from '../../services/actaService'
import { useToast } from '../common/ToastProvider'
import { extDesdeMime, fileToBase64DataPart } from '../../utils/fotoActa'

const FOTOS_EXTERIOR = [
  { key: 'frontal',     label: 'Frontal',      icon: '' },
  { key: 'trasera',     label: 'Trasera',      icon: '' },
  { key: 'lateral_izq', label: 'Lateral Izq.', icon: '' },
  { key: 'lateral_der', label: 'Lateral Der.', icon: '' },
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
  const toast = useToast()
  const { formData, updateForm } = useForm()
  const [errores, setErrores] = useState({})

  useEffect(() => {
    const e = validarSeccion4(formData)
    if (Object.keys(e).length === 0) setErrores({})
  }, [
    formData.estado_exterior,
    formData.detalle_exterior,
    formData.estado_interior,
    formData.detalle_interior,
    formData.fotos,
  ])

  async function updateFoto(key, result) {
    const prev = formData.fotos || {}
    if (!result) {
      const next = { ...prev }
      delete next[key]
      delete next[`${key}_file`]
      updateForm({ fotos: next })
      return
    }
    const next = { ...prev, [key]: result.preview, [`${key}_file`]: result.file }
    updateForm({ fotos: next })
    if (!result.file) return
    if (!formData.acta_id) {
      toast.info('La foto se subirá al terminar el acta')
      return
    }
    try {
      const base64 = await fileToBase64DataPart(result.file)
      const mime = result.file.type || 'image/jpeg'
      await actaService.subirFoto(formData.acta_id, key, base64, mime, extDesdeMime(mime))
      const after = { ...next }
      delete after[`${key}_file`]
      updateForm({ fotos: after })
      toast.success('Foto subida')
    } catch (e) {
      toast.error(e?.message ? `Error al subir foto: ${e.message}` : 'Error al subir foto')
    }
  }

  async function updateFotosMultiples(key, items) {
    const baseFotos = { ...(formData.fotos || {}), [key]: items }
    updateForm({ fotos: baseFotos })
    if (!formData.acta_id) {
      toast.info('Las fotos se subirán al terminar el acta')
      return
    }
    const tipo = key === 'interior' ? 'interior' : 'danos'
    const nextItems = [...items]
    let changed = false
    for (let i = 0; i < nextItems.length; i++) {
      const it = nextItems[i]
      if (!(it?.file instanceof File)) continue
      try {
        const base64 = await fileToBase64DataPart(it.file)
        const mime = it.file.type || 'image/jpeg'
        await actaService.subirFoto(formData.acta_id, tipo, base64, mime, extDesdeMime(mime))
        nextItems[i] = { ...it, file: undefined }
        changed = true
      } catch (e) {
        toast.error(e?.message ? `Error al subir foto: ${e.message}` : 'Error al subir foto')
      }
    }
    if (changed) {
      updateForm({ fotos: { ...baseFotos, [key]: nextItems } })
      toast.success('Fotos subidas')
    }
  }

  function handleSubmit() {
    const e = validarSeccion4(formData)
    setErrores(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: '#a98225', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Técnico</p>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>Estado del Vehículo</h2>
        <div className="s-divider" />
      </div>

      {/* 4A — Exterior */}
      <div className="s-card" style={{ marginBottom: 16 }}>
        <p style={{ color: '#a98225', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 0, marginBottom: 16 }}>
          · Exterior
        </p>

        <label className="s-label">Estado general <span style={{ color: '#FF453A' }}>*</span></label>
        <EstadoSelector
          options={[
            { value: 'sin_danos', label: 'Sin daños visibles' },
            { value: 'con_danos', label: 'Con daños visibles' },
          ]}
          value={formData.estado_exterior}
          onChange={(v) => updateForm({ estado_exterior: v })}
        />
        {errores.estado_exterior && <p className="s-error">⚠ {errores.estado_exterior}</p>}

        {formData.estado_exterior === 'con_danos' && (
          <div style={{ marginTop: 16 }}>
            <label className="s-label">Descripción de daños <span style={{ color: '#FF453A' }}>*</span></label>
            <textarea rows={3} value={formData.detalle_exterior}
              onChange={(e) => updateForm({ detalle_exterior: e.target.value })}
              placeholder="Rayones, abolladuras, zona afectada"
              className={`s-input ${errores.detalle_exterior ? 's-input-err' : ''}`}
              style={{ resize: 'none' }}
            />
            {errores.detalle_exterior && <p className="s-error">{errores.detalle_exterior}</p>}
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
          {errores.fotos_exterior && <p className="s-error" style={{ marginTop: 8 }}>⚠ {errores.fotos_exterior}</p>}
        </div>

        <div style={{ marginTop: 16 }}>
          <LocalMultiPhotoCapture
            label="Fotos adicionales del vehículo (opcional)"
            fotos={formData.fotos?.danos || []}
            onChange={(items) => updateFotosMultiples('danos', items)}
          />
        </div>
      </div>

      {/* 4B — Interior */}
      <div className="s-card" style={{ marginBottom: 16 }}>
        <p style={{ color: '#a98225', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 0, marginBottom: 16 }}>
          · Interior
        </p>

        <label className="s-label">Estado general <span style={{ color: '#FF453A' }}>*</span></label>
        <EstadoSelector
          options={[
            { value: 'buen_estado',       label: 'Buen estado' },
            { value: 'con_observaciones', label: 'Con observaciones' },
          ]}
          value={formData.estado_interior}
          onChange={(v) => updateForm({ estado_interior: v })}
        />
        {errores.estado_interior && <p className="s-error">{errores.estado_interior}</p>}

        {formData.estado_interior === 'con_observaciones' && (
          <div style={{ marginTop: 16 }}>
            <label className="s-label">Observaciones <span style={{ color: '#FF453A' }}>*</span></label>
            <textarea rows={3} value={formData.detalle_interior}
              onChange={(e) => updateForm({ detalle_interior: e.target.value })}
              placeholder="Tapicería, tablero, olores…"
              className={`s-input ${errores.detalle_interior ? 's-input-err' : ''}`}
              style={{ resize: 'none' }}
            />
            {errores.detalle_interior && <p className="s-error">{errores.detalle_interior}</p>}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <LocalMultiPhotoCapture
            label="Fotos del interior"
            required
            fotos={formData.fotos?.interior || []}
            onChange={(items) => updateFotosMultiples('interior', items)}
          />
          {errores.foto_interior && <p className="s-error">{errores.foto_interior}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button type="button" onClick={handleSubmit} className="s-btn-primary">Continuar</button>
        <button type="button" onClick={onBack}    className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}

