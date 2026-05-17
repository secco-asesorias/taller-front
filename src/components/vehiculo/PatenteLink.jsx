import { useVehiculoPanelOptional } from '../../context/VehiculoPanelContext'
import { isPatenteAbrible } from '../../lib/normalizePatente'

const LINK_STYLE = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: '#1e3a8a',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  cursor: 'pointer',
  fontWeight: 'inherit',
}

const MONO_STYLE = {
  fontFamily: 'monospace',
  letterSpacing: '1px',
}

/**
 * Patente clickeable que abre el panel global del vehículo.
 * Si no hay patente válida o no hay provider, renderiza texto plano.
 */
export default function PatenteLink({
  patente,
  children,
  className,
  style,
  mono = false,
  stopPropagation = false,
  title = 'Ver historial del vehículo',
  onClick,
  ...rest
}) {
  const panel = useVehiculoPanelOptional()
  const label = children ?? patente
  const abrible = isPatenteAbrible(patente) && panel?.openVehiculoPanel

  if (!abrible) {
    return (
      <span className={className} style={mono ? { ...style, ...MONO_STYLE } : style} {...rest}>
        {label}
      </span>
    )
  }

  return (
    <button
      type="button"
      title={title}
      className={className}
      style={{ ...LINK_STYLE, ...(mono ? MONO_STYLE : {}), ...style }}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation()
        onClick?.(e)
        panel.openVehiculoPanel(patente)
      }}
      {...rest}
    >
      {label}
    </button>
  )
}
