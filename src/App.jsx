import { useState } from 'react'
import { AuthProvider, useAuth, useRol } from './context/AuthContext'
import { DiagnosticoProvider } from './context/DiagnosticoContext'
import { supabase } from './services/api'

// Screens
import LoginScreen from './screens/Login/LoginScreen'
import AdminDashboard from './screens/Dashboard/AdminDashboard'
import RecepcionistaDashboard from './screens/Dashboard/RecepcionistaDashboard'
import TecnicoDashboard from './screens/Dashboard/TecnicoDashboard'
import ActasListScreen from './screens/Actas/ActasListScreen'
import ActaForm from './screens/Actas/ActaForm'
import ActaDetalleScreen from './screens/Actas/ActaDetalleScreen'
import DiagnosticosListScreen from './screens/Diagnostico/DiagnosticosListScreen'
import DiagnosticoForm from './screens/Diagnostico/DiagnosticoForm'
import CotizacionesListScreen from './screens/Cotizaciones/CotizacionesListScreen'
import PresupuestoForm from './screens/Cotizaciones/PresupuestoForm'
import OTListScreen from './screens/OrdenesTrabajo/OTListScreen'
import OTForm from './screens/OrdenesTrabajo/OTForm'
import ClientesListScreen from './screens/Clientes/ClientesListScreen'

// ── DashboardScreen: elige el dashboard según rol ─────────────
function DashboardScreen({ onNavigate }) {
  const { esAdmin, esTecnico, esRecepcionista } = useRol()
  if (esAdmin) return <AdminDashboard onNavigate={onNavigate} />
  if (esTecnico) return <TecnicoDashboard onNavigate={onNavigate} />
  if (esRecepcionista) return <RecepcionistaDashboard onNavigate={onNavigate} />
  return <AdminDashboard onNavigate={onNavigate} />
}

// ── AppContent: navegación interna ────────────────────────────
function AppContent() {
  const { cargando } = useAuth()
  const { nombre } = useRol()
  const [ruta, setRuta] = useState('dashboard')
  const [params, setParams] = useState({})
  const [diagnosticoActivo, setDiagnosticoActivo] = useState(null)
  const [cotizacionActiva, setCotizacionActiva] = useState(null)
  const [otActiva, setOtActiva] = useState(null)

  function navigate(nuevaRuta, nuevosParams = {}) {
    setRuta(nuevaRuta)
    setParams(nuevosParams)
    window.scrollTo(0, 0)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (cargando) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5' }}>
        <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando...</p>
      </div>
    )
  }

  function renderPantalla() {
    // Dashboard
    if (ruta === 'dashboard') return <DashboardScreen onNavigate={navigate} />

    // ── Actas ──
    if (ruta === 'actas') return <ActasListScreen onNavigate={navigate} />
    if (ruta === 'actas/nueva') return <ActaForm onVolver={() => navigate('dashboard')} />
    if (ruta.startsWith('actas/')) {
      const actaId = ruta.split('/')[1]
      return <ActaDetalleScreen actaId={actaId} onNavigate={navigate} onVolver={() => navigate('actas')} />
    }

    // ── Diagnósticos ──
    if (ruta === 'diagnosticos') return <DiagnosticosListScreen onNavigate={navigate} />
    if (ruta.startsWith('diagnosticos/')) {
      const diagId = ruta.split('/')[1]
      if (diagnosticoActivo && diagnosticoActivo.id === diagId) {
        return (
          <DiagnosticoProvider>
            <DiagnosticoForm
              diagnosticoInicial={diagnosticoActivo}
              onVolver={() => { setDiagnosticoActivo(null); navigate('diagnosticos') }}
            />
          </DiagnosticoProvider>
        )
      }
      // Si no tenemos el objeto cargado, cargar desde la lista primero
      return (
        <DiagnosticosListScreen
          onNavigate={(r) => {
            if (r.startsWith('diagnosticos/')) {
              const id = r.split('/')[1]
              import('./services/diagnosticoService').then(({ diagnosticoService }) => {
                diagnosticoService.obtener(id).then((d) => {
                  setDiagnosticoActivo(d)
                  navigate(r)
                })
              })
            } else {
              navigate(r)
            }
          }}
        />
      )
    }

    // ── Cotizaciones ──
    if (ruta === 'cotizaciones') return <CotizacionesListScreen onNavigate={navigate} />
    if (ruta.startsWith('cotizaciones/')) {
      if (cotizacionActiva) {
        return (
          <PresupuestoForm
            cotizacionInicial={cotizacionActiva}
            onVolver={() => { setCotizacionActiva(null); navigate('cotizaciones') }}
            onAbrirOT={(ot) => { setCotizacionActiva(null); setOtActiva(ot); navigate(`ordenes-trabajo/${ot.id}`) }}
          />
        )
      }
      const cotId = ruta.split('/')[1]
      import('./services/cotizacionService').then(({ cotizacionService }) => {
        cotizacionService.obtener(cotId).then((c) => {
          setCotizacionActiva(c)
          navigate(ruta)
        })
      })
      return (
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando cotización...</p>
        </div>
      )
    }

    // ── Órdenes de Trabajo ──
    if (ruta === 'ordenes-trabajo') return <OTListScreen onNavigate={navigate} />
    if (ruta.startsWith('ordenes-trabajo/')) {
      if (otActiva) {
        return (
          <OTForm
            otInicial={otActiva}
            onVolver={() => { setOtActiva(null); navigate('ordenes-trabajo') }}
          />
        )
      }
      const otId = ruta.split('/')[1]
      import('./services/ordenTrabajoService').then(({ ordenTrabajoService }) => {
        ordenTrabajoService.obtener(otId).then((ot) => {
          setOtActiva(ot)
          navigate(ruta)
        })
      })
      return (
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Cargando orden de trabajo...</p>
        </div>
      )
    }

    // ── Clientes ──
    if (ruta === 'clientes') return <ClientesListScreen onNavigate={navigate} />

    return <DashboardScreen onNavigate={navigate} />
  }

  // Pantallas sin header (flujo completo)
  const SIN_HEADER = ['actas/nueva', 'diagnosticos/']
  const mostrarHeader = !SIN_HEADER.some((p) => ruta === p || ruta.startsWith(p)) &&
    !ruta.startsWith('ordenes-trabajo/') && !cotizacionActiva

  return (
    <div style={{ minHeight: '100svh', background: '#F5F5F5' }}>
      {mostrarHeader && (
        <header style={{ background: '#1e3a8a', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <button
            onClick={() => { setDiagnosticoActivo(null); setCotizacionActiva(null); setOtActiva(null); navigate('dashboard') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}
          >
            <img
              src="/logo-secco.png"
              alt="SECCO"
              style={{ height: 28, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px' }}>SECCO</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{nombre}</span>
            <button
              onClick={handleLogout}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Salir
            </button>
          </div>
        </header>
      )}

      <main style={{ maxWidth: 600, margin: '0 auto' }}>
        {renderPantalla()}
      </main>
    </div>
  )
}

// ── AuthGate: muestra login si no hay sesión ──────────────────
function AuthGate() {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e3a8a' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Cargando...</p>
      </div>
    )
  }

  if (!usuario) {
    return <LoginScreen />
  }

  return <AppContent />
}

// ── App root ──────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
