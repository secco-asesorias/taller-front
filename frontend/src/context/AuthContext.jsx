import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/api'

async function cargarPerfil(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
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
      const p = await cargarPerfil(session.user.id)
      setPerfil(p)
    } catch {
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
  const { perfil } = useAuth()
  const rol = perfil?.rol || null
  return {
    rol,
    nombre: perfil?.nombre || '',
    esAdmin: rol === 'admin',
    esTecnico: rol === 'tecnico',
    esRecepcionista: rol === 'recepcionista',
    puedeVerPresupuestos: rol === 'admin',
    puedeCrearActa: ['admin', 'recepcionista', 'tecnico'].includes(rol),
    puedeEditarDiagnostico: ['admin', 'tecnico'].includes(rol),
    puedeGestionarOTs: ['admin', 'tecnico'].includes(rol),
    puedeVerHistorial: ['admin', 'recepcionista'].includes(rol),
  }
}
