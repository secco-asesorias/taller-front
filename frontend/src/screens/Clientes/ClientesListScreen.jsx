import { useEffect, useState } from 'react'
import { clienteService } from '../../services/clienteService'

export default function ClientesListScreen({ onNavigate }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    clienteService.listar({ limite: 100 })
      .then(setClientes)
      .catch((err) => setError(err.message || 'Error al cargar clientes'))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = clientes.filter((c) => {
    if (!filtro) return true
    const q = filtro.toLowerCase()
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.rut?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefono?.includes(q)
    )
  })

  return (
    <div style={{ padding: '24px 16px 40px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#111114', fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>Clientes</h2>
        <input
          type="text"
          placeholder="Buscar por nombre, RUT, email..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="s-input"
        />
      </div>

      {error && <p className="s-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando clientes...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map((cliente) => (
            <div
              key={cliente.id}
              className="s-card"
              style={{ padding: 16, border: '1.5px solid #E0E0E0', borderRadius: 14 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', color: '#111114', fontSize: 15, fontWeight: 700 }}>
                    {cliente.nombre}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {cliente.rut && (
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>
                        RUT: <span style={{ color: '#111114', fontFamily: 'monospace' }}>{cliente.rut}</span>
                      </p>
                    )}
                    {cliente.telefono && (
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12 }}>
                        Tel: {cliente.telefono}
                      </p>
                    )}
                    {cliente.email && (
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cliente.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!filtrados.length && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#6B6B6B', fontSize: 14 }}>
                {filtro ? 'Sin resultados para tu búsqueda' : 'No hay clientes registrados'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
