import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth, useRol } from './context/AuthContext'
import { DiagnosticoProvider } from './context/DiagnosticoContext'
import AppShell from './components/layout/AppShell'
import { ToastProvider } from './components/common/ToastProvider'
import { ConfirmProvider } from './components/common/ConfirmProvider'
import { VehiculoPanelProvider } from './context/VehiculoPanelContext'

// Screens
import LoginScreen from './screens/Login/LoginScreen'
import AdminDashboard from './screens/Dashboard/AdminDashboard'
import ActasListScreen from './screens/Actas/ActasListScreen'
import ActaForm from './screens/Actas/ActaForm'
import ActaDetalleScreen from './screens/Actas/ActaDetalleScreen'
import { actaService } from './services/actaService'
import DiagnosticosListScreen from './screens/Diagnostico/DiagnosticosListScreen'
import DiagnosticoForm from './screens/Diagnostico/DiagnosticoForm'
import CotizacionesListScreen from './screens/Cotizaciones/CotizacionesListScreen'
import PresupuestoForm, { nuevaCotizacionPlantilla } from './screens/Cotizaciones/PresupuestoForm'
import OTListScreen from './screens/OrdenesTrabajo/OTListScreen'
import OTForm from './screens/OrdenesTrabajo/OTForm'
import ClientesListScreen from './screens/Clientes/ClientesListScreen'
import UsuariosListScreen from './screens/Usuarios/UsuariosListScreen'
import ActasEntregaListScreen from './screens/ActasEntrega/ActasEntregaListScreen'
import ActaEntregaForm from './screens/ActasEntrega/ActaEntregaForm'
import ActaEntregaDetalleScreen from './screens/ActasEntrega/ActaEntregaDetalleScreen'
import { actaEntregaService } from './services/actaEntregaService'

function useLegacyNavigate() {
  const navigate = useNavigate()
  return (r, _params = {}) => {
    if (!r) return
    const path = String(r).startsWith('/') ? String(r) : `/${r}`
    navigate(path.replaceAll('//', '/'))
  }
}

function DashboardRoute() {
  const { rol } = useRol()
  // Por ahora el dashboard “persistente” es el AdminDashboard (ya tiene sidebar interno + historial).
  // Si luego quieres dashboards por rol, se pueden enchufar acá sin perder el layout.
  const onNavigate = useLegacyNavigate()
  return <AdminDashboard key={rol || 'anon'} onNavigate={onNavigate} />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function ActaDetalleRoute() {
  const { actaId } = useParams()
  const navigate = useNavigate()
  const onNavigate = useLegacyNavigate()
  return <ActaDetalleScreen actaId={actaId} onNavigate={onNavigate} onVolver={() => navigate('/actas')} />
}

function ActasListRoute() {
  const onNavigate = useLegacyNavigate()
  return <ActasListScreen onNavigate={onNavigate} />
}

function ActaNuevaRoute() {
  const navigate = useNavigate()
  return <ActaForm onVolver={() => navigate('/')} />
}

function ActaEditarRoute() {
  const { actaId } = useParams()
  const navigate = useNavigate()
  const [acta, setActa] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!actaId) return
    actaService.obtener(actaId)
      .then(setActa)
      .catch((e) => setError(e?.message || 'Error al cargar acta'))
  }, [actaId])

  if (error) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p className="s-error">⚠ {error}</p>
        <button className="s-btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate(`/actas/${actaId}`)}>
          Volver
        </button>
      </div>
    )
  }

  if (!acta) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando acta...</p>
      </div>
    )
  }

  return <ActaForm key={actaId} initialActa={acta} onVolver={() => navigate(`/actas/${actaId}`)} />
}

function DiagnosticoDetalleRoute() {
  const { diagId } = useParams()
  const navigate = useNavigate()
  const [diagnosticoActivo, setDiagnosticoActivo] = useState(null)

  useEffect(() => {
    // Mantiene el comportamiento previo: si no está cargado el objeto, cargar desde servicio.
    import('./services/diagnosticoService').then(({ diagnosticoService }) => {
      diagnosticoService.obtener(diagId).then(setDiagnosticoActivo).catch(() => setDiagnosticoActivo(null))
    })
  }, [diagId])

  if (!diagnosticoActivo) {
    const onNavigate = useLegacyNavigate()
    return <DiagnosticosListScreen onNavigate={onNavigate} />
  }

  return (
    <DiagnosticoProvider>
      <DiagnosticoForm diagnosticoInicial={diagnosticoActivo} onVolver={() => navigate('/diagnosticos')} />
    </DiagnosticoProvider>
  )
}

function DiagnosticosListRoute() {
  const onNavigate = useLegacyNavigate()
  return <DiagnosticosListScreen onNavigate={onNavigate} />
}

function CotizacionNuevaRoute() {
  const navigate = useNavigate()
  return (
    <PresupuestoForm
      cotizacionInicial={nuevaCotizacionPlantilla()}
      onVolver={() => navigate('/cotizaciones')}
      onPersistido={(cot) => navigate(`/cotizaciones/${cot.id}`, { replace: true })}
      onAbrirOT={(ot) => navigate(`/ordenes-trabajo/${ot.id}`)}
    />
  )
}

