import { useEffect, useState } from 'react'
import { actaEntregaService } from '../../services/actaEntregaService'
import { useToast } from '../../components/common/ToastProvider'
import { useConfirm } from '../../components/common/ConfirmProvider'
import { useRol } from '../../context/AuthContext'
import PatenteLink from '../../components/vehiculo/PatenteLink'
import { useMobile } from '../../hooks/useMobile'

function Campo({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', fontWeight: 500, lineHeight: 1.4 }}>{value}</p>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--secco-green-dark)', borderBottom: '1px solid rgba(26,122,52,0.2)', paddingBottom: 6 }}>{titulo}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>{children}</div>
    </div>
  )
}

function statusText(val) {
  return String(val || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusStyle(status) {
  if (status === 'cerrada') return { background: 'var(--secco-green-12)', color: 'var(--secco-green-dark)', border: '1px solid var(--secco-green-30)' }
  return { background: 'var(--secco-muted-10)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
}

export default function ActaEntregaDetalleScreen({ actaId, onNavigate, onVolver }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const { rol } = useRol()
  const isMobile = useMobile()
  const [acta, setActa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [eliminando, setEliminando] = useState(false)

  const esAdmin = rol === 'admin'

  useEffect(() => {
    if (!actaId) { setError('ID no especificado'); setLoading(false); return }
    actaEntregaService.obtener(actaId)
      .then(setActa)
      .catch((err) => setError(err.message || 'Error al cargar acta de entrega'))
      .finally(() => setLoading(false))
  }, [actaId])

  async function handleEliminar() {
    if (!actaId || !esAdmin) return
    const ok = await confirm({
      title: 'Eliminar acta de entrega',
      message: '¿Eliminar esta acta de entrega? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    setEliminando(true)
    try {
      await actaEntregaService.eliminar(actaId)
      toast.success('Acta de entrega eliminada')
      onVolver?.()
    } catch (e) {
      toast.error(e?.message ? `Error al eliminar: ${e.message}` : 'Error al eliminar')
    } finally {
      setEliminando(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando acta de entrega…</p>
      </div>
    )
  }

  if (error || !acta) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p className="s-error">{error || 'Acta no encontrada'}</p>
        <button type="button" className="s-btn-secondary" style={{ marginTop: 16 }} onClick={onVolver}>Volver</button>
      </div>
    )
  }

  const cliente = acta.clientes || {}
  const vehiculo = acta.vehiculos || {}
  const numero = acta.numero_acta_entrega ?? acta.numero_acta
  const fecha = acta.fecha_entrega || acta.fecha_ingreso
  const hora = acta.hora_entrega || acta.hora_ingreso
  const trabajo = acta.trabajo_realizado || acta.trabajo_solicitado
  const fechaFmt = fecha
    ? new Date(fecha.includes('T') ? fecha : fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
  const esBorrador = String(acta.status || '').toLowerCase() === 'borrador'

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)', padding: isMobile ? '10px 12px' : '12px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 40 }}>
        <button type="button" onClick={onVolver} style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
            {numero ? `Entrega #${numero}` : 'Acta de entrega'}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>
            {vehiculo.marca} {vehiculo.modelo}
            {vehiculo.patente ? <> · <PatenteLink patente={vehiculo.patente} mono /></> : null}
          </p>
        </div>
        {esBorrador ? (
          <button
            type="button"
            onClick={() => onNavigate?.(`actas-entrega/${actaId}/editar`)}
            style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1.5px solid #1a7a34', background: 'var(--background)', color: 'var(--secco-green-dark)', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Editar
          </button>
        ) : null}
        {esAdmin ? (
          <button
            type="button"
            onClick={handleEliminar}
            disabled={eliminando}
            style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1.5px solid var(--secco-red-35)', background: 'var(--secco-red-08)', color: 'var(--destructive)', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: eliminando ? 0.6 : 1 }}
          >
            {eliminando ? '…' : 'Eliminar'}
          </button>
        ) : null}
      </div>

      <div style={{ padding: '20px 16px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, ...statusStyle(acta.status) }}>
          {statusText(acta.status)}
        </span>

        <div className="s-card" style={{ marginTop: 16, marginBottom: 12 }}>
          <Seccion titulo="Cliente">
            <Campo label="Nombre" value={cliente.nombre} />
            <Campo label="RUT" value={cliente.rut} />
            <Campo label="Teléfono" value={cliente.telefono} />
            <Campo label="Correo" value={cliente.email} />
          </Seccion>
        </div>

        <div className="s-card" style={{ marginBottom: 12 }}>
          <Seccion titulo="Vehículo">
            <Campo label="Marca" value={vehiculo.marca} />
            <Campo label="Modelo" value={vehiculo.modelo} />
            <Campo label="Año" value={vehiculo.anio} />
            {vehiculo.patente ? (
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 700, textTransform: 'uppercase' }}>Patente</p>
                <PatenteLink patente={vehiculo.patente} mono style={{ fontSize: 13, fontWeight: 500 }} />
              </div>
            ) : null}
          </Seccion>
        </div>

        <div className="s-card" style={{ marginBottom: 12 }}>
          <Seccion titulo="Datos de entrega">
            <Campo label="Fecha" value={fechaFmt} />
            <Campo label="Hora" value={hora?.slice?.(0, 5) || hora} />
            <Campo label="Kilometraje" value={acta.km != null ? `${Number(acta.km).toLocaleString('es-CL')} km` : null} />
            <Campo label="Combustible" value={acta.combustible} />
            <Campo label="Llaves" value={acta.llaves != null ? String(acta.llaves) : null} />
          </Seccion>
        </div>

        {trabajo ? (
          <div className="s-card" style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--secco-green-dark)' }}>Trabajo realizado</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{trabajo}</p>
          </div>
        ) : null}

        {(acta.tc_nombre || acta.tecnico_nombre || acta.nombre_responsable) ? (
          <div className="s-card" style={{ marginBottom: 12 }}>
            <Seccion titulo="Responsable SECCO">
              <Campo label="Nombre" value={acta.tc_nombre || acta.tecnico_nombre || acta.nombre_responsable} />
              <Campo label="Cargo" value={acta.cargo_responsable} />
            </Seccion>
          </div>
        ) : null}

        <button type="button" className="s-btn-secondary" style={{ width: '100%', marginTop: 16 }} onClick={onVolver}>
          Volver al listado
        </button>
      </div>
    </div>
  )
}
