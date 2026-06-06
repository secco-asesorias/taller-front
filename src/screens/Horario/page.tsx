import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { horarioAdminService } from '../../services/horarioAdminService'
import { useToast } from '../../components/common/ToastProvider'

interface Reserva {
  id: string
  fecha: string
  hora_inicio: string
  nombre: string
  telefono: string
  email: string | null
  rut: string
  patente: string | null
  marca_modelo: string | null
  año: string | null
  vin: string | null
  km: number | null
  trabajo_solicitado: string
  estado: 'pendiente' | 'confirmada' | 'cancelada'
  created_at: string
}

const HORAS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']
const DIAS_LABEL = ['Lun','Mar','Mié','Jue','Vie','Sáb']
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function getMondayOf(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return date
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function esHoy(d: Date): boolean {
  return toISO(d) === toISO(new Date())
}

const ESTADO_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  pendiente:  { bg: 'var(--secco-gold-10)',    color: 'var(--secco-gold)',       border: 'var(--secco-gold-30)' },
  confirmada: { bg: 'var(--secco-green-12)',   color: 'var(--secco-green)',      border: 'var(--secco-green-30)' },
  cancelada:  { bg: 'var(--secco-red-08)',     color: 'var(--secco-red)',        border: 'var(--secco-red-25)' },
}

function Badge({ estado }: { estado: string }) {
  const s = ESTADO_BADGE[estado] ?? ESTADO_BADGE.pendiente
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
      {estado}
    </span>
  )
}

function DetalleReserva({ reserva, onCancelar, onEliminar, cambiando, onCerrar, onCrearPresupuesto }: {
  reserva: Reserva
  onCancelar: () => void
  onEliminar: () => void
  cambiando: boolean
  onCerrar: () => void
  onCrearPresupuesto: () => void
}) {
  return (
    <div className="s-card" style={{ border: '1.5px solid var(--secco-gold-30)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--secco-gold)' }}>
            Detalle de reserva
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>
            {reserva.fecha.split('-').reverse().join('/')} · {reserva.hora_inicio.slice(0,5)}–{String(Number(reserva.hora_inicio.slice(0,2))+1).padStart(2,'0')}:00
          </p>
        </div>
        <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 18, padding: '0 4px', lineHeight: 1, fontFamily: 'inherit' }}>✕</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{reserva.nombre}</h3>
        <Badge estado={reserva.estado} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {([
          ['Teléfono', reserva.telefono],
          ['RUT', reserva.rut],
          ['Correo', reserva.email ?? '—'],
          ['Patente', reserva.patente ?? '—'],
          ['Vehículo', reserva.marca_modelo ?? '—'],
          ['Año', reserva.año ?? '—'],
          ['Kilometraje', reserva.km != null ? `${reserva.km.toLocaleString('es-CL')} km` : '—'],
          ['VIN', reserva.vin ?? '—'],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted-foreground)' }}>{label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 14 }}>{val}</p>
          </div>
        ))}
      </div>

      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted-foreground)' }}>Trabajo solicitado</p>
        <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5 }}>{reserva.trabajo_solicitado}</p>
      </div>

      {reserva.estado !== 'cancelada' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onCrearPresupuesto}
            style={{ width: '100%', height: 42, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'var(--secco-gold)', color: '#fff', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>
            Crear presupuesto
          </button>
          {reserva.estado === 'pendiente' && (
            <button disabled={cambiando} onClick={onCancelar}
              style={{ width: '100%', height: 38, borderRadius: 10, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--muted-foreground)', fontWeight: 500, fontSize: 13,
                fontFamily: 'inherit', opacity: cambiando ? 0.4 : 1 }}>
              Cancelar reserva
            </button>
          )}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <button disabled={cambiando} onClick={onEliminar}
          style={{ width: '100%', height: 36, borderRadius: 10, cursor: 'pointer',
            border: '1px solid var(--secco-red-25)', background: 'var(--secco-red-08)',
            color: 'var(--secco-red)', fontWeight: 500, fontSize: 13,
            fontFamily: 'inherit', opacity: cambiando ? 0.4 : 1 }}>
          Eliminar reserva
        </button>
      </div>
    </div>
  )
}

