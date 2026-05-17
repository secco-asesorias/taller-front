import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../services/api'
import { usuarioService } from '../services/usuarioService'
import {
  normalizarPerfil,
  rolDesdeSesion,
  perfilDesdeRolSesion,
  buscarPerfilEnListaUsuarios,
  unwrapUsuariosApi,
} from '../utils/perfilUsuario'

/** Etiquetas legibles del rol (tabla `perfiles`). */
export const ROL_ETIQUETAS = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  recepcionista: 'Recepción',
}

const ROL_ETIQUETA = ROL_ETIQUETAS

function inicialesDesdeTexto(text) {
  if (!text?.trim()) return '·'
  const t = text.trim()
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  const one = parts[0] || t
  return one.slice(0, 2).toUpperCase()
}

/**
 * Datos de presentación del usuario: combina perfil en BD con claims/metadata del JWT
 * (la sesión que Supabase guarda en localStorage, p. ej. sb-…-auth-token).
 */
function datosSesionParaUI(usuario, perfil) {
  const meta = usuario?.user_metadata || {}
  const nombrePerfil = perfil?.nombre?.trim() || ''
  const metaNombre = (meta.full_name || meta.name || meta.display_name || '').trim()
  const email = (usuario?.email || perfil?.email || '').trim()
  const parteLocal = email ? email.split('@')[0] : ''
  const nombre =
    nombrePerfil || metaNombre || parteLocal || (email ? email : 'Usuario')
  const avatarUrl = (meta.avatar_url || meta.picture || '').trim() || null
  const iniciales = inicialesDesdeTexto(nombrePerfil || metaNombre || parteLocal || email)
  return { nombre, nombrePerfil, email: email || null, avatarUrl, iniciales }
}

async function cargarPerfilSupabase(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return normalizarPerfil(data)
}

/**
 * Resuelve rol de taller (admin | recepcionista | tecnico).
 * El JWT de Supabase solo trae role: "authenticated"; el rol real está en `perfiles` o en la API.
 */
async function resolverPerfil(session) {
  const userId = session.user.id

  let perfil = null

  try {
    perfil = await cargarPerfilSupabase(userId)
  } catch (e) {
    console.warn('[auth] No se pudo leer perfiles desde Supabase:', e?.message || e)
  }

  if (!perfil?.rol) {
    try {
      const apiRow = await usuarioService.obtenerMiPerfil()
      perfil = normalizarPerfil(apiRow) || perfil
    } catch (e) {
      if (e?.status !== 404) {
        console.warn('[auth] No se pudo cargar perfil desde API:', e?.message || e)
      }
    }
  }

  if (!perfil?.rol) {
    const rolJwt = rolDesdeSesion(session)
    if (rolJwt) perfil = perfilDesdeRolSesion(session, rolJwt)
  }

  if (!perfil?.rol) {
    try {
      const data = await usuarioService.listar({ limite: 100 })
      const lista = unwrapUsuariosApi(data)
      const desdeLista = buscarPerfilEnListaUsuarios(lista, session)
      if (desdeLista?.rol) perfil = desdeLista
    } catch {
      /* solo admins pueden listar; ignorar 403 */
    }
  }

  if (perfil && !perfil.id) perfil = { ...perfil, id: userId }
  return perfil
}

export async function listarTecnicos() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .eq('rol', 'tecnico')
    .order('nombre')
  if (error) throw error
  return data || []
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async (session) => {
    if (!session?.user) {
      setUsuario(null)
      setPerfil(null)
      setCargando(false)
      return
    }
    setUsuario(session.user)
    try {
      const p = await resolverPerfil(session)
      setPerfil(p)
    } catch (e) {
      console.warn('[auth] Error al resolver perfil:', e?.message || e)
      setPerfil(null)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => cargar(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      cargar(session)
    })
    return () => subscription.unsubscribe()
  }, [cargar])

  return (
    <AuthContext.Provider value={{ usuario, perfil, cargando }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

export function useRol() {
  const { usuario, perfil, cargando } = useAuth()
  const rol = perfil?.rol || null
  const sesionUI = useMemo(() => datosSesionParaUI(usuario, perfil), [usuario, perfil])
  return {
    rol,
    cargando,
    /** Nombre para mostrar: perfil → metadata Supabase → parte local del email. */
    nombre: sesionUI.nombre,
    nombrePerfil: sesionUI.nombrePerfil,
    email: sesionUI.email,
    avatarUrl: sesionUI.avatarUrl,
    iniciales: sesionUI.iniciales,
    rolEtiqueta: rol ? ROL_ETIQUETA[rol] || rol : '',
    esAdmin: rol === 'admin',
    esTecnico: rol === 'tecnico',
    esRecepcionista: rol === 'recepcionista',
    puedeVerPresupuestos: rol === 'admin',
    puedeCrearActa: ['admin', 'recepcionista', 'tecnico'].includes(rol),
    puedeEditarDiagnostico: ['admin', 'tecnico'].includes(rol),
    puedeGestionarOTs: ['admin', 'tecnico'].includes(rol),
    puedeVerHistorial: ['admin', 'recepcionista'].includes(rol),
    puedeGestionarUsuarios: rol === 'admin',
  }
}
