import { unwrapApiList } from '../lib/unwrapApiList'

export const ROLES_TALLER = ['admin', 'recepcionista', 'tecnico']

export function esRolTaller(rol) {
  return ROLES_TALLER.includes(rol)
}

/** Unifica fila de perfiles / respuesta API al shape del contexto. */
export function normalizarPerfil(row) {
  if (!row || typeof row !== 'object') return null
  const anidado = row.perfil || row.profile || row.usuario
  const base = anidado && typeof anidado === 'object' ? anidado : row
  const rol = String(base.rol || base.role || '').trim().toLowerCase()
  if (!rol && !base.nombre && !base.email) return null
  return {
    id: base.id || row.id || null,
    nombre: base.nombre || base.name || '',
    email: base.email || null,
    rol: esRolTaller(rol) ? rol : null,
  }
}

/** Rol en JWT / metadata de Supabase (si el backend lo inyecta después). */
export function rolDesdeSesion(session) {
  const user = session?.user
  if (!user) return null
  const candidatos = [
    user.app_metadata?.rol,
    user.app_metadata?.role,
    user.user_metadata?.rol,
    user.user_metadata?.role,
  ]
  for (const r of candidatos) {
    const norm = String(r || '').trim().toLowerCase()
    if (esRolTaller(norm)) return norm
  }
  const token = session.access_token
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const desdePayload = [
      payload.rol,
      payload.role,
      payload.app_metadata?.rol,
      payload.app_metadata?.role,
      payload.user_metadata?.rol,
    ]
    for (const r of desdePayload) {
      const norm = String(r || '').trim().toLowerCase()
      if (esRolTaller(norm)) return norm
    }
  } catch {
    /* ignore */
  }
  return null
}

export function perfilDesdeRolSesion(session, rol) {
  if (!rol || !session?.user) return null
  const email = session.user.email || ''
  return {
    id: session.user.id,
    nombre: session.user.user_metadata?.full_name
      || session.user.user_metadata?.name
      || email.split('@')[0]
      || '',
    email,
    rol,
  }
}

export function buscarPerfilEnListaUsuarios(lista, session) {
  if (!session?.user || !Array.isArray(lista)) return null
  const id = session.user.id
  const email = (session.user.email || '').toLowerCase()
  const yo = lista.find((u) => u.id === id || (u.email && String(u.email).toLowerCase() === email))
  return normalizarPerfil(yo)
}

export function unwrapUsuariosApi(data) {
  if (Array.isArray(data)) return data
  return unwrapApiList(data, ['usuarios', 'users', 'personal'])
}
