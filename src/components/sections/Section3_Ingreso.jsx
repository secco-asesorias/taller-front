import { useEffect, useState } from 'react'
import { useForm } from '../../context/FormContext'
import { validarSeccion3 } from '../../utils/validation'
import PhotoCapture from '../common/PhotoCapture'
import FuelSelector from '../common/FuelSelector'
import { actaService } from '../../services/actaService'
import { useToast } from '../common/ToastProvider'
import { extDesdeMime, fileToBase64DataPart } from '../../utils/fotoActa'

const DOCS = [
  { value: 'permiso',  label: 'Permiso de circulación' },
  { value: 'soap',     label: 'SOAP' },
  { value: 'revision', label: 'Revisión técnica' },
  { value: 'ninguna',  label: 'Ninguna' },
  { value: 'otros',    label: 'Otros' },
]

export default function Section3_Ingreso({ onNext, onBack }) {
  const toast = useToast()
  const { formData, updateForm } = useForm()
  const [errores, setErrores] = useState({})
  const [subiendo, setSubiendo] = useState({ km: false, combustible: false })

  // Si el acta se hidrata después (GET /actas/:id), limpiar errores cuando ya cumple la sección.
  useEffect(() => {
    const e = validarSeccion3(formData)
    if (Object.keys(e).length === 0) setErrores({})
  }, [
    formData.fecha_ingreso,
    formData.hora_ingreso,
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

  async function handleFotoKm(result) {
    updateForm(result
      ? { foto_km: result.file, foto_km_preview: result.preview }
      : { foto_km: null, foto_km_preview: null }
    )

    if (!result?.file) return
    if (!formData.acta_id) {
      toast.info('La foto se subirá al continuar')
      return
    }

    setSubiendo((p) => ({ ...p, km: true }))
    try {
      const base64 = await fileToBase64DataPart(result.file)
      const mimetype = result.file.type || 'image/jpeg'
      const ext = extDesdeMime(mimetype)
      await actaService.subirFoto(formData.acta_id, 'km', base64, mimetype, ext)

      // Evitar doble subida al finalizar (ActaForm solo sube si es File)
      updateForm({ foto_km: null })
      toast.success('Foto de odómetro subida')
    } catch (e) {
      toast.error(e?.message ? `Error al subir foto: ${e.message}` : 'Error al subir foto')
    } finally {
      setSubiendo((p) => ({ ...p, km: false }))
    }
  }

  async function handleFotoCombustible(result) {
    updateForm(result
      ? { foto_combustible: result.file, foto_combustible_preview: result.preview }
      : { foto_combustible: null, foto_combustible_preview: null }
    )

    if (!result?.file) return
    if (!formData.acta_id) {
      toast.info('La foto se subirá al continuar')
      return
    }

    setSubiendo((p) => ({ ...p, combustible: true }))
    try {
      const base64 = await fileToBase64DataPart(result.file)
      const mimetype = result.file.type || 'image/jpeg'
      const ext = extDesdeMime(mimetype)
      await actaService.subirFoto(formData.acta_id, 'combustible', base64, mimetype, ext)

      // Evitar doble subida al finalizar
      updateForm({ foto_combustible: null })
      toast.success('Foto de combustible subida')
    } catch (e) {
      toast.error(e?.message ? `Error al subir foto: ${e.message}` : 'Error al subir foto')
    } finally {
      setSubiendo((p) => ({ ...p, combustible: false }))
    }
  }

  function handleSubmit() {
    const e = validarSeccion3(formData)
    setErrores(e)
    if (Object.keys(e).length === 0) onNext()
  }

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--secco-gold)', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
          Técnico
        </p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>
          Datos de Ingreso
        </h2>
        <div className="s-divider" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Fecha y hora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="s-label">Fecha <span style={{ color: 'var(--destructive)' }}>*</span></label>
            <input type="date" value={formData.fecha_ingreso}
              onChange={(e) => updateForm({ fecha_ingreso: e.target.value })}
              className="s-input" />
          </div>
          <div>
            <label className="s-label">Hora <span style={{ color: 'var(--destructive)' }}>*</span></label>
            <input type="time" value={formData.hora_ingreso}
              onChange={(e) => updateForm({ hora_ingreso: e.target.value })}
              className="s-input" />
          </div>
        </div>

        {/* Kilometraje */}
        <div className="s-card">
          <label className="s-label">Kilometraje <span style={{ color: 'var(--destructive)' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              type="number" inputMode="numeric" min="0"
              value={formData.kilometraje}
              onChange={(e) => updateForm({ kilometraje: e.target.value })}
              placeholder="85000"
              className={`s-input ${errores.kilometraje ? 's-input-err' : ''}`}
              style={{ paddingRight: 50 }}
            />
            <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500 }}>km</span>
          </div>
          {errores.kilometraje && <p className="s-error">âš  {errores.kilometraje}</p>}
          <div style={{ marginTop: 16 }}>
            <PhotoCapture label="Foto del odómetro" required preview={formData.foto_km_preview} onChange={handleFotoKm} />
            {errores.foto_km && <p className="s-error">âš  {errores.foto_km}</p>}
            {subiendo.km && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>Subiendo foto…</p>}
          </div>
        </div>

        {/* Combustible */}
        <div className="s-card">
          <label className="s-label" style={{ marginBottom: 12 }}>Nivel de combustible <span style={{ color: 'var(--destructive)' }}>*</span></label>
          <FuelSelector value={formData.combustible} onChange={(v) => updateForm({ combustible: v })} />
          {errores.combustible && <p className="s-error">âš  {errores.combustible}</p>}
          <div style={{ marginTop: 16 }}>
            <PhotoCapture label="Foto del indicador" required preview={formData.foto_combustible_preview} onChange={handleFotoCombustible} />
            {errores.foto_combustible && <p className="s-error">âš  {errores.foto_combustible}</p>}
            {subiendo.combustible && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>Subiendo foto…</p>}
          </div>
        </div>

        {/* Llaves */}
        <div>
          <label className="s-label">Llaves entregadas <span style={{ color: 'var(--destructive)' }}>*</span></label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0,1,2,3,4].map((n) => {
              const active = formData.llaves === n
              return (
                <button key={n} type="button" onClick={() => updateForm({ llaves: n })}
                  style={{
                    flex: 1, padding: '14px 0', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms', fontFamily: 'inherit',
                    border: active ? '1.5px solid #a98225' : '1.5px solid #E0E0E0',
                    background: active ? 'var(--secco-gold)' : 'var(--background)',
                    color: active ? 'var(--background)' : 'var(--muted-foreground)',
                  }}
                >{n}</button>
              )
            })}
          </div>
          {errores.llaves && <p className="s-error">âš  {errores.llaves}</p>}
        </div>

        {/* DocumentaciÃ³n */}
        <div>
          <label className="s-label">Documentación entregada</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DOCS.map((doc) => {
              const checked = (formData.documentacion || []).includes(doc.value)
              return (
                <label key={doc.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', transition: 'border-color 150ms',
                    border: checked ? '1.5px solid #a98225' : '1.5px solid #E0E0E0',
                    background: 'var(--background)',
                  }}
                >
                  <input type="checkbox" className="s-checkbox" checked={checked} onChange={() => toggleDoc(doc.value)} />
                  <span style={{ color: checked ? 'var(--foreground)' : 'var(--muted-foreground)', fontSize: 15, fontWeight: 500 }}>{doc.label}</span>
                </label>
              )
            })}
          </div>
          {(formData.documentacion || []).includes('otros') && (
            <input type="text" value={formData.documentacion_otros}
              onChange={(e) => updateForm({ documentacion_otros: e.target.value })}
              placeholder="Especifica cuÃ¡lesâ€¦"
              className="s-input" style={{ marginTop: 8 }} />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 36 }}>
        <button type="button" onClick={handleSubmit} className="s-btn-primary">Continuar</button>
        <button type="button" onClick={onBack}    className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}

