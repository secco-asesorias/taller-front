import { useState } from 'react'
import { useForm } from '../../context/FormContext'
import { validarSeccion5 } from '../../utils/validation'

const SUGERENCIAS = [
  'Revisión general de motor','Cambio de aceite y filtros','Revisión de frenos',
  'Alineación y balanceo','Revisión de suspensión','Diagnóstico eléctrico',
  'Falla en el motor','Ruido anormal','Check Engine encendido',
]

/** Viñeta en UTF-8 (evita secuencias corruptas tipo "â€¢" en el archivo fuente). */
const BULLET_PREFIX = '\n\u2022 '
const BULLET_FIRST = '\u2022 '

export default function Section5_TrabajoSolicitado({
  onNext,
  onBack,
  presupuestosSinAsignar = [],
  cargandoPresupuestos = false,
  asignandoPresupuesto = null,
  presupuestoSeleccionadoId = null,
  onAsignarPresupuesto,
  creandoPresupuestoInicial = false,
  onCrearPresupuestoInicial,
}) {
  const { formData, updateForm } = useForm()
  const [errores, setErrores] = useState({})

  function agregarSugerencia(texto) {
    const actual = formData.trabajo_solicitado ?? ''
    const prefix = actual.trim() ? BULLET_PREFIX : BULLET_FIRST
    updateForm({ trabajo_solicitado: `${actual.trimEnd()}${prefix}${texto}` })
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    const input = e.currentTarget
    const value = input.value
    const start = input.selectionStart
    const end = input.selectionEnd
    const bullet = value.trim() ? BULLET_PREFIX : BULLET_FIRST
    const next = `${value.slice(0, start)}${bullet}${value.slice(end)}`
    updateForm({ trabajo_solicitado: next })
    window.requestAnimationFrame(() => {
      const pos = start + bullet.length
      input.setSelectionRange(pos, pos)
    })
  }

  function handleSubmit() {
    const e = validarSeccion5(formData)
    setErrores(e)
    if (Object.keys(e).length === 0) onNext()
  }

  const chars = (formData.trabajo_solicitado ?? '').length
  const actaListaParaPresupuesto = !!formData.acta_id

  return (
    <div className="section-enter" style={{ padding: '0 16px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--secco-gold)', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Técnico</p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>Trabajo Solicitado</h2>
        <div className="s-divider" />
      </div>

      <div className="s-card" style={{ marginBottom: 16 }}>
        <label className="s-label">Descripción <span style={{ color: 'var(--destructive)' }}>*</span></label>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Describe qué busca el cliente y qué espera del servicio.
        </p>
        <textarea
          rows={6}
          value={formData.trabajo_solicitado ?? ''}
          onChange={(e) => updateForm({ trabajo_solicitado: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="El cliente trae el vehículo porque…"
          className={`s-input ${errores.trabajo_solicitado ? 's-input-err' : ''}`}
          style={{ resize: 'none' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {errores.trabajo_solicitado
            ? <p className="s-error" style={{ margin: 0 }}>{errores.trabajo_solicitado}</p>
            : <span />
          }
          <span style={{ color: 'var(--placeholder)', fontSize: 12 }}>{chars} car.</span>
        </div>
      </div>

      <div className="s-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <p style={{ color: 'var(--secco-gold)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>
              Presupuesto inicial
            </p>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: 0, lineHeight: 1.45 }}>
              Puedes asociar un presupuesto sin asignar a esta acta. Luego seguirá siendo posible crear un presupuesto final.
            </p>
          </div>
          {presupuestoSeleccionadoId && (
            <span style={{ background: 'rgba(34,139,80,0.12)', color: 'var(--secco-green)', fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 6, flexShrink: 0 }}>
              Asignado
            </span>
          )}
        </div>

        {!actaListaParaPresupuesto && (
          <p style={{ color: 'var(--secco-gold-dark)', fontSize: 12, margin: '0 0 10px', lineHeight: 1.4 }}>
            Para crear o asignar un presupuesto, el acta debe estar guardada como borrador (avanzá desde cliente y vehículo, o esperá a que figure «Guardado» arriba).
          </p>
        )}
        <button
          type="button"
          onClick={() => onCrearPresupuestoInicial?.()}
          disabled={creandoPresupuestoInicial || !!presupuestoSeleccionadoId || !actaListaParaPresupuesto || typeof onCrearPresupuestoInicial !== 'function'}
          style={{
            width: '100%',
            border: '1.5px solid var(--secco-gold-30)',
            background: 'var(--secco-gold-10)',
            color: 'var(--secco-gold)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 13,
            fontWeight: 800,
            fontFamily: 'inherit',
            cursor: creandoPresupuestoInicial || presupuestoSeleccionadoId || !actaListaParaPresupuesto ? 'default' : 'pointer',
            opacity: creandoPresupuestoInicial || presupuestoSeleccionadoId || !actaListaParaPresupuesto ? 0.65 : 1,
            marginBottom: 12,
          }}
        >
          {creandoPresupuestoInicial ? 'Creando presupuesto...' : 'Crear presupuesto inicial para esta acta'}
        </button>

        {cargandoPresupuestos ? (
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: 0 }}>Cargando presupuestos sin asignar...</p>
        ) : !presupuestosSinAsignar.length ? (
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: 0 }}>No hay presupuestos sin asignar disponibles.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {presupuestosSinAsignar.map((cot) => {
              const veh = cot.vista_cliente?.vehiculo_manual || {}
              const cli = cot.vista_cliente?.cliente_manual || {}
              const titulo = cot.vista_cliente?.titulo || `COT-${cot.numero_cotizacion}`
              const asignando = asignandoPresupuesto === cot.id
              return (
                <button
                  key={cot.id}
                  type="button"
                  onClick={() => onAsignarPresupuesto?.(cot.id)}
                  disabled={asignando || !!presupuestoSeleccionadoId}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 12,
                    cursor: asignando || presupuestoSeleccionadoId ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: asignando || presupuestoSeleccionadoId ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', color: 'var(--foreground)', fontSize: 14, fontWeight: 700 }}>
                        {titulo}
                      </p>
                      <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 12 }}>
                        COT-{cot.numero_cotizacion}
                        {veh.patente ? ` \u00b7 ${veh.patente}` : ''}
                        {veh.marca || veh.modelo ? ` \u00b7 ${[veh.marca, veh.modelo].filter(Boolean).join(' ')}` : ''}
                        {cli.nombre ? ` \u00b7 ${cli.nombre}` : ''}
                      </p>
                    </div>
                    <span style={{ color: 'var(--secco-gold)', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                      {asignando ? 'Asignando...' : 'Asignar'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Sugerencias */}
      <div className="s-card" style={{ marginBottom: 16 }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 0, marginBottom: 14 }}>
          Agregar rápido
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGERENCIAS.map((s) => (
            <button key={s} type="button" onClick={() => agregarSugerencia(s)}
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted-foreground)',
                transition: 'border-color 120ms, color 120ms',
              }}
            >+ {s}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button type="button" onClick={handleSubmit} className="s-btn-primary">Continuar</button>
        <button type="button" onClick={onBack}    className="s-btn-secondary">Volver</button>
      </div>
    </div>
  )
}

