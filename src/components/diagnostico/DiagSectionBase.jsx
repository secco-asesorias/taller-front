import { useEffect, useMemo, useRef, useState } from 'react'
import { useDiagnostico } from '../../context/DiagnosticoContext'
import MultiPhotoCapture from '../common/MultiPhotoCapture'
import { diagnosticoService } from '../../services/diagnosticoService'

const ESTADOS = [
  { value: 'ok', label: 'OK' },
  { value: 'requiere_atencion', label: 'Atención' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'no_aplica', label: 'N/A' },
]

const COMMENT_ITEM = 'Comentario general de la sección'

function estadoStyle(active, value) {
  const urgent = value === 'urgente'
  return {
    padding: '11px 8px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 150ms',
    border: active ? `1.5px solid ${urgent ? 'var(--destructive)' : 'var(--secco-gold)'}` : '1.5px solid #E0E0E0',
    background: active ? (urgent ? 'var(--secco-red-08)' : 'var(--secco-gold-10)') : 'var(--background)',
    color: active ? (urgent ? 'var(--destructive)' : 'var(--secco-gold)') : 'var(--muted-foreground)',
  }
}

export default function DiagSectionBase({ config, onNext, onBack, nextLabel = 'Continuar', loading = false }) {
  const { diagnosticoData, updateDiagnostico } = useDiagnostico()
  const [autosave, setAutosave] = useState('')
  const didMount = useRef(false)

  function key(item) {
    return `${config.num}_${item}`
  }

  function fotoKey(item) {
    return `${config.num}_${item}`
  }

  const sectionItems = useMemo(() => {
    const checklistItems = config.items.map((item) => {
      const actual = diagnosticoData.checklist?.[`${config.num}_${item}`]
      return {
        seccion: config.num,
        item,
        estado: actual?.estado || 'ok',
        observacion: actual?.observacion || '',
      }
    })
    const comment = diagnosticoData.checklist?.[`${config.num}_${COMMENT_ITEM}`]
    return [
      ...checklistItems,
      {
        seccion: config.num,
        item: COMMENT_ITEM,
        estado: 'no_aplica',
        observacion: comment?.observacion || '',
      },
    ]
  }, [config, diagnosticoData.checklist])

  function updateSectionComment(value) {
    updateDiagnostico({
      checklist: {
        ...(diagnosticoData.checklist || {}),
        [key(COMMENT_ITEM)]: {
          seccion: config.num,
          item: COMMENT_ITEM,
          estado: 'no_aplica',
          observacion: value,
        },
      },
    })
  }

  function currentSectionComment() {
    return diagnosticoData.checklist?.[key(COMMENT_ITEM)]?.observacion || ''
  }

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    if (!diagnosticoData.diagnostico_id) return

    setAutosave('Guardando...')
    const timer = window.setTimeout(async () => {
      try {
        await diagnosticoService.guardarChecklist(diagnosticoData.diagnostico_id, sectionItems)
        if (diagnosticoData.status === 'pendiente') {
          await diagnosticoService.actualizar(diagnosticoData.diagnostico_id, { status: 'proceso' })
          updateDiagnostico({ status: 'proceso' })
        }
        setAutosave('Guardado')
      } catch {
        setAutosave('No se pudo guardar')
      }
    }, 650)

    return () => window.clearTimeout(timer)
  }, [diagnosticoData.diagnostico_id, diagnosticoData.status, sectionItems, updateDiagnostico])

  function updateItem(item, campos) {
    updateDiagnostico({
      checklist: {
        ...(diagnosticoData.checklist || {}),
        [key(item)]: {
          item,
          seccion: config.num,
          estado: 'ok',
          observacion: '',
          ...(diagnosticoData.checklist?.[key(item)] || {}),
          ...campos,
        },
      },
    })
  }

  function updateFotos(fotos) {
    updateDiagnostico({
      fotos: {
        ...(diagnosticoData.fotos || {}),
        [String(config.num)]: fotos,
      },
    })
  }

  function updateFotosItem(item, fotos) {
    updateDiagnostico({
      fotos: {
        ...(diagnosticoData.fotos || {}),
        [fotoKey(item)]: fotos,
      },
    })
  }

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ display: 'inline-flex', background: 'var(--secco-gold)', color: 'var(--background)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 8px', padding: '4px 8px', borderRadius: 6 }}>
          Técnico
        </p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>
          {config.titulo}
        </h2>
        <p style={{ margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 13 }}>
          {diagnosticoData.marca} {diagnosticoData.modelo} · {diagnosticoData.patente}
        </p>
        {autosave && (
          <p style={{ margin: '8px 0 0', color: autosave === 'No se pudo guardar' ? 'var(--destructive)' : 'var(--secco-gold)', fontSize: 12, fontWeight: 600 }}>
            {autosave}
          </p>
        )}
        <div className="s-divider" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {config.items.map((item) => {
          const actual = diagnosticoData.checklist?.[key(item)] || { estado: 'ok', observacion: '' }
          const requiereObs = !['ok', 'no_aplica'].includes(actual.estado)

          return (
            <div key={item} className="s-card" style={{ padding: 14 }}>
              <p style={{ margin: '0 0 12px', color: 'var(--foreground)', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>
                {item}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {ESTADOS.map((estado) => (
                  <button
                    key={estado.value}
                    type="button"
                    onClick={() => updateItem(item, { estado: estado.value })}
                    style={estadoStyle(actual.estado === estado.value, estado.value)}
                  >
                    {estado.label}
                  </button>
                ))}
              </div>

              {requiereObs && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea
                    rows={2}
                    value={actual.observacion || ''}
                    onChange={(e) => updateItem(item, { observacion: e.target.value })}
                    placeholder="Observación técnica..."
                    className="s-input"
                    style={{ resize: 'none', fontSize: 13 }}
                  />
                  <MultiPhotoCapture
                    seccion={config.num}
                    item={item}
                    label="Fotos del hallazgo"
                    diagnosticoId={diagnosticoData.diagnostico_id}
                    fotos={diagnosticoData.fotos?.[fotoKey(item)] || []}
                    onChange={(fotos) => updateFotosItem(item, fotos)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="s-card" style={{ marginTop: 16 }}>
        <label className="s-label">Comentarios del técnico</label>
        <textarea
          rows={4}
          value={currentSectionComment()}
          onChange={(e) => updateSectionComment(e.target.value)}
          placeholder="Escribe hallazgos, contexto o comentarios libres de esta sección..."
          className="s-input"
          style={{ resize: 'vertical', fontSize: 14 }}
        />
      </div>

      {!config.sinFotos && (
        <div className="s-card" style={{ marginTop: 16 }}>
          <MultiPhotoCapture
            seccion={config.num}
            item={null}
            diagnosticoId={diagnosticoData.diagnostico_id}
            fotos={diagnosticoData.fotos?.[String(config.num)] || []}
            onChange={updateFotos}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
        <button type="button" onClick={onNext} disabled={loading} className="s-btn-primary" style={{ opacity: loading ? 0.65 : 1 }}>
          {loading ? 'Guardando...' : nextLabel}
        </button>
        <button type="button" onClick={onBack} className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}
