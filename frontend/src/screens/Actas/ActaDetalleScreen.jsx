import { useEffect, useState } from 'react'
import { actaService } from '../../services/actaService'
import { generarPDFDesdeActaGuardada } from '../../utils/pdf'

function Campo({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: 10, color: '#6B6B6B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#111114', fontWeight: 500, lineHeight: 1.4 }}>{value}</p>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#a98225', borderBottom: '1px solid rgba(169,130,37,0.2)', paddingBottom: 6 }}>{titulo}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
        {children}
      </div>
    </div>
  )
}

function statusText(val) {
  return String(val || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusStyle(status) {
  if (status === 'cerrada') return { background: 'rgba(52,199,89,0.12)', color: '#1a7a34', border: '1px solid rgba(52,199,89,0.3)' }
  if (status === 'borrador') return { background: 'rgba(107,107,107,0.10)', color: '#6B6B6B', border: '1px solid #E0E0E0' }
  return { background: 'rgba(169,130,37,0.10)', color: '#a98225', border: '1px solid rgba(169,130,37,0.3)' }
}

export default function ActaDetalleScreen({ actaId, onNavigate, onVolver }) {
  const [acta, setActa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    if (!actaId) { setError('ID de acta no especificado'); setLoading(false); return }
    actaService.obtener(actaId)
      .then(setActa)
      .catch((err) => setError(err.message || 'Error al cargar acta'))
      .finally(() => setLoading(false))
  }, [actaId])

  async function handleDescargarPDF() {
    if (!acta) return
    setDescargando(true)
    try { await generarPDFDesdeActaGuardada(acta) }
    catch (e) { alert(`Error al generar PDF: ${e.message}`) }
    finally { setDescargando(false) }
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando acta...</p>
      </div>
    )
  }

  if (error || !acta) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p className="s-error">⚠ {error || 'Acta no encontrada'}</p>
        <button className="s-btn-secondary" style={{ marginTop: 16 }} onClick={onVolver}>Volver</button>
      </div>
    )
  }

  const cliente = acta.clientes || {}
  const vehiculo = acta.vehiculos || {}
  const fotos = acta.fotos_acta || []
  const TIPOS_FOTO = ['frontal', 'trasera', 'lateral_izq', 'lateral_der', 'danos', 'interior', 'km', 'combustible', 'firma_cliente', 'firma_secco']
  const fotosMap = {}
  for (const f of fotos) {
    fotosMap[f.tipo] = [...(fotosMap[f.tipo] || []), f.url]
  }

  const fechaIngreso = acta.fecha_ingreso
    ? new Date(acta.fecha_ingreso + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E0E0E0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 40 }}>
        <button type="button" onClick={onVolver}
          style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', color: '#111114', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111114' }}>
            {acta.numero_acta ? `Acta #${acta.numero_acta}` : 'Acta de recepción'}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#6B6B6B' }}>
            {vehiculo.marca} {vehiculo.modelo} · {vehiculo.patente}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDescargarPDF}
          disabled={descargando}
          style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1.5px solid #a98225', background: '#FFFFFF', color: '#a98225', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: descargando ? 0.5 : 1 }}
        >
          {descargando ? '...' : '↓ PDF'}
        </button>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Status badge */}
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, ...statusStyle(acta.status) }}>
            {statusText(acta.status)}
          </span>
        </div>

        {/* Datos cliente */}
        <div className="s-card" style={{ marginBottom: 12 }}>
          <Seccion titulo="Cliente">
            <Campo label="Nombre" value={cliente.nombre} />
            <Campo label="RUT" value={cliente.rut} />
            <Campo label="Teléfono" value={cliente.telefono} />
            <Campo label="Correo" value={cliente.email} />
          </Seccion>
        </div>

        {/* Datos vehículo */}
        <div className="s-card" style={{ marginBottom: 12 }}>
          <Seccion titulo="Vehículo">
            <Campo label="Marca" value={vehiculo.marca} />
            <Campo label="Modelo" value={vehiculo.modelo} />
            <Campo label="Año" value={vehiculo.anio} />
            <Campo label="Patente" value={vehiculo.patente} />
            <Campo label="VIN" value={vehiculo.vin} />
            <Campo label="Color" value={vehiculo.color} />
          </Seccion>
        </div>

        {/* Datos ingreso */}
        <div className="s-card" style={{ marginBottom: 12 }}>
          <Seccion titulo="Datos de ingreso">
            <Campo label="Fecha" value={fechaIngreso} />
            <Campo label="Hora" value={acta.hora_ingreso?.slice(0, 5)} />
            <Campo label="Kilometraje" value={acta.km != null ? `${Number(acta.km).toLocaleString('es-CL')} km` : null} />
            <Campo label="Combustible" value={acta.combustible} />
            <Campo label="Llaves" value={acta.llaves != null ? String(acta.llaves) : null} />
            {Array.isArray(acta.documentacion) && acta.documentacion.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Campo label="Documentación" value={acta.documentacion.join(', ')} />
              </div>
            )}
          </Seccion>
        </div>

        {/* Estado vehículo */}
        {(acta.estado_exterior || acta.estado_interior) && (
          <div className="s-card" style={{ marginBottom: 12 }}>
            <Seccion titulo="Estado del vehículo">
              <Campo label="Exterior" value={statusText(acta.estado_exterior)} />
              <Campo label="Interior" value={statusText(acta.estado_interior)} />
              <div style={{ gridColumn: '1 / -1' }}>
                <Campo label="Detalle exterior" value={acta.detalle_exterior} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Campo label="Detalle interior" value={acta.detalle_interior} />
              </div>
            </Seccion>
          </div>
        )}

        {/* Trabajo solicitado */}
        {acta.trabajo_solicitado && (
          <div className="s-card" style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#a98225', borderBottom: '1px solid rgba(169,130,37,0.2)', paddingBottom: 6 }}>
              Trabajo solicitado
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#111114', lineHeight: 1.5, background: '#FAFAFA', borderRadius: 8, padding: '10px 12px', border: '1px solid #EEEEEE', whiteSpace: 'pre-wrap' }}>
              {acta.trabajo_solicitado}
            </p>
          </div>
        )}

        {/* Responsable */}
        {(acta.tc_nombre || acta.tecnico_nombre) && (
          <div className="s-card" style={{ marginBottom: 12 }}>
            <Seccion titulo="Responsable SECCO">
              <Campo label="Responsable" value={acta.tc_nombre || acta.tecnico_nombre} />
            </Seccion>
          </div>
        )}

        {/* Fotos */}
        {fotos.length > 0 && (
          <div className="s-card" style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#a98225', borderBottom: '1px solid rgba(169,130,37,0.2)', paddingBottom: 6 }}>
              Fotos ({fotos.length})
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {TIPOS_FOTO.flatMap((tipo) =>
                (fotosMap[tipo] || []).map((url, idx) => (
                  <div key={`${tipo}-${idx}`} style={{ borderRadius: 8, overflow: 'hidden', background: '#F5F5F5', border: '1px solid #EEEEEE', aspectRatio: '4/3' }}>
                    <img
                      src={url}
                      alt={tipo.replace(/_/g, ' ')}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { e.target.parentElement.style.display = 'none' }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
          {acta.diagnostico_id && (
            <button
              type="button"
              className="s-btn-primary"
              onClick={() => onNavigate?.(`diagnosticos/${acta.diagnostico_id}`)}
            >
              Ver diagnóstico →
            </button>
          )}
          <button type="button" className="s-btn-secondary" onClick={onVolver}>
            Volver a actas
          </button>
        </div>
      </div>
    </div>
  )
}
