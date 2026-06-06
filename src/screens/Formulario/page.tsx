import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobile } from '../../hooks/useMobile'
import { reservaService } from '../../services/reservaService'

interface HorarioDisponible {
  id: string
  hora_inicio: string
  hora_fin: string
}

interface FormData {
  nombre: string
  telefono: string
  email: string
  rut: string
  patente: string
  marca_modelo: string
  trabajo_solicitado: string
  fecha: string
  hora_inicio: string
  año?: string
  vin?: string
  km?: string
}

interface Errores {
  nombre?: string
  telefono?: string
  email?: string
  rut?: string
  trabajo_solicitado?: string
  hora_inicio?: string
}

const EMPTY: FormData = {
  nombre: '', telefono: '', email: '', rut: '',
  patente: '', marca_modelo: '', año: '', vin: '', km: '', trabajo_solicitado: '',
  fecha: '', hora_inicio: '',
}

function fechaMinima() {
  return new Date().toISOString().split('T')[0]
}

function validarTelefono(tel: string): string | undefined {
  const v = tel.replace(/\s/g, '')
  if (!v) return 'Requerido'
  if (v.startsWith('+56')) {
    if (!/^\+569\d{8}$/.test(v)) return 'Formato: +56 9XXXXXXXX'
    return undefined
  }
  if (!/^9\d{8}$/.test(v)) return '9XXXXXXXX  o  +56 9XXXXXXXX'
  return undefined
}

function validarRUT(rut: string): string | undefined {
  if (!rut) return 'Requerido'
  if (!/^\d{7,8}-[\dkK]$/.test(rut.trim())) return 'Formato: 12345678-9'
  return undefined
}

function validarEmail(email: string): string | undefined {
  if (!email) return undefined
  if (!email.includes('@') || email.indexOf('@') === 0 || !email.includes('.'))
    return 'Correo inválido'
  return undefined
}

function validar(form: FormData): Errores {
  const e: Errores = {}
  if (!form.nombre.trim()) e.nombre = 'Requerido'
  const tel = validarTelefono(form.telefono); if (tel) e.telefono = tel
  const rut = validarRUT(form.rut); if (rut) e.rut = rut
  const email = validarEmail(form.email); if (email) e.email = email
  if (!form.trabajo_solicitado.trim()) e.trabajo_solicitado = 'Requerido'
  if (!form.fecha) e.hora_inicio = 'Selecciona una fecha primero'
  else if (!form.hora_inicio) e.hora_inicio = 'Selecciona un horario'
  return e
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--destructive)' }}>⚠ {msg}</p>
}

