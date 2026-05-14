import { useCallback, useEffect, useRef, useState } from 'react'
import { actaService } from '../../services/actaService'
import { cotizacionService } from '../../services/cotizacionService'
import { unwrapApiList } from '../../lib/unwrapApiList'

const STATUS_ACTA_LABEL = {
  borrador: 'Borrador',
  cerrada: 'Cerrada',
}

function statusLabel(status) {
  const k = String(status || '').toLowerCase()
  return STATUS_ACTA_LABEL[k] || status || ''
}

function descripcionVehiculo(acta) {
  const v = acta?.vehiculos || {}
  const marca = v.marca || ''
  const modelo = v.modelo || ''
  const patente = v.patente || ''
  const head = `${marca} ${modelo}`.trim()
  if (head || patente) return head ? `${head}${patente ? ` · ${patente}` : ''}` : patente
  // Sin populate de vehiculos: al menos mostrá el número de acta para confirmar el vínculo.
  if (acta?.numero_acta) return `Acta #${acta.numero_acta} · sin datos de vehículo`
  return 'Sin vehículo'
}

function nombreCliente(acta) {
  return acta?.clientes?.nombre || ''
}

/**
 * Panel para vincular/desvincular un acta a la cotización abierta.
 *
 * Props:
 *  - cotizacion: la cotización actual (con `acta_id`, `actas`, etc.).
 *  - onVinculada(full): callback con la cotización refrescada tras vincular/desvincular.
 *  - onError(mensaje): callback opcional para mostrar toast/alert.
 *  - disabled: deshabilita las acciones (ej: cuando hay una operación pendiente).
 */
