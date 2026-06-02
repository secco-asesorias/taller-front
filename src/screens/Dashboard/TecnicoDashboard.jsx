import { useRol } from '../../context/AuthContext'
import { useMobile } from '../../hooks/useMobile'

const ACCIONES = [
  { label: 'Órdenes de Trabajo', ruta: 'ordenes-trabajo', icon: '⚙️', desc: 'Mis trabajos asignados', primary: true },
  { label: 'Diagnósticos', ruta: 'diagnosticos', icon: '🔧', desc: 'Informes técnicos' },
]

export default function TecnicoDashboard({ onNavigate }) {
  const { nombre, rolEtiqueta } = useRol()
  const isMobile = useMobile()

  return (
    <div style={{ padding: isMobile ? '16px 12px 40px' : '24px 16px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '0 0 2px' }}>Bienvenido,</p>
        <h2 style={{ color: 'var(--foreground)', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
          {nombre}
        </h2>
        {rolEtiqueta ? (
          <p style={{ margin: '6px 0 0', color: 'var(--muted-foreground)', fontSize: 12 }}>{rolEtiqueta}</p>
        ) : null}
        <div className="s-divider" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ACCIONES.map((a) => (
          <button
            key={a.ruta}
            onClick={() => onNavigate(a.ruta)}
            style={{
              background: a.primary ? 'var(--secco-gold)' : 'var(--background)',
              color: a.primary ? 'var(--background)' : 'var(--foreground)',
              border: a.primary ? 'none' : '1.5px solid #E0E0E0',
              borderRadius: 14,
              padding: '20px 18px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: a.primary ? '0 2px 8px var(--secco-gold-10)' : '0 1px 4px rgba(0,0,0,0.06)',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 30 }}>{a.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{a.label}</p>
              <p style={{ margin: 0, fontSize: 12, opacity: a.primary ? 0.85 : 0.55, marginTop: 2 }}>{a.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