export default function HorarioPage() {
  const navigate = useNavigate()
  const toast = useToast() as { success: (m: string) => void; error: (m: string) => void }
  const [lunes, setLunes] = useState(() => getMondayOf(new Date()))
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cargando, setCargando] = useState(false)
  const [seleccionada, setSeleccionada] = useState<Reserva | null>(null)
  const [cambiando, setCambiando] = useState(false)

  const diasSemana = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => addDays(lunes, i)), [lunes])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const desde = toISO(lunes)
      const hasta = toISO(addDays(lunes, 5))
      const data = await horarioAdminService.getReservasSemana(desde, hasta)
      setReservas(data)
    } catch {
      setReservas([])
    } finally {
      setCargando(false)
    }
  }, [lunes])

  useEffect(() => { cargar() }, [cargar])

  const mapa = useMemo(() => {
    const m: Record<string, Reserva> = {}
    for (const r of reservas) {
      const hora = r.hora_inicio.slice(0, 5)
      m[`${r.fecha}_${hora}`] = r
    }
    return m
  }, [reservas])

  async function cancelarReserva(id: string) {
    setCambiando(true)
    try {
      await horarioAdminService.actualizarEstadoReserva(id, 'cancelada')
      await cargar()
      setSeleccionada(r => r?.id === id ? { ...r, estado: 'cancelada' } : r)
    } finally {
      setCambiando(false)
    }
  }

  async function eliminarReserva(id: string) {
    setCambiando(true)
    try {
      await horarioAdminService.eliminarReserva(id)
      setSeleccionada(null)
      await cargar()
      toast.success('Reserva eliminada')
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo eliminar la reserva')
    } finally {
      setCambiando(false)
    }
  }

  function crearPresupuesto(reserva: Reserva) {
    navigate('/cotizaciones/nueva', { state: { reserva } })
  }

  const semanaLabel = (() => {
    const desde = diasSemana[0]
    const hasta = diasSemana[5]
    if (desde.getMonth() === hasta.getMonth()) {
      return `${desde.getDate()} – ${hasta.getDate()} de ${MESES[desde.getMonth()]} ${desde.getFullYear()}`
    }
    return `${desde.getDate()} ${MESES[desde.getMonth()]} – ${hasta.getDate()} ${MESES[hasta.getMonth()]} ${hasta.getFullYear()}`
  })()

  return (
    <div style={{ padding: '24px 0' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Horario</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>
            Reservas del taller — 9:00 a 19:00 hrs
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setLunes(d => addDays(d, -7))}
            style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--background)', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>
            ←
          </button>
          <span style={{ fontSize: 14, fontWeight: 500, minWidth: 200, textAlign: 'center' }}>{semanaLabel}</span>
          <button onClick={() => setLunes(d => addDays(d, 7))}
            style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--background)', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>
            →
          </button>
          <button onClick={() => { setLunes(getMondayOf(new Date())); setSeleccionada(null) }}
            style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--background)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            Hoy
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: seleccionada ? '1fr 340px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* Grilla del calendario */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ width: 64, padding: '8px 0', textAlign: 'left' }} />
                {diasSemana.map((dia, i) => (
                  <th key={i} style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                    <div style={{ color: 'var(--muted-foreground)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {DIAS_LABEL[i]}
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 32, height: 32, borderRadius: '50%', marginTop: 2, fontSize: 14,
                      background: esHoy(dia) ? 'var(--secco-gold)' : 'transparent',
                      color: esHoy(dia) ? '#fff' : 'var(--foreground)',
                      fontWeight: esHoy(dia) ? 700 : 500,
                    }}>
                      {dia.getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORAS.map(hora => (
                <tr key={hora} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0 8px 0 0', verticalAlign: 'middle', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', width: 64, textAlign: 'right' }}>
                    {hora}
                  </td>
                  {diasSemana.map((dia, i) => {
                    const key = `${toISO(dia)}_${hora}`
                    const reserva = mapa[key]
                    const s = reserva ? ESTADO_BADGE[reserva.estado] : null
                    return (
                      <td key={i} style={{ padding: '3px 4px', height: 56, verticalAlign: 'top' }}>
                        {reserva ? (
                          <button
                            onClick={() => setSeleccionada(r => r?.id === reserva.id ? null : reserva)}
                            style={{
                              width: '100%', height: '100%', minHeight: 50, padding: '6px 8px',
                              borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                              border: `1.5px solid ${seleccionada?.id === reserva.id ? s!.color : s!.border}`,
                              background: s!.bg, fontFamily: 'inherit',
                              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 600, color: s!.color, display: 'block',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {reserva.nombre.split(' ')[0]}
                            </span>
                            <span style={{ fontSize: 11, color: s!.color, opacity: 0.75, display: 'block',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {reserva.patente ?? reserva.marca_modelo ?? reserva.telefono}
                            </span>
                          </button>
                        ) : (
                          <div style={{ height: '100%', minHeight: 50, borderRadius: 8, background: 'transparent' }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {cargando && (
            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13, marginTop: 16 }}>
              Cargando...
            </p>
          )}
        </div>

        {/* Panel de detalle */}
        {seleccionada && (
          <DetalleReserva
            reserva={seleccionada}
            onCancelar={() => cancelarReserva(seleccionada.id)}
            onEliminar={() => eliminarReserva(seleccionada.id)}
            onCrearPresupuesto={() => crearPresupuesto(seleccionada)}
            cambiando={cambiando}
            onCerrar={() => setSeleccionada(null)}
          />
        )}
      </div>
    </div>
  )
}