export default function VincularActaPanel({ cotizacion, onVinculada, onError, disabled = false }) {
  const tieneAsignacion = Boolean(cotizacion?.acta_id || cotizacion?.actas?.id)
  const actaActual = cotizacion?.actas || null

  const [modoBuscar, setModoBuscar] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [pendiente, setPendiente] = useState(null) // 'vincular' | 'desvincular' | null
  const [pendienteActaId, setPendienteActaId] = useState(null)
  const debounceRef = useRef(null)

  const cargarRecientes = useCallback(async () => {
    setBuscando(true)
    try {
      const data = await actaService.listar({ limite: 12 })
      setResultados(unwrapApiList(data, ['actas']))
    } catch (e) {
      setResultados([])
      onError?.(e?.message || 'No se pudieron cargar actas recientes')
    } finally {
      setBuscando(false)
    }
  }, [onError])

  const buscarPorPatente = useCallback(async (q) => {
    setBuscando(true)
    try {
      const data = await actaService.buscarPorPatente(q, { limite: 20 })
      setResultados(unwrapApiList(data, ['actas']))
    } catch (e) {
      setResultados([])
      onError?.(e?.message || 'Error al buscar actas')
    } finally {
      setBuscando(false)
    }
  }, [onError])

  useEffect(() => {
    if (!modoBuscar) return
    const q = filtro.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q) {
      cargarRecientes()
      return
    }
    debounceRef.current = setTimeout(() => buscarPorPatente(q), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filtro, modoBuscar, buscarPorPatente, cargarRecientes])

  function abrirBusqueda() {
    setModoBuscar(true)
    setFiltro('')
    if (!resultados.length) cargarRecientes()
  }

  function cerrarBusqueda() {
    setModoBuscar(false)
    setFiltro('')
  }

  async function refrescarCotizacion() {
    try {
      const full = await cotizacionService.obtener(cotizacion.id)
      onVinculada?.(full)
    } catch (e) {
      onError?.(e?.message || 'Vinculación aplicada, pero no se pudo refrescar')
    }
  }

  async function handleVincular(actaId) {
    if (!cotizacion?.id) {
      onError?.('Primero guardá la cotización para poder vincularla.')
      return
    }
    setPendiente('vincular')
    setPendienteActaId(actaId)
    try {
      await cotizacionService.vincularActa(cotizacion.id, actaId)
      await refrescarCotizacion()
      cerrarBusqueda()
    } catch (e) {
      const status = e?.status
      const msg = status === 401 || status === 403
        ? 'No tenés permisos para vincular esta cotización a un acta.'
        : (e?.message || 'No se pudo vincular el acta')
      onError?.(msg)
    } finally {
      setPendiente(null)
      setPendienteActaId(null)
    }
  }

  async function handleDesvincular() {
    if (!cotizacion?.id) return
    setPendiente('desvincular')
    try {
      await cotizacionService.desvincularActa(cotizacion.id)
      await refrescarCotizacion()
    } catch (e) {
      const status = e?.status
      const msg = status === 401 || status === 403
        ? 'No tenés permisos para desvincular esta cotización.'
        : (e?.message || 'No se pudo desvincular el acta')
      onError?.(msg)
    } finally {
      setPendiente(null)
    }
  }

  const accionando = pendiente !== null
  const blockAll = disabled || accionando

  return (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid #E0E0E0', background: '#FFFFFF' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111114' }}>Acta vinculada</p>
        {tieneAsignacion && actaActual?.numero_acta && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#1a7a34',
            background: 'rgba(52,199,89,0.10)', border: '1px solid rgba(52,199,89,0.3)',
            padding: '2px 8px', borderRadius: 12,
          }}>
            ACT-{actaActual.numero_acta}
          </span>
        )}
      </div>

      {!cotizacion?.id && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#6B6B6B', lineHeight: 1.45 }}>
          Guardá la cotización en el servidor (botón «Guardar borrador» arriba) para poder vincularla a un acta.
        </p>
      )}

      {cotizacion?.id && tieneAsignacion && !modoBuscar && (
        <>
          <p style={{ margin: '10px 0 4px', fontSize: 13, color: '#111114', fontWeight: 600 }}>
            {descripcionVehiculo(actaActual) || 'Acta sin vehículo'}
          </p>
          {nombreCliente(actaActual) && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6B6B6B' }}>
              {nombreCliente(actaActual)}
            </p>
          )}
          <p style={{ margin: '0 0 10px', fontSize: 11, color: '#6B6B6B' }}>
            Estado del acta: <strong>{statusLabel(actaActual?.status)}</strong>
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={abrirBusqueda}
              disabled={blockAll}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                background: '#FFF',
                color: '#a98225',
                border: '1px solid rgba(169,130,37,0.45)',
                borderRadius: 8,
                cursor: blockAll ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cambiar acta
            </button>
            <button
              type="button"
              onClick={handleDesvincular}
              disabled={blockAll}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                background: '#FFF',
                color: '#FF453A',
                border: '1px solid rgba(255,69,58,0.35)',
                borderRadius: 8,
                cursor: blockAll ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {pendiente === 'desvincular' ? '…' : 'Desvincular'}
            </button>
          </div>
        </>
      )}

      {cotizacion?.id && !tieneAsignacion && !modoBuscar && (
        <>
          <p style={{ margin: '8px 0 10px', fontSize: 11, color: '#6B6B6B', lineHeight: 1.45 }}>
            Sin acta vinculada. Asigná una para que el presupuesto se pueda aprobar y generar OT.
          </p>
          <button
            type="button"
            onClick={abrirBusqueda}
            disabled={blockAll}
            style={{
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              background: 'rgba(169,130,37,0.12)',
              color: '#a98225',
              border: '1px solid rgba(169,130,37,0.35)',
              borderRadius: 8,
              cursor: blockAll ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + Vincular acta
          </button>
        </>
      )}

      {cotizacion?.id && modoBuscar && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value.toUpperCase())}
              placeholder="Buscar por patente…"
              autoFocus
              autoComplete="off"
              style={{
                flex: 1,
                fontSize: 12,
                padding: '7px 10px',
                border: '1px solid #E0E0E0',
                borderRadius: 8,
                outline: 'none',
                color: '#111114',
                fontFamily: 'monospace',
                letterSpacing: '1px',
              }}
            />
            <button
              type="button"
              onClick={cerrarBusqueda}
              style={{
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: '#F5F5F5',
                color: '#6B6B6B',
                border: '1px solid #E0E0E0',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
          </div>

          {buscando && (
            <p style={{ margin: 0, fontSize: 11, color: '#6B6B6B' }}>Buscando…</p>
          )}

          {!buscando && resultados.length === 0 && (
            <p style={{ margin: 0, fontSize: 11, color: '#6B6B6B' }}>
              {filtro.trim() ? 'No se encontraron actas para esa patente.' : 'No hay actas recientes para mostrar.'}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {resultados.map((acta) => {
              const yaEsLaActual = actaActual?.id === acta.id
              const enCurso = pendiente === 'vincular' && pendienteActaId === acta.id
              return (
                <div
                  key={acta.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    background: yaEsLaActual ? 'rgba(52,199,89,0.06)' : '#FAFAFA',
                    border: '1px solid #E0E0E0',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111114' }}>
                      ACT-{acta.numero_acta || '—'} · {descripcionVehiculo(acta)}
                    </p>
                    {nombreCliente(acta) && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B6B6B' }}>{nombreCliente(acta)}</p>
                    )}
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#AAAAAA' }}>
                      {statusLabel(acta.status)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVincular(acta.id)}
                    disabled={blockAll || yaEsLaActual}
                    style={{
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      background: yaEsLaActual ? '#E0E0E0' : '#a98225',
                      color: yaEsLaActual ? '#6B6B6B' : '#FFF',
                      border: 'none',
                      borderRadius: 6,
                      cursor: blockAll || yaEsLaActual ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {yaEsLaActual ? 'Actual' : enCurso ? '…' : 'Vincular'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
