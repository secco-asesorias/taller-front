import { useEffect, useMemo, useState } from 'react'
import { useVehiculoPanel } from '../../context/VehiculoPanelContext'
import PatenteLink from '../../components/vehiculo/PatenteLink'
import { fetchTodosLosVehiculos, filtrarVehiculos } from '../../services/vehiculoListService'
import { vehiculoService } from '../../services/vehiculoService'
import { normalizePatente, isPatenteAbrible } from '../../lib/normalizePatente'
import { useToast } from '../../components/common/ToastProvider'

function clienteNombre(veh) {
  const c = veh?.clientes
  if (Array.isArray(c)) return c[0]?.nombre
  return c?.nombre
}

function tituloVehiculo(veh) {
  return [veh.marca, veh.modelo, veh.anio].filter(Boolean).join(' ') || 'Sin datos de modelo'
}

export default function VehiculosListScreen({ patenteInicial }) {
  const toast = useToast()
  const { openVehiculoPanel } = useVehiculoPanel()
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('')
  const [buscandoPatente, setBuscandoPatente] = useState(false)

  function cargar() {
    setLoading(true)
    setError('')
    fetchTodosLosVehiculos({ limite: 200 })
      .then(setVehiculos)
      .catch((err) => setError(err?.message || 'Error al cargar vehículos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  useEffect(() => {
    if (!patenteInicial || !isPatenteAbrible(patenteInicial)) return
    openVehiculoPanel(patenteInicial)
  }, [patenteInicial, openVehiculoPanel])

  const filtrados = useMemo(() => filtrarVehiculos(vehiculos, filtro), [vehiculos, filtro])

  async function buscarPatenteExacta() {
    const patente = normalizePatente(filtro)
    if (!isPatenteAbrible(patente)) {
      toast.warning('Ingresa una patente válida para buscar')
      return
    }
    setBuscandoPatente(true)
    try {
      const veh = await vehiculoService.buscarPorPatente(patente)
      if (veh?.patente || veh?.id) {
        setVehiculos((prev) => {
          const key = veh.id || normalizePatente(veh.patente)
          const exists = prev.some((v) => (v.id || normalizePatente(v.patente)) === key)
          if (exists) return prev
          return [...prev, veh].sort((a, b) =>
            normalizePatente(a.patente).localeCompare(normalizePatente(b.patente), 'es'),
          )
        })
        openVehiculoPanel(patente)
        toast.success('Vehículo encontrado')
      } else {
        openVehiculoPanel(patente)
        toast.info('Patente sin registro; se muestra historial vinculado')
      }
    } catch (e) {
      if (e?.status === 404) {
        openVehiculoPanel(patente)
        toast.info('Patente sin registro; se muestra historial vinculado')
      } else {
        toast.error(e?.message || 'Error al buscar patente')
      }
    } finally {
      setBuscandoPatente(false)
    }
  }

  function abrirVehiculo(veh) {
    const patente = normalizePatente(veh.patente)
    if (!isPatenteAbrible(patente)) {
      toast.warning('Este vehículo no tiene patente válida')
      return
    }
    openVehiculoPanel(patente)
  }

  return (
    <div style={{ padding: '14px 12px 40px' }}>
      <style>{`
        .veh-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .veh-tools { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 14px; }
        .veh-searchWrap { position: relative; }
        .veh-searchIcon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #AAAAAA; font-size: 14px; pointer-events: none; }
        .veh-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 720px) { .veh-grid { grid-template-columns: 1fr 1fr; gap: 12px; } }
        @media (max-width: 520px) { .veh-tools { grid-template-columns: 1fr; } }
      `}</style>

      <div className="veh-toolbar">
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 800, margin: 0 }}>Vehículos</h2>
          <p style={{ margin: '4px 0 0', color: '#6B6B6B', fontSize: 12 }}>
            {loading ? 'Cargando...' : `${filtrados.length} vehículo${filtrados.length === 1 ? '' : 's'}`}
            {!loading && filtro ? ` (filtrado de ${vehiculos.length})` : ''}
          </p>
        </div>
        <button
          type="button"
          className="s-btn-secondary"
          style={{ width: 'auto', height: 40, padding: '9px 14px', fontSize: 13 }}
          onClick={cargar}
          disabled={loading}
        >
          Actualizar
        </button>
      </div>

      <div className="veh-tools">
        <div className="veh-searchWrap">
          <span className="veh-searchIcon">⌕</span>
          <input
            type="text"
            placeholder="Buscar por patente, marca, modelo, cliente..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="s-input"
            style={{ paddingLeft: 36 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') buscarPatenteExacta()
            }}
          />
        </div>
        <button
          type="button"
          className="s-btn-primary"
          style={{ width: 'auto', height: 44, padding: '0 16px', fontSize: 13, whiteSpace: 'nowrap' }}
          onClick={buscarPatenteExacta}
          disabled={buscandoPatente || !filtro.trim()}
        >
          {buscandoPatente ? 'Buscando…' : 'Ir a patente'}
        </button>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 12, color: '#6B6B6B', lineHeight: 1.45 }}>
        Haz clic en una patente o en una tarjeta para ver actas, diagnósticos, cotizaciones y OT asociados.
      </p>

      {error ? <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p> : null}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando vehículos...</p>
        </div>
      ) : (
        <div className="veh-grid">
          {filtrados.map((veh) => {
            const nombreCliente = clienteNombre(veh)
            return (
              <button
                key={veh.id || normalizePatente(veh.patente)}
                type="button"
                onClick={() => abrirVehiculo(veh)}
                className="s-card"
                style={{
                  padding: 16,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: '1.5px solid #E0E0E0',
                  borderRadius: 14,
                  background: '#FFFFFF',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1.5px', color: '#111114' }}>
                      {veh.patente ? (
                        <PatenteLink
                          patente={veh.patente}
                          mono
                          stopPropagation
                          style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a' }}
                        />
                      ) : '—'}
                    </p>
                    <p style={{ margin: '0 0 4px', color: '#111114', fontSize: 14, fontWeight: 600 }}>
                      {tituloVehiculo(veh)}
                    </p>
                    {nombreCliente ? (
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>
                        Cliente: {nombreCliente}
                      </p>
                    ) : null}
                    {(veh.color || veh.vin) ? (
                      <p style={{ margin: '4px 0 0', color: '#6B6B6B', fontSize: 11 }}>
                        {veh.color || ''}
                        {veh.color && veh.vin ? ' · ' : ''}
                        {veh.vin ? `VIN ${veh.vin}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 20,
                    flexShrink: 0,
                    background: 'rgba(30,58,138,0.08)',
                    color: '#1e3a8a',
                    border: '1px solid rgba(30,58,138,0.2)',
                  }}
                  >
                    Ver historial
                  </span>
                </div>
              </button>
            )
          })}
          {!filtrados.length ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#6B6B6B', fontSize: 14, margin: '0 0 12px' }}>
                {filtro ? 'Sin resultados para tu búsqueda' : 'No hay vehículos registrados'}
              </p>
              {filtro.trim() ? (
                <button type="button" className="s-btn-primary" style={{ width: 'auto', padding: '10px 18px' }} onClick={buscarPatenteExacta} disabled={buscandoPatente}>
                  Buscar patente «{filtro.trim().toUpperCase()}» en el taller
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