export default function FormularioPage() {
  const navigate = useNavigate()
  const isMobile = useMobile()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errores, setErrores] = useState<Errores>({})
  const [horarios, setHorarios] = useState<HorarioDisponible[]>([])
  const [cargandoHorarios, setCargandoHorarios] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')
  const [exito, setExito] = useState(false)

  useEffect(() => {
    if (!form.fecha) { setHorarios([]); return }
    setCargandoHorarios(true)
    setForm(f => ({ ...f, hora_inicio: '' }))
    reservaService.getHorariosDisponibles(form.fecha)
      .then(setHorarios)
      .catch(() => setHorarios([]))
      .finally(() => setCargandoHorarios(false))
  }, [form.fecha])

  function set(campo: keyof FormData, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }))
    if (campo in errores) setErrores(e => ({ ...e, [campo]: undefined }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const errs = validar(form)
    if (Object.keys(errs).length > 0) { setErrores(errs); return }
    setErrorServidor('')
    setEnviando(true)
    try {
      await reservaService.crearReserva({
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        nombre: form.nombre.trim(),
        telefono: form.telefono.replace(/\s/g, ''),
        email: form.email.trim() || null,
        rut: form.rut.trim(),
        patente: form.patente.trim() || null,
        marca_modelo: form.marca_modelo.trim() || null,
        año: form.año?.trim() || null,
        vin: form.vin?.trim() || null,
        km: form.km ? Number(form.km) : null,
        trabajo_solicitado: form.trabajo_solicitado.trim(),
      })
      setExito(true)
    } catch (err: any) {
      setErrorServidor(err.message || 'Error al enviar. Intenta nuevamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (exito) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--secco-green-12)', border: '2px solid var(--secco-green-30)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, color: 'var(--secco-green)' }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>¡Reserva registrada!</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, margin: '0 0 6px', lineHeight: 1.6 }}>
            Fecha: <strong>{form.fecha.split('-').reverse().join('/')}</strong> · Hora: <strong>{form.hora_inicio}</strong>
          </p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
            Nos pondremos en contacto para confirmar la cita.
          </p>
          <button className="s-btn-primary" style={{ maxWidth: 240, margin: '0 auto', display: 'block' }}
            onClick={() => { setForm(EMPTY); setExito(false) }}>
            Hacer otra reserva
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--background)' }}>

      {/* Header compacto */}
      <div style={{ background: 'var(--secco-black)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <img
          src="/logo-secco.png"
          alt="SECCO"
          style={{ height: 36, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          onError={(e: any) => { e.target.style.display = 'none' }}
        />
        <div>
          <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Agenda tu visita</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>
            Completa el formulario y te contactamos para confirmar.
          </p>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 40px' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16,
            alignItems: 'start',
          }}>

            {/* Columna izquierda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Datos personales */}
              <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--secco-gold)' }}>
                  Datos personales
                </p>

                <div>
                  <label className="s-label">Nombre completo</label>
                  <input className={`s-input${errores.nombre ? ' s-input-err' : ''}`}
                    type="text" placeholder="Juan Pérez" autoComplete="name"
                    value={form.nombre} onChange={e => set('nombre', e.target.value)} />
                  <FieldError msg={errores.nombre} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="s-label">Teléfono</label>
                    <input className={`s-input${errores.telefono ? ' s-input-err' : ''}`}
                      type="tel" inputMode="tel" placeholder="9XXXXXXXX" autoComplete="tel"
                      value={form.telefono} onChange={e => set('telefono', e.target.value)} />
                    <FieldError msg={errores.telefono} />
                  </div>
                  <div>
                    <label className="s-label">RUT <span style={{ fontWeight: 400, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>(sin puntos)</span></label>
                    <input className={`s-input${errores.rut ? ' s-input-err' : ''}`}
                      type="text" placeholder="12345678-9"
                      value={form.rut} onChange={e => set('rut', e.target.value)} />
                    <FieldError msg={errores.rut} />
                  </div>
                </div>

                <div>
                  <label className="s-label">Correo electrónico <span style={{ fontWeight: 400, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                  <input className={`s-input${errores.email ? ' s-input-err' : ''}`}
                    type="email" inputMode="email" placeholder="correo@ejemplo.com" autoComplete="email"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                  <FieldError msg={errores.email} />
                </div>
              </div>

              {/* Vehículo */}
              <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--secco-gold)' }}>
                  Vehículo
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="s-label">Patente</label>
                    <input className="s-input" type="text" placeholder="ABCD12"
                      value={form.patente} onChange={e => set('patente', e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <label className="s-label">Marca y modelo</label>
                    <input className="s-input" type="text" placeholder=" "
                      value={form.marca_modelo} onChange={e => set('marca_modelo', e.target.value)} />
                  </div>
                  <div>
                   <label className="s-label">Año <span style={{ fontWeight: 400, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                   <input className="s-input" type="number" placeholder="2020"
                     value={form.año} onChange={e => set('año', e.target.value)} />
                  </div>
                  <div>
                    <label className="s-label">Kilometraje <span style={{ fontWeight: 400, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                    <input className="s-input" type="number" placeholder="125000" min="0"
                      value={form.km} onChange={e => set('km', e.target.value)} />
                  </div>
                  <div>
                    <label className="s-label">VIN <span style={{ fontWeight: 400, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                    <input className="s-input" type="text" placeholder="1HGBH41JXMN109186"
                      value={form.vin} onChange={e => set('vin', e.target.value.toUpperCase())} />
                  </div>
                </div>

                <div>
                  <label className="s-label">Trabajo solicitado</label>
                  <textarea
                    className={`s-input${errores.trabajo_solicitado ? ' s-input-err' : ''}`}
                    placeholder="Describe qué necesitas revisar o reparar..."
                    rows={3} style={{ resize: 'vertical', minHeight: 72 }}
                    value={form.trabajo_solicitado}
                    onChange={e => set('trabajo_solicitado', e.target.value)}
                  />
                  <FieldError msg={errores.trabajo_solicitado} />
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div className="s-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--secco-gold)' }}>
                  Fecha y horario
                </p>

                <div>
                  <label className="s-label">Fecha preferida</label>
                  <input className="s-input" type="date"
                    min={fechaMinima()}
                    value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>

                <div>
                  <label className="s-label">Horario disponible</label>
                  {!form.fecha ? (
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '4px 0 0' }}>
                      Selecciona una fecha primero.
                    </p>
                  ) : cargandoHorarios ? (
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '4px 0 0' }}>Cargando...</p>
                  ) : horarios.length === 0 ? (
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '4px 0 0' }}>
                      No hay horarios disponibles para esta fecha.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {horarios.map(h => {
                        const activo = form.hora_inicio === h.hora_inicio
                        return (
                          <button key={h.id} type="button" onClick={() => set('hora_inicio', h.hora_inicio)}
                            style={{
                              height: 42, borderRadius: 10, fontWeight: 600, fontSize: 14,
                              cursor: 'pointer', fontFamily: 'inherit',
                              border: activo ? '2px solid var(--secco-gold)' : '1.5px solid var(--border)',
                              background: activo ? 'var(--secco-gold)' : 'var(--background)',
                              color: activo ? '#fff' : 'var(--foreground)',
                              transition: 'all 120ms ease',
                            }}>
                            {h.hora_inicio}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <FieldError msg={errores.hora_inicio} />
                </div>
              </div>

              {errorServidor && (
                <div className="s-error-box">
                  <p className="s-error" style={{ margin: 0, fontSize: 13 }}>⚠ {errorServidor}</p>
                </div>
              )}

              <button type="submit" className="s-btn-primary" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Confirmar reserva'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button onClick={() => navigate('/portal')} type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 11, opacity: 0.35, padding: '4px 12px', fontFamily: 'inherit' }}>
                  Portal corporativo
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
