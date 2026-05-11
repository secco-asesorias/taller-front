const SECCIONES = [
  { num: 1, label: 'Cliente' },
  { num: 2, label: 'Vehículo' },
  { num: 3, label: 'Ingreso' },
  { num: 4, label: 'Estado' },
  { num: 5, label: 'Trabajo' },
  { num: 6, label: 'Firma C.' },
  { num: 7, label: 'Firma S.' },
  { num: 8, label: 'Checklist' },
]

export default function ProgressBar({
  seccionActual,
  secciones = SECCIONES,
  /** Paso más lejano ya alcanzado en esta sesión (permite volver y reavanzar sin saltar adelante). */
  maxSeccionAlcanzada = seccionActual,
  /** Ir a un paso ya visitado (1…8). */
  onIrASeccion,
}) {
  const pct = Math.round(((seccionActual - 1) / (secciones.length - 1)) * 100)

  function puedeIr(n) {
    return typeof onIrASeccion === 'function' && n >= 1 && n <= secciones.length && n <= maxSeccionAlcanzada && n !== seccionActual
  }

  return (
    <div style={{ background: '#F5F5F5', borderBottom: '1px solid #E0E0E0' }} className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: '#6B6B6B', fontSize: 12, letterSpacing: '0.6px', textTransform: 'uppercase', fontWeight: 500 }}>
          Sección {seccionActual} de {secciones.length}
        </span>
        <span style={{ color: '#a98225', fontSize: 12, fontWeight: 600 }}>{pct}%</span>
      </div>

      <div style={{ width: '100%', height: 2, background: '#E0E0E0', borderRadius: 1, overflow: 'hidden', marginBottom: 14 }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: '#a98225',
            borderRadius: 1,
            transition: 'width 400ms ease',
          }}
        />
      </div>

      <div className="flex justify-between gap-1">
        {secciones.map((s) => {
          const done   = s.num < seccionActual
          const active = s.num === seccionActual
          const clicable = puedeIr(s.num)
          const futuroSinVisitar = s.num > maxSeccionAlcanzada

          const circleStyle = {
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            marginBottom: 3,
            transition: 'all 200ms ease',
            ...(done
              ? { background: '#a98225', color: '#FFFFFF', border: 'none' }
              : active
              ? { background: 'transparent', border: '2px solid #a98225', color: '#a98225' }
              : { background: '#E0E0E0', color: '#6B6B6B', border: 'none' }),
            ...(clicable ? { cursor: 'pointer', padding: 0 } : {}),
            ...(!clicable && futuroSinVisitar && typeof onIrASeccion === 'function' ? { opacity: 0.55 } : {}),
          }

          return (
            <div key={s.num} className="flex flex-col items-center flex-1 min-w-0">
              {clicable ? (
                <button
                  type="button"
                  title={`Ir a: ${s.label}`}
                  aria-label={`Ir al paso ${s.num}, ${s.label}`}
                  onClick={() => onIrASeccion(s.num)}
                  style={circleStyle}
                  className={done ? 'check-animate' : ''}
                >
                  {done ? '✓' : s.num}
                </button>
              ) : (
                <div
                  style={circleStyle}
                  className={done ? 'check-animate' : ''}
                  title={futuroSinVisitar && typeof onIrASeccion === 'function' ? 'Completa los pasos anteriores' : undefined}
                >
                  {done ? '✓' : s.num}
                </div>
              )}
              <span
                style={{
                  fontSize: 9,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  color: done ? '#a98225' : active ? '#111114' : '#AAAAAA',
                  fontWeight: active ? 600 : 400,
                  pointerEvents: 'none',
                }}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
