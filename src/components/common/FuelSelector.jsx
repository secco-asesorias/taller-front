const NIVELES = [
  { value: 'vacio', label: 'Vacío', pct: 0 },
  { value: '1/4',  label: '¼',    pct: 25 },
  { value: '1/2',  label: '½',    pct: 50 },
  { value: '3/4',  label: '¾',    pct: 75 },
  { value: 'lleno',label: 'Lleno',pct: 100 },
]

export default function FuelSelector({ value, onChange }) {
  const selected = NIVELES.find((n) => n.value === value)

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
        {NIVELES.map((n) => {
          const active = value === n.value
          return (
            <button
              key={n.value}
              type="button"
              onClick={() => onChange(n.value)}
              style={{
                padding: '12px 4px',
                borderRadius: 10,
                border: active ? '1.5px solid #a98225' : '1.5px solid #E0E0E0',
                background: active ? '#a98225' : '#FFFFFF',
                color: active ? '#FFFFFF' : '#6B6B6B',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                fontFamily: 'inherit',
              }}
            >
              {n.label}
            </button>
          )
        })}
      </div>

      {selected && (
        <div style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#6B6B6B', fontSize: 11 }}>Vacío</span>
            <span style={{ color: '#a98225', fontSize: 12, fontWeight: 600 }}>{selected.label}</span>
            <span style={{ color: '#6B6B6B', fontSize: 11 }}>Lleno</span>
          </div>
          <div style={{ height: 4, background: '#E0E0E0', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${selected.pct}%`,
                background: selected.pct < 25 ? '#FF453A' : selected.pct < 50 ? '#FF9F0A' : '#a98225',
                borderRadius: 2,
                transition: 'width 400ms ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
