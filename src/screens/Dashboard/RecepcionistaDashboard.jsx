import { useRol } from '../../context/AuthContext'

const ACCIONES = [
  { label: 'Nueva Acta', ruta: 'actas/nueva', icon: '📋', desc: 'Registrar ingreso de vehículo', primary: true },
  { label: 'Ver Actas', ruta: 'actas', icon: '📂', desc: 'Historial de recepciones' },
  { label: 'Clientes', ruta: 'clientes', icon: '👥', desc: 'Base de datos de clientes' },
  { label: 'Órdenes de Trabajo', ruta: 'ordenes-trabajo', icon: '⚙️', desc: 'Estado de trabajos' },
]

export default function RecepcionistaDashboard({ onNavigate }) {
  const { nombre } = useRol()

  return (
    <div style={{ padding: '24px 16px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: '#6B6B6B', fontSize: 13, margin: '0 0 2px' }}>Bienvenido,</p>
        <h2 style={{ color: '#111114', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
          {nombre || 'Recepcionista'}
        </h2>
        <div className="s-divider" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {ACCIONES.map((a) => (
          <button
            key={a.ruta}
            onClick={() => onNavigate(a.ruta)}
            style={{
              background: a.primary ? '#a98225' : '#FFFFFF',
              color: a.primary ? '#FFFFFF' : '#111114',
              border: a.primary ? 'none' : '1.5px solid #E0E0E0',
              borderRadius: 14,
              padding: '18px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              boxShadow: a.primary ? '0 2px 8px rgba(169,130,37,0.18)' : '0 1px 4px rgba(0,0,0,0.06)',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 24 }}>{a.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{a.label}</span>
            <span style={{ fontSize: 11, opacity: a.primary ? 0.85 : 0.55, lineHeight: 1.3 }}>{a.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
