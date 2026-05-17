import { api } from './api'

export const usuarioService = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get(`/api/usuarios${qs ? `?${qs}` : ''}`)
  },
  crear: (datos) => api.post('/api/usuarios', datos),
  /** Perfil del usuario autenticado (varios paths según versión del backend). */
  async obtenerMiPerfil() {
    const rutas = ['/api/perfil', '/api/usuarios/me', '/api/me']
    let ultimoError = null
    for (const path of rutas) {
      try {
        return await api.get(path)
      } catch (e) {
        ultimoError = e
        if (e?.status !== 404) throw e
      }
    }
    if (ultimoError) throw ultimoError
    return null
  },
}