function CotizacionDetalleRoute() {
  const { cotId } = useParams()
  const navigate = useNavigate()
  const [cotizacionActiva, setCotizacionActiva] = useState(null)
  const [otActiva, setOtActiva] = useState(null)
  const [cotizacionError, setCotizacionError] = useState('')
  const [cotizacionCargando, setCotizacionCargando] = useState(true)

  useEffect(() => {
    setCotizacionActiva(null)
    setCotizacionError('')
    setCotizacionCargando(true)
    import('./services/cotizacionService').then(({ cotizacionService }) => {
      cotizacionService
        .obtener(cotId)
        .then((cot) => {
          setCotizacionActiva(cot)
          setCotizacionError('')
        })
        .catch((e) => {
          setCotizacionActiva(null)
          setCotizacionError(e?.message || 'No se pudo cargar la cotización')
        })
        .finally(() => setCotizacionCargando(false))
    })
  }, [cotId])

  if (otActiva) {
    return <OTForm otInicial={otActiva} onVolver={() => { setOtActiva(null); navigate('/ordenes-trabajo') }} />
  }

  if (cotizacionCargando) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando cotización...</p>
      </div>
    )
  }

  if (!cotizacionActiva && cotizacionError) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
        <p className="s-error" style={{ marginBottom: 16 }}>{cotizacionError}</p>
        <button type="button" className="s-btn-primary" onClick={() => navigate('/cotizaciones')}>
          Volver al listado
        </button>
      </div>
    )
  }

  if (!cotizacionActiva) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>No hay datos de cotización.</p>
        <button type="button" className="s-btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/cotizaciones')}>
          Volver al listado
        </button>
      </div>
    )
  }

  return (
    <PresupuestoForm
      cotizacionInicial={cotizacionActiva}
      onVolver={() => navigate('/cotizaciones')}
      onAbrirOT={(ot) => { setOtActiva(ot); navigate(`/ordenes-trabajo/${ot.id}`) }}
    />
  )
}

function CotizacionesListRoute() {
  const onNavigate = useLegacyNavigate()
  return <CotizacionesListScreen onNavigate={onNavigate} />
}

function OTDetalleRoute() {
  const { otId } = useParams()
  const navigate = useNavigate()
  const [otActiva, setOtActiva] = useState(null)

  useEffect(() => {
    import('./services/ordenTrabajoService').then(({ ordenTrabajoService }) => {
      ordenTrabajoService.obtener(otId).then(setOtActiva).catch(() => setOtActiva(null))
    })
  }, [otId])

  if (!otActiva) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando orden de trabajo...</p>
      </div>
    )
  }

  return <OTForm otInicial={otActiva} onVolver={() => navigate('/ordenes-trabajo')} />
}

function OTListRoute() {
  const onNavigate = useLegacyNavigate()
  return <OTListScreen onNavigate={onNavigate} />
}

function ClientesListRoute() {
  const onNavigate = useLegacyNavigate()
  return <ClientesListScreen onNavigate={onNavigate} />
}

function ActasEntregaListRoute() {
  const onNavigate = useLegacyNavigate()
  return <ActasEntregaListScreen onNavigate={onNavigate} />
}

function ActaEntregaNuevaRoute() {
  const navigate = useNavigate()
  return <ActaEntregaForm onVolver={() => navigate('/actas-entrega')} />
}

function ActaEntregaDetalleRoute() {
  const { actaEntregaId } = useParams()
  const navigate = useNavigate()
  const onNavigate = useLegacyNavigate()
  return (
    <ActaEntregaDetalleScreen
      actaId={actaEntregaId}
      onNavigate={onNavigate}
      onVolver={() => navigate('/actas-entrega')}
    />
  )
}

function ActaEntregaEditarRoute() {
  const { actaEntregaId } = useParams()
  const navigate = useNavigate()
  const [acta, setActa] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!actaEntregaId) return
    actaEntregaService.obtener(actaEntregaId)
      .then(setActa)
      .catch((e) => setError(e?.message || 'Error al cargar acta de entrega'))
  }, [actaEntregaId])

  if (error) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p className="s-error">{error}</p>
        <button type="button" className="s-btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate(`/actas-entrega/${actaEntregaId}`)}>
          Volver
        </button>
      </div>
    )
  }

  if (!acta) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Cargando acta de entrega…</p>
      </div>
    )
  }

  return <ActaEntregaForm key={actaEntregaId} initialActa={acta} onVolver={() => navigate(`/actas-entrega/${actaEntregaId}`)} />
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardRoute />} />

        <Route path="actas" element={<ActasListRoute />} />
        <Route path="actas/nueva" element={<ActaNuevaRoute />} />
        <Route path="actas/:actaId" element={<ActaDetalleRoute />} />
        <Route path="actas/:actaId/editar" element={<ActaEditarRoute />} />

        <Route path="actas-entrega" element={<ActasEntregaListRoute />} />
        <Route path="actas-entrega/nueva" element={<ActaEntregaNuevaRoute />} />
        <Route path="actas-entrega/:actaEntregaId" element={<ActaEntregaDetalleRoute />} />
        <Route path="actas-entrega/:actaEntregaId/editar" element={<ActaEntregaEditarRoute />} />

        <Route path="diagnosticos" element={<DiagnosticosListRoute />} />
        <Route path="diagnosticos/:diagId" element={<DiagnosticoDetalleRoute />} />

        <Route path="cotizaciones" element={<CotizacionesListRoute />} />
        <Route path="cotizaciones/nueva" element={<CotizacionNuevaRoute />} />
        <Route path="cotizaciones/:cotId" element={<CotizacionDetalleRoute />} />

        <Route path="ordenes-trabajo" element={<OTListRoute />} />
        <Route path="ordenes-trabajo/:otId" element={<OTDetalleRoute />} />

        <Route path="clientes" element={<ClientesListRoute />} />
        <Route path="usuarios" element={<UsuariosListScreen />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

// ── AuthGate: muestra login si no hay sesión ──────────────────
function AuthGate() {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--secco-black)' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Cargando...</p>
      </div>
    )
  }

  if (!usuario) {
    return <LoginScreen />
  }

  return <AppRoutes />
}

// ── App root ──────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <VehiculoPanelProvider>
              <ScrollToTop />
              <AuthGate />
            </VehiculoPanelProvider>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
