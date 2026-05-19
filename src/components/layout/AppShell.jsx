import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useRol } from '../../context/AuthContext'
import { supabase } from '../../services/api'
import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: '🏠' },
  { label: 'Actas ingreso', to: '/actas', icon: '📂' },
  { label: 'Actas entrega', to: '/actas-entrega', icon: '🚗' },
  { label: 'Diagnósticos', to: '/diagnosticos', icon: '🔧' },
  { label: 'Cotizaciones', to: '/cotizaciones', icon: '💰' },
  { label: 'Órdenes de Trabajo', to: '/ordenes-trabajo', icon: '⚙️' },
  { label: 'Clientes', to: '/clientes', icon: '👥' },
  { label: 'Vehículos', to: '/vehiculos', icon: '🚙' },
]

const MOBILE_MAIN = [
  { label: 'Inicio', to: '/', icon: '🏠' },
  { label: 'Actas', to: '/actas', icon: '📂' },
  { label: 'Diag.', to: '/diagnosticos', icon: '🔧' },
  { label: 'OT', to: '/ordenes-trabajo', icon: '⚙️' },
]

const MOBILE_MORE_BASE = [
  { label: 'Cotizaciones', to: '/cotizaciones', icon: '💰' },
  { label: 'Entregas', to: '/actas-entrega', icon: '🚗' },
  { label: 'Clientes', to: '/clientes', icon: '👥' },
  { label: 'Vehículos', to: '/vehiculos', icon: '🚙' },
]

const NAV_USUARIOS = { label: 'Usuarios', to: '/usuarios', icon: '🔑' }

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

export default function AppShell() {
  const { nombre, email, iniciales, avatarUrl, rolEtiqueta, esAdmin } = useRol()
  const navItems = useMemo(
    () => (esAdmin ? [...NAV_ITEMS, NAV_USUARIOS] : NAV_ITEMS),
    [esAdmin],
  )
  const mobileMore = useMemo(
    () => (esAdmin ? [...MOBILE_MORE_BASE, NAV_USUARIOS] : MOBILE_MORE_BASE),
    [esAdmin],
  )
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname || '/'
  const esFullWidth = (
    pathname === '/' ||
    pathname.startsWith('/actas') ||
    pathname.startsWith('/actas-entrega') ||
    pathname.startsWith('/diagnosticos') ||
    pathname.startsWith('/cotizaciones') ||
    pathname.startsWith('/ordenes-trabajo') ||
    pathname.startsWith('/clientes') ||
    pathname.startsWith('/vehiculos') ||
    pathname.startsWith('/usuarios')
  )
  const [moreOpen, setMoreOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`${styles.brand} ${styles.brandBtn}`}
            >
              <img
                src="/logo-secco.png"
                alt="SECCO"
                className={styles.brandLogo}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </button>

            <div className={styles.userCard}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className={styles.userAvatarImg} />
              ) : (
                <div className={styles.userAvatar} aria-hidden>
                  {iniciales}
                </div>
              )}
              <div className={styles.userMeta}>
                <p className={styles.userName}>{nombre}</p>
                {email ? (
                  <p className={styles.userEmail} title={email}>
                    {email}
                  </p>
                ) : null}
                {rolEtiqueta ? (
                  <span className={styles.userRol}>{rolEtiqueta}</span>
                ) : null}
              </div>
            </div>

            <p className={styles.navTitle}>Navegación</p>
            <nav className={styles.nav}>
              {navItems.map((it) => (
                <NavItem key={it.to} to={it.to} icon={it.icon} label={it.label} />
              ))}
            </nav>

            <div className={styles.spacer} />

            <button type="button" onClick={handleLogout} className={styles.logout}>
              <span style={{ fontSize: 18 }}>⎋</span>
              <span>Salir</span>
            </button>
          </div>
        </aside>

        <main className={`${styles.main} ${styles.mobilePadBottom}`}>
          <div style={{ maxWidth: esFullWidth ? '100%' : 600, width: '100%' }}>
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <div className={styles.mobileNavWrap}>
          {/* Backdrop for "Más" */}
          {moreOpen && (
            <div
              onClick={() => setMoreOpen(false)}
              className={styles.mobileBackdrop}
            />
          )}

          {/* Bottom sheet */}
          {moreOpen && (
            <div className={styles.mobileSheet}>
              <div className={styles.mobileSheetUser}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className={styles.mobileSheetAvatarImg} />
                ) : (
                  <div className={styles.mobileSheetAvatar} aria-hidden>
                    {iniciales}
                  </div>
                )}
                <div className={styles.mobileSheetUserText}>
                  <p className={styles.mobileSheetUserName}>{nombre}</p>
                  {email ? (
                    <p className={styles.mobileSheetUserEmail}>{email}</p>
                  ) : null}
                  {rolEtiqueta ? (
                    <span className={styles.userRol}>{rolEtiqueta}</span>
                  ) : null}
                </div>
              </div>
              <p className={styles.mobileSheetTitle}>
                Más
              </p>
              <div className={styles.mobileSheetList}>
                {mobileMore.map((it) => (
                  <button
                    key={it.to}
                    onClick={() => { setMoreOpen(false); navigate(it.to) }}
                    className={styles.mobileSheetItem}
                  >
                    <span style={{ fontSize: 18 }}>{it.icon}</span>
                    <span>{it.label}</span>
                  </button>
                ))}
                <button
                  onClick={() => { setMoreOpen(false); handleLogout() }}
                  className={styles.mobileSheetLogout}
                >
                  <span style={{ fontSize: 18 }}>⎋</span>
                  <span>Salir</span>
                </button>
              </div>
            </div>
          )}

          <nav className={styles.bottomNav}>
            <div className={styles.bottomNavGrid}>
              {MOBILE_MAIN.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => `${styles.bottomLink} ${isActive ? styles.bottomLinkActive : ''}`}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{it.icon}</span>
                  <span>{it.label}</span>
                </NavLink>
              ))}

              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={`${styles.bottomMoreBtn} ${moreOpen ? styles.bottomMoreBtnActive : ''}`}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>⋯</span>
                <span>Más</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}

